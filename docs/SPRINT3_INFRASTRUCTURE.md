# Sprint 3 Infrastructure Setup Guide

**Status:** Ready for Development
**Sprint:** Sprint 3 (Crypto Deposits, Crypto Withdrawals, KYC Submission)
**Date:** 2025-11-20

---

## Overview

Sprint 3 introduces three critical features requiring new infrastructure:

1. **KYC Document Submission** - MinIO object storage + ClamAV scanning
2. **Crypto Deposits** - BlockCypher API integration
3. **Crypto Withdrawals** - BlockCypher API integration

This guide documents the infrastructure setup, configuration, and validation procedures.

---

## Infrastructure Additions

### New Services Added

| Service | Purpose | Port | Status |
|---------|---------|------|--------|
| **MinIO** | Object storage for KYC documents | 9000/9001 | Deployed |
| **ClamAV** | Virus scanning for document uploads | 3310 | Deployed |
| **BlockCypher API** | Blockchain integration (external) | N/A | Configured |

### Updated Services

| Service | Changes | Impact |
|---------|---------|--------|
| **Prometheus** | Added monitoring jobs for MinIO, Wallet, ClamAV | Enhanced observability |
| **Wallet Service** | New environment variables for blockchain/S3 | Ready for dev integration |

---

## Quick Start

### 1. Start All Services

```bash
cd /Users/musti/Documents/Projects/MyCrypto_Platform

# Start all services (includes MinIO and ClamAV)
docker-compose up -d

# Verify services are healthy
docker-compose ps

# Check logs
docker-compose logs -f minio
docker-compose logs -f clamav
```

### 2. Verify MinIO

```bash
# Access MinIO console
# URL: http://localhost:9001
# Username: minioadmin
# Password: minioadmin_password

# Create bucket via CLI
docker-compose exec minio mc mb minio/kyc-documents

# Set bucket policy (private)
docker-compose exec minio mc policy set private minio/kyc-documents
```

### 3. Verify ClamAV

```bash
# Check ClamAV is running
docker-compose exec clamav clamdtop

# Test scanning
docker-compose exec clamav echo "test" | clamdscan -

# Update virus definitions
docker-compose exec clamav freshclam
```

### 4. Configure Blockchain (BlockCypher)

```bash
# Get your BlockCypher API tokens from https://www.blockcypher.com
# Add to .env file:

BLOCKCYPHER_BTC_TOKEN=your-token-here
BLOCKCYPHER_ETH_TOKEN=your-token-here
BLOCKCYPHER_WEBHOOK_URL=https://your-domain.com/api/v1/wallet/webhook/blockcypher
```

---

## Service Configuration Details

### MinIO (Object Storage)

#### Architecture

```
┌─────────────────────────────────────┐
│        Wallet Service               │
│    (Upload KYC Documents)           │
└────────────────┬────────────────────┘
                 │
         ┌───────▼────────┐
         │    ClamAV      │
         │  (Virus Scan)  │
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │     MinIO      │
         │  (Store Files) │
         └────────────────┘
                 │
         ┌───────▼─────────────────┐
         │   minio_data volume     │
         │  /data (50GB allocated) │
         └─────────────────────────┘
```

#### Configuration

**Docker Compose Entry:**
```yaml
minio:
  image: minio/minio:latest
  ports:
    - "9000:9000"    # API
    - "9001:9001"    # Console
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin_password
  volumes:
    - minio_data:/data
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
    interval: 30s
```

**Environment Variables (wallet-service):**
```bash
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin_password
S3_BUCKET_KYC=kyc-documents
S3_MAX_FILE_SIZE=52428800    # 50MB
S3_ALLOWED_MIME_TYPES=application/pdf,image/jpeg,image/png,image/webp
```

**Security Settings:**

1. Bucket Policy (Private):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Deny",
         "Principal": "*",
         "Action": "s3:*",
         "Resource": ["arn:aws:s3:::kyc-documents/*"],
         "Condition": {
           "StringNotLike": {
             "aws:userid": "minioadmin"
           }
         }
       }
     ]
   }
   ```

2. Enable Encryption (AES256):
   ```bash
   docker-compose exec minio mc encrypt set AES256 minio/kyc-documents
   ```

3. Set Expiration Policy (delete after 90 days):
   ```bash
   docker-compose exec minio mc ilm import minio/kyc-documents << EOF
   {
     "Rules": [{
       "ID": "kyc-cleanup",
       "Status": "Enabled",
       "Expiration": {
         "Days": 90
       }
     }]
   }
   EOF
   ```

#### Health Checks

```bash
# Check MinIO health
curl -f http://localhost:9000/minio/health/live

# Expected response: 200 OK
# MinIO is ready for requests

# Check bucket status
docker-compose exec minio mc ls minio/

# Expected output:
# [2025-11-20 12:34:56 UTC]     0B kyc-documents/
```

---

### ClamAV (Virus Scanning)

#### Architecture

```
┌──────────────────────────────────┐
│      Wallet Service              │
│   (KYC Upload Endpoint)          │
└────────────┬─────────────────────┘
             │
       ┌─────▼──────┐
       │   ClamAV   │ ◄── Virus Definitions
       │   Daemon   │     (auto-updated)
       └─────┬──────┘
             │
        ┌────▼─────┐
        │  Verdict  │
        │ CLEAN/    │
        │ INFECTED  │
        └──────────┘
```

#### Configuration

**Docker Compose Entry:**
```yaml
clamav:
  image: clamav/clamav:latest
  ports:
    - "3310:3310"
  volumes:
    - clamav_data:/var/lib/clamav
  healthcheck:
    test: ["CMD", "clamdscan", "--version"]
    interval: 60s
```

**Environment Variables (wallet-service):**
```bash
CLAMAV_HOST=clamav
CLAMAV_PORT=3310
CLAMAV_TIMEOUT=30000        # 30 seconds
CLAMAV_ENABLED=true
CLAMAV_SCAN_ON_UPLOAD=true
```

**Virus Definition Updates:**

ClamAV automatically updates virus definitions from `freshclam` at container startup and daily. For manual update:

```bash
# Check last update time
docker-compose exec clamav ls -la /var/lib/clamav/*.cvd

# Force update
docker-compose exec clamav freshclam
```

#### Health Checks

```bash
# Check ClamAV daemon
docker-compose exec clamav clamdscan --version
# Expected: ClamAV x.x.x

# Test with EICAR test file (safe)
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' | \
  docker-compose exec -T clamav clamdscan -

# Expected: stdin: Eicar-Test-File FOUND
```

#### Integration with Wallet Service

```typescript
// Example: Wallet Service KYC upload handler

import { Injectable } from '@nestjs/common';
import NodeClam from 'clamscan';

@Injectable()
export class KycUploadService {
  private clam: NodeClam;

  constructor() {
    this.clam = new NodeClam().init({
      clamdscan: {
        host: process.env.CLAMAV_HOST,
        port: parseInt(process.env.CLAMAV_PORT),
      },
    });
  }

  async uploadKycDocument(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ url: string; scanResult: string }> {
    // 1. Scan file
    const { isInfected, viruses } = await this.clam.scanFile(file.path);

    if (isInfected) {
      throw new BadRequestException(`File infected: ${viruses.join(', ')}`);
    }

    // 2. Upload to MinIO
    const url = await this.s3Service.uploadKycDocument(
      userId,
      file.buffer,
      file.originalname,
    );

    return {
      url,
      scanResult: 'CLEAN',
    };
  }
}
```

---

### BlockCypher API (Blockchain Integration)

#### Configuration

BlockCypher is an external service (SaaS). No Docker service needed.

**Sign Up:**

1. Visit https://www.blockcypher.com
2. Create free account (no credit card required for testnet)
3. Generate API tokens for each network

**Environment Variables:**

```bash
# Bitcoin Testnet
BLOCKCYPHER_BTC_TOKEN=abc123xyz789
BLOCKCYPHER_BTC_NETWORK=test3

# Ethereum Testnet
BLOCKCYPHER_ETH_TOKEN=xyz789abc123
BLOCKCYPHER_ETH_NETWORK=ethtest

# Webhook (optional, for push notifications)
BLOCKCYPHER_WEBHOOK_URL=https://your-domain.com/api/v1/wallet/webhook/blockcypher
BLOCKCYPHER_WEBHOOK_SECRET=your-webhook-secret-key
```

**Supported Cryptocurrencies:**

| Currency | Network | Test Faucet |
|----------|---------|-------------|
| **BTC** | Bitcoin Testnet (test3) | https://testnet-faucet.mempool.space/ |
| **ETH** | Ethereum Goerli (ethtest) | https://goerlifaucet.com/ |
| **USDT** | Ethereum Goerli (ethtest) | Use ETH, bridge to USDT |

#### Integration Pattern

```typescript
// wallet-service: BlockchainService

@Injectable()
export class BlockchainService {
  private http: HttpClient;

  constructor(private configService: ConfigService) {
    this.http = new HttpClient();
  }

  async generateDepositAddress(userId: string, network: 'BTC' | 'ETH') {
    const apiKey = this.configService.get(
      `BLOCKCYPHER_${network}_TOKEN`,
    );
    const blockchainNetwork = this.configService.get(
      `BLOCKCYPHER_${network}_NETWORK`,
    );

    // Call BlockCypher API
    const response = await this.http.post(
      `https://api.blockcypher.com/v1/${network}/${blockchainNetwork}/addrs`,
      null,
      { params: { token: apiKey } },
    );

    return response.address;
  }

  async checkDeposits(userId: string, network: 'BTC' | 'ETH') {
    // Poll BlockCypher for transactions to user's address
    // Update database when confirmations reach threshold (3)
  }

  async broadcastWithdrawal(
    userId: string,
    network: 'BTC' | 'ETH',
    recipientAddress: string,
    amount: number,
  ) {
    // Create transaction
    // Sign with user's private key
    // Broadcast via BlockCypher
  }
}
```

---

## Monitoring & Observability

### Prometheus Metrics

#### MinIO Metrics

```prometheus
# Enable via environment variable
MINIO_METRICS_ENABLED=true

# Scrape config
- job_name: 'minio'
  static_configs:
    - targets: ['minio:9000']
  metrics_path: '/minio/v2/metrics/cluster'

# Key metrics
minio_disk_storage_used_bytes
minio_disk_storage_total_bytes
minio_disk_storage_free_bytes
minio_bucket_request_total{bucket="kyc-documents"}
```

#### ClamAV Metrics (Custom Implementation)

```typescript
// Add to wallet-service health endpoint

@Get('/health/scan')
async getScanHealth() {
  const socketClient = new net.Socket();
  const startTime = Date.now();

  socketClient.connect(3310, 'clamav', () => {
    const duration = Date.now() - startTime;
    return {
      status: 'UP',
      clamav: {
        host: 'clamav',
        port: 3310,
        response_time_ms: duration,
      },
    };
  });
}
```

#### Wallet Service Metrics

```prometheus
wallet_deposits_total{network="BTC", status="confirmed"}
wallet_deposits_amount_sum{network="BTC", currency="BTC"}
wallet_deposits_confirmation_time_seconds

wallet_withdrawals_total{network="BTC", status="broadcast"}
wallet_withdrawals_amount_sum{network="BTC"}
wallet_withdrawals_failed_total{reason="insufficient_balance"}
```

### Grafana Dashboards

Three new dashboards created:

1. **KYC Document Processing**
   - File upload rate
   - Scan results (clean vs infected)
   - Processing latency

2. **Blockchain Transactions**
   - Deposits by network and status
   - Withdrawals by status
   - Transaction fees

3. **Infrastructure Health**
   - MinIO disk usage
   - ClamAV availability
   - BlockCypher API latency

---

## Health Check Validation

### Automated Health Checks

All services include Docker health checks:

```bash
# Check all services
docker-compose ps

# Status indicators:
# - minio: (healthy)
# - clamav: (healthy)
# - wallet-service: (healthy)
# - postgres: (healthy)
```

### Manual Validation Script

Create `scripts/validate-sprint3.sh`:

```bash
#!/bin/bash

echo "=== Sprint 3 Infrastructure Validation ==="
echo ""

# MinIO
echo "1. MinIO Health Check"
curl -s -f http://localhost:9000/minio/health/live && echo "✓ MinIO is healthy" || echo "✗ MinIO failed"

# ClamAV
echo ""
echo "2. ClamAV Health Check"
docker-compose exec clamav clamdscan --version > /dev/null 2>&1 && echo "✓ ClamAV is healthy" || echo "✗ ClamAV failed"

# Wallet Service
echo ""
echo "3. Wallet Service Health Check"
curl -s -f http://localhost:3002/health && echo "✓ Wallet service is healthy" || echo "✗ Wallet service failed"

# Prometheus
echo ""
echo "4. Prometheus Health Check"
curl -s -f http://localhost:9090/-/healthy > /dev/null && echo "✓ Prometheus is healthy" || echo "✗ Prometheus failed"

# Environment Variables
echo ""
echo "5. Environment Variables Check"
[ -f .env ] && echo "✓ .env file exists" || echo "✗ .env file missing"

echo ""
echo "=== Validation Complete ==="
```

Run validation:

```bash
chmod +x scripts/validate-sprint3.sh
./scripts/validate-sprint3.sh
```

---

## Development Workflow

### For KYC Feature Development

1. **Setup Local Environment**
   ```bash
   docker-compose up -d minio clamav
   docker-compose exec minio mc mb minio/kyc-documents
   ```

2. **Test Document Upload**
   ```bash
   curl -X POST http://localhost:3002/api/v1/kyc/upload \
     -H "Authorization: Bearer $TOKEN" \
     -F "file=@document.pdf"
   ```

3. **Verify MinIO Storage**
   ```bash
   docker-compose exec minio mc ls minio/kyc-documents/
   ```

### For Blockchain Feature Development

1. **Get TestNet Crypto**
   - BTC Testnet: https://testnet-faucet.mempool.space/
   - ETH Goerli: https://goerlifaucet.com/

2. **Test Deposit Address Generation**
   ```bash
   curl -X POST http://localhost:3002/api/v1/wallet/deposit/address \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"network":"BTC"}'
   ```

3. **Verify BlockCypher Integration**
   - Check transaction in BlockCypher explorer
   - https://www.blockcypher.com/btc/testnet

---

## Troubleshooting

### MinIO Issues

**Problem:** MinIO health check fails
```bash
# Solution: Check Docker logs
docker-compose logs minio

# Ensure port 9000 is available
lsof -i :9000

# Restart MinIO
docker-compose restart minio
```

**Problem:** Bucket creation fails
```bash
# Solution: Use correct endpoint
docker-compose exec minio mc alias set minio http://minio:9000 minioadmin minioadmin_password
docker-compose exec minio mc mb minio/kyc-documents
```

### ClamAV Issues

**Problem:** ClamAV doesn't respond to scans
```bash
# Solution: Update virus definitions
docker-compose exec clamav freshclam

# Check clamd is running
docker-compose exec clamav ps aux | grep clamd
```

**Problem:** Scan timeout
```bash
# Solution: Increase timeout in environment
CLAMAV_TIMEOUT=60000  # 60 seconds
```

### BlockCypher Issues

**Problem:** Invalid API key
```bash
# Solution: Verify token at https://www.blockcypher.com
# Check environment variables
grep BLOCKCYPHER .env
```

**Problem:** Webhook not receiving events
```bash
# Solution: Verify webhook URL is publicly accessible
# Enable ngrok for local testing
ngrok http 3000
# Update BLOCKCYPHER_WEBHOOK_URL in BlockCypher dashboard
```

---

## Cleanup

### Remove Services (Preserve Data)

```bash
docker-compose down

# Data persists in named volumes
docker volume ls | grep exchange
```

### Full Cleanup (Remove All Data)

```bash
docker-compose down -v

# This removes all named volumes, including stored documents
```

---

## Next Steps

1. **Backend Development** - Wallet service implements KYC upload and blockchain endpoints
2. **Frontend Development** - KYC form UI integration with document upload
3. **Testing** - Integration tests with real BlockCypher testnet
4. **Staging Deployment** - Migrate to AWS (S3 instead of MinIO, real RDS)

---

## Reference Files

- Docker Compose: `/Users/musti/Documents/Projects/MyCrypto_Platform/docker-compose.yml`
- Environment Template: `/Users/musti/Documents/Projects/MyCrypto_Platform/.env.example`
- Prometheus Config: `/Users/musti/Documents/Projects/MyCrypto_Platform/monitoring/prometheus.yml`
- Blockchain Docs: `/Users/musti/Documents/Projects/MyCrypto_Platform/docs/BLOCKCHAIN_INTEGRATION.md`

---

**Document Owner:** DevOps Lead
**Last Updated:** 2025-11-20
**Status:** Ready for Development
