# Admin API Quick Start Guide

## Setup (1 minute)

### 1. Set Environment Variables
```bash
export ADMIN_TOKEN="your-secure-admin-token-here"
export APP_ENV="development"  # or "production"
```

### 2. Start Trade Engine
```bash
go run cmd/server/main.go
```

## Using Admin Endpoints

### Health Check
```bash
curl -H "X-Admin-Token: $ADMIN_TOKEN" \
  http://localhost:8080/api/v1/admin/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-03T10:30:45Z",
  "components": {
    "database": {"status": "healthy", "latency_ms": 1.2},
    "matching_engine": {"status": "healthy"},
    "settlement_service": {"status": "healthy"},
    "websocket": {"status": "healthy"},
    "wallet_service": {"status": "healthy"}
  },
  "metrics": {
    "uptime_hours": 24.5,
    "memory_usage_mb": 256,
    "goroutines": 87
  }
}
```

### Real-Time Metrics
```bash
curl -H "X-Admin-Token: $ADMIN_TOKEN" \
  http://localhost:8080/api/v1/admin/metrics
```

**Response:**
```json
{
  "trading": {
    "total_orders": 125432,
    "open_orders": 234,
    "filled_orders": 125098,
    "cancelled_orders": 100,
    "trades_executed": 45123
  },
  "performance": {
    "orders_per_second": 125.4,
    "trades_per_second": 450.2
  },
  "users": {
    "total_users": 5432,
    "active_traders": 234
  },
  "errors": {
    "errors_24h": 3,
    "settlement_failures": 0
  }
}
```

### Get Trading Limits
```bash
curl -H "X-Admin-Token: $ADMIN_TOKEN" \
  http://localhost:8080/api/v1/admin/limits
```

**Response:**
```json
{
  "max_order_size": "100.0",
  "max_daily_volume": "1000.0",
  "max_concurrent_orders": 50,
  "min_order_size": "0.001",
  "price_band_percent": "10"
}
```

### Update Trading Limits
```bash
curl -X POST \
  -H "X-Admin-Token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "max_order_size": "150.0",
    "max_daily_volume": "2000.0",
    "max_concurrent_orders": 75,
    "min_order_size": "0.005",
    "price_band_percent": "15"
  }' \
  http://localhost:8080/api/v1/admin/limits
```

**Response:**
```json
{
  "success": true,
  "limits": { ... }
}
```

### Risk Status
```bash
curl -H "X-Admin-Token: $ADMIN_TOKEN" \
  http://localhost:8080/api/v1/admin/risk-status
```

**Response:**
```json
{
  "risk_level": "low",
  "exposure": {
    "total_user_balance": "50000000",
    "total_pending_settlements": "125000",
    "largest_single_order": "5000.00"
  },
  "alerts": [
    {
      "level": "warning",
      "message": "High order concentration from user_123"
    }
  ]
}
```

### Prometheus Metrics (No Auth)
```bash
curl http://localhost:8080/metrics
```

## Grafana Dashboards

### Import Dashboards
1. Open Grafana: http://localhost:3000
2. Go to Dashboards > Import
3. Upload files from: `monitoring/grafana/dashboards/`
   - trading-activity.json
   - system-health.json
   - risk-monitoring.json
4. Configure Prometheus datasource
5. Set refresh interval: 5-30s

### Available Dashboards
- **Trading Activity** - Orders, trades, volume, performance
- **System Health** - Components, connections, errors, latency
- **Risk Monitoring** - Exposure, alerts, limits, fees

## Security

### IP Whitelisting
By default, admin endpoints are only accessible from:
- 10.0.0.0/8 (Private Class A)
- 172.16.0.0/12 (Private Class B)
- 192.168.0.0/16 (Private Class C)
- 127.0.0.0/8 (Loopback)

### Custom IP Whitelist
```bash
export ADMIN_ALLOWED_NETWORKS="10.0.0.0/8,192.168.1.0/24"
```

### Development Mode
In development, localhost is automatically allowed:
```bash
export APP_ENV="development"
```

## Testing

### Run Admin API Tests
```bash
# All tests
go test -v ./tests/admin_api_test.go

# Specific tests
go test -v ./tests/admin_api_test.go -run TestHealthEndpoint
go test -v ./tests/admin_api_test.go -run TestMetricsEndpoint
go test -v ./tests/admin_api_test.go -run TestLimitsEndpoint
go test -v ./tests/admin_api_test.go -run TestAdminEndpoint
```

## Monitoring Integration

### Prometheus Configuration
```yaml
scrape_configs:
  - job_name: 'trade-engine'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: /metrics
```

### Key Metrics to Monitor
- `trade_engine_orders_placed_total` - Order placement rate
- `trade_engine_trades_executed_total` - Trade execution rate
- `trade_engine_settlement_errors_total` - Settlement failures
- `trade_engine_open_orders` - Current open orders
- `trade_engine_matching_latency_seconds` - Matching performance

### Alert Rules Example
```yaml
groups:
  - name: trade_engine_alerts
    rules:
      - alert: HighSettlementFailureRate
        expr: rate(trade_engine_settlement_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High settlement failure rate"
```

## Troubleshooting

### Admin Token Not Working
```bash
# Check token is set
echo $ADMIN_TOKEN

# Try with explicit token
curl -H "X-Admin-Token: your-token" http://localhost:8080/api/v1/admin/health
```

### Access Denied (403)
- Check you're accessing from allowed IP
- Verify IP whitelist configuration
- In development, set APP_ENV=development

### Health Check Returns Degraded
- Check individual component status in response
- Review component error messages
- Check database/Redis/wallet service connectivity

### Metrics Not Appearing in Prometheus
- Verify /metrics endpoint is accessible
- Check Prometheus scrape configuration
- Verify Prometheus can reach the service
- Check firewall rules

## Best Practices

### Security
1. Use strong ADMIN_TOKEN (32+ characters, random)
2. Rotate admin token regularly
3. Configure strict IP whitelist in production
4. Monitor admin access logs
5. Never commit ADMIN_TOKEN to git

### Monitoring
1. Set appropriate Prometheus scrape interval (15-30s)
2. Configure alerting for critical metrics
3. Review dashboards regularly
4. Set up on-call rotation for alerts
5. Monitor settlement failure rates

### Configuration
1. Test limit changes in staging first
2. Document all limit changes
3. Monitor impact after changes
4. Keep backup of previous limits
5. Review limits during high traffic

## API Reference

### Endpoints
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| /api/v1/admin/health | GET | Required | System health |
| /api/v1/admin/metrics | GET | Required | Trading metrics |
| /api/v1/admin/risk-status | GET | Required | Risk monitoring |
| /api/v1/admin/limits | GET | Required | Get limits |
| /api/v1/admin/limits | POST | Required | Update limits |
| /metrics | GET | None | Prometheus metrics |

### Authentication Header
```
X-Admin-Token: your-admin-token
```

### Response Codes
- 200 OK - Success
- 400 Bad Request - Invalid input
- 401 Unauthorized - Missing token
- 403 Forbidden - Invalid token or external IP
- 503 Service Unavailable - System degraded

---

**For more details:** See TASK-BACKEND-014-COMPLETION-REPORT.md
