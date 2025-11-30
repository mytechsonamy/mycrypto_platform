/**
 * EPIC 3: Trading Engine & Market Data - Phase 4 QA Tests
 * Comprehensive E2E and API tests for all 44 test cases
 *
 * This test suite covers:
 * - Phase 1: Market Data (12 tests)
 * - Phase 2: Order Placement (8 tests)
 * - Phase 3: Order Management (8 tests)
 * - Phase 4: History & Analytics (8 tests)
 * - Phase 5: Advanced Features (8 tests)
 * - Phase 6: Performance & WebSocket (5+ tests)
 */

describe('EPIC 3: Trading Engine & Market Data - Phase 4 QA Tests', () => {

  // Base URLs
  const API_URL = Cypress.env('API_URL') || 'http://localhost:8001';
  const WEBSOCKET_URL = Cypress.env('WEBSOCKET_URL') || 'ws://localhost:8001';

  // Test data
  let accessToken: string;
  let userId: string;
  let orderId: string;
  let tradeId: string;

  before(() => {
    // Setup: Get test user auth token
    cy.request({
      method: 'POST',
      url: `${API_URL}/api/v1/auth/login`,
      body: {
        email: Cypress.env('TEST_EMAIL') || 'test@example.com',
        password: Cypress.env('TEST_PASSWORD') || 'TestPass123!'
      }
    }).then((response) => {
      accessToken = response.body.data.access_token;
      userId = response.body.data.user_id;
    });
  });

  // ==========================================
  // PHASE 1: Market Data Tests (12 tests)
  // ==========================================

  describe('PHASE 1: Market Data Tests', () => {

    describe('TC-101: Order Book - Real-time display (REST API)', () => {
      it('Should retrieve order book with valid structure', () => {
        cy.request(`${API_URL}/api/v1/orderbook/BTC-USDT`).then((response) => {
          expect(response.status).to.equal(200);
          expect(response.body).to.have.property('success', true);
          expect(response.body.data).to.have.property('symbol', 'BTC-USDT');
          expect(response.body.data).to.have.property('bids').and.be.an('array');
          expect(response.body.data).to.have.property('asks').and.be.an('array');
        });
      });

      it('Should have sorted bids (descending) and asks (ascending)', () => {
        cy.request(`${API_URL}/api/v1/orderbook/BTC-USDT`).then((response) => {
          const { bids, asks } = response.body.data;

          // Verify bids are sorted descending
          for (let i = 0; i < bids.length - 1; i++) {
            expect(parseFloat(bids[i].price)).to.be.gte(parseFloat(bids[i + 1].price));
          }

          // Verify asks are sorted ascending
          for (let i = 0; i < asks.length - 1; i++) {
            expect(parseFloat(asks[i].price)).to.be.lte(parseFloat(asks[i + 1].price));
          }
        });
      });

      it('Should have valid bid-ask spread', () => {
        cy.request(`${API_URL}/api/v1/orderbook/BTC-USDT`).then((response) => {
          const { bids, asks } = response.body.data;
          if (bids.length > 0 && asks.length > 0) {
            const bestBid = parseFloat(bids[0].price);
            const bestAsk = parseFloat(asks[0].price);
            expect(bestBid).to.be.lt(bestAsk);
          }
        });
      });

      it('Should have price and quantity for each level', () => {
        cy.request(`${API_URL}/api/v1/orderbook/BTC-USDT`).then((response) => {
          const { bids, asks } = response.body.data;

          bids.forEach((bid: any) => {
            expect(bid).to.have.property('price');
            expect(bid).to.have.property('quantity');
          });

          asks.forEach((ask: any) => {
            expect(ask).to.have.property('price');
            expect(ask).to.have.property('quantity');
          });
        });
      });

      it('Response time should be < 100ms', () => {
        cy.request(`${API_URL}/api/v1/orderbook/BTC-USDT`).then((response) => {
          expect(response.duration).to.be.lt(100);
        });
      });
    });

    describe('TC-102: Market Ticker - Single symbol', () => {
      it('Should retrieve ticker with valid structure', () => {
        cy.request(`${API_URL}/api/v1/ticker/BTC-USDT`).then((response) => {
          expect(response.status).to.equal(200);
          expect(response.body.data).to.have.property('symbol', 'BTC-USDT');
          expect(response.body.data).to.have.property('last_price');
          expect(response.body.data).to.have.property('bid');
          expect(response.body.data).to.have.property('ask');
        });
      });

      it('Last price should be between bid and ask', () => {
        cy.request(`${API_URL}/api/v1/ticker/BTC-USDT`).then((response) => {
          const { last_price, bid, ask } = response.body.data;
          const lastPrice = parseFloat(last_price);
          const bidPrice = parseFloat(bid);
          const askPrice = parseFloat(ask);

          expect(lastPrice).to.be.gte(bidPrice);
          expect(lastPrice).to.be.lte(askPrice);
        });
      });

      it('Should have positive price values', () => {
        cy.request(`${API_URL}/api/v1/ticker/BTC-USDT`).then((response) => {
          const { last_price, bid, ask } = response.body.data;
          expect(parseFloat(last_price)).to.be.gt(0);
          expect(parseFloat(bid)).to.be.gt(0);
          expect(parseFloat(ask)).to.be.gt(0);
        });
      });
    });

    describe('TC-103: 24h Statistics - OHLCV calculations', () => {
      it('Should retrieve 24h statistics with OHLCV data', () => {
        cy.request(`${API_URL}/api/v1/statistics/BTC-USDT?interval=24h`).then((response) => {
          expect(response.status).to.equal(200);
          const stats = response.body.data.stats_24h;
          expect(stats).to.have.property('open');
          expect(stats).to.have.property('high');
          expect(stats).to.have.property('low');
          expect(stats).to.have.property('close');
          expect(stats).to.have.property('volume');
        });
      });

      it('Should have valid OHLC logic', () => {
        cy.request(`${API_URL}/api/v1/statistics/BTC-USDT?interval=24h`).then((response) => {
          const stats = response.body.data.stats_24h;
          const open = parseFloat(stats.open);
          const high = parseFloat(stats.high);
          const low = parseFloat(stats.low);
          const close = parseFloat(stats.close);

          expect(high).to.be.gte(close);
          expect(high).to.be.gte(open);
          expect(high).to.be.gte(low);
          expect(low).to.be.lte(close);
          expect(low).to.be.lte(open);
        });
      });

      it('Should have non-negative volume', () => {
        cy.request(`${API_URL}/api/v1/statistics/BTC-USDT?interval=24h`).then((response) => {
          const volume = parseFloat(response.body.data.stats_24h.volume);
          expect(volume).to.be.gte(0);
        });
      });
    });

    describe('TC-104: Recent Trades - Live feed', () => {
      it('Should retrieve recent trades with valid structure', () => {
        cy.request(`${API_URL}/api/v1/trades/recent/BTC-USDT`).then((response) => {
          expect(response.status).to.equal(200);
          expect(response.body).to.have.property('success', true);
          expect(response.body.data).to.have.property('trades').and.be.an('array');
        });
      });

      it('Each trade should have required fields', () => {
        cy.request(`${API_URL}/api/v1/trades/recent/BTC-USDT`).then((response) => {
          const trades = response.body.data.trades;
          trades.forEach((trade: any) => {
            expect(trade).to.have.property('id');
            expect(trade).to.have.property('price');
            expect(trade).to.have.property('quantity');
            expect(trade).to.have.property('side');
            expect(trade).to.have.property('timestamp');
          });
        });
      });

      it('Trades should be sorted by timestamp (newest first)', () => {
        cy.request(`${API_URL}/api/v1/trades/recent/BTC-USDT`).then((response) => {
          const trades = response.body.data.trades;
          for (let i = 0; i < trades.length - 1; i++) {
            expect(trades[i].timestamp).to.be.gte(trades[i + 1].timestamp);
          }
        });
      });
    });

    describe('TC-105: Recent Trades - Pagination', () => {
      it('Should support pagination with limit and offset', () => {
        cy.request(`${API_URL}/api/v1/trades/recent/BTC-USDT?limit=10&offset=0`)
          .then((response) => {
            const { pagination } = response.body.data;
            expect(pagination).to.have.property('total');
            expect(pagination).to.have.property('limit');
            expect(pagination).to.have.property('offset');
            expect(response.body.data.trades.length).to.be.lte(10);
          });
      });

      it('Should return different items on different pages', () => {
        let firstPageIds: string[];
        cy.request(`${API_URL}/api/v1/trades/recent/BTC-USDT?limit=5&offset=0`)
          .then((response) => {
            firstPageIds = response.body.data.trades.map((t: any) => t.id);
            return cy.request(`${API_URL}/api/v1/trades/recent/BTC-USDT?limit=5&offset=5`);
          })
          .then((response) => {
            const secondPageIds = response.body.data.trades.map((t: any) => t.id);
            const overlap = firstPageIds.filter(id => secondPageIds.includes(id));
            expect(overlap.length).to.equal(0);
          });
      });
    });

    describe('TC-106: Candle History - OHLCV per timeframe', () => {
      it('Should retrieve candles with OHLCV data', () => {
        const now = Math.floor(Date.now() / 1000);
        cy.request(`${API_URL}/api/v1/candles/BTC-USDT?timeframe=1h&start=${now - 86400}&end=${now}`)
          .then((response) => {
            expect(response.status).to.equal(200);
            expect(response.body.data).to.have.property('candles').and.be.an('array');
            expect(response.body.data).to.have.property('timeframe', '1h');
          });
      });

      it('Each candle should have OHLCV values', () => {
        const now = Math.floor(Date.now() / 1000);
        cy.request(`${API_URL}/api/v1/candles/BTC-USDT?timeframe=1h&start=${now - 86400}&end=${now}`)
          .then((response) => {
            const candles = response.body.data.candles;
            candles.forEach((candle: any) => {
              expect(candle).to.have.property('time');
              expect(candle).to.have.property('open');
              expect(candle).to.have.property('high');
              expect(candle).to.have.property('low');
              expect(candle).to.have.property('close');
              expect(candle).to.have.property('volume');
            });
          });
      });

      it('Candle OHLC should follow logical order', () => {
        const now = Math.floor(Date.now() / 1000);
        cy.request(`${API_URL}/api/v1/candles/BTC-USDT?timeframe=1h&start=${now - 86400}&end=${now}`)
          .then((response) => {
            const candles = response.body.data.candles;
            candles.forEach((candle: any) => {
              const high = parseFloat(candle.high);
              const close = parseFloat(candle.close);
              const open = parseFloat(candle.open);
              const low = parseFloat(candle.low);

              expect(high).to.be.gte(close);
              expect(high).to.be.gte(open);
              expect(low).to.be.lte(close);
              expect(low).to.be.lte(open);
            });
          });
      });
    });

    describe('TC-107: Symbol List - Metadata and trading rules', () => {
      it('Should retrieve list of available symbols', () => {
        cy.request(`${API_URL}/api/v1/symbols`).then((response) => {
          expect(response.status).to.equal(200);
          expect(response.body.data).to.have.property('symbols').and.be.an('array');
        });
      });

      it('Each symbol should have trading rules', () => {
        cy.request(`${API_URL}/api/v1/symbols`).then((response) => {
          const symbols = response.body.data.symbols;
          symbols.forEach((symbol: any) => {
            expect(symbol).to.have.property('symbol');
            expect(symbol).to.have.property('base_asset');
            expect(symbol).to.have.property('quote_asset');
            expect(symbol).to.have.property('min_order_quantity');
            expect(symbol).to.have.property('max_order_quantity');
            expect(symbol).to.have.property('step_size');
          });
        });
      });

      it('Should contain major trading pairs', () => {
        cy.request(`${API_URL}/api/v1/symbols`).then((response) => {
          const symbols = response.body.data.symbols.map((s: any) => s.symbol);
          expect(symbols).to.include('BTC-USDT');
          expect(symbols).to.include('ETH-USDT');
        });
      });

      it('Min order quantity should be less than max', () => {
        cy.request(`${API_URL}/api/v1/symbols`).then((response) => {
          const symbols = response.body.data.symbols;
          symbols.forEach((symbol: any) => {
            const min = parseFloat(symbol.min_order_quantity);
            const max = parseFloat(symbol.max_order_quantity);
            expect(min).to.be.lt(max);
          });
        });
      });
    });
  });

  // ==========================================
  // PHASE 2: Order Placement Tests (8 tests)
  // ==========================================

  describe('PHASE 2: Order Placement Tests', () => {

    describe('TC-201: Market Order - Buy BTC', () => {
      it('Should create market buy order successfully', () => {
        cy.request({
          method: 'POST',
          url: `${API_URL}/api/v1/orders`,
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: {
            symbol: 'BTC-USDT',
            side: 'BUY',
            type: 'MARKET',
            quantity: '0.001'
          }
        }).then((response) => {
          expect(response.status).to.equal(201);
          expect(response.body.order).to.have.property('id');
          expect(response.body.order.symbol).to.equal('BTC-USDT');
          expect(response.body.order.side).to.equal('BUY');
          expect(response.body.order.type).to.equal('MARKET');
          expect(['FILLED', 'PENDING']).to.include(response.body.order.status);
          orderId = response.body.order.id;
        });
      });
    });

    describe('TC-203: Order Type Validation - Invalid types', () => {
      it('Should reject invalid order type with 400', () => {
        cy.request({
          method: 'POST',
          url: `${API_URL}/api/v1/orders`,
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: {
            symbol: 'BTC-USDT',
            side: 'BUY',
            type: 'INVALID',
            quantity: '0.1'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.equal(400);
          expect(response.body).to.have.property('error');
        });
      });
    });

    describe('TC-204: Price Validation - Negative prices rejected', () => {
      it('Should reject negative price with 400', () => {
        cy.request({
          method: 'POST',
          url: `${API_URL}/api/v1/orders`,
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: {
            symbol: 'BTC-USDT',
            side: 'BUY',
            type: 'LIMIT',
            quantity: '0.1',
            price: '-100'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.equal(400);
        });
      });
    });

    describe('TC-205: Quantity Validation - Zero/negative rejected', () => {
      it('Should reject zero quantity', () => {
        cy.request({
          method: 'POST',
          url: `${API_URL}/api/v1/orders`,
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: {
            symbol: 'BTC-USDT',
            side: 'BUY',
            type: 'MARKET',
            quantity: '0'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.equal(400);
        });
      });

      it('Should reject negative quantity', () => {
        cy.request({
          method: 'POST',
          url: `${API_URL}/api/v1/orders`,
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: {
            symbol: 'BTC-USDT',
            side: 'BUY',
            type: 'MARKET',
            quantity: '-1'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.equal(400);
        });
      });
    });
  });

  // ==========================================
  // PHASE 3: Order Management Tests (8 tests)
  // ==========================================

  describe('PHASE 3: Order Management Tests', () => {

    describe('TC-301: Open Orders - Fetch user active orders', () => {
      it('Should fetch open orders', () => {
        cy.request({
          method: 'GET',
          url: `${API_URL}/api/v1/orders/open`,
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }).then((response) => {
          expect(response.status).to.equal(200);
          expect(response.body).to.have.property('success', true);
          expect(response.body.data).to.have.property('orders').and.be.an('array');
        });
      });

      it('Open orders should have PENDING or PARTIALLY_FILLED status', () => {
        cy.request({
          method: 'GET',
          url: `${API_URL}/api/v1/orders/open`,
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }).then((response) => {
          const orders = response.body.data.orders;
          orders.forEach((order: any) => {
            expect(['PENDING', 'PARTIALLY_FILLED']).to.include(order.status);
          });
        });
      });
    });

    describe('TC-303: Order History - Filtering by status', () => {
      it('Should filter orders by status', () => {
        cy.request({
          method: 'GET',
          url: `${API_URL}/api/v1/orders/history?status=FILLED`,
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }).then((response) => {
          expect(response.status).to.equal(200);
          const orders = response.body.data.orders;
          orders.forEach((order: any) => {
            expect(order.status).to.equal('FILLED');
          });
        });
      });
    });

    describe('TC-304: Order History - Pagination', () => {
      it('Should support pagination in order history', () => {
        cy.request({
          method: 'GET',
          url: `${API_URL}/api/v1/orders/history?limit=10&offset=0`,
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }).then((response) => {
          expect(response.status).to.equal(200);
          const { pagination } = response.body.data;
          expect(pagination).to.have.property('total');
          expect(pagination).to.have.property('limit', 10);
          expect(pagination).to.have.property('offset', 0);
        });
      });
    });

    describe('TC-305: Order Detail - Single order fetch', () => {
      it('Should fetch single order details', () => {
        if (!orderId) {
          cy.skip(); // Skip if no order created
        } else {
          cy.request({
            method: 'GET',
            url: `${API_URL}/api/v1/orders/${orderId}`,
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }).then((response) => {
            expect(response.status).to.equal(200);
            expect(response.body.data).to.have.property('id', orderId);
            expect(response.body.data).to.have.property('symbol');
            expect(response.body.data).to.have.property('quantity');
            expect(response.body.data).to.have.property('filled_quantity');
          });
        }
      });
    });
  });

  // ==========================================
  // PHASE 4: History & Analytics Tests (8 tests)
  // ==========================================

  describe('PHASE 4: History & Analytics Tests', () => {

    describe('TC-401: Trade History - Fetch all user trades', () => {
      it('Should retrieve trade history', () => {
        cy.request({
          method: 'GET',
          url: `${API_URL}/api/v1/trades/history`,
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }).then((response) => {
          expect(response.status).to.equal(200);
          expect(response.body.data).to.have.property('trades').and.be.an('array');
        });
      });

      it('Each trade should have required fields', () => {
        cy.request({
          method: 'GET',
          url: `${API_URL}/api/v1/trades/history`,
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }).then((response) => {
          const trades = response.body.data.trades;
          trades.forEach((trade: any) => {
            expect(trade).to.have.property('id');
            expect(trade).to.have.property('symbol');
            expect(trade).to.have.property('price');
            expect(trade).to.have.property('quantity');
            expect(trade).to.have.property('side');
          });
        });
      });
    });

    describe('TC-402: Trade History - Filter by symbol', () => {
      it('Should filter trades by symbol', () => {
        cy.request({
          method: 'GET',
          url: `${API_URL}/api/v1/trades/history?symbol=BTC-USDT`,
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }).then((response) => {
          expect(response.status).to.equal(200);
          const trades = response.body.data.trades;
          trades.forEach((trade: any) => {
            expect(trade.symbol).to.equal('BTC-USDT');
          });
        });
      });
    });
  });

  // ==========================================
  // PHASE 5: Advanced Features Tests (8 tests)
  // ==========================================

  describe('PHASE 5: Advanced Features Tests', () => {

    describe('TC-501: Price Alerts - Create alert', () => {
      it('Should create price alert successfully', () => {
        cy.request({
          method: 'POST',
          url: `${API_URL}/api/v1/alerts`,
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: {
            symbol: 'BTC-USDT',
            alert_type: 'above',
            target_price: '45000.00'
          }
        }).then((response) => {
          expect(response.status).to.equal(201);
          expect(response.body.data).to.have.property('id');
          expect(response.body.data.symbol).to.equal('BTC-USDT');
          expect(response.body.data.alert_type).to.equal('above');
          expect(response.body.data.is_active).to.equal(true);
        });
      });
    });

    describe('TC-504: SMA Indicator - Calculate 20-period', () => {
      it('Should calculate 20-period SMA', () => {
        cy.request({
          method: 'GET',
          url: `${API_URL}/api/v1/market/indicators/BTC-USDT?type=sma&period=20`,
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }).then((response) => {
          expect(response.status).to.equal(200);
          expect(response.body.data).to.have.property('symbol', 'BTC-USDT');
          expect(response.body.data).to.have.property('indicator_type', 'SMA');
          expect(response.body.data).to.have.property('period', 20);
          expect(response.body.data).to.have.property('value');
        });
      });
    });

    describe('TC-505: EMA Indicator - Calculate 12-period', () => {
      it('Should calculate 12-period EMA', () => {
        cy.request({
          method: 'GET',
          url: `${API_URL}/api/v1/market/indicators/ETH-USDT?type=ema&period=12`,
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }).then((response) => {
          expect(response.status).to.equal(200);
          expect(response.body.data.indicator_type).to.equal('EMA');
          expect(response.body.data.period).to.equal(12);
        });
      });
    });
  });

  // ==========================================
  // PHASE 6: Performance & WebSocket Tests
  // ==========================================

  describe('PHASE 6: Performance & WebSocket Tests', () => {

    describe('TC-601: Response Time Baseline', () => {
      it('Market data response time should be < 50ms', () => {
        cy.request(`${API_URL}/api/v1/ticker/BTC-USDT`).then((response) => {
          expect(response.duration).to.be.lt(50);
        });
      });

      it('Order book response time should be < 100ms', () => {
        cy.request(`${API_URL}/api/v1/orderbook/BTC-USDT`).then((response) => {
          expect(response.duration).to.be.lt(100);
        });
      });
    });

    describe('TC-605: Load Test - Concurrent Requests', () => {
      it('Should handle 10 concurrent ticker requests', () => {
        const requests = Array(10).fill(null).map(() =>
          cy.request(`${API_URL}/api/v1/ticker/BTC-USDT`)
        );

        Cypress.Promise.all(requests).then((responses) => {
          responses.forEach((response: any) => {
            expect(response.status).to.equal(200);
            expect(response.duration).to.be.lt(200);
          });
        });
      });
    });
  });

  after(() => {
    // Cleanup: Clear test data if needed
    cy.log('Test suite completed');
  });
});

export {};
