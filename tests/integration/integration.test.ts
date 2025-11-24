/**
 * Integration Test Suite - MyCrypto Exchange Platform
 *
 * Comprehensive end-to-end testing of trading workflows
 * including order placement, execution, settlement, and real-time updates
 *
 * Test Framework: Jest
 * API Client: Axios
 * WebSocket: ws
 */

import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';

// Test Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api/v1';
const TRADE_ENGINE_URL = process.env.TRADE_ENGINE_URL || 'http://localhost:8080/api/v1';
const WS_URL = process.env.WS_URL || 'ws://localhost:3001/ws';
const TIMEOUT_MS = parseInt(process.env.API_TIMEOUT_MS || '5000');
const WS_TIMEOUT_MS = parseInt(process.env.WS_TIMEOUT_MS || '10000');

describe('Integration Test Suite - Order Flow & Execution', () => {
  let apiClient: AxiosInstance;
  let trader1Token: string;
  let trader2Token: string;
  let trader1Id: string;
  let trader2Id: string;

  // Setup: Create test users and authenticate
  beforeAll(async () => {
    // Configure API client
    apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: TIMEOUT_MS,
      validateStatus: () => true, // Don't throw on any status
    });

    // Register and authenticate Trader 1
    try {
      const reg1 = await apiClient.post('/auth/register', {
        email: `trader1_${Date.now()}@test.local`,
        password: 'TestPass123!',
        firstName: 'Trader',
        lastName: 'One',
      });

      if (reg1.status === 201 || reg1.status === 200) {
        trader1Token = reg1.data.token;
        trader1Id = reg1.data.user.id;
        console.log('Trader 1 authenticated:', trader1Id);
      } else {
        throw new Error(`Failed to register Trader 1: ${reg1.status}`);
      }

      // Register and authenticate Trader 2
      const reg2 = await apiClient.post('/auth/register', {
        email: `trader2_${Date.now()}@test.local`,
        password: 'TestPass123!',
        firstName: 'Trader',
        lastName: 'Two',
      });

      if (reg2.status === 201 || reg2.status === 200) {
        trader2Token = reg2.data.token;
        trader2Id = reg2.data.user.id;
        console.log('Trader 2 authenticated:', trader2Id);
      } else {
        throw new Error(`Failed to register Trader 2: ${reg2.status}`);
      }
    } catch (error) {
      console.error('Authentication setup failed:', error);
      throw error;
    }
  });

  /**
   * TC-INT-001: Market Order Execution Flow
   *
   * Scenario: Seller places limit order, buyer places market order
   * Expected: Orders match, trade executes, balances updated
   */
  describe('TC-INT-001: Market Order → Execution → Settlement', () => {
    it('should execute market order from placement to settlement', async () => {
      const symbol = 'BTC/USDT';
      const sellQuantity = 1.0;
      const expectedPrice = 45000.0;

      // Step 1: Trader 1 places limit sell order
      const sellOrder = await apiClient.post(
        '/trading/orders',
        {
          symbol,
          side: 'sell',
          type: 'limit',
          quantity: sellQuantity,
          price: expectedPrice,
        },
        {
          headers: { Authorization: `Bearer ${trader1Token}` },
        }
      );

      expect(sellOrder.status).toBe(201);
      expect(sellOrder.data.order).toBeDefined();
      expect(sellOrder.data.order.status).toBe('OPEN');
      expect(sellOrder.data.order.symbol).toBe(symbol);

      const sellOrderId = sellOrder.data.order.id;

      // Step 2: Verify order appears in order book
      const orderBook = await apiClient.get(`/markets/${symbol}/orderbook`, {
        headers: { Authorization: `Bearer ${trader1Token}` },
      });

      expect(orderBook.status).toBe(200);
      const sellOrderInBook = orderBook.data.asks.find(
        (ask: any) => ask.order_id === sellOrderId
      );
      expect(sellOrderInBook).toBeDefined();

      // Step 3: Trader 2 places market buy order
      const buyOrder = await apiClient.post(
        '/trading/orders',
        {
          symbol,
          side: 'buy',
          type: 'market',
          quantity: sellQuantity,
        },
        {
          headers: { Authorization: `Bearer ${trader2Token}` },
        }
      );

      expect(buyOrder.status).toBe(201);
      expect(buyOrder.data.order.status).toMatch(/FILLED|PARTIALLY_FILLED/);

      // Step 4: Verify trade was executed
      const trades = await apiClient.get('/trading/trades', {
        headers: { Authorization: `Bearer ${trader2Token}` },
      });

      expect(trades.status).toBe(200);
      expect(trades.data.length).toBeGreaterThan(0);

      const executedTrade = trades.data.find(
        (trade: any) => trade.maker_order_id === sellOrderId || trade.taker_order_id === buyOrder.data.order.id
      );
      expect(executedTrade).toBeDefined();
      expect(executedTrade.quantity).toBe(sellQuantity);
      expect(executedTrade.price).toBe(expectedPrice);

      // Step 5: Verify balances updated
      const trader1Balance = await apiClient.get('/wallet/balances', {
        headers: { Authorization: `Bearer ${trader1Token}` },
      });

      const trader2Balance = await apiClient.get('/wallet/balances', {
        headers: { Authorization: `Bearer ${trader2Token}` },
      });

      expect(trader1Balance.status).toBe(200);
      expect(trader2Balance.status).toBe(200);

      // Trader 1 should have received USDT, lost BTC
      const trader1UsdtBalance = trader1Balance.data.find(
        (b: any) => b.asset === 'USDT'
      );
      expect(trader1UsdtBalance.available).toBeGreaterThan(0);

      // Trader 2 should have received BTC, lost USDT
      const trader2BtcBalance = trader2Balance.data.find(
        (b: any) => b.asset === 'BTC'
      );
      expect(trader2BtcBalance.available).toBeGreaterThan(0);
    });
  });

  /**
   * TC-INT-002: Limit Order Queue
   *
   * Scenario: Place limit order that doesn't match immediately
   * Expected: Order stays OPEN, locked balance reduced
   */
  describe('TC-INT-002: Limit Order → Order Book Entry', () => {
    it('should queue limit order in order book without immediate fill', async () => {
      const symbol = 'ETH/USDT';
      const quantity = 0.5;
      const highPrice = 99999.0; // Price too high to match

      // Place limit sell order at unrealistic price
      const order = await apiClient.post(
        '/trading/orders',
        {
          symbol,
          side: 'sell',
          type: 'limit',
          quantity,
          price: highPrice,
        },
        {
          headers: { Authorization: `Bearer ${trader1Token}` },
        }
      );

      expect(order.status).toBe(201);
      expect(order.data.order.status).toBe('OPEN');

      // Verify order appears in order book
      const orderBook = await apiClient.get(`/markets/${symbol}/orderbook`, {
        headers: { Authorization: `Bearer ${trader1Token}` },
      });

      const orderInBook = orderBook.data.asks.find(
        (ask: any) => ask.order_id === order.data.order.id
      );
      expect(orderInBook).toBeDefined();
      expect(orderInBook.price).toBe(highPrice);

      // Verify balance is locked
      const balance = await apiClient.get('/wallet/balances', {
        headers: { Authorization: `Bearer ${trader1Token}` },
      });

      const ethBalance = balance.data.find((b: any) => b.asset === 'ETH');
      expect(ethBalance.locked).toBeGreaterThanOrEqual(quantity);
    });
  });

  /**
   * TC-INT-013: Invalid Order Parameters
   *
   * Scenario: Submit order with invalid parameters
   * Expected: 400 Bad Request with clear error messages
   */
  describe('TC-INT-013: Invalid Order Parameters', () => {
    it('should reject order with negative quantity', async () => {
      const response = await apiClient.post(
        '/trading/orders',
        {
          symbol: 'BTC/USDT',
          side: 'buy',
          type: 'limit',
          quantity: -1.0,
          price: 45000,
        },
        {
          headers: { Authorization: `Bearer ${trader1Token}` },
        }
      );

      expect(response.status).toBe(400);
      expect(response.data.error).toBeDefined();
      expect(response.data.error.code).toBe('INVALID_QUANTITY');
    });

    it('should reject order with missing symbol', async () => {
      const response = await apiClient.post(
        '/trading/orders',
        {
          // symbol: omitted
          side: 'buy',
          type: 'limit',
          quantity: 1.0,
          price: 45000,
        },
        {
          headers: { Authorization: `Bearer ${trader1Token}` },
        }
      );

      expect(response.status).toBe(400);
      expect(response.data.error.code).toMatch(/MISSING|INVALID/);
    });

    it('should reject order with zero price for limit order', async () => {
      const response = await apiClient.post(
        '/trading/orders',
        {
          symbol: 'BTC/USDT',
          side: 'buy',
          type: 'limit',
          quantity: 1.0,
          price: 0,
        },
        {
          headers: { Authorization: `Bearer ${trader1Token}` },
        }
      );

      expect(response.status).toBe(400);
      expect(response.data.error.code).toBe('INVALID_PRICE');
    });
  });

  /**
   * TC-INT-014: Insufficient Balance
   *
   * Scenario: User attempts to buy more than available balance
   * Expected: 400 error with details about required vs available
   */
  describe('TC-INT-014: Insufficient Balance', () => {
    it('should reject order when balance insufficient', async () => {
      const response = await apiClient.post(
        '/trading/orders',
        {
          symbol: 'BTC/USDT',
          side: 'buy',
          type: 'market',
          quantity: 10000.0, // Unrealistically large
        },
        {
          headers: { Authorization: `Bearer ${trader1Token}` },
        }
      );

      expect(response.status).toBe(400);
      expect(response.data.error.code).toBe('INSUFFICIENT_BALANCE');
      expect(response.data.error.details).toBeDefined();
      expect(response.data.error.details.required).toBeDefined();
      expect(response.data.error.details.available).toBeDefined();
    });
  });

  /**
   * TC-INT-015: Order Not Found
   *
   * Scenario: Request non-existent order or another user's order
   * Expected: 404 or 403 with appropriate error
   */
  describe('TC-INT-015: Order Not Found / Access Denied', () => {
    it('should return 404 for non-existent order', async () => {
      const response = await apiClient.get('/trading/orders/999999999', {
        headers: { Authorization: `Bearer ${trader1Token}` },
      });

      expect(response.status).toBe(404);
      expect(response.data.error.code).toBe('ORDER_NOT_FOUND');
    });

    it('should return 403 for other user\'s order', async () => {
      // First create an order as trader1
      const order = await apiClient.post(
        '/trading/orders',
        {
          symbol: 'BTC/USDT',
          side: 'buy',
          type: 'limit',
          quantity: 0.1,
          price: 40000,
        },
        {
          headers: { Authorization: `Bearer ${trader1Token}` },
        }
      );

      // Try to access as trader2
      const response = await apiClient.get(`/trading/orders/${order.data.order.id}`, {
        headers: { Authorization: `Bearer ${trader2Token}` },
      });

      expect(response.status).toBe(403);
      expect(response.data.error.code).toBe('PERMISSION_DENIED');
    });
  });

  /**
   * WebSocket Real-Time Tests
   */
  describe('TC-INT-009: WebSocket Order Status Updates', () => {
    it('should receive order updates via WebSocket', (done) => {
      const ws = new WebSocket(WS_URL);
      let messageReceived = false;

      const timeout = setTimeout(() => {
        if (!messageReceived) {
          ws.close();
          done(new Error('WebSocket message timeout'));
        }
      }, WS_TIMEOUT_MS);

      ws.onopen = () => {
        // Authenticate
        ws.send(
          JSON.stringify({
            action: 'auth',
            token: trader1Token,
          })
        );

        // Subscribe to orders stream
        ws.send(
          JSON.stringify({
            action: 'subscribe',
            stream: 'orders',
          })
        );

        // Place order via REST API (should trigger WebSocket message)
        setTimeout(() => {
          apiClient.post(
            '/trading/orders',
            {
              symbol: 'BTC/USDT',
              side: 'buy',
              type: 'limit',
              quantity: 0.05,
              price: 44000,
            },
            {
              headers: { Authorization: `Bearer ${trader1Token}` },
            }
          );
        }, 500);
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'order_created') {
          messageReceived = true;
          expect(message.data.symbol).toBe('BTC/USDT');
          expect(message.data.status).toBe('OPEN');
          clearTimeout(timeout);
          ws.close();
          done();
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        done(error);
      };
    });
  });

  /**
   * Multi-User Concurrent Orders
   */
  describe('TC-INT-007: Concurrent Order Processing', () => {
    it('should handle multiple concurrent orders from same user', async () => {
      const promises = [];

      // Place 5 concurrent buy orders
      for (let i = 0; i < 5; i++) {
        promises.push(
          apiClient.post(
            '/trading/orders',
            {
              symbol: 'BTC/USDT',
              side: 'buy',
              type: 'limit',
              quantity: 0.1,
              price: 42000 + i * 100,
            },
            {
              headers: { Authorization: `Bearer ${trader1Token}` },
            }
          )
        );
      }

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.data.order).toBeDefined();
      });

      // Verify all orders in order book
      const orders = await apiClient.get('/trading/orders', {
        headers: { Authorization: `Bearer ${trader1Token}` },
      });

      expect(orders.status).toBe(200);
      expect(orders.data.length).toBeGreaterThanOrEqual(5);
    });
  });

  /**
   * Cancel Order
   */
  describe('Order Cancellation', () => {
    it('should cancel open order', async () => {
      // Create order
      const order = await apiClient.post(
        '/trading/orders',
        {
          symbol: 'ETH/USDT',
          side: 'sell',
          type: 'limit',
          quantity: 0.2,
          price: 99999,
        },
        {
          headers: { Authorization: `Bearer ${trader1Token}` },
        }
      );

      const orderId = order.data.order.id;

      // Cancel it
      const cancel = await apiClient.post(
        `/trading/orders/${orderId}/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${trader1Token}` },
        }
      );

      expect(cancel.status).toBe(200);
      expect(cancel.data.order.status).toBe('CANCELLED');

      // Verify balance unlocked
      const balance = await apiClient.get('/wallet/balances', {
        headers: { Authorization: `Bearer ${trader1Token}` },
      });

      const ethBalance = balance.data.find((b: any) => b.asset === 'ETH');
      expect(ethBalance.locked).toBeLessThan(0.2);
    });
  });

  /**
   * Cleanup: Cancel all open orders
   */
  afterAll(async () => {
    // Cancel all open orders from traders
    const ordersTrader1 = await apiClient.get('/trading/orders', {
      headers: { Authorization: `Bearer ${trader1Token}` },
    });

    for (const order of ordersTrader1.data) {
      if (order.status === 'OPEN') {
        await apiClient.post(
          `/trading/orders/${order.id}/cancel`,
          {},
          {
            headers: { Authorization: `Bearer ${trader1Token}` },
          }
        );
      }
    }

    const ordersTrader2 = await apiClient.get('/trading/orders', {
      headers: { Authorization: `Bearer ${trader2Token}` },
    });

    for (const order of ordersTrader2.data) {
      if (order.status === 'OPEN') {
        await apiClient.post(
          `/trading/orders/${order.id}/cancel`,
          {},
          {
            headers: { Authorization: `Bearer ${trader2Token}` },
          }
        );
      }
    }

    console.log('Test cleanup complete');
  });
});

/**
 * Performance Tests
 */
describe('Performance & Load Tests', () => {
  let apiClient: AxiosInstance;
  let testToken: string;

  beforeAll(async () => {
    apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: TIMEOUT_MS,
    });

    // Register perf test user
    const response = await apiClient.post('/auth/register', {
      email: `perftest_${Date.now()}@test.local`,
      password: 'TestPass123!',
      firstName: 'Perf',
      lastName: 'Test',
    });

    testToken = response.data.token;
  });

  /**
   * TC-INT-019: p99 Latency Benchmark
   */
  it('should maintain p99 latency under 100ms', async () => {
    const latencies: number[] = [];
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();

      await apiClient.post(
        '/trading/orders',
        {
          symbol: 'BTC/USDT',
          side: i % 2 === 0 ? 'buy' : 'sell',
          type: 'limit',
          quantity: 0.01,
          price: 45000 + Math.random() * 1000,
        },
        {
          headers: { Authorization: `Bearer ${testToken}` },
        }
      );

      const latency = Date.now() - start;
      latencies.push(latency);
    }

    // Calculate percentiles
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    console.log(`Latency Percentiles: p50=${p50}ms, p95=${p95}ms, p99=${p99}ms`);

    expect(p99).toBeLessThan(100);
  }, 60000); // 60 second timeout
});

export {};
