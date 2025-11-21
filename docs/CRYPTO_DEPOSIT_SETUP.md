# Crypto Deposit Setup Guide
## Story 2.4 - Development & Deployment

---

## Quick Start (Development)

### 1. Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ installed
- PostgreSQL running (via Docker Compose)

### 2. Environment Configuration

The `.env` file has been created with development values:

```bash
# HD Wallet Configuration (Development Only - DO NOT USE IN PRODUCTION!)
HD_WALLET_MNEMONIC=bottom nephew attract still chuckle catch yard genuine certain describe fun claim they ahead bracket result lend imitate inside today series birth resource reopen

# BlockCypher API (Get token at https://www.blockcypher.com/)
BLOCKCYPHER_API_TOKEN=
BLOCKCYPHER_WEBHOOK_URL=https://api.mycrypto-platform.com/wallet/deposit/crypto/webhook

# Minimum Deposit Limits
BTC_MIN_DEPOSIT=0.0001
ETH_MIN_DEPOSIT=0.001
USDT_MIN_DEPOSIT=1.0

# Feature Flag
CRYPTO_ENABLED=true
```

### 3. Get BlockCypher API Token

1. Visit https://www.blockcypher.com/
2. Sign up for a free account
3. Get your API token (200 req/hour, 3 req/sec)
4. Update `BLOCKCYPHER_API_TOKEN` in `.env`

### 4. Start Services

```bash
# From project root
cd /Users/musti/Documents/Projects/MyCrypto_Platform

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f wallet-service
```

### 5. Database Tables

TypeORM will automatically create the blockchain tables on startup (synchronize mode):

- `blockchain_addresses` - HD Wallet generated deposit addresses
- `blockchain_transactions` - Transaction tracking with confirmations

**Note:** For production, use migrations instead of synchronize mode.

---

## Testing the Implementation

### 1. Generate a Deposit Address

```bash
curl -X POST http://localhost:3002/wallet/deposit/crypto/address/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"currency": "BTC"}'
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "currency": "BTC",
  "address": "bc1q...",
  "qrCodeUrl": "data:image/png;base64,...",
  "requiredConfirmations": 3,
  "estimatedConfirmationTime": "30-60 minutes",
  "createdAt": "2024-11-21T00:00:00.000Z"
}
```

### 2. Get Existing Address

```bash
curl http://localhost:3002/wallet/deposit/crypto/address/BTC \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Get Deposit History

```bash
curl http://localhost:3002/wallet/deposit/crypto/history?currency=BTC&page=1&pageSize=20 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Check Transaction Status

```bash
curl http://localhost:3002/wallet/deposit/crypto/transaction/TX_HASH \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Webhook Configuration (Local Development)

For local testing with BlockCypher webhooks, use ngrok:

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start ngrok tunnel
ngrok http 3002

# Update .env with ngrok URL
BLOCKCYPHER_WEBHOOK_URL=https://YOUR_NGROK_URL.ngrok.io/wallet/deposit/crypto/webhook

# Restart wallet-service
docker-compose restart wallet-service
```

---

## Generated Addresses by Currency

### Bitcoin (BTC)
- **Path:** m/44'/0'/0'/0/{index}
- **Format:** Native SegWit (P2WPKH) - bc1...
- **Confirmations:** 3
- **Time:** ~30-60 minutes

### Ethereum (ETH)
- **Path:** m/44'/60'/0'/0/{index}
- **Format:** 0x...
- **Confirmations:** 12
- **Time:** ~3-5 minutes

### Tether (USDT)
- **Path:** m/44'/60'/0'/0/{index} (Same as ETH - ERC-20)
- **Format:** 0x...
- **Network:** Ethereum (ERC-20 only, TRC-20 not supported)
- **Confirmations:** 12
- **Time:** ~3-5 minutes

---

## Production Deployment

### 1. Generate Production HD Wallet Mnemonic

```bash
# Generate 24-word mnemonic (256-bit entropy)
node -e "console.log(require('bip39').generateMnemonic(256))"

# CRITICAL SECURITY STEPS:
# 1. Write down the 24 words on paper
# 2. Store in multiple secure locations (safe deposit boxes)
# 3. NEVER store electronically
# 4. NEVER commit to git
# 5. NEVER share with anyone
# 6. Consider using a hardware wallet for production
```

### 2. Update Production Environment

```bash
# In production .env
HD_WALLET_MNEMONIC=<your_production_24_word_mnemonic>
BLOCKCYPHER_API_TOKEN=<production_api_token>
BLOCKCYPHER_WEBHOOK_URL=https://api.mycrypto-platform.com/wallet/deposit/crypto/webhook
NODE_ENV=production
```

### 3. Database Migration (Production)

```bash
# Disable synchronize in production
# Create TypeORM config file and run migration manually

# Run migration SQL
docker exec postgres psql -U postgres -d exchange_prod -f /path/to/migration.sql
```

### 4. Security Checklist

- [ ] Production mnemonic generated and backed up securely
- [ ] HD_WALLET_MNEMONIC stored in encrypted secrets manager (AWS Secrets Manager, HashiCorp Vault)
- [ ] BlockCypher production API token obtained
- [ ] Webhook endpoint uses HTTPS
- [ ] Webhook signature verification enabled (if available)
- [ ] Rate limiting configured
- [ ] Monitoring and alerts set up
- [ ] Private keys never logged
- [ ] Database encrypted at rest
- [ ] Regular security audits scheduled

---

## Monitoring & Operations

### Key Metrics to Monitor

1. **Address Generation Rate**
   - Addresses created per hour
   - Address reuse (should be 1 per user per currency)

2. **Transaction Processing**
   - Webhook latency
   - Confirmation times
   - Failed transactions
   - Stuck transactions (confirmations not increasing)

3. **API Usage**
   - BlockCypher API quota (200 req/hour free tier)
   - Webhook failure rate
   - Database query performance

4. **Security Alerts**
   - Unexpected address generation
   - Large deposit amounts
   - Failed mnemonic validations
   - Webhook endpoint errors

### Useful Queries

```sql
-- Check total deposits by currency
SELECT currency, COUNT(*), SUM(amount::numeric)
FROM blockchain_transactions
WHERE status = 'CREDITED'
GROUP BY currency;

-- Check pending transactions
SELECT *
FROM blockchain_transactions
WHERE status = 'PENDING'
AND created_at < NOW() - INTERVAL '1 hour';

-- Check active addresses per user
SELECT user_id, currency, COUNT(*)
FROM blockchain_addresses
WHERE is_active = true
GROUP BY user_id, currency
HAVING COUNT(*) > 1;  -- Should be 0 rows
```

---

## Troubleshooting

### Address Generation Fails

**Error:** "Invalid HD_WALLET_MNEMONIC"
- **Solution:** Verify mnemonic is exactly 24 words
- **Check:** Run validation: `node -e "console.log(require('bip39').validateMnemonic('YOUR_MNEMONIC'))"`

### Webhook Not Receiving Notifications

1. **Check webhook registration:**
   ```bash
   curl https://api.blockcypher.com/v1/btc/main/hooks?token=YOUR_TOKEN
   ```

2. **Verify webhook URL is publicly accessible:**
   ```bash
   curl https://YOUR_WEBHOOK_URL
   ```

3. **Check BlockCypher logs in service logs**

### Transactions Stuck in PENDING

1. **Check BlockCypher API quota:** May be rate limited
2. **Verify transaction on blockchain explorer:** blockchain.com or etherscan.io
3. **Check confirmation count vs required confirmations**
4. **Force update:** Call update endpoint manually

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection
docker exec postgres pg_isready

# View logs
docker-compose logs postgres
```

---

## API Documentation

### OpenAPI/Swagger

Access interactive API documentation:

```
http://localhost:3002/api
```

### REST Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/wallet/deposit/crypto/address/generate` | JWT | Generate deposit address |
| GET | `/wallet/deposit/crypto/address/:currency` | JWT | Get existing address |
| GET | `/wallet/deposit/crypto/history` | JWT | Get deposit history |
| GET | `/wallet/deposit/crypto/transaction/:txHash` | JWT | Get transaction status |
| POST | `/wallet/deposit/crypto/webhook` | Public | BlockCypher webhook |

---

## Development Testing with Testnet

For testing without real funds, use testnet:

### Bitcoin Testnet

```typescript
// Update HDWalletService to use testnet
network: bitcoin.networks.testnet
```

- Get testnet BTC: https://testnet-faucet.mempool.co/
- BlockCypher testnet: https://api.blockcypher.com/v1/btc/test3

### Ethereum Goerli/Sepolia Testnet

- Get testnet ETH: https://goerlifaucet.com/
- BlockCypher ETH testnet available

---

## Support & Resources

- **BlockCypher API Docs:** https://www.blockcypher.com/dev/bitcoin/
- **BIP-44 Spec:** https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
- **BIP-39 Spec:** https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
- **EIP-681 (Ethereum URI):** https://eips.ethereum.org/EIPS/eip-681
- **Bitcoin Explorer:** https://www.blockchain.com/explorer
- **Ethereum Explorer:** https://etherscan.io/

---

**Last Updated:** 2024-11-21
**Story:** 2.4 - Crypto Deposit
**Sprint:** 3
