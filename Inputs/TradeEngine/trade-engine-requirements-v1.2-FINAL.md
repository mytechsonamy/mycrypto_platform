# TRADE ENGINE - GEREKSİNİM ANALİZİ

**Proje:** MyTrader White-Label Kripto Exchange Platform  
**Doküman:** Trade Engine Requirements Analysis  
**Versiyon:** 1.2  
**Tarih:** 2024-11-22  
**Hazırlayan:** Techsonamy - Mustafa Yıldırım

---

## 📋 İÇİNDEKİLER

1. Executive Summary
2. Fonksiyonel Gereksinimler
3. Non-Fonksiyonel Gereksinimler
4. Order Types Detayı
5. Matching Algorithm
6. Performance Requirements
7. Risk Management Requirements
8. Data Requirements
9. Integration Points
10. MVP vs Full Feature Matrix
11. Success Criteria

---

## 1. EXECUTIVE SUMMARY

Trade Engine, MyTrader platformunun merkezi bileşenidir. Kullanıcı emirlerini alır, eşleştirir, ve işlemleri gerçekleştirir. Hem simülasyon (paper trading) hem de gerçek broker entegrasyonu için tasarlanmıştır.

**Temel Sorumluluklar:**
- Emir kabul ve validasyon
- Order book yönetimi (in-memory)
- Emir eşleştirme (matching engine)
- Trade kaydı oluşturma ve event üretimi
- Trade event'lerini ilgili servislere yönlendirme
- Real-time WebSocket notifications

**NOT:** Trade Engine, bakiye ve pozisyon yönetimini **direkt yapmaz**. Trade event'lerini üretir; Wallet Service (ledger-based) ve Position Service bu event'leri dinleyerek kendi domain'lerini günceller.

---

## 2. FONKSİYONEL GEREKSİNİMLER

### 2.1 Emir Yönetimi

#### FR-001: Emir Oluşturma
**Öncelik:** P0 (Critical)
**Açıklama:** Kullanıcılar sistem üzerinden emir oluşturabilmelidir.

**Kabul Kriterleri:**
- ✅ Market, Limit, Stop emirleri desteklenmeli
- ✅ Emir parametreleri validasyonu yapılmalı
- ✅ Kullanıcı bakiye kontrolü yapılmalı
- ✅ Minimum/maksimum emir miktarı kontrolü
- ✅ Price tick size validasyonu
- ✅ Response time < 100ms
- ✅ **Idempotency:** Aynı `client_order_id` ile tekrar istek gelirse:
  - Aynı `order_id` dönülmeli (duplicate creation yok)
  - Ya da idempotent conflict hatası (HTTP 409)
  - TTL: 24 saat (client_order_id cache)

**Input Parametreleri:**
```json
{
  "user_id": "string",
  "symbol": "string (BTC/USDT)",
  "side": "BUY | SELL",
  "order_type": "MARKET | LIMIT | STOP",
  "quantity": "decimal",
  "price": "decimal (optional for MARKET)",
  "stop_price": "decimal (optional for STOP)",
  "time_in_force": "GTC | IOC | FOK",
  "client_order_id": "string (REQUIRED for idempotency)"
}
```

**Idempotency Implementation:**
```javascript
// Check cache/DB for existing client_order_id
const existingOrder = await checkClientOrderId(client_order_id, user_id);

if (existingOrder) {
  if (existingOrder.params === requestParams) {
    // Exact duplicate - return existing order
    return { order_id: existingOrder.order_id, status: 'DUPLICATE' };
  } else {
    // Same client_order_id, different params - conflict
    throw new ConflictError('CLIENT_ORDER_ID_ALREADY_EXISTS');
  }
}

// Create new order...
```

**Output:**
```json
{
  "order_id": "uuid",
  "status": "PENDING | REJECTED | DUPLICATE",
  "created_at": "timestamp",
  "error": "string (if rejected)"
}
```

---

#### FR-002: Emir İptali
**Öncelik:** P0 (Critical)
**Açıklama:** Kullanıcılar açık emirlerini iptal edebilmelidir.

**Kabul Kriterleri:**
- ✅ Sadece açık (OPEN/PENDING) emirler iptal edilebilmeli
- ✅ Kısmen gerçekleşmiş emirler iptal edilebilmeli
- ✅ İptal sonrası bakiye serbest bırakılmalı
- ✅ Response time < 50ms

---

#### FR-003: Emir Güncelleme
**Öncelik:** P1 (High)
**Açıklama:** Kullanıcılar açık limit emirlerini güncelleyebilmelidir.

**Kabul Kriterleri:**
- ✅ Sadece fiyat ve miktar güncellenebilmeli
- ✅ Güncelleme = İptal + Yeni Emir (atomic operation)
- ✅ Order book'ta sıra kaybedilmeli (yeni timestamp)

---

#### FR-004: Emir Sorgulama
**Öncelik:** P0 (Critical)
**Açıklama:** Kullanıcılar emir durumunu sorgulayabilmelidir.

**Kabul Kriterleri:**
- ✅ Order ID ile sorgulama
- ✅ User ID ile tüm emirleri listeleme
- ✅ Symbol bazlı filtreleme
- ✅ Status bazlı filtreleme (OPEN, FILLED, CANCELLED, REJECTED)
- ✅ Pagination desteği

---

### 2.2 Order Book Yönetimi

#### FR-005: Order Book Oluşturma
**Öncelik:** P0 (Critical)
**Açıklama:** Her trading pair için order book tutulmalıdır.

**Kabul Kriterleri:**
- ✅ Bid (alış) ve Ask (satış) tarafları ayrı yönetilmeli
- ✅ Price-Time Priority sıralaması
- ✅ Real-time güncellemeler
- ✅ Depth (derinlik) hesaplaması
- ✅ Best bid/ask tracking

**Veri Yapısı:**
```javascript
{
  "symbol": "BTC/USDT",
  "bids": [
    {"price": 50000, "quantity": 1.5, "orders": [...]},
    {"price": 49999, "quantity": 0.8, "orders": [...]}
  ],
  "asks": [
    {"price": 50001, "quantity": 2.1, "orders": [...]},
    {"price": 50002, "quantity": 1.2, "orders": [...]}
  ],
  "last_update": "timestamp"
}
```

---

#### FR-006: Order Book Snapshot
**Öncelik:** P0 (Critical)
**Açıklama:** WebSocket bağlantısı kuran istemcilere snapshot gönderilmelidir.

**Kabul Kriterleri:**
- ✅ İlk bağlantıda tam snapshot
- ✅ Sonrasında incremental updates
- ✅ Depth level configurable (default: 20)
- ✅ Snapshot size < 100KB

---

### 2.3 Emir Eşleştirme (Matching)

#### FR-007: Price-Time Priority Algorithm
**Öncelik:** P0 (Critical)
**Açıklama:** Emirler fiyat-zaman önceliğine göre eşleştirilmelidir.

**Matching Kuralları:**
1. **Fiyat Önceliği:**
   - Buy orders: En yüksek fiyat önce
   - Sell orders: En düşük fiyat önce

2. **Zaman Önceliği:**
   - Aynı fiyatta önce gelen emir önce

3. **Eşleşme Koşulu:**
   - Buy price >= Sell price

**Kabul Kriterleri:**
- ✅ Algoritmik doğruluk %100
- ✅ Matching latency < 10ms
- ✅ Atomic transaction (tüm veya hiç)
- ✅ Partial fills desteklenmeli

---

#### FR-008: Market Order Execution
**Öncelik:** P0 (Critical)
**Açıklama:** Market emirleri anında en iyi fiyattan gerçekleşmelidir.

**Execution Logic:**
1. Order book'tan en iyi fiyatı al
2. Mevcut likiditeyi tüket
3. Miktar tamamlanana kadar sonraki fiyat seviyesine geç
4. Slippage hesapla ve kaydet

**Kabul Kriterleri:**
- ✅ Execution time < 20ms
- ✅ Best execution guarantee
- ✅ Slippage tracking
- ✅ Insufficient liquidity handling

---

#### FR-009: Limit Order Execution
**Öncelik:** P0 (Critical)
**Açıklama:** Limit emirleri belirtilen fiyattan veya daha iyisinden gerçekleşmelidir.

**Execution Logic:**
1. Fiyat kontrolü yap
2. Eşleşme varsa hemen gerçekleştir
3. Eşleşme yoksa order book'a ekle
4. Partial fill durumunda kalanı book'a ekle

**Kabul Kriterleri:**
- ✅ Price improvement allowed
- ✅ Book placement time < 50ms
- ✅ Maker fee uygulama
- ✅ Order queue management

---

#### FR-010: Stop Order Execution
**Öncelik:** P1 (High)
**Açıklama:** Stop emirleri tetiklendiğinde market emirine dönüşmelidir.

**Trigger Logic:**
1. Market fiyatı takip et
2. Stop price'a ulaşınca tetikle
3. Market order olarak execute et

**Kabul Kriterleri:**
- ✅ Trigger accuracy %100
- ✅ Conversion to market < 100ms
- ✅ Stop price validation
- ✅ Trailing stop support (Phase 2)

---

### 2.4 Trade Execution

#### FR-011: Trade Gerçekleştirme
**Öncelik:** P0 (Critical)
**Açıklama:** Eşleşen emirler trade olarak kaydedilmelidir.

**Service Ownership:**
- **Trade Engine:** Trade kaydı oluşturma, event üretimi
- **Wallet Service:** Ledger üzerinden bakiye güncelleme
- **Notification Service:** Kullanıcılara bildirim gönderme
- **Risk Service:** Post-trade risk kontrolleri

**Trade Record:**
```json
{
  "trade_id": "uuid",
  "symbol": "BTC/USDT",
  "buyer_order_id": "uuid",
  "seller_order_id": "uuid",
  "buyer_user_id": "uuid",
  "seller_user_id": "uuid",
  "price": "decimal",
  "quantity": "decimal",
  "buyer_fee": "decimal",
  "seller_fee": "decimal",
  "timestamp": "timestamp",
  "is_buyer_maker": "boolean"
}
```

**Execution Flow:**
1. Trade Engine: Match bulur, trade kaydı oluşturur
2. Trade Engine: Trade event publish eder (Kafka)
3. Wallet Service: Event'i dinler, ledger entries oluşturur
4. Notification Service: Kullanıcılara bildirim gönderir
5. Risk Service: Post-trade risk limiti kontrol eder

**Kabul Kriterleri:**
- ✅ Atomic database transaction (trade kaydı)
- ✅ Event-driven bakiye güncellemeleri (async)
- ✅ Fee hesaplama doğru (maker/taker ayrımı)
- ✅ Trade notification real-time (< 200ms)
- ✅ Idempotency garantisi (duplicate trade prevention)

---

#### FR-012: Bakiye Yönetimi
**Öncelik:** P0 (Critical)
**Açıklama:** Kullanıcı bakiyeleri doğru ve tutarlı tutulmalıdır.

**Bakiye Tipleri:**
- **Available Balance:** Kullanılabilir bakiye
- **Reserved Balance:** Açık emirlerde kilitli
- **Total Balance:** Available + Reserved

**Kabul Kriterleri:**
- ✅ Bakiye overflow koruması
- ✅ Negative balance prevention
- ✅ Concurrency control
- ✅ Audit trail

---

#### FR-013: Pozisyon Tracking
**Öncelik:** P1 (High)
**Açıklama:** Kullanıcıların açık pozisyonları takip edilmelidir.

**Position Data:**
```json
{
  "user_id": "uuid",
  "symbol": "BTC/USDT",
  "side": "LONG | SHORT",
  "quantity": "decimal",
  "entry_price": "decimal (avg)",
  "unrealized_pnl": "decimal",
  "realized_pnl": "decimal"
}
```

---

#### FR-014: Admin Market Controls
**Öncelik:** P1 (High)
**Service Owner:** Trade Engine + Admin Service
**Açıklama:** Adminler market'leri kontrol edebilmelidir.

**Admin Capabilities:**

1. **Symbol Management**
```json
PUT /admin/symbols/{symbol}/status
{
  "status": "ACTIVE | HALTED | MAINTENANCE | DELISTED",
  "reason": "string",
  "estimated_resume": "timestamp (optional)"
}
```

2. **Trading Parameters**
```json
PATCH /admin/symbols/{symbol}/config
{
  "tick_size": "0.01",
  "min_order_size": "0.0001",
  "max_order_size": "100",
  "price_band_percentage": "10", // ±10% from last price
  "trading_hours": {
    "start": "00:00",
    "end": "23:59",
    "timezone": "UTC"
  }
}
```

3. **Emergency Controls**
```json
POST /admin/emergency/halt-all
{
  "reason": "SYSTEM_ISSUE | SECURITY_BREACH | REGULATORY",
  "notify_users": true
}

POST /admin/emergency/resume-all
{
  "validation_required": true
}
```

4. **Circuit Breaker Override**
```json
POST /admin/circuit-breaker/{symbol}
{
  "action": "TRIGGER | RESET",
  "duration_minutes": 30,
  "reason": "string"
}
```

**Kabul Kriterleri:**
- ✅ Tüm admin actions audit log'a yazılmalı
- ✅ Multi-factor authentication required
- ✅ Role-based access (SUPER_ADMIN only)
- ✅ Immediate effect (< 1 second propagation)
- ✅ User notification (WebSocket + Email)
- ✅ Graceful degradation (pending orders cancelled)

**Audit Trail:**
```json
{
  "action_id": "uuid",
  "admin_user_id": "uuid",
  "action_type": "HALT_SYMBOL | UPDATE_CONFIG | ...",
  "target": "BTC/USDT",
  "old_value": {...},
  "new_value": {...},
  "reason": "string",
  "timestamp": "timestamp",
  "ip_address": "string"
}
```

---

### 2.5 Simülasyon Modu (Paper Trading)

#### FR-015: Simülasyon Execution
**Öncelik:** P0 (Critical - MVP için)

**Neden P0?**
MyTrader'ın core value proposition ve growth stratejisi paper trading üzerine kurgulanmıştır:
- **User Acquisition:** Kullanıcılar gerçek para riski olmadan strateji test edebilir
- **Product Differentiation:** Bankalar müşterilerine "önce dene, sonra yatır" modeli sunabilir
- **Regulatory Advantage:** KYC tamamlanmadan bile kullanıcı deneyimi başlar
- **Data Collection:** Kullanıcı stratejileri ve behavior'ları analiz edilir
- **Upsell Path:** Paper trading → Real trading conversion

**Açıklama:** Gerçek para kullanmadan trading yapılabilmelidir.

**Simülasyon Kuralları:**
1. Market emirleri bir sonraki bar açılışından execute
2. Limit emirleri fiyat uygunsa execute
3. Stop emirleri tetiklenince market olarak execute
4. Slippage ve fee simülasyonu

**Kabul Kriterleri:**
- ✅ Gerçekçi execution simulation
- ✅ Historical data ile uyumlu
- ✅ Fee ve slippage dahil
- ✅ Simülasyon ve gerçek ayrımı net

---

### 2.6 Real-Time Bildirimler

#### FR-016: WebSocket Events
**Öncelik:** P0 (Critical)
**Açıklama:** Emir ve trade güncellemeleri WebSocket ile gönderilmelidir.

**Event Types:**
```javascript
{
  // Order Update
  "ORDER_CREATED": {order_id, status, ...},
  "ORDER_FILLED": {order_id, fill_quantity, ...},
  "ORDER_PARTIALLY_FILLED": {order_id, filled_quantity, ...},
  "ORDER_CANCELLED": {order_id, reason, ...},
  
  // Trade Update
  "TRADE_EXECUTED": {trade_id, price, quantity, ...},
  
  // Balance Update
  "BALANCE_UPDATED": {asset, available, reserved, ...},
  
  // Order Book Update
  "ORDERBOOK_UPDATE": {symbol, bids, asks, ...}
}
```

**Kabul Kriterleri:**
- ✅ Event latency < 100ms
- ✅ At-least-once delivery semantics
- ✅ Event ordering preservation per user
- ✅ Sequence number tracking (lastEventId)
- ✅ Reconnection & resync support

**Delivery Model (Binance-style):**
1. Client connects → Server sends snapshot with `lastUpdateId`
2. Server sends incremental updates with sequence numbers
3. On reconnect: Client sends last received `lastUpdateId`
4. Server replays missed events or sends new snapshot
5. Client validates sequence continuity

**Resync Logic:**
```javascript
// Client-side
if (event.sequenceId !== lastSequenceId + 1) {
  // Gap detected - request resync
  socket.emit('resync', { lastSequenceId });
}
```

**NOT:** Tam "guaranteed delivery" (exactly-once) network nature'ı gereği mümkün değildir. Sistemimiz at-least-once + idempotency + sequence tracking ile güvenilir delivery sağlar.

---

## 3. NON-FONKSIYONEL GEREKSİNİMLER

### 3.1 Performance Requirements

#### NFR-001: Throughput
**Hedef:** 1,000 orders/second (MVP)  
**Future:** 10,000 orders/second

#### NFR-002: Latency
- Order placement: < 100ms (p99)
- Order matching: < 10ms (p99)
- Order cancellation: < 50ms (p99)
- WebSocket notification: < 100ms (p99)

#### NFR-003: Concurrent Users
**MVP:** 500 simultaneous users  
**Future:** 10,000+ simultaneous users

---

### 3.2 Reliability Requirements

#### NFR-004: Availability
**Target:** 99.9% uptime (43.8 dakika/ay downtime)

#### NFR-005: Data Durability & Consistency
- **ACID transactions:** Database level consistency
- **Durability:** Confirmed trades ve accepted orders için RPO ≈ 0
  - Synchronous write to primary database
  - Write-ahead logging (WAL)
  - Streaming replication to standby
- **Eventual consistency:** Read replicas için (< 1 second lag)
- **In-flight requests:** Unacknowledged requests may be lost on crash
  - Mitigation: Client-side retry with idempotency keys
  - Detection: Health check & automatic reconnection

**Data Loss Scenarios:**
| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Primary DB crash (with WAL) | No data loss | WAL replay on recovery |
| Network partition | Client sees timeout | Retry with idempotency |
| Application crash | In-flight requests lost | Client retry mechanism |
| Both primary & standby down | RPO = last backup (< 1 hour) | Regular backups + PITR |

**Guarantee:** Zero data loss for *acknowledged* transactions under normal conditions. In-flight requests require client-side idempotency handling.

#### NFR-006: Fault Tolerance
- Graceful degradation
- Circuit breaker pattern
- Automatic recovery

---

### 3.3 Security Requirements

#### NFR-007: Authentication
- JWT-based authentication
- Session management
- API key support

#### NFR-008: Authorization
- Role-based access control (RBAC)
- Order ownership validation
- Admin vs user permissions

#### NFR-009: Data Protection
- TLS 1.3 encryption
- Sensitive data masking in logs
- PII protection (KVKK compliance)

#### NFR-010: Rate Limiting
- Per-user order rate limit: 10 orders/second
- Per-user API call limit: 100 requests/minute
- DDoS protection

---

### 3.4 Scalability Requirements

#### NFR-011: Horizontal Scaling
- Stateless service design
- Load balancer ready
- Database sharding support

#### NFR-012: Vertical Scaling
- Multi-core utilization
- Memory optimization
- Database query optimization

---

### 3.5 Maintainability Requirements

#### NFR-013: Monitoring
- Metrics collection (Prometheus)
- Alerting (PagerDuty/Opsgenie)
- Dashboard (Grafana)

**Key Metrics:**
- Orders per second
- Average matching latency
- Order book depth
- Active orders count
- Trade volume
- Error rate
- System health

#### NFR-014: Logging
- Structured logging (JSON)
- Log levels (DEBUG, INFO, WARN, ERROR)
- Centralized logging (ELK Stack)
- Audit trail for all transactions

#### NFR-015: Testing
- Unit test coverage > 80%
- Integration tests
- Performance tests
- Chaos engineering

---

## 4. ORDER TYPES DETAYI

### 4.1 Market Order (MVP)

**Açıklama:** Mevcut en iyi fiyattan anında gerçekleşir.

**Parametreler:**
- Symbol
- Side (BUY/SELL)
- Quantity

**Use Cases:**
- Hızlı pozisyon açma/kapama
- Likidite yüksek marketlerde

**Risks:**
- Slippage
- Partial execution (düşük likidite)

**Simülasyon Kuralı:**
```
Execution Price = Next Bar Open Price
Slippage = Random(0-0.1%) based on volatility
Fee = 0.1% (taker fee)
```

---

### 4.2 Limit Order (MVP)

**Açıklama:** Belirtilen fiyattan veya daha iyisinden gerçekleşir.

**Parametreler:**
- Symbol
- Side (BUY/SELL)
- Quantity
- Limit Price
- Time in Force (GTC/IOC/FOK)

**Time in Force:**
- **GTC (Good Till Cancelled):** İptal edilene kadar bekler
- **IOC (Immediate or Cancel):** Anında gerçekleşen kısım alınır, geri kalanı iptal
- **FOK (Fill or Kill):** Tamamı gerçekleşmezse iptal

**Use Cases:**
- Belirli fiyattan alım/satım
- Market maker stratejileri
- Range trading

**Simülasyon Kuralı:**
```
If Current Price <= Limit Price (BUY):
  Execute at Limit Price
  Fee = 0.05% (maker fee)
Else:
  Add to Order Book
```

---

### 4.3 Stop Order (MVP)

**Açıklama:** Fiyat stop seviyesine ulaştığında market order olarak tetiklenir.

**Parametreler:**
- Symbol
- Side (BUY/SELL)
- Quantity
- Stop Price

**Trigger Conditions:**
- **Stop Loss (Sell):** Price <= Stop Price
- **Stop Buy:** Price >= Stop Price

**Use Cases:**
- Zarar durdurma (stop loss)
- Breakout trading
- Trend following

**Simülasyon Kuralı:**
```
When Market Price crosses Stop Price:
  Convert to Market Order
  Execute at next available price
  Slippage may apply
```

---

### 4.4 Future Order Types (Phase 2)

#### Stop-Limit Order
- Stop tetiklenince limit order olur
- Daha kontrollü ama execution riski var

#### Trailing Stop
- Stop seviyesi fiyatı takip eder
- Trend yakalamak için ideal

#### OCO (One-Cancels-Other)
- İki emir birlikte, biri gerçekleşince diğeri iptal
- Take profit + Stop loss kombinasyonu

#### Iceberg Order
- Toplam miktarın sadece bir kısmı görünür
- Büyük emirleri gizleme

---

## 5. MATCHING ALGORITHM

### 5.1 Price-Time Priority (FIFO)

**Algoritma:**
```
FOR each incoming order:
  IF (order is MARKET):
    WHILE (quantity > 0 AND liquidity exists):
      match_with_best_price()
      create_trade_record()
      publish_trade_event()  // → Kafka/RabbitMQ
      // Wallet Service: listens event → updates ledger
      // Notification Service: listens event → sends notification
  
  ELSE IF (order is LIMIT):
    WHILE (quantity > 0 AND match_possible):
      match_with_crossing_orders()
      create_trade_record()
      publish_trade_event()  // → Event bus
    
    IF (remaining_quantity > 0):
      add_to_orderbook()
      publish_orderbook_update()  // → WebSocket
  
  ELSE IF (order is STOP):
    add_to_stop_orders_watchlist()
    monitor_market_price()
```

**Event-Driven Architecture:**
```
Trade Engine Responsibilities:
  1. Match orders (in-memory)
  2. Create trade records (database)
  3. Publish events (message queue)

Other Services Listen & React:
  - Wallet Service: ledger_entries update
  - Notification Service: user notifications
  - Risk Service: post-trade risk checks
  - Analytics Service: metrics collection
```

### 5.2 Matching Rules

**Rule 1: Price Priority**
```
BUY Orders: Highest bid first
SELL Orders: Lowest ask first
```

**Rule 2: Time Priority**
```
Same price level: First-In-First-Out (FIFO)
```

**Rule 3: Execution**
```
Partial fills allowed
Remaining quantity stays in book
```

**Rule 4: Self-Trading Prevention**
```
IF (buyer_user_id == seller_user_id):
  ACTION: CANCEL incoming order (passive order remains)
  REASON: "SELF_TRADE_PREVENTION"
  
  EXCEPTION cases:
  - Market Maker accounts: Internal match allowed but flagged
  - Institutional accounts: Configurable per institution
  
  LOGGING: All self-trade attempts logged for compliance review
```

**Rationale:**
- **Regulatory:** SPK/MASAK wash trading prevention
- **Market integrity:** Artificial volume önleme
- **Exception handling:** Market maker'lar için flexibility

**Implementation Note:**
```javascript
// During matching
if (buyOrder.userId === sellOrder.userId) {
  if (buyOrder.user.role === 'MARKET_MAKER' && 
      buyOrder.user.selfTradeAllowed) {
    // Allow but flag
    trade.flags.push('SELF_TRADE');
    await complianceService.logSelfTrade(trade);
  } else {
    // Cancel incoming order
    return cancelOrder(incomingOrder, 'SELF_TRADE_PREVENTION');
  }
}
```

---

## 6. PERFORMANCE REQUIREMENTS

### 6.1 Latency Targets

| Operation | Target (p50) | Target (p99) | Max Acceptable |
|-----------|--------------|--------------|----------------|
| Order Placement | 50ms | 100ms | 200ms |
| Order Matching | 5ms | 10ms | 50ms |
| Order Cancellation | 20ms | 50ms | 100ms |
| Balance Update | 10ms | 20ms | 50ms |
| Trade Creation | 10ms | 20ms | 50ms |
| WebSocket Event | 50ms | 100ms | 200ms |
| Order Book Update | 10ms | 20ms | 50ms |

### 6.2 Throughput Targets

**MVP Phase:**
- 1,000 orders/second
- 500 concurrent WebSocket connections
- 100 symbols

**Production Phase:**
- 10,000 orders/second
- 10,000 concurrent connections
- 500+ symbols

### 6.3 Resource Utilization

**CPU:**
- Normal: < 60%
- Peak: < 80%
- Alert: > 90%

**Memory:**
- Normal: < 70%
- Peak: < 85%
- Alert: > 95%

**Database:**
- Connection pool: 50-100
- Query time: < 10ms (p99)
- Lock time: < 5ms

---

## 7. RISK MANAGEMENT REQUIREMENTS

### 7.1 User Limits

#### RMR-001: Position Limits
```javascript
{
  "max_open_orders_per_user": 100,
  "max_open_orders_per_symbol": 20,
  "max_position_size_per_symbol": "configurable",
  "max_notional_value": "configurable"
}
```

#### RMR-002: Trading Limits
```javascript
{
  "min_order_size": 0.0001, // per symbol
  "max_order_size": 100, // per symbol
  "min_order_value": 10, // USDT
  "max_daily_volume_per_user": 1000000 // USDT
}
```

### 7.2 Market Protection

#### RMR-003: Circuit Breakers
```
IF (price_change > 10% in 1 minute):
  HALT trading for 5 minutes
  SEND admin alert
```

#### RMR-004: Price Bands
```
Limit Price must be within ±10% of last trade price
REJECT orders outside this range
```

#### RMR-005: Wash Trading Prevention
```
DETECT patterns:
  - Same user buy/sell
  - Circular trading
  - Artificial volume
  
ACTION:
  - Flag account
  - Temporary suspension
  - Admin review
```

---

## 8. DATA REQUIREMENTS

### 8.1 Database Schema

#### Table: orders

**NOT:** Bu şema, global *MyTrader Database Schema V2.1* ile uyumludur. Gerçek implementasyonda ENUM types ve partitioning kullanılır.

```sql
-- ENUM Type Definitions (Global Schema'da tanımlı)
CREATE TYPE order_side_enum AS ENUM ('BUY', 'SELL');
CREATE TYPE order_type_enum AS ENUM ('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT', 'TRAILING_STOP');
CREATE TYPE order_status_enum AS ENUM ('PENDING', 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED');
CREATE TYPE time_in_force_enum AS ENUM ('GTC', 'IOC', 'FOK', 'DAY');

-- Orders Table with Partitioning
CREATE TABLE orders (
  order_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  institution_id UUID,  -- Multi-tenancy support
  symbol VARCHAR(20) NOT NULL,
  side order_side_enum NOT NULL,
  order_type order_type_enum NOT NULL,
  status order_status_enum NOT NULL,
  quantity DECIMAL(20,8) NOT NULL,
  filled_quantity DECIMAL(20,8) DEFAULT 0,
  price DECIMAL(20,8), -- NULL for MARKET
  stop_price DECIMAL(20,8), -- For STOP orders
  time_in_force time_in_force_enum DEFAULT 'GTC',
  
  -- Metadata
  client_order_id VARCHAR(100), -- Idempotency key
  order_source VARCHAR(50), -- 'WEB' | 'MOBILE' | 'API' | 'BOT'
  fee_profile_id UUID, -- Link to fee structure
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  filled_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  expires_at TIMESTAMP, -- For FOK/IOC/DAY
  
  -- Constraints
  CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_filled_lte_quantity CHECK (filled_quantity <= quantity),
  CONSTRAINT chk_market_no_price CHECK (order_type != 'MARKET' OR price IS NULL),
  CONSTRAINT chk_limit_has_price CHECK (order_type != 'LIMIT' OR price IS NOT NULL),
  
  -- Indexes
  INDEX idx_user_symbol_status (user_id, symbol, status),
  INDEX idx_symbol_status (symbol, status),
  INDEX idx_status_created (status, created_at),
  INDEX idx_client_order (client_order_id) WHERE client_order_id IS NOT NULL,
  
  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (institution_id) REFERENCES institutions(institution_id)
) PARTITION BY RANGE (created_at);

-- Partitioning Strategy (Monthly)
CREATE TABLE orders_2024_11 PARTITION OF orders
  FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');

CREATE TABLE orders_2024_12 PARTITION OF orders
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
-- ... (automated partition management)
```

**Detaylar için bkz:** *MyTrader Database Schema V2.1 - Section 4.2*

#### Table: trades

**NOT:** Bu şema, global *MyTrader Database Schema V2.1* ile uyumludur.

```sql
-- Trades Table with Partitioning
CREATE TABLE trades (
  trade_id UUID PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  
  -- Order References
  buyer_order_id UUID NOT NULL,
  seller_order_id UUID NOT NULL,
  buyer_user_id UUID NOT NULL,
  seller_user_id UUID NOT NULL,
  buyer_institution_id UUID,
  seller_institution_id UUID,
  
  -- Trade Details
  price DECIMAL(20,8) NOT NULL,
  quantity DECIMAL(20,8) NOT NULL,
  
  -- Fees
  buyer_fee DECIMAL(20,8) NOT NULL,
  seller_fee DECIMAL(20,8) NOT NULL,
  buyer_fee_asset VARCHAR(10) NOT NULL,
  seller_fee_asset VARCHAR(10) NOT NULL,
  
  -- Maker/Taker
  is_buyer_maker BOOLEAN NOT NULL,
  
  -- Metadata
  trade_source VARCHAR(50), -- 'INTERNAL' | 'BROKER' | 'SIMULATION'
  execution_venue VARCHAR(50), -- For multi-venue routing
  
  -- Timestamps
  executed_at TIMESTAMP NOT NULL,
  settled_at TIMESTAMP, -- Settlement time (for real broker)
  
  -- Indexes
  INDEX idx_buyer (buyer_user_id, executed_at DESC),
  INDEX idx_seller (seller_user_id, executed_at DESC),
  INDEX idx_symbol_time (symbol, executed_at DESC),
  INDEX idx_executed_at (executed_at DESC),
  
  -- Foreign Keys
  FOREIGN KEY (buyer_order_id) REFERENCES orders(order_id),
  FOREIGN KEY (seller_order_id) REFERENCES orders(order_id),
  FOREIGN KEY (buyer_user_id) REFERENCES users(user_id),
  FOREIGN KEY (seller_user_id) REFERENCES users(user_id)
) PARTITION BY RANGE (executed_at);

-- Partitioning Strategy (Daily for high-volume)
CREATE TABLE trades_2024_11_22 PARTITION OF trades
  FOR VALUES FROM ('2024-11-22') TO ('2024-11-23');
-- ... (automated partition management)
```

**Detaylar için bkz:** *MyTrader Database Schema V2.1 - Section 4.3*

#### Balance Management (Logical View)

**NOT:** Trade Engine, bakiye yönetimi için **Wallet Service** ve **Ledger System** ile entegre çalışır. Aşağıdaki mantıksal bakiye tipleri desteklenir:

```javascript
// Logical Balance View
{
  user_id: "uuid",
  asset: "BTC",
  available_balance: decimal,  // Kullanılabilir
  reserved_balance: decimal,   // Açık emirlerde kilitli
  total_balance: decimal       // available + reserved
}
```

**Fiziksel Şema:** Global database schema'da tanımlı `user_wallets` ve `ledger_entries` tabloları kullanılır. Detaylar için bkz: *MyTrader Database Schema V2.1*

**Trade Engine Sorumlulukları:**
- Emir açılışında bakiye rezerve talebi (→ Wallet Service)
- Emir iptalinde rezerv serbest bırakma (→ Wallet Service)
- Trade sonrası bakiye güncelleme talebi (→ Wallet Service)

**Wallet Service Sorumlulukları:**
- Gerçek bakiye güncellemeleri (ledger üzerinden)
- Double-entry bookkeeping
- Balance reconciliation
- Audit trail

#### Table: positions
```sql
CREATE TABLE positions (
  position_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(5) NOT NULL, -- LONG/SHORT
  quantity DECIMAL(20,8) NOT NULL,
  entry_price DECIMAL(20,8) NOT NULL, -- average
  unrealized_pnl DECIMAL(20,8),
  realized_pnl DECIMAL(20,8) DEFAULT 0,
  opened_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  
  UNIQUE (user_id, symbol, side)
);
```

### 8.2 In-Memory Data (Redis)

#### Order Book Cache
```
Key: orderbook:{symbol}
Value: {
  bids: [[price, quantity, [order_ids]]],
  asks: [[price, quantity, [order_ids]]]
}
TTL: No expiration
Update: Real-time on every order event
```

#### Active Orders Cache
```
Key: active_orders:{user_id}
Value: [order_id_1, order_id_2, ...]
TTL: 24 hours
Update: On order create/cancel/fill
```

#### Stop Orders Watchlist
```
Key: stop_orders:{symbol}
Value: [{order_id, stop_price, side}, ...]
TTL: No expiration
Update: On stop order create/trigger/cancel
```

---

## 9. INTEGRATION POINTS

### 9.1 Internal Services

#### User Service
```
GET /api/users/{user_id}
  - Verify user exists
  - Check KYC status
  - Get risk tier
```

#### Wallet Service
```
POST /api/wallets/reserve
  - Reserve balance for order
  
POST /api/wallets/release
  - Release reserved balance
  
POST /api/wallets/transfer
  - Execute balance transfer after trade
```

#### Market Data Service
```
WS /market-data/{symbol}
  - Subscribe to real-time prices
  - Trigger stop orders
  
GET /api/market-data/{symbol}/ticker
  - Get current price for validation
```

#### Notification Service
```
POST /api/notifications/send
  - Order filled notification
  - Balance update
  - Admin alerts
```

### 9.2 External Services (Future)

#### Broker Integration
```
POST /api/broker/order
  - Forward order to real broker
  - Handle API responses
  
GET /api/broker/positions
  - Sync positions
  
WS /broker/events
  - Listen to execution events
```

---

## 10. MVP vs FULL FEATURE MATRIX

| Feature | MVP (Phase 1) | Phase 2 | Phase 3 |
|---------|---------------|---------|---------|
| **Order Types** |
| Market Order | ✅ | ✅ | ✅ |
| Limit Order | ✅ | ✅ | ✅ |
| Stop Order | ✅ | ✅ | ✅ |
| Stop-Limit | ❌ | ✅ | ✅ |
| Trailing Stop | ❌ | ✅ | ✅ |
| OCO | ❌ | ❌ | ✅ |
| Iceberg | ❌ | ❌ | ✅ |
| **Execution** |
| Paper Trading | ✅ | ✅ | ✅ |
| Broker Integration | ❌ | ✅ | ✅ |
| Multi-Broker | ❌ | ❌ | ✅ |
| Smart Routing | ❌ | ❌ | ✅ |
| **Features** |
| Order Book | ✅ | ✅ | ✅ |
| Real-time Updates | ✅ | ✅ | ✅ |
| Position Tracking | ✅ | ✅ | ✅ |
| P&L Calculation | ✅ | ✅ | ✅ |
| Risk Limits | Basic | Advanced | Enterprise |
| Fee Management | ✅ | ✅ | ✅ |
| **Performance** |
| Throughput (orders/sec) | 1,000 | 5,000 | 10,000+ |
| Concurrent Users | 500 | 2,000 | 10,000+ |
| Symbols | 50 | 200 | 500+ |
| **Advanced** |
| Margin Trading | ❌ | ❌ | ✅ |
| Futures | ❌ | ❌ | ✅ |
| Options | ❌ | ❌ | ✅ |
| Algorithmic Orders | ❌ | ✅ | ✅ |

---

## 11. SUCCESS CRITERIA

### 11.1 Functional Success

✅ **100% order accuracy:** Her emir doğru fiyat ve miktarda execute edilmeli  
✅ **Zero balance errors:** Bakiye tutarsızlığı olmamalı  
✅ **Complete audit trail:** Her işlem loglanmalı  
✅ **Real-time notifications:** WebSocket events < 100ms latency  

### 11.2 Performance Success

✅ **Latency SLA:** p99 < 100ms for order placement  
✅ **Throughput:** 1,000 orders/second sustained  
✅ **Uptime:** 99.9% availability  
✅ **Zero downtime deployments:** Blue-green deployment  

### 11.3 Quality Success

✅ **Test coverage:** > 80% code coverage  
✅ **Bug rate:** < 0.1% in production  
✅ **Security:** Zero critical vulnerabilities  
✅ **Documentation:** Complete API docs and runbooks  

---

## NEXT STEPS

1. **Architecture Design** (Week 1-2)
   - High-level architecture diagram
   - Technology stack selection
   - Service boundaries definition
   - Data flow design
   - Event-driven architecture (Kafka/RabbitMQ)

2. **Detailed Design** (Week 2-3)
   - API specifications (OpenAPI 3.0)
   - Database schema refinement (align with V2.1)
   - **Sequence diagrams** for critical flows:
     * **Flow 1:** Place Limit Order → Match → Trade → Ledger Update → WebSocket Notification
     * **Flow 2:** Place Stop Order → Price Monitor → Trigger → Market Order → Trade
     * **Flow 3:** Place Market Order → Immediate Match → Partial Fill → Remaining Quantity → Notification
     * **Flow 4:** Cancel Order → Release Reserved Balance → Update Order Book → Notify User
     * **Flow 5:** Admin Halt Symbol → Cancel Pending Orders → Notify All Users
   - State machines (Order Lifecycle, Trade Lifecycle)
   - Error handling & retry strategies

3. **Development Planning** (Week 3-4)
   - Sprint planning (2-week sprints)
   - Task breakdown (Jira epics/stories)
   - Dependencies mapping
   - Resource allocation
   - Testing strategy (unit/integration/performance)

4. **Prototype** (Week 4-6)
   - Core matching engine (Go/Rust)
   - Basic order types (Market/Limit/Stop)
   - In-memory order book (Redis)
   - Unit tests (> 80% coverage)
   - Performance benchmark (1K orders/sec)

---

**Doküman Sonu**
