# Blockchain Integration - Sprint 3

**Decision:** Option A - BlockCypher API (Recommended for MVP)

**Date:** 2025-11-20
**Version:** 1.0

---

## Executive Summary

For Sprint 3's Crypto Deposit and Crypto Withdrawal features, we have chosen **BlockCypher API** (Option A) over local blockchain nodes. This decision optimizes for rapid development, reduced operational complexity, and cost efficiency during the MVP phase.

---

## Decision Matrix

| Criteria | BlockCypher API (A) | Local Nodes (B) | Winner |
|----------|---------------------|-----------------|--------|
| **Development Speed** | Fast (API calls) | Slow (node sync) | A |
| **Operational Overhead** | None (SaaS) | High (node management) | A |
| **Cost (MVP)** | $0-50/mo | $200+/mo (servers) | A |
| **Webhook Support** | Yes (native) | Custom implementation | A |
| **Production-Ready** | Medium | High | B |
| **Scalability** | Rate-limited | Unlimited | B |
| **Data Privacy** | Third-party | Self-hosted | B |

**Rationale:** BlockCypher provides immediate value for MVP development with minimal infrastructure. When scaling to production (Q2 2026), we will migrate to self-hosted nodes for full control and compliance.

---

## BlockCypher Integration Details

### Supported Networks

| Network | Network ID | Purpose | Status |
|---------|-----------|---------|--------|
| **Bitcoin Testnet** | `test3` | BTC deposits/withdrawals | Active |
| **Ethereum Testnet** | `ethtest` (Goerli) | ETH deposits/withdrawals | Active |
| **USDT on Ethereum** | `ethtest` | USDT deposits/withdrawals | Active |

### API Endpoints

```
Base URL: https://api.blockcypher.com/v1
Testnet URLs:
  - BTC:  https://api.blockcypher.com/v1/btc/test3?token=YOUR_TOKEN
  - ETH:  https://api.blockcypher.com/v1/eth/test?token=YOUR_TOKEN
  - USDT: https://api.blockcypher.com/v1/eth/test?token=YOUR_TOKEN
```

### Setup Instructions

#### 1. Register for BlockCypher API

1. Visit https://www.blockcypher.com/
2. Sign up for a free account
3. Verify email
4. Create API tokens for each network:
   - Bitcoin Testnet (test3)
   - Ethereum Testnet (ethtest)

#### 2. Get API Keys

Example API tokens (replace with yours):
```
Bitcoin Testnet Token:  abc123def456xyz789
Ethereum Testnet Token: xyz789abc123def456
```

#### 3. Configure Environment Variables

Add to `.env` file:

```bash
# BlockCypher API Keys
BLOCKCYPHER_BTC_TOKEN=abc123def456xyz789
BLOCKCYPHER_ETH_TOKEN=xyz789abc123def456
BLOCKCYPHER_USDT_TOKEN=xyz789abc123def456

# Webhook Configuration (for deposit notifications)
BLOCKCYPHER_WEBHOOK_URL=https://your-domain.com/api/v1/wallet/webhook/blockcypher
BLOCKCYPHER_WEBHOOK_SECRET=your-secure-webhook-secret

# Network Configuration
BLOCKCYPHER_BTC_NETWORK=test3
BLOCKCYPHER_ETH_NETWORK=ethtest

# Address management
BLOCKCYPHER_DERIVE_PATH="m/44'/0'/0'/0"  # BIP44 path for key derivation
```

#### 4. Configure Webhooks (Optional)

BlockCypher can push transaction notifications to your API:

```bash
# Create webhook via API
curl -X POST https://api.blockcypher.com/v1/btc/test3/hooks \
  -d '{
    "event": "tx-confirmation",
    "address": "YOUR_ADDRESS",
    "url": "https://your-domain.com/api/v1/wallet/webhook/blockcypher",
    "confirmations": 3
  }' \
  -H "Content-Type: application/json" \
  --data-urlencode "token=YOUR_TOKEN"
```

---

## Implementation in Wallet Service

### Blockchain Service Integration

The wallet service will implement a `BlockchainService` that:

1. **Generate Addresses**
   ```typescript
   // Generate new receiving address for user
   async generateDepositAddress(userId: string, network: 'BTC' | 'ETH'): Promise<Address> {
     // Call BlockCypher API to generate new address
     // Store in database linked to user
   }
   ```

2. **Monitor Deposits**
   ```typescript
   // Poll BlockCypher for new transactions
   async checkIncomingTransactions(): Promise<void> {
     // Verify transaction confirmations
     // Update database when deposit is confirmed
     // Trigger notification to user
   }
   ```

3. **Process Withdrawals**
   ```typescript
   // Create and broadcast withdrawal transaction
   async withdrawCrypto(userId: string, amount: number, address: string): Promise<TxId> {
     // Validate recipient address
     // Build transaction
     // Sign transaction
     // Broadcast via BlockCypher
   }
   ```

### Database Schema

```sql
-- Blockchain addresses
CREATE TABLE blockchain_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  network VARCHAR(20) NOT NULL,  -- BTC, ETH, USDT
  address VARCHAR(255) NOT NULL UNIQUE,
  derivation_path VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, network)  -- One address per user per network
);

-- Blockchain transactions
CREATE TABLE blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  network VARCHAR(20) NOT NULL,
  tx_hash VARCHAR(255) UNIQUE,
  tx_type VARCHAR(20) NOT NULL,  -- DEPOSIT, WITHDRAWAL
  amount DECIMAL(20, 8) NOT NULL,
  status VARCHAR(20) NOT NULL,  -- PENDING, CONFIRMED, FAILED
  confirmations INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  INDEX idx_user_status (user_id, status),
  INDEX idx_tx_hash (tx_hash)
);
```

---

## Migration Path to Production

### Phase 2 (Q2 2026): Self-Hosted Nodes

When transitioning to production-grade infrastructure:

1. **Deploy Bitcoin Core node** (testnet → mainnet)
   - Kubernetes StatefulSet with persistent storage
   - RPC endpoint: `http://bitcoin-node:8332`
   - Automated backups

2. **Deploy Ethereum Geth node** (Goerli → mainnet)
   - Kubernetes StatefulSet with persistent storage
   - RPC endpoint: `http://eth-node:8545`
   - Archive mode enabled for compliance

3. **Setup Hardware Security Module (HSM)**
   - Store private keys in HSM instead of hot wallet
   - Multi-sig transactions for large amounts

4. **Replace BlockCypher with internal services**
   - Update `BlockchainService` to use local RPC endpoints
   - Implement custom webhook server for transaction notifications
   - Add compliance monitoring

### Configuration Example (Phase 2)

```yaml
# docker-compose.yml (Phase 2)
bitcoin-node:
  image: btcpayserver/bitcoin:24.0
  environment:
    BITCOIN_NETWORK: mainnet
    BITCOIN_RPC_USER: bitcoinrpc
    BITCOIN_RPC_PASSWORD: ${BITCOIN_RPC_PASSWORD}
  volumes:
    - bitcoin_data:/data

ethereum-node:
  image: ethereum/client-go:v1.13.0
  command: --mainnet --http --http.addr 0.0.0.0 --archive
  volumes:
    - eth_data:/root/.ethereum
```

---

## Security Considerations

### BlockCypher Phase (MVP)

1. **API Key Security**
   - Store tokens in AWS Secrets Manager
   - Rotate quarterly
   - Use separate tokens per network

2. **Webhook Validation**
   - Verify webhook signature with shared secret
   - Rate-limit webhook endpoints
   - Log all webhook events for audit

3. **Address Privacy**
   - Don't expose blockchain addresses in logs
   - Use address hashing for lookups
   - Mask addresses in UI (first 6 + last 4 chars)

### Self-Hosted Phase (Production)

1. **Private Key Management**
   - Multi-sig requirements (2-of-3 keys)
   - HSM storage for signing keys
   - Air-gapped cold storage for backup keys

2. **Network Security**
   - VPN-only access to node RPC endpoints
   - WAF protection on withdrawal endpoints
   - DDoS mitigation

3. **Compliance**
   - Transaction audit trail
   - AML/KYC screening before withdrawal
   - Regulatory reporting automation

---

## Testing

### Unit Tests

```typescript
// Test BlockCypher integration
describe('BlockchainService - BlockCypher', () => {
  it('should generate valid Bitcoin address', async () => {
    // Mock BlockCypher API
    // Verify address format (valid P2PKH/P2WPKH)
  });

  it('should detect transaction confirmations', async () => {
    // Mock confirmed transaction from BlockCypher
    // Verify status update in database
  });

  it('should handle failed withdrawal', async () => {
    // Mock blockchain error response
    // Verify transaction status set to FAILED
  });
});
```

### Integration Tests

```typescript
// Test against BlockCypher testnet
describe('BlockchainService - Integration', () => {
  it('should receive deposit webhook from BlockCypher', async () => {
    // Send test webhook from BlockCypher dashboard
    // Verify transaction recorded in database
  });

  it('should broadcast withdrawal transaction', async () => {
    // Create real transaction on testnet
    // Verify appears in BlockCypher explorer
  });
});
```

---

## Monitoring & Alerts

### Key Metrics

1. **Deposit Metrics**
   - `wallet_deposits_total` - Count of deposit transactions
   - `wallet_deposits_amount_sum` - Total amount deposited
   - `wallet_deposits_confirmation_time_seconds` - Time to confirmation

2. **Withdrawal Metrics**
   - `wallet_withdrawals_total` - Count of withdrawal transactions
   - `wallet_withdrawals_amount_sum` - Total amount withdrawn
   - `wallet_withdrawals_failed_total` - Failed withdrawal count

3. **BlockCypher API Metrics**
   - `blockcypher_api_requests_total` - API call count
   - `blockcypher_api_errors_total` - Failed API calls
   - `blockcypher_api_latency_seconds` - API response time

### Alerting Rules

```yaml
# Prometheus alert rules
groups:
  - name: blockchain
    rules:
      - alert: BlockCypherAPIDown
        expr: blockcypher_api_errors_total > 10
        for: 5m
        annotations:
          summary: "BlockCypher API errors detected"

      - alert: WithdrawalFailureRate
        expr: wallet_withdrawals_failed_total / wallet_withdrawals_total > 0.05
        for: 10m
        annotations:
          summary: "Withdrawal failure rate > 5%"
```

---

## Rollback Plan

If BlockCypher API becomes unavailable:

1. **Immediate (0-5 min)**
   - Enable maintenance mode
   - Display message: "Deposits/withdrawals temporarily unavailable"
   - Alert on-call engineer

2. **Short-term (5-30 min)**
   - Failover to backup API provider (e.g., Blockchain.com API)
   - Or temporarily disable deposits/withdrawals until resolved

3. **Long-term (>30 min)**
   - Escalate to Phase 2: Provision local nodes
   - This should be completed within 72 hours

---

## References

- BlockCypher API Docs: https://www.blockcypher.com/dev/bitcoin/
- BIP44 Derivation: https://github.com/trezor/slips/blob/master/slip-0044.md
- Bitcoin Testnet Faucet: https://testnet-faucet.mempool.space/
- Ethereum Goerli Faucet: https://goerlifaucet.com/

---

**Document Owner:** DevOps Lead
**Last Updated:** 2025-11-20
**Next Review:** 2025-12-15 (Post-MVP evaluation)
