# Kurumsal Kripto Varlık Borsası Platformu
## SDK Development Guide

**Version:** 1.0  
**Last Updated:** 2025-11-19  
**Purpose:** Guide for building client SDKs  
**Target:** SDK Developers, Integration Partners

---

## 📋 Overview

Bu doküman, Kripto Varlık Borsası API'si için client SDK (Software Development Kit) geliştirme sürecini anlatır.

### SDK Goals

1. **Developer Experience:** Kolay kullanım, minimal boilerplate
2. **Type Safety:** Strong typing, auto-completion
3. **Error Handling:** Descriptive errors, retry logic
4. **Best Practices:** Rate limiting, connection pooling, caching
5. **Documentation:** Comprehensive examples, API reference

### Supported Languages (Priority)

1. 🟢 **JavaScript/TypeScript** (Web, Node.js)
2. 🟢 **Python** (Backend, Data Science)
3. 🟡 **Java** (Enterprise, Android)
4. 🟡 **C#** (Enterprise, .NET)
5. 🔵 **Go** (Backend, Performance-critical)

---

## 🏗️ SDK Architecture

### Core Components

```
SDK
├── Client (Main entry point)
├── Auth Module
│   ├── Login
│   ├── Logout
│   ├── Refresh Token
│   └── Token Storage
├── Resources (API endpoints)
│   ├── Markets
│   ├── Orders
│   ├── Wallets
│   ├── Users
│   └── Admin
├── WebSocket Client
│   ├── Connection Management
│   ├── Subscription Management
│   └── Reconnection Logic
├── HTTP Client (Low-level)
│   ├── Request Builder
│   ├── Response Parser
│   ├── Error Handler
│   └── Retry Logic
├── Utils
│   ├── Decimal Handling
│   ├── Timestamp Conversion
│   └── Request Signing
└── Types/Models
    ├── Order
    ├── Trade
    ├── Balance
    └── ...
```

---

## 📝 Design Principles

### 1. Fluent API (Method Chaining)

```typescript
// ✅ GOOD: Fluent, readable
const client = new CryptoClient({
  apiKey: 'xxx',
  apiSecret: 'yyy'
})
  .setBaseUrl('https://api.yourbank.com')
  .setTimeout(30000)
  .enableRetry(3);

const order = await client.orders
  .create('BTCTRY', 'BUY', 'MARKET', '0.01')
  .execute();
```

### 2. Resource-Based Organization

```typescript
// ✅ GOOD: Organized by resource
client.markets.getTicker('BTCTRY');
client.orders.create(...);
client.wallets.getBalances();

// ❌ BAD: Flat namespace
client.getTicker('BTCTRY');
client.createOrder(...);
client.getBalances();
```

### 3. Strong Typing

```typescript
// ✅ GOOD: Type-safe
interface Order {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  status: 'NEW' | 'FILLED' | 'CANCELED';
  // ...
}

const order: Order = await client.orders.get('ord_123');

// ❌ BAD: Any type
const order: any = await client.orders.get('ord_123');
```

### 4. Error Handling

```typescript
// ✅ GOOD: Descriptive errors
try {
  await client.orders.create('BTCTRY', 'BUY', 'MARKET', '0.01');
} catch (error) {
  if (error instanceof InsufficientBalanceError) {
    console.log(`Need ${error.required}, have ${error.available}`);
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited, retry after ${error.retryAfter}s`);
  }
}
```

### 5. Async/Await by Default

```typescript
// ✅ GOOD: Modern async/await
const ticker = await client.markets.getTicker('BTCTRY');

// ❌ BAD: Callback hell (avoid unless language limitation)
client.markets.getTicker('BTCTRY', (err, ticker) => {
  // ...
});
```

---

## 🔧 Implementation Guide

### TypeScript/JavaScript SDK

#### Project Structure

```
crypto-sdk-ts/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── client.ts                # CryptoClient class
│   ├── auth/
│   │   ├── index.ts
│   │   └── token-storage.ts
│   ├── resources/
│   │   ├── markets.ts
│   │   ├── orders.ts
│   │   ├── wallets.ts
│   │   └── index.ts
│   ├── websocket/
│   │   └── client.ts
│   ├── http/
│   │   ├── client.ts
│   │   ├── request.ts
│   │   └── response.ts
│   ├── errors/
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── decimal.ts
│       └── signing.ts
├── tests/
│   ├── unit/
│   └── integration/
├── examples/
│   ├── basic-usage.ts
│   ├── websocket.ts
│   └── advanced.ts
├── docs/
│   └── api-reference.md
├── package.json
├── tsconfig.json
└── README.md
```

#### Core Client Implementation

```typescript
// src/client.ts
import axios, { AxiosInstance } from 'axios';
import { Markets } from './resources/markets';
import { Orders } from './resources/orders';
import { Wallets } from './resources/wallets';
import { TokenStorage } from './auth/token-storage';

export interface CryptoClientConfig {
  baseUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  timeout?: number;
  maxRetries?: number;
}

export class CryptoClient {
  private http: AxiosInstance;
  private tokenStorage: TokenStorage;
  
  public markets: Markets;
  public orders: Orders;
  public wallets: Wallets;
  
  constructor(config: CryptoClientConfig = {}) {
    const {
      baseUrl = 'https://api.yourbank.com',
      timeout = 30000,
      maxRetries = 3
    } = config;
    
    // Create HTTP client
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': 'crypto-sdk-ts/1.0.0'
      }
    });
    
    // Setup interceptors
    this.setupInterceptors(maxRetries);
    
    // Initialize token storage
    this.tokenStorage = new TokenStorage();
    
    // Initialize resources
    this.markets = new Markets(this.http);
    this.orders = new Orders(this.http, this.tokenStorage);
    this.wallets = new Wallets(this.http, this.tokenStorage);
  }
  
  private setupInterceptors(maxRetries: number): void {
    // Request interceptor (add auth token)
    this.http.interceptors.request.use(
      async (config) => {
        const token = await this.tokenStorage.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Response interceptor (handle errors, retry)
    this.http.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Handle 401 (token expired)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.refreshToken();
            return this.http(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }
        
        // Handle 429 (rate limit)
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
          
          if (originalRequest._retryCount < maxRetries) {
            originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
            
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            return this.http(originalRequest);
          }
        }
        
        return Promise.reject(this.handleError(error));
      }
    );
  }
  
  private handleError(error: any): Error {
    if (error.response) {
      const { code, message, details } = error.response.data.error || {};
      
      // Map API error codes to SDK error classes
      switch (code) {
        case 'INSUFFICIENT_BALANCE':
          return new InsufficientBalanceError(message, details);
        case 'RATE_LIMIT_EXCEEDED':
          return new RateLimitError(message, details);
        // ... more error types
        default:
          return new APIError(code, message, details);
      }
    }
    
    return error;
  }
  
  async login(email: string, password: string): Promise<void> {
    const response = await this.http.post('/api/v1/auth/login', {
      email,
      password
    });
    
    const { accessToken, refreshToken } = response.data.data;
    await this.tokenStorage.setTokens(accessToken, refreshToken);
  }
  
  async refreshToken(): Promise<void> {
    const refreshToken = await this.tokenStorage.getRefreshToken();
    
    const response = await this.http.post('/api/v1/auth/refresh', {
      refreshToken
    });
    
    const { accessToken } = response.data.data;
    await this.tokenStorage.setAccessToken(accessToken);
  }
  
  async logout(): Promise<void> {
    const refreshToken = await this.tokenStorage.getRefreshToken();
    
    await this.http.post('/api/v1/auth/logout', {
      refreshToken
    });
    
    await this.tokenStorage.clearTokens();
  }
}
```

#### Resource Implementation Example

```typescript
// src/resources/orders.ts
import { AxiosInstance } from 'axios';
import { TokenStorage } from '../auth/token-storage';
import { Order, OrderCreateParams, OrderListParams } from '../types';

export class Orders {
  constructor(
    private http: AxiosInstance,
    private tokenStorage: TokenStorage
  ) {}
  
  async create(params: OrderCreateParams): Promise<Order> {
    const response = await this.http.post('/api/v1/orders', params);
    return response.data.data;
  }
  
  async get(orderId: string): Promise<Order> {
    const response = await this.http.get(`/api/v1/orders/${orderId}`);
    return response.data.data;
  }
  
  async list(params?: OrderListParams): Promise<Order[]> {
    const response = await this.http.get('/api/v1/orders', { params });
    return response.data.data;
  }
  
  async cancel(orderId: string): Promise<Order> {
    const response = await this.http.delete(`/api/v1/orders/${orderId}`);
    return response.data.data;
  }
}
```

#### Type Definitions

```typescript
// src/types/order.ts
export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus = 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';

export interface Order {
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price?: string;
  quantity: string;
  status: OrderStatus;
  timeInForce?: TimeInForce;
  executedQuantity: string;
  remainingQuantity: string;
  averagePrice?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderCreateParams {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: string;
  price?: string;
  timeInForce?: TimeInForce;
  clientOrderId?: string;
}

export interface OrderListParams {
  symbol?: string;
  status?: OrderStatus;
  page?: number;
  pageSize?: number;
}
```

#### WebSocket Client

```typescript
// src/websocket/client.ts
import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface WebSocketClientConfig {
  url: string;
  token?: string;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export class WebSocketClient extends EventEmitter {
  private ws?: WebSocket;
  private subscriptions: Set<string> = new Set();
  private reconnecting: boolean = false;
  
  constructor(private config: WebSocketClientConfig) {
    super();
  }
  
  connect(): void {
    this.ws = new WebSocket(this.config.url);
    
    this.ws.on('open', () => {
      this.emit('connected');
      
      // Re-subscribe to channels after reconnect
      this.subscriptions.forEach(channel => {
        this.sendSubscribe(channel);
      });
    });
    
    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      this.handleMessage(message);
    });
    
    this.ws.on('error', (error) => {
      this.emit('error', error);
    });
    
    this.ws.on('close', () => {
      this.emit('disconnected');
      
      if (this.config.reconnect && !this.reconnecting) {
        this.reconnect();
      }
    });
  }
  
  private reconnect(): void {
    this.reconnecting = true;
    
    setTimeout(() => {
      this.reconnecting = false;
      this.connect();
    }, this.config.reconnectInterval || 5000);
  }
  
  subscribe(channel: string, params?: any): void {
    this.subscriptions.add(channel);
    this.sendSubscribe(channel, params);
  }
  
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({
      method: 'UNSUBSCRIBE',
      params: { channel }
    });
  }
  
  private sendSubscribe(channel: string, params?: any): void {
    this.send({
      method: 'SUBSCRIBE',
      params: {
        channel,
        auth: this.config.token ? { token: this.config.token } : undefined,
        ...params
      }
    });
  }
  
  private send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
  
  private handleMessage(message: any): void {
    const { channel, data } = message;
    
    if (channel) {
      this.emit(`message:${channel}`, data);
    }
    
    this.emit('message', message);
  }
  
  close(): void {
    this.ws?.close();
  }
}
```

#### Usage Examples

```typescript
// examples/basic-usage.ts
import { CryptoClient } from 'crypto-sdk-ts';

async function main() {
  const client = new CryptoClient({
    baseUrl: 'https://api.yourbank.com'
  });
  
  // Login
  await client.login('user@example.com', 'password');
  
  // Get markets
  const markets = await client.markets.list();
  console.log('Markets:', markets);
  
  // Get ticker
  const ticker = await client.markets.getTicker('BTCTRY');
  console.log('BTC/TRY:', ticker.lastPrice);
  
  // Get balances
  const balances = await client.wallets.getBalances();
  console.log('Balances:', balances);
  
  // Place order
  try {
    const order = await client.orders.create({
      symbol: 'BTCTRY',
      side: 'BUY',
      type: 'MARKET',
      quantity: '0.001'
    });
    console.log('Order placed:', order.orderId);
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      console.error('Insufficient balance!');
    }
  }
  
  // Logout
  await client.logout();
}

main();
```

```typescript
// examples/websocket.ts
import { CryptoClient } from 'crypto-sdk-ts';

async function main() {
  const client = new CryptoClient();
  await client.login('user@example.com', 'password');
  
  // Create WebSocket client
  const ws = client.createWebSocketClient();
  
  ws.on('connected', () => {
    console.log('WebSocket connected');
    
    // Subscribe to ticker
    ws.subscribe('ticker', { symbol: 'BTCTRY' });
    
    // Subscribe to orderbook
    ws.subscribe('orderbook', { symbol: 'BTCTRY', depth: 20 });
  });
  
  ws.on('message:ticker', (data) => {
    console.log('Ticker update:', data);
  });
  
  ws.on('message:orderbook', (data) => {
    console.log('Orderbook update:', data);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  ws.connect();
}

main();
```

---

### Python SDK

#### Project Structure

```
crypto-sdk-py/
├── crypto_sdk/
│   ├── __init__.py
│   ├── client.py
│   ├── auth/
│   │   ├── __init__.py
│   │   └── token_storage.py
│   ├── resources/
│   │   ├── __init__.py
│   │   ├── markets.py
│   │   ├── orders.py
│   │   └── wallets.py
│   ├── websocket/
│   │   └── client.py
│   ├── http/
│   │   └── client.py
│   ├── errors.py
│   ├── types.py
│   └── utils/
│       └── decimal.py
├── tests/
├── examples/
├── docs/
├── setup.py
├── requirements.txt
└── README.md
```

#### Core Client Implementation

```python
# crypto_sdk/client.py
import requests
from typing import Optional
from .auth.token_storage import TokenStorage
from .resources.markets import Markets
from .resources.orders import Orders
from .resources.wallets import Wallets
from .errors import APIError, InsufficientBalanceError, RateLimitError

class CryptoClient:
    def __init__(
        self,
        base_url: str = 'https://api.yourbank.com',
        timeout: int = 30,
        max_retries: int = 3
    ):
        self.base_url = base_url
        self.timeout = timeout
        self.max_retries = max_retries
        
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'X-Client-Version': 'crypto-sdk-py/1.0.0'
        })
        
        self.token_storage = TokenStorage()
        
        # Initialize resources
        self.markets = Markets(self)
        self.orders = Orders(self)
        self.wallets = Wallets(self)
    
    def request(
        self,
        method: str,
        path: str,
        params: Optional[dict] = None,
        json: Optional[dict] = None,
        authenticated: bool = False
    ) -> dict:
        url = f"{self.base_url}{path}"
        
        headers = {}
        if authenticated:
            token = self.token_storage.get_access_token()
            if token:
                headers['Authorization'] = f'Bearer {token}'
        
        for attempt in range(self.max_retries):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    params=params,
                    json=json,
                    headers=headers,
                    timeout=self.timeout
                )
                
                response.raise_for_status()
                return response.json()
                
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 401 and authenticated and attempt == 0:
                    # Token expired, try refresh
                    self.refresh_token()
                    token = self.token_storage.get_access_token()
                    headers['Authorization'] = f'Bearer {token}'
                    continue
                
                if e.response.status_code == 429:
                    # Rate limited
                    retry_after = int(e.response.headers.get('Retry-After', 60))
                    if attempt < self.max_retries - 1:
                        import time
                        time.sleep(retry_after)
                        continue
                
                raise self._handle_error(e.response)
        
        raise APIError('MAX_RETRIES_EXCEEDED', 'Maximum retry attempts reached')
    
    def _handle_error(self, response):
        try:
            error_data = response.json().get('error', {})
            code = error_data.get('code')
            message = error_data.get('message')
            details = error_data.get('details')
            
            if code == 'INSUFFICIENT_BALANCE':
                return InsufficientBalanceError(message, details)
            elif code == 'RATE_LIMIT_EXCEEDED':
                return RateLimitError(message, details)
            else:
                return APIError(code, message, details)
        except:
            return APIError('UNKNOWN_ERROR', str(response.content))
    
    def login(self, email: str, password: str) -> None:
        response = self.request(
            'POST',
            '/api/v1/auth/login',
            json={'email': email, 'password': password}
        )
        
        data = response['data']
        self.token_storage.set_tokens(
            data['accessToken'],
            data['refreshToken']
        )
    
    def refresh_token(self) -> None:
        refresh_token = self.token_storage.get_refresh_token()
        
        response = self.request(
            'POST',
            '/api/v1/auth/refresh',
            json={'refreshToken': refresh_token}
        )
        
        self.token_storage.set_access_token(response['data']['accessToken'])
    
    def logout(self) -> None:
        refresh_token = self.token_storage.get_refresh_token()
        
        self.request(
            'POST',
            '/api/v1/auth/logout',
            json={'refreshToken': refresh_token}
        )
        
        self.token_storage.clear_tokens()
```

#### Resource Implementation

```python
# crypto_sdk/resources/orders.py
from typing import List, Optional
from ..types import Order, OrderCreateParams

class Orders:
    def __init__(self, client):
        self.client = client
    
    def create(self, params: OrderCreateParams) -> Order:
        response = self.client.request(
            'POST',
            '/api/v1/orders',
            json=params,
            authenticated=True
        )
        return Order(**response['data'])
    
    def get(self, order_id: str) -> Order:
        response = self.client.request(
            'GET',
            f'/api/v1/orders/{order_id}',
            authenticated=True
        )
        return Order(**response['data'])
    
    def list(
        self,
        symbol: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> List[Order]:
        params = {
            'page': page,
            'pageSize': page_size
        }
        if symbol:
            params['symbol'] = symbol
        if status:
            params['status'] = status
        
        response = self.client.request(
            'GET',
            '/api/v1/orders',
            params=params,
            authenticated=True
        )
        
        return [Order(**item) for item in response['data']]
    
    def cancel(self, order_id: str) -> Order:
        response = self.client.request(
            'DELETE',
            f'/api/v1/orders/{order_id}',
            authenticated=True
        )
        return Order(**response['data'])
```

#### Type Definitions (Pydantic)

```python
# crypto_sdk/types.py
from pydantic import BaseModel
from typing import Optional, Literal
from decimal import Decimal

OrderSide = Literal['BUY', 'SELL']
OrderType = Literal['MARKET', 'LIMIT']
OrderStatus = Literal['NEW', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED', 'REJECTED']

class Order(BaseModel):
    order_id: str
    client_order_id: Optional[str]
    symbol: str
    side: OrderSide
    type: OrderType
    price: Optional[Decimal]
    quantity: Decimal
    status: OrderStatus
    executed_quantity: Decimal
    remaining_quantity: Decimal
    average_price: Optional[Decimal]
    created_at: str
    updated_at: str

class OrderCreateParams(BaseModel):
    symbol: str
    side: OrderSide
    type: OrderType
    quantity: Decimal
    price: Optional[Decimal]
    time_in_force: Optional[str]
    client_order_id: Optional[str]
```

#### Usage Example

```python
# examples/basic_usage.py
from crypto_sdk import CryptoClient
from crypto_sdk.errors import InsufficientBalanceError

def main():
    client = CryptoClient(base_url='https://api.yourbank.com')
    
    # Login
    client.login('user@example.com', 'password')
    
    # Get markets
    markets = client.markets.list()
    print('Markets:', markets)
    
    # Get ticker
    ticker = client.markets.get_ticker('BTCTRY')
    print(f"BTC/TRY: {ticker.last_price}")
    
    # Get balances
    balances = client.wallets.get_balances()
    print('Balances:', balances)
    
    # Place order
    try:
        order = client.orders.create({
            'symbol': 'BTCTRY',
            'side': 'BUY',
            'type': 'MARKET',
            'quantity': '0.001'
        })
        print(f"Order placed: {order.order_id}")
    except InsufficientBalanceError as e:
        print('Insufficient balance!')
    
    # Logout
    client.logout()

if __name__ == '__main__':
    main()
```

---

## 📚 Documentation Requirements

### 1. README.md

**Must Include:**
- Installation instructions
- Quick start example
- Link to full documentation
- Support/contact information
- License

```markdown
# Crypto SDK for TypeScript/JavaScript

Official TypeScript/JavaScript SDK for Crypto Exchange API.

## Installation

```bash
npm install crypto-sdk-ts
```

## Quick Start

```typescript
import { CryptoClient } from 'crypto-sdk-ts';

const client = new CryptoClient();
await client.login('email', 'password');

const ticker = await client.markets.getTicker('BTCTRY');
console.log(ticker.lastPrice);
```

## Documentation

Full documentation: https://docs.yourbank.com/sdk/typescript

## Support

- Email: sdk-support@yourbank.com
- Issues: https://github.com/yourbank/crypto-sdk-ts/issues

## License

MIT
```

### 2. API Reference (Auto-generated)

Use documentation generators:
- **TypeScript:** TypeDoc
- **Python:** Sphinx
- **Java:** Javadoc
- **C#:** DocFX

### 3. Examples

Comprehensive examples for:
- Authentication
- Market data
- Order placement
- WebSocket usage
- Error handling
- Advanced patterns

---

## ✅ SDK Checklist

### Feature Completeness

- [ ] Authentication (login, logout, refresh)
- [ ] All resource endpoints (markets, orders, wallets)
- [ ] WebSocket support
- [ ] Error handling (all error types)
- [ ] Retry logic
- [ ] Rate limiting awareness
- [ ] Request signing (if applicable)
- [ ] Pagination support
- [ ] Type safety (TypeScript, Python type hints)

### Code Quality

- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] Code linting (ESLint, Pylint)
- [ ] Code formatting (Prettier, Black)
- [ ] TypeScript strict mode enabled
- [ ] No security vulnerabilities (npm audit, safety)

### Documentation

- [ ] README with quick start
- [ ] API reference (auto-generated)
- [ ] Examples (at least 5 scenarios)
- [ ] Changelog
- [ ] Migration guide (for breaking changes)

### Publishing

- [ ] Package name reserved (npm, PyPI)
- [ ] CI/CD setup (automated testing, publishing)
- [ ] Semantic versioning
- [ ] Release notes

---

## 🚀 Publishing Process

### NPM (TypeScript/JavaScript)

```bash
# Build
npm run build

# Test
npm test

# Publish (dry-run first)
npm publish --dry-run

# Publish
npm publish

# Tag git release
git tag v1.0.0
git push origin v1.0.0
```

### PyPI (Python)

```bash
# Build
python setup.py sdist bdist_wheel

# Test upload (TestPyPI)
twine upload --repository testpypi dist/*

# Production upload
twine upload dist/*

# Tag git release
git tag v1.0.0
git push origin v1.0.0
```

---

## 📊 Metrics & Analytics

### SDK Usage Tracking

```typescript
// Optional: Anonymous usage tracking (with user consent)
class CryptoClient {
  constructor(config: CryptoClientConfig) {
    // ...
    if (config.enableAnalytics !== false) {
      this.analytics = new SDKAnalytics();
    }
  }
  
  private trackEvent(eventName: string, properties?: any): void {
    if (this.analytics) {
      this.analytics.track(eventName, {
        ...properties,
        sdk_version: SDK_VERSION,
        language: 'typescript',
        platform: process.platform
      });
    }
  }
}
```

**Track:**
- SDK initialization
- Method calls (orders.create, etc.)
- Errors encountered
- Performance metrics (API latency)

**Privacy:**
- No PII (personally identifiable information)
- User consent required
- Opt-out option

---

## 🔄 Maintenance & Updates

### Release Cycle

| Type | Frequency | Contents |
|------|-----------|----------|
| **Patch** | As needed | Bug fixes, security patches |
| **Minor** | Monthly | New features, backward compatible |
| **Major** | Quarterly | Breaking changes |

### Breaking Changes Process

1. **Announce:** 3 months before
2. **Deprecation:** Mark as deprecated, add warnings
3. **Migration Guide:** Provide detailed guide
4. **Support:** Support old version for 6 months

---

## 📚 Related Documents

- [API Specification](./crypto-exchange-api-spec-complete.md)
- [Integration Guide](./integration-guide.md)
- [Technical Architecture](./crypto-exchange-architecture.md)

---

**Document Owner:** SDK Team  
**Review Frequency:** Quarterly  
**Next Review Date:** 2026-02-19