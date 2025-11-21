# TRC-20 USDT Support Implementation Plan
**Status:** DEFERRED to Sprint 4
**Estimated Effort:** 2-3 days
**Priority:** MEDIUM (Nice-to-have for MVP)

---

## Current State

**ERC-20 USDT:** ✅ Fully Functional
- Network: Ethereum
- Address Format: `0x...` (42 characters)
- BIP-44 Path: `m/44'/60'/0'/0/{index}`
- Blockchain API: BlockCypher (Ethereum)
- Status: Production Ready

**TRC-20 USDT:** ❌ Not Implemented
- Network: TRON
- Address Format: Base58 (starts with 'T')
- Would need separate implementation

---

## Why TRC-20 is Deferred

### 1. Complexity
- **Different Blockchain:** TRON ≠ Ethereum (completely different protocols)
- **Different APIs:** Requires TronGrid/TronScan instead of BlockCypher
- **Different Address Generation:** Base58 encoding vs Ethereum hex
- **Different Smart Contract:** TRON's USDT contract ≠ Ethereum's

### 2. Development Effort
- HD Wallet modifications for TRON (BIP-44 path `m/44'/195'/0'/0/`)
- TronGrid API integration
- TRON address validation
- Separate blockchain monitoring service
- Database schema updates (add network field)
- DTO changes (network selection)
- Testing across two networks

### 3. MVP Priorities
- **ERC-20 USDT works** - Users can deposit USDT
- **Users can deposit ETH** - Alternative if USDT fees high
- **Users can deposit BTC** - Most popular cryptocurrency
- TRC-20 is a convenience feature, not a blocker

### 4. Market Reality
- Most exchanges started with ERC-20 only
- ERC-20 USDT has higher liquidity
- TRC-20 mainly benefits users in regions with high ETH gas fees
- Can be added later based on user feedback

---

## Implementation Plan (Sprint 4+)

### Phase 1: Requirements Gathering
- [ ] Survey users - is TRC-20 needed?
- [ ] Analyze gas fee trends (if ETH fees low, TRC-20 less important)
- [ ] Check competitor offerings
- [ ] Estimate transaction volume split (ERC-20 vs TRC-20)

### Phase 2: Technical Design
- [ ] Choose TRON API provider (TronGrid, TronScan, or self-hosted node)
- [ ] Design database schema changes
  ```sql
  ALTER TABLE blockchain_addresses
  ADD COLUMN network VARCHAR(20); -- 'ERC20' or 'TRC20'

  ALTER TABLE blockchain_transactions
  ADD COLUMN network VARCHAR(20);
  ```
- [ ] Update DTO for network selection
  ```typescript
  export class GenerateAddressDto {
    @IsEnum(['BTC', 'ETH', 'USDT'])
    currency: string;

    @IsEnum(['ERC20', 'TRC20'])
    @IsOptional()
    network?: string; // Only for USDT
  }
  ```

### Phase 3: HD Wallet Implementation
- [ ] Add TRON address generation to HDWalletService
  ```typescript
  async generateTronAddress(index: number): Promise<TronAddress> {
    // BIP-44 path: m/44'/195'/0'/0/index
    const path = `m/44'/195'/0'/0/${index}`;
    const child = this.masterKey.derivePath(path);

    // TRON uses secp256k1 (same as Bitcoin/Ethereum)
    // But different address encoding (base58)
    const publicKey = child.publicKey;
    const address = this.encodeBase58Check(publicKey);

    return { address, publicKey, derivationPath: path };
  }
  ```

### Phase 4: TronGrid Integration
- [ ] Create TronGridService (similar to BlockCypherService)
  ```typescript
  @Injectable()
  export class TronGridService {
    async getTransaction(txHash: string): Promise<TronTransaction> {
      // GET https://api.trongrid.io/v1/transactions/{txHash}
    }

    async registerWebhook(address: string): Promise<string> {
      // TronGrid event subscription
    }

    async getUsdtBalance(address: string): Promise<string> {
      // Query USDT TRC-20 contract
    }
  }
  ```

### Phase 5: Service Layer Updates
- [ ] Update CryptoDepositService
  - Handle network selection
  - Route to correct blockchain service (BlockCypher vs TronGrid)
  - Process TRON webhooks differently
- [ ] Update validation logic
  - Ensure network matches currency (network only for USDT)
  - Validate TRON address format (base58, starts with 'T')

### Phase 6: Database & API
- [ ] Run migrations to add network column
- [ ] Update OpenAPI documentation
- [ ] Add network filter to deposit history
- [ ] Update QR codes to show network type

### Phase 7: Testing
- [ ] Unit tests for TRON address generation
- [ ] Unit tests for TronGridService
- [ ] Integration tests for TRC-20 deposits
- [ ] E2E tests on TRON testnet (Shasta)
- [ ] Manual testing with real USDT transfers

### Phase 8: Deployment
- [ ] Configure TronGrid API credentials
- [ ] Test on staging with testnet
- [ ] Monitor first production deposits carefully
- [ ] Set up alerts for TRON network issues

---

## Technical Considerations

### Dependencies to Add
```json
{
  "tronweb": "^5.3.0",  // TRON JavaScript SDK
  "bs58check": "^2.1.2"  // Base58 encoding
}
```

### Environment Variables
```bash
# TronGrid API
TRONGRID_API_KEY=your_api_key
TRONGRID_API_URL=https://api.trongrid.io

# TRON Network
TRON_NETWORK=mainnet  # or shasta for testnet

# USDT TRC-20 Contract Address
USDT_TRC20_CONTRACT=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
```

### TRON vs Ethereum Differences

| Feature | Ethereum (ERC-20) | TRON (TRC-20) |
|---------|-------------------|---------------|
| Address Format | 0x + 40 hex chars | Base58 (34 chars), starts with 'T' |
| Block Time | ~12 seconds | ~3 seconds |
| Confirmations | 12 blocks | 19 blocks (recommended) |
| Transaction Fee | Gas (ETH) | Energy/Bandwidth (TRX) |
| API Provider | BlockCypher | TronGrid |
| Smart Contract Lang | Solidity | Solidity (compatible) |

---

## Risks & Mitigation

### Risk 1: TRON Node Reliability
- **Mitigation:** Use TronGrid (official, stable) or run own node
- **Fallback:** TronScan API as backup

### Risk 2: Different Fee Structure
- **Issue:** TRON uses Energy/Bandwidth instead of gas
- **Mitigation:** Pre-calculate fees, warn users about minimum TRX balance

### Risk 3: Smart Contract Differences
- **Issue:** TRC-20 token interface slightly different from ERC-20
- **Mitigation:** Thoroughly test token balance queries and transfers

### Risk 4: Lower Liquidity
- **Issue:** TRC-20 USDT might have lower off-ramp options
- **Mitigation:** Document clearly which network users are using

---

## Acceptance Criteria (When Implemented)

- [ ] User can select "TRC-20" or "ERC-20" when generating USDT address
- [ ] TRON address generated correctly (starts with 'T')
- [ ] QR code displays TRON address
- [ ] Blockchain monitors TRON network for deposits
- [ ] Deposits credited after 19 confirmations
- [ ] Transaction history shows network type
- [ ] Fees are reasonable (< 1 TRX per transaction)
- [ ] No mixing of ERC-20 and TRC-20 funds
- [ ] Error messages explain network mismatch
- [ ] Test coverage > 60%

---

## Cost-Benefit Analysis

### Benefits
- Lower transaction fees for users (~$1 TRC-20 vs ~$5-20 ERC-20)
- Faster confirmations (3s blocks vs 12s blocks)
- Competitive feature parity with major exchanges
- Better UX in high-gas-fee periods

### Costs
- 2-3 developer days
- Ongoing TronGrid API costs (if paid tier needed)
- Additional testing complexity
- Support burden (users confused about networks)
- Maintenance of two blockchain integrations

### Verdict
**DEFER** - Implement only if:
1. User demand is high (>20% of users request it)
2. ETH gas fees consistently > $10
3. Competitors all offer TRC-20
4. Development capacity available post-MVP

---

## Alternative Solutions

### Option 1: ERC-20 Only (Current)
- **Pros:** Simple, works, most users understand Ethereum
- **Cons:** High fees during network congestion

### Option 2: Recommend Native Crypto
- **Pros:** Direct deposits (ETH, BTC) have no network confusion
- **Cons:** Users specifically want stablecoins

### Option 3: Lightning Network (BTC)
- **Pros:** Instant, low fees for BTC transfers
- **Cons:** Even more complex than TRC-20, less adoption

### Option 4: Layer 2 Solutions (Polygon, Arbitrum)
- **Pros:** Lower fees, ERC-20 compatible
- **Cons:** Requires different infrastructure, lower awareness

---

## Decision Log

**2024-11-21:** Decided to DEFER TRC-20 implementation
- **By:** Development Team (Sprint 3 Review)
- **Reason:** ERC-20 sufficient for MVP, complexity not justified
- **Reconsider When:** User feedback indicates demand OR ETH gas > $15 sustained

---

## References

- TRON Documentation: https://developers.tron.network/
- TronGrid API: https://www.trongrid.io/
- TronWeb SDK: https://github.com/tronprotocol/tronweb
- USDT TRC-20 Contract: https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
- BIP-44 TRON: Coin type 195

---

**Status:** 📋 PLANNED - Implementation guide ready for Sprint 4+
**Next Action:** Gather user feedback on network preferences
