# Kubernetes Deployment Guide for Monitoring Stack
## MyCrypto Platform Monitoring on EKS

**Version:** 1.0
**Status:** Production-Ready
**Target:** Kubernetes 1.28+ (EKS)

---

## Prerequisites

```bash
# Kubernetes cluster
kubectl version --client

# Helm package manager
helm version

# Configured kubectl context
kubectl config current-context

# Metrics server (for HPA)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Kubernetes Cluster                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              monitoring namespace                         │  │
│  │                                                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │  │
│  │  │Prometheus│  │ Grafana  │  │ AlertManager         │  │  │
│  │  │StatefulSet│  │Deployment│  │ Deployment           │  │  │
│  │  └─────┬────┘  └─────┬────┘  └──────────┬───────────┘  │  │
│  │        │             │                   │              │  │
│  │        │             │                   │              │  │
│  │  ┌─────▼─────────────▼───────────────────▼──────────┐  │  │
│  │  │            PersistentVolumes                      │  │  │
│  │  │  - prometheus_data (30GB, 30d retention)         │  │  │
│  │  │  - grafana_data (5GB)                            │  │  │
│  │  │  - alertmanager_data (2GB)                       │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              monitoring-exporters namespace             │  │
│  │                                                            │  │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────────┐  │  │
│  │  │Postgres │ │ Redis   │ │RabbitMQ  │ │Node-Exporter│  │  │
│  │  │Exporter │ │Exporter │ │ Exporter │ │ DaemonSet   │  │  │
│  │  └─────────┘ └─────────┘ └──────────┘ └─────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          Application Services (production namespace)    │  │
│  │                                                            │  │
│  │  - Auth Service (/metrics)                             │  │
│  │  - Wallet Service (/metrics)                           │  │
│  │  - Trading Engine (/metrics)                           │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Create Monitoring Namespace

```bash
kubectl create namespace monitoring
kubectl label namespace monitoring name=monitoring
```

---

## Step 2: Create PersistentVolumes

```yaml
# prometheus-pv.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: prometheus-data
  namespace: monitoring
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp3  # EBS storage class
  resources:
    requests:
      storage: 50Gi

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: grafana-data
  namespace: monitoring
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp3
  resources:
    requests:
      storage: 10Gi

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: alertmanager-data
  namespace: monitoring
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp3
  resources:
    requests:
      storage: 5Gi
```

Apply:
```bash
kubectl apply -f prometheus-pv.yaml
```

---

## Step 3: Create ConfigMaps for Configuration

```bash
# Prometheus configuration
kubectl create configmap prometheus-config \
  --from-file=prometheus.yml \
  -n monitoring

# Alert rules
kubectl create configmap prometheus-rules \
  --from-file=prometheus/rules/ \
  -n monitoring

# AlertManager configuration
kubectl create configmap alertmanager-config \
  --from-file=alertmanager.yml \
  -n monitoring

# Grafana provisioning
kubectl create configmap grafana-provisioning \
  --from-file=grafana/provisioning/ \
  -n monitoring
```

---

## Step 4: Create Secrets for Credentials

```bash
# Create secret for AlertManager webhooks
kubectl create secret generic alertmanager-secrets \
  --from-literal=slack-webhook-url='https://hooks.slack.com/services/...' \
  --from-literal=pagerduty-service-key='...' \
  -n monitoring

# Create secret for Grafana admin password
kubectl create secret generic grafana-credentials \
  --from-literal=admin-password='<CHANGE_ME>' \
  -n monitoring
```

---

## Step 5: Deploy Prometheus StatefulSet

```yaml
# prometheus-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: prometheus
  namespace: monitoring
  labels:
    app: prometheus
spec:
  serviceName: prometheus
  replicas: 1  # Can scale to 2+ for HA
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      serviceAccountName: prometheus
      securityContext:
        fsGroup: 65534
        runAsNonRoot: true
        runAsUser: 65534

      containers:
        - name: prometheus
          image: prom/prometheus:v2.48.1
          ports:
            - containerPort: 9090
              name: http
              protocol: TCP
          args:
            - '--config.file=/etc/prometheus/prometheus.yml'
            - '--storage.tsdb.path=/prometheus'
            - '--storage.tsdb.retention.time=30d'
            - '--storage.tsdb.max-block-duration=2h'
            - '--web.enable-lifecycle'
            - '--web.enable-admin-api'

          resources:
            requests:
              cpu: 500m
              memory: 2Gi
            limits:
              cpu: 2000m
              memory: 4Gi

          livenessProbe:
            httpGet:
              path: /-/healthy
              port: 9090
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /-/ready
              port: 9090
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 5
            failureThreshold: 3

          volumeMounts:
            - name: prometheus-config
              mountPath: /etc/prometheus
            - name: prometheus-rules
              mountPath: /etc/prometheus/rules
            - name: prometheus-data
              mountPath: /prometheus

      volumes:
        - name: prometheus-config
          configMap:
            name: prometheus-config
        - name: prometheus-rules
          configMap:
            name: prometheus-rules

  volumeClaimTemplates:
    - metadata:
        name: prometheus-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: gp3
        resources:
          requests:
            storage: 50Gi

---
apiVersion: v1
kind: Service
metadata:
  name: prometheus
  namespace: monitoring
  labels:
    app: prometheus
spec:
  type: ClusterIP
  clusterIP: None  # Headless service for StatefulSet
  selector:
    app: prometheus
  ports:
    - port: 9090
      targetPort: 9090
      protocol: TCP
      name: http

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus
rules:
  - apiGroups: [""]
    resources:
      - nodes
      - nodes/proxy
      - services
      - endpoints
      - pods
    verbs: ["get", "list", "watch"]

  - apiGroups: ["apps"]
    resources:
      - statefulsets
      - deployments
    verbs: ["get", "list", "watch"]

  - nonResourceURLs: ["/metrics", "/metrics/cadvisor"]
    verbs: ["get"]

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus
  namespace: monitoring

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus
subjects:
  - kind: ServiceAccount
    name: prometheus
    namespace: monitoring
```

Apply:
```bash
kubectl apply -f prometheus-statefulset.yaml
```

---

## Step 6: Deploy Grafana Deployment

```yaml
# grafana-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
  labels:
    app: grafana
spec:
  replicas: 2  # HA setup
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      serviceAccountName: grafana
      securityContext:
        fsGroup: 472
        runAsNonRoot: true
        runAsUser: 472

      containers:
        - name: grafana
          image: grafana/grafana:10.2.2
          ports:
            - containerPort: 3000
              name: http
              protocol: TCP
          env:
            - name: GF_SECURITY_ADMIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: grafana-credentials
                  key: admin-password
            - name: GF_USERS_ALLOW_SIGN_UP
              value: "false"
            - name: GF_LOG_LEVEL
              value: "info"

          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 500m
              memory: 1Gi

          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /api/health/db
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 5
            failureThreshold: 2

          volumeMounts:
            - name: grafana-provisioning
              mountPath: /etc/grafana/provisioning
              readOnly: true
            - name: grafana-data
              mountPath: /var/lib/grafana

      volumes:
        - name: grafana-provisioning
          configMap:
            name: grafana-provisioning
        - name: grafana-data
          persistentVolumeClaim:
            claimName: grafana-data

---
apiVersion: v1
kind: Service
metadata:
  name: grafana
  namespace: monitoring
  labels:
    app: grafana
spec:
  type: LoadBalancer  # Or use Ingress
  selector:
    app: grafana
  ports:
    - port: 80
      targetPort: 3000
      protocol: TCP
      name: http

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: grafana
  namespace: monitoring
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: grafana
  minReplicas: 2
  maxReplicas: 4
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: grafana
  namespace: monitoring
```

Apply:
```bash
kubectl apply -f grafana-deployment.yaml
```

---

## Step 7: Deploy AlertManager

```yaml
# alertmanager-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alertmanager
  namespace: monitoring
  labels:
    app: alertmanager
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
  selector:
    matchLabels:
      app: alertmanager
  template:
    metadata:
      labels:
        app: alertmanager
    spec:
      serviceAccountName: alertmanager
      securityContext:
        fsGroup: 65534
        runAsNonRoot: true
        runAsUser: 65534

      containers:
        - name: alertmanager
          image: prom/alertmanager:v0.26.0
          ports:
            - containerPort: 9093
              name: http
              protocol: TCP
          args:
            - '--config.file=/etc/alertmanager/alertmanager.yml'
            - '--storage.path=/alertmanager'

          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi

          livenessProbe:
            httpGet:
              path: /-/healthy
              port: 9093
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /-/ready
              port: 9093
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 5
            failureThreshold: 2

          volumeMounts:
            - name: alertmanager-config
              mountPath: /etc/alertmanager
            - name: alertmanager-data
              mountPath: /alertmanager

      volumes:
        - name: alertmanager-config
          configMap:
            name: alertmanager-config
        - name: alertmanager-data
          persistentVolumeClaim:
            claimName: alertmanager-data

---
apiVersion: v1
kind: Service
metadata:
  name: alertmanager
  namespace: monitoring
  labels:
    app: alertmanager
spec:
  type: ClusterIP
  selector:
    app: alertmanager
  ports:
    - port: 9093
      targetPort: 9093
      protocol: TCP
      name: http

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: alertmanager
  namespace: monitoring
```

Apply:
```bash
kubectl apply -f alertmanager-deployment.yaml
```

---

## Step 8: Deploy Exporters

```yaml
# exporters-daemonset.yaml
# Node Exporter as DaemonSet (one per node)
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      hostPID: true
      containers:
        - name: node-exporter
          image: prom/node-exporter:v1.7.0
          ports:
            - containerPort: 9100
              hostPort: 9100
          args:
            - --path.sysfs=/host/sys
            - --path.procfs=/host/proc
            - --path.rootfs=/rootfs
            - --collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
          volumeMounts:
            - name: sys
              mountPath: /host/sys
              readOnly: true
            - name: proc
              mountPath: /host/proc
              readOnly: true
            - name: root
              mountPath: /rootfs
              readOnly: true
      volumes:
        - name: sys
          hostPath:
            path: /sys
        - name: proc
          hostPath:
            path: /proc
        - name: root
          hostPath:
            path: /
      tolerations:
        - key: node-role.kubernetes.io/master
          operator: Exists
          effect: NoSchedule

---
# Postgres Exporter (in default namespace)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres-exporter
  template:
    metadata:
      labels:
        app: postgres-exporter
    spec:
      containers:
        - name: postgres-exporter
          image: prometheuscommunity/postgres-exporter:v0.13.2
          ports:
            - containerPort: 9187
          env:
            - name: DATA_SOURCE_NAME
              valueFrom:
                secretKeyRef:
                  name: postgres-exporter-config
                  key: dsn
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi

---
apiVersion: v1
kind: Service
metadata:
  name: postgres-exporter
  namespace: monitoring
spec:
  selector:
    app: postgres-exporter
  ports:
    - port: 9187
      targetPort: 9187
```

Apply:
```bash
kubectl apply -f exporters-daemonset.yaml
```

---

## Step 9: Setup Ingress for External Access

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: monitoring-ingress
  namespace: monitoring
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: basic-auth
    nginx.ingress.kubernetes.io/auth-realm: 'Authentication Required'
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - monitoring.exchange.com
      secretName: monitoring-tls
  rules:
    - host: monitoring.exchange.com
      http:
        paths:
          - path: /grafana/
            pathType: Prefix
            backend:
              service:
                name: grafana
                port:
                  number: 3000
          - path: /prometheus/
            pathType: Prefix
            backend:
              service:
                name: prometheus
                port:
                  number: 9090
          - path: /alertmanager/
            pathType: Prefix
            backend:
              service:
                name: alertmanager
                port:
                  number: 9093
```

Apply:
```bash
kubectl apply -f ingress.yaml
```

---

## Verification

```bash
# Check deployments
kubectl -n monitoring get deployments

# Check StatefulSets
kubectl -n monitoring get statefulsets

# Check pods
kubectl -n monitoring get pods

# View logs
kubectl -n monitoring logs -f deployment/grafana
kubectl -n monitoring logs -f statefulset/prometheus

# Port-forward for local testing
kubectl -n monitoring port-forward svc/prometheus 9090:9090
kubectl -n monitoring port-forward svc/grafana 3000:3000
kubectl -n monitoring port-forward svc/alertmanager 9093:9093
```

---

## Troubleshooting

### Prometheus can't scrape services

```bash
# Check Prometheus targets
kubectl -n monitoring port-forward svc/prometheus 9090:9090
# Visit http://localhost:9090/targets
```

### Persistent Volume not binding

```bash
kubectl describe pvc prometheus-data -n monitoring
# Check storage class exists
kubectl get storageclass
```

### High memory usage

Reduce retention:
```bash
kubectl -n monitoring set env statefulset/prometheus \
  TSDB_RETENTION_TIME=7d
```

---

## Scaling

### High Availability Prometheus

```bash
# Use Thanos for HA
# https://thanos.io/
```

### Grafana Replicas

Already configured with HPA. Monitor:
```bash
kubectl -n monitoring get hpa
```

---

## Backup & Restore

### Backup Prometheus Data

```bash
kubectl -n monitoring exec prometheus-0 -- \
  tar czf - /prometheus | \
  gzip > prometheus-backup-$(date +%Y%m%d).tar.gz
```

### Backup Grafana Dashboards

```bash
kubectl -n monitoring port-forward svc/grafana 3000:3000
# Use Grafana API or UI export feature
```

---

## Maintenance

### Update Prometheus

```bash
kubectl -n monitoring set image \
  statefulset/prometheus \
  prometheus=prom/prometheus:v2.49.0
```

### Update Grafana

```bash
kubectl -n monitoring set image \
  deployment/grafana \
  grafana=grafana/grafana:10.3.0
```

---

**Owner:** DevOps / SRE Team
**Last Updated:** 2025-11-30
