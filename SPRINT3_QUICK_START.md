# Sprint 3 Infrastructure - Quick Start Guide

## Overview

Sprint 3 infrastructure is ready for development. This guide gets you started in 5 minutes.

**Status:** All infrastructure provisioned and validated (21/21 checks passing)

---

## Quick Start (5 minutes)

### 1. Start Docker Services

```bash
cd /Users/musti/Documents/Projects/MyCrypto_Platform
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

Expected output:
```
NAME                    STATUS
exchange_postgres       healthy
exchange_redis          healthy
exchange_rabbitmq       healthy
exchange_minio          healthy
exchange_clamav         healthy
exchange_auth_service   healthy
exchange_wallet_service healthy
exchange_mailpit        healthy
exchange_prometheus     healthy (optional)
exchange_grafana        healthy (optional - profile=monitoring)
```

### 2. Validate Infrastructure

```bash
./scripts/validate-sprint3-simple.sh
```

Expected: `All checks passed! Infrastructure is ready for deployment.`

### 3. Test MinIO (KYC Storage)

**Access MinIO Console:**
- URL: http://localhost:9001
- Username: `minioadmin`
- Password: `minioadmin_password`

**Create bucket:**
```bash
docker-compose exec minio mc mb minio/kyc-documents
docker-compose exec minio mc policy set private minio/kyc-documents
```

### 4. Test ClamAV (Virus Scanning)

**Verify ClamAV is running:**
```bash
docker-compose exec clamav clamdtop
```

**Test with EICAR test file (harmless):**
```bash
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' | \
  docker-compose exec -T clamav clamdscan -
```

Expected: `stdin: Eicar-Test-File FOUND`

### 5. Configure BlockCypher (Blockchain)

1. Sign up at https://www.blockcypher.com (free account)
2. Create API tokens for:
   - Bitcoin Testnet (test3)
   - Ethereum Testnet (ethtest)
3. Add to `.env` file:
   ```bash
   BLOCKCYPHER_BTC_TOKEN=your-token-here
   BLOCKCYPHER_ETH_TOKEN=your-token-here
   BLOCKCYPHER_WEBHOOK_URL=https://your-domain.com/api/v1/wallet/webhook/blockcypher
   ```

---

## Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin_password |
| **MinIO API** | http://localhost:9000 | minioadmin / minioadmin_password |
| **Auth Service API** | http://localhost:3001 | See JWT tokens |
| **Wallet Service API** | http://localhost:3002 | See JWT tokens |
| **Prometheus** | http://localhost:9090 | No auth |
| **Grafana** | http://localhost:3000 | admin / admin |
| **RabbitMQ Console** | http://localhost:15672 | rabbitmq / rabbitmq_dev_password |
| **Mailpit** | http://localhost:8025 | No auth |

---

## Environment Variables

All environment variables are documented in `.env.example`. Copy to `.env`:

```bash
cp .env.example .env
```

Key new variables for Sprint 3:

**MinIO/S3:**
```bash
S3_ENDPOINT=http://minio:9000
S3_BUCKET_KYC=kyc-documents
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin_password
```

**ClamAV:**
```bash
CLAMAV_HOST=clamav
CLAMAV_PORT=3310
CLAMAV_ENABLED=true
```

**BlockCypher:**
```bash
BLOCKCYPHER_BTC_TOKEN=your-token
BLOCKCYPHER_ETH_TOKEN=your-token
BLOCKCYPHER_WEBHOOK_URL=https://your-domain.com/api/v1/wallet/webhook/blockcypher
```

---

## Documentation References

| Document | Location | Purpose |
|----------|----------|---------|
| **Sprint 3 Infrastructure** | `docs/SPRINT3_INFRASTRUCTURE.md` | Complete setup guide |
| **Blockchain Integration** | `docs/BLOCKCHAIN_INTEGRATION.md` | Blockchain implementation guide |
| **Engineering Guidelines** | `docs/engineering-guidelines.md` | Code standards and patterns |
| **CI/CD Pipeline** | `docs/cicd-branch-strategy.md` | Deployment procedures |
| **This Quick Start** | `SPRINT3_QUICK_START.md` | 5-minute setup |

---

## Validation Checklist

Before starting development:

- [ ] Docker services running (`docker-compose ps`)
- [ ] Validation script passing (`./scripts/validate-sprint3-simple.sh`)
- [ ] MinIO accessible (http://localhost:9001)
- [ ] ClamAV responsive (`docker-compose exec clamav clamdtop`)
- [ ] Wallet Service healthy (`curl http://localhost:3002/health`)
- [ ] BlockCypher tokens in .env file
- [ ] Database migrations ready
- [ ] Environment variables configured

---

**Status:** Ready for Development
**Last Updated:** 2025-11-20
**Validation:** 21/21 checks passing
