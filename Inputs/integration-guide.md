# Kurumsal Kripto Varlık Borsası Platformu
## Integration Guide for Developers

**Version:** 1.0  
**Last Updated:** 2025-11-19  
**Audience:** Backend Developers, Integration Engineers

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Authentication Flow](#2-authentication-flow)
3. [Your First API Call](#3-your-first-api-call)
4. [Common Integration Patterns](#4-common-integration-patterns)
5. [Code Examples](#5-code-examples)
6. [Testing & Sandbox](#6-testing--sandbox)
7. [Error Handling](#7-error-handling)
8. [Best Practices](#8-best-practices)
9. [Troubleshooting](#9-troubleshooting)
10. [FAQ](#10-faq)

---

## 1. Quick Start

### Prerequisites

Before you begin:
- ✅ You have received API credentials (base URL, API key if server-to-server)
- ✅ You have access to sandbox environment
- ✅ You have test user credentials
- ✅ You understand JWT-based authentication

### Base URLs

```
Production:  https://api.yourbank.com
Sandbox:     https://sandbox-api.yourbank.com
```

### Required Tools

- **API Client:** Postman, Insomnia, or curl
- **Programming Language:** Any (examples in JavaScript, Python, curl)
- **OpenAPI Spec:** Available at `/api/docs/openapi.json`

### 5-Minute Integration Test

```bash
# 1. Test server connectivity
curl https://sandbox-api.yourbank.com/api/v1/public/time

# 2. Login and get JWT token
curl -X POST https://sandbox-api.yourbank.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.user@yourbank.com",
    "password": "TestPassword123!"
  }'

# 3. Use token to get markets
curl https://sandbox-api.yourbank.com/api/v1/markets \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

If all 3 requests succeed → **You're ready to integrate!**

---

## 2. Authentication Flow

### 2.1 User Authentication (JWT)

**Step 1: Register User (One-time)**

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "phoneNumber": "+905551234567"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "usr_abc123",
    "email": "user@example.com",
    "status": "PENDING_VERIFICATION",
    "verificationRequired": ["EMAIL", "PHONE"]
  }
}
```

---

**Step 2: Verify Email**

User receives 6-digit code via email.

```http
POST /api/v1/auth/verify-email
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}
```

---

**Step 3: Login**

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "deviceId": "uuid-of-device"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "expiresIn": 1800,
    "tokenType": "Bearer",
    "user": {
      "userId": "usr_abc123",
      "email": "user@example.com",
      "kycLevel": "LEVEL_0"
    }
  }
}
```

---

**Step 4: Use Access Token**

All subsequent API calls:

```http
GET /api/v1/wallets/balances
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

**Step 5: Refresh Token (when access token expires)**

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_access_token",
    "expiresIn": 1800
  }
}
```

---

### 2.2 Token Lifecycle

```
Register → Verify → Login
                      ↓
                Access Token (15-30 min)
                      ↓
          ┌───────────┴───────────┐
          ↓                       ↓
    Use API Calls          Token Expires?
          ↓                       ↓
      Success               Refresh Token
                                  ↓
                          New Access Token
```

---

### 2.3 Security Best Practices

✅ **Store tokens securely:**
- Never in `localStorage` (vulnerable to XSS)
- Use `httpOnly` cookies or secure memory

✅ **Handle token expiry:**
- Implement automatic token refresh
- Retry failed requests after refresh

✅ **Use HTTPS only:**
- Never send tokens over HTTP

✅ **Device tracking:**
- Always send `deviceId` for suspicious activity detection

---

## 3. Your First API Call

### Scenario: Check BTC/TRY Market Price

**Step 1: Get Market List**

```bash
curl https://sandbox-api.yourbank.com/api/v1/markets \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTCTRY",
      "baseAsset": "BTC",
      "quoteAsset": "TRY",
      "status": "TRADING",
      "minOrderAmount": "100.00",
      "maxOrderAmount": "1000000.00",
      "fees": {
        "maker": "0.001",
        "taker": "0.002"
      }
    }
  ]
}
```

---

**Step 2: Get Current Price (Ticker)**

```bash
curl https://sandbox-api.yourbank.com/api/v1/markets/BTCTRY/ticker
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTCTRY",
    "lastPrice": "1850000.00",
    "bidPrice": "1849500.00",
    "askPrice": "1850500.00",
    "high24h": "1875000.00",
    "low24h": "1825000.00",
    "volume24h": "1250000000.00",
    "priceChange24h": "2.5",
    "timestamp": "2025-11-19T10:30:00Z"
  }
}
```

✅ **Success!** You now know BTC/TRY is trading at ~1,850,000 TRY.

---

## 4. Common Integration Patterns

### Pattern 1: Place a Market Order (Buy BTC)

**Prerequisites:**
- User has TRY balance
- User is logged in (has JWT token)

```bash
curl -X POST https://sandbox-api.yourbank.com/api/v1/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCTRY",
    "side": "BUY",
    "type": "MARKET",
    "quantity": "0.01"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ord_abc123",
    "symbol": "BTCTRY",
    "side": "BUY",
    "type": "MARKET",
    "quantity": "0.01000000",
    "status": "FILLED",
    "averagePrice": "1850000.00",
    "executedQuantity": "0.01000000",
    "createdAt": "2025-11-19T10:30:00Z"
  }
}
```

---

### Pattern 2: Place a Limit Order (Sell BTC)

```bash
curl -X POST https://sandbox-api.yourbank.com/api/v1/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCTRY",
    "side": "SELL",
    "type": "LIMIT",
    "price": "1900000.00",
    "quantity": "0.05",
    "timeInForce": "GTC"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ord_xyz789",
    "symbol": "BTCTRY",
    "side": "SELL",
    "type": "LIMIT",
    "price": "1900000.00",
    "quantity": "0.05000000",
    "status": "NEW",
    "timeInForce": "GTC",
    "createdAt": "2025-11-19T10:30:00Z"
  }
}
```

---

### Pattern 3: Check Order Status

```bash
curl https://sandbox-api.yourbank.com/api/v1/orders/ord_xyz789 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Pattern 4: Cancel Order

```bash
curl -X DELETE https://sandbox-api.yourbank.com/api/v1/orders/ord_xyz789 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Pattern 5: Withdraw BTC

```bash
curl -X POST https://sandbox-api.yourbank.com/api/v1/wallets/BTC/withdraw \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "0.05",
    "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "network": "BTC",
    "twoFactorCode": "123456"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "withdrawalId": "wdr_abc123",
    "asset": "BTC",
    "amount": "0.05000000",
    "fee": "0.0005",
    "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "status": "PENDING_APPROVAL",
    "createdAt": "2025-11-19T10:30:00Z"
  }
}
```

---

## 5. Code Examples

### 5.1 JavaScript (Node.js)

#### Installation

```bash
npm install axios
```

#### Complete Trading Flow

```javascript
const axios = require('axios');

const BASE_URL = 'https://sandbox-api.yourbank.com';
let accessToken = null;

// 1. Login
async function login(email, password) {
  const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
    email,
    password,
    deviceId: 'my-app-device-id'
  });
  
  accessToken = response.data.data.accessToken;
  console.log('✅ Logged in successfully');
  return accessToken;
}

// 2. Get Markets
async function getMarkets() {
  const response = await axios.get(`${BASE_URL}/api/v1/markets`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  console.log('📊 Markets:', response.data.data);
  return response.data.data;
}

// 3. Get Balances
async function getBalances() {
  const response = await axios.get(`${BASE_URL}/api/v1/wallets/balances`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  console.log('💰 Balances:', response.data.data);
  return response.data.data;
}

// 4. Place Order
async function placeOrder(symbol, side, type, quantity, price = null) {
  const orderData = {
    symbol,
    side,
    type,
    quantity
  };
  
  if (type === 'LIMIT' && price) {
    orderData.price = price;
    orderData.timeInForce = 'GTC';
  }
  
  const response = await axios.post(
    `${BASE_URL}/api/v1/orders`,
    orderData,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  console.log('📝 Order placed:', response.data.data);
  return response.data.data;
}

// 5. Error Handling with Retry
async function apiCallWithRetry(apiFunction, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiFunction();
    } catch (error) {
      if (error.response?.status === 401) {
        // Token expired, need to re-login
        console.log('🔄 Token expired, re-logging in...');
        await login('user@example.com', 'password');
        continue;
      }
      
      if (error.response?.status === 429) {
        // Rate limited
        const retryAfter = error.response.headers['retry-after'] || 60;
        console.log(`⏳ Rate limited, waiting ${retryAfter}s...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      throw error; // Other errors, throw immediately
    }
  }
}

// Main execution
async function main() {
  try {
    // Login
    await login('test.user@yourbank.com', 'TestPassword123!');
    
    // Get markets
    await getMarkets();
    
    // Get balances
    await getBalances();
    
    // Place a market order
    await placeOrder('BTCTRY', 'BUY', 'MARKET', '0.01');
    
    // Place a limit order
    await placeOrder('BTCTRY', 'SELL', 'LIMIT', '0.01', '1900000.00');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

main();
```

---

### 5.2 Python

#### Installation

```bash
pip install requests
```

#### Complete Trading Flow

```python
import requests
import time
from typing import Optional

BASE_URL = 'https://sandbox-api.yourbank.com'
access_token = None

def login(email: str, password: str) -> str:
    """Login and get access token"""
    response = requests.post(
        f'{BASE_URL}/api/v1/auth/login',
        json={
            'email': email,
            'password': password,
            'deviceId': 'my-python-app'
        }
    )
    response.raise_for_status()
    
    global access_token
    access_token = response.json()['data']['accessToken']
    print('✅ Logged in successfully')
    return access_token

def get_headers() -> dict:
    """Get authorization headers"""
    return {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

def get_markets():
    """Get all markets"""
    response = requests.get(
        f'{BASE_URL}/api/v1/markets',
        headers=get_headers()
    )
    response.raise_for_status()
    
    markets = response.json()['data']
    print(f'📊 Found {len(markets)} markets')
    return markets

def get_balances():
    """Get user balances"""
    response = requests.get(
        f'{BASE_URL}/api/v1/wallets/balances',
        headers=get_headers()
    )
    response.raise_for_status()
    
    balances = response.json()['data']
    print('💰 Balances:')
    for balance in balances:
        print(f"  {balance['asset']}: {balance['available']} (available)")
    return balances

def place_order(
    symbol: str,
    side: str,
    order_type: str,
    quantity: str,
    price: Optional[str] = None
):
    """Place an order"""
    order_data = {
        'symbol': symbol,
        'side': side,
        'type': order_type,
        'quantity': quantity
    }
    
    if order_type == 'LIMIT' and price:
        order_data['price'] = price
        order_data['timeInForce'] = 'GTC'
    
    response = requests.post(
        f'{BASE_URL}/api/v1/orders',
        json=order_data,
        headers=get_headers()
    )
    response.raise_for_status()
    
    order = response.json()['data']
    print(f"📝 Order placed: {order['orderId']} - {order['status']}")
    return order

def get_order_status(order_id: str):
    """Get order status"""
    response = requests.get(
        f'{BASE_URL}/api/v1/orders/{order_id}',
        headers=get_headers()
    )
    response.raise_for_status()
    return response.json()['data']

def cancel_order(order_id: str):
    """Cancel an order"""
    response = requests.delete(
        f'{BASE_URL}/api/v1/orders/{order_id}',
        headers=get_headers()
    )
    response.raise_for_status()
    print(f"🚫 Order {order_id} canceled")
    return response.json()['data']

def api_call_with_retry(func, *args, max_retries=3, **kwargs):
    """Retry API calls with exponential backoff"""
    for attempt in range(max_retries):
        try:
            return func(*args, **kwargs)
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                # Token expired
                print('🔄 Token expired, re-logging in...')
                login('test.user@yourbank.com', 'TestPassword123!')
                continue
            
            if e.response.status_code == 429:
                # Rate limited
                retry_after = int(e.response.headers.get('Retry-After', 60))
                print(f'⏳ Rate limited, waiting {retry_after}s...')
                time.sleep(retry_after)
                continue
            
            raise  # Other errors
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            wait_time = 2 ** attempt
            print(f'⚠️  Error, retrying in {wait_time}s...')
            time.sleep(wait_time)

# Main execution
def main():
    try:
        # Login
        login('test.user@yourbank.com', 'TestPassword123!')
        
        # Get markets
        markets = get_markets()
        
        # Get balances
        balances = get_balances()
        
        # Place a market order
        order = place_order('BTCTRY', 'BUY', 'MARKET', '0.01')
        
        # Check order status
        time.sleep(1)  # Wait a bit
        status = get_order_status(order['orderId'])
        print(f"📊 Order status: {status['status']}")
        
        # Place a limit order
        limit_order = place_order(
            'BTCTRY', 'SELL', 'LIMIT', 
            '0.01', '1900000.00'
        )
        
        # Cancel the limit order
        time.sleep(1)
        cancel_order(limit_order['orderId'])
        
    except requests.exceptions.RequestException as e:
        print(f'❌ Error: {e.response.json() if e.response else str(e)}')
    except Exception as e:
        print(f'❌ Unexpected error: {str(e)}')

if __name__ == '__main__':
    main()
```

---

### 5.3 cURL Examples

```bash
# Set variables
BASE_URL="https://sandbox-api.yourbank.com"
EMAIL="test.user@yourbank.com"
PASSWORD="TestPassword123!"

# 1. Login
TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.data.accessToken')

echo "Token: $TOKEN"

# 2. Get Markets
curl -s "$BASE_URL/api/v1/markets" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data[] | {symbol, status, fees}'

# 3. Get Balances
curl -s "$BASE_URL/api/v1/wallets/balances" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data[] | {asset, available, locked}'

# 4. Place Market Order
curl -s -X POST "$BASE_URL/api/v1/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCTRY",
    "side": "BUY",
    "type": "MARKET",
    "quantity": "0.01"
  }' | jq '.'

# 5. Get Order History
curl -s "$BASE_URL/api/v1/orders?status=FILLED&page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data[] | {orderId, symbol, side, status, averagePrice}'
```

---

## 6. Testing & Sandbox

### Sandbox Environment

**URL:** `https://sandbox-api.yourbank.com`

**Test Users:**

| Email | Password | KYC Level | Description |
|-------|----------|-----------|-------------|
| `test.level0@yourbank.com` | `Test123!` | LEVEL_0 | No KYC, limited features |
| `test.level1@yourbank.com` | `Test123!` | LEVEL_1 | Basic KYC |
| `test.level2@yourbank.com` | `Test123!` | LEVEL_2 | Full KYC, all features |

**Pre-funded Balances:**
- TRY: 100,000
- BTC: 0.5
- ETH: 10
- USDT: 10,000

**Test Bank Account:**
- IBAN: `TR330006100519786457841326`
- Account Name: "Test Platform"

---

### Testing Checklist

✅ **Authentication:**
- [ ] Register new user
- [ ] Verify email
- [ ] Login and get JWT
- [ ] Refresh token
- [ ] Logout

✅ **Trading:**
- [ ] Get markets list
- [ ] Get ticker data
- [ ] Place market order (buy)
- [ ] Place limit order (sell)
- [ ] Cancel order
- [ ] Get order history

✅ **Wallet:**
- [ ] Get balances
- [ ] Get deposit address
- [ ] Request withdrawal (will stay pending in sandbox)
- [ ] Check withdrawal status

✅ **Error Scenarios:**
- [ ] Invalid credentials (401)
- [ ] Expired token (401)
- [ ] Insufficient balance (400)
- [ ] Invalid order parameters (400)
- [ ] Rate limit exceeded (429)

---

## 7. Error Handling

### Common Error Codes

| Code | HTTP | Description | Action |
|------|------|-------------|--------|
| `AUTH_002` | 401 | Token expired | Refresh token or re-login |
| `TRADE_001` | 400 | Insufficient balance | Check balance, add funds |
| `TRADE_004` | 400 | Market closed | Wait for market open |
| `WALLET_002` | 400 | Withdrawal limit exceeded | Wait or request limit increase |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait per `Retry-After` header |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance for this order",
    "details": {
      "required": "1000.00",
      "available": "750.50",
      "currency": "TRY"
    },
    "traceId": "trace-uuid"
  }
}
```

### Retry Strategy

```javascript
async function retryWithBackoff(apiCall, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      // Don't retry 4xx errors (except 401, 429)
      if (error.response?.status >= 400 && 
          error.response?.status < 500 &&
          error.response?.status !== 401 &&
          error.response?.status !== 429) {
        throw error;
      }
      
      // Calculate wait time (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, i), 30000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## 8. Best Practices

### 8.1 Authentication

✅ **DO:**
- Store tokens securely (encrypted storage, not localStorage)
- Implement automatic token refresh
- Use device tracking (`deviceId`)
- Implement proper logout (token invalidation)

❌ **DON'T:**
- Store tokens in localStorage (XSS vulnerability)
- Share tokens between users
- Log tokens (security risk)
- Hardcode credentials

---

### 8.2 API Calls

✅ **DO:**
- Use HTTPS only
- Check rate limit headers (`X-RateLimit-*`)
- Implement exponential backoff for retries
- Use idempotency keys for critical operations
- Validate responses before processing

❌ **DON'T:**
- Ignore rate limits
- Retry 4xx errors blindly
- Make parallel calls excessively
- Trust user input without validation

---

### 8.3 Order Management

✅ **DO:**
- Always check balance before placing orders
- Use `clientOrderId` for tracking
- Poll order status for completion
- Handle partial fills properly
- Implement order confirmation UI

❌ **DON'T:**
- Place orders without balance check
- Assume instant execution
- Ignore order status changes
- Forget to handle order rejections

---

### 8.4 Decimal Precision

✅ **DO:**
- Use string type for all decimal numbers
- Follow precision rules:
  - Crypto quantity: 8 decimals
  - Fiat amount: 2 decimals
- Validate precision before sending

❌ **DON'T:**
- Use JavaScript `Number` type (precision loss)
- Send more decimals than allowed
- Assume floating point arithmetic is accurate

**Example:**
```javascript
// ❌ BAD
const amount = 0.1 + 0.2; // 0.30000000000000004

// ✅ GOOD
const amount = "0.30000000"; // String, exact
```

---

## 9. Troubleshooting

### Issue 1: "401 Unauthorized" on all requests

**Symptoms:**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_002",
    "message": "Token expired"
  }
}
```

**Solutions:**
1. Check if token is expired (expires in 15-30 min)
2. Implement automatic token refresh
3. Re-login if refresh fails
4. Verify token format: `Bearer <token>`

---

### Issue 2: "429 Too Many Requests"

**Symptoms:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests"
  }
}
```

**Solutions:**
1. Check `X-RateLimit-Remaining` header before calling
2. Respect `Retry-After` header
3. Implement request queue with rate limiting
4. Use WebSocket for real-time data instead of polling

---

### Issue 3: Order not executing

**Possible Causes:**
1. **Insufficient balance:** Check `TRADE_001` error
2. **Market closed:** Check market status
3. **Price out of range:** Limit order price too far from market
4. **Minimum order size:** Below `minOrderAmount`

**Debug Steps:**
```bash
# 1. Check balance
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/v1/wallets/balances"

# 2. Check market status
curl "$BASE_URL/api/v1/markets/BTCTRY/ticker"

# 3. Check order details
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/v1/orders/ORDER_ID"
```

---

### Issue 4: Withdrawal stuck in "PENDING_APPROVAL"

**Explanation:**
Large withdrawals require admin approval for security.

**Solutions:**
1. Wait for admin review (typically <24 hours)
2. Check withdrawal status: `GET /api/v1/wallets/withdrawals`
3. Contact support if urgent

---

## 10. FAQ

**Q: How long do access tokens last?**  
**A:** 15-30 minutes. Implement automatic refresh using refresh token (valid for 30 days).

**Q: What's the rate limit?**  
**A:** Varies by endpoint:
- Public endpoints: 100 req/min
- Trading (POST): 50 req/min
- Trading (GET): 200 req/min
- Wallet operations: 30 req/min

**Q: Can I use floating point numbers for amounts?**  
**A:** ❌ No! Always use string type to avoid precision loss.
```javascript
// ❌ BAD: { "amount": 0.01 }
// ✅ GOOD: { "amount": "0.01000000" }
```

**Q: How do I test withdrawals in sandbox?**  
**A:** Withdrawals stay in `PENDING_APPROVAL` in sandbox. They won't be sent to blockchain.

**Q: What happens if my API key is compromised?**  
**A:** Immediately:
1. Logout all sessions: `POST /api/v1/auth/logout`
2. Contact support to rotate API key
3. Change password

**Q: Can I cancel a filled order?**  
**A:** ❌ No. Only `NEW` or `PARTIALLY_FILLED` orders can be canceled.

**Q: How do I know if an order is fully executed?**  
**A:** Check `status` field:
- `FILLED`: Fully executed
- `PARTIALLY_FILLED`: Partially executed, still open
- `NEW`: Not yet executed

**Q: What's the difference between maker and taker fees?**  
**A:**
- **Maker:** You add liquidity (limit order that goes to order book) → Lower fee
- **Taker:** You remove liquidity (market order or limit order that matches immediately) → Higher fee

---

## Next Steps

✅ **You've completed the integration guide!**

**What's next:**
1. 📚 Read the [Complete API Specification](./crypto-exchange-api-spec-complete.md)
2. 🔧 Download [Postman Collection](./postman-collection.json)
3. 📖 Review [OpenAPI Specification](./openapi-specification.yaml)
4. 🏗️  Study [Technical Architecture](./crypto-exchange-architecture.md)
5. 💾 Understand [Database Schema](./crypto-exchange-database-schema-v2.md)

**Need Help?**
- 📧 Technical Support: tech@techsonamy.com
- 📧 Integration Support: integration@techsonamy.com
- 🐛 Bug Reports: bugs@techsonamy.com
- 💬 Developer Chat: Slack channel (invite link from your contact)

---

**Happy Integrating! 🚀**

Techsonamy Platform Team
