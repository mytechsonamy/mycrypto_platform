/**
 * Tests for WebSocket service
 */

import websocketService from './websocket.service';
import { WebSocketMessageType } from '../types/trading.types';

// Mock WebSocket
class MockWebSocket {
  public onopen: (() => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((error: Event) => void) | null = null;
  public onclose: (() => void) | null = null;
  public readyState: number = WebSocket.CONNECTING;

  constructor(public url: string) {
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen();
      }
    }, 10);
  }

  send(data: string): void {
    // Mock send
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose();
    }
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe('WebSocketService', () => {
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    jest.clearAllMocks();
    websocketService.disconnect();
  });

  afterEach(() => {
    websocketService.disconnect();
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      await websocketService.connect();
      expect(websocketService.isConnected()).toBe(true);
    });

    it('should connect with authentication token', async () => {
      const token = 'test-token-123';
      await websocketService.connect(token);
      expect(websocketService.isConnected()).toBe(true);
    });

    it('should not connect twice if already connected', async () => {
      await websocketService.connect();
      const firstConnection = websocketService.isConnected();
      await websocketService.connect();
      const secondConnection = websocketService.isConnected();

      expect(firstConnection).toBe(true);
      expect(secondConnection).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await websocketService.connect();
      expect(websocketService.isConnected()).toBe(true);

      websocketService.disconnect();
      expect(websocketService.isConnected()).toBe(false);
    });

    it('should clear subscriptions on disconnect', async () => {
      await websocketService.connect();
      websocketService.subscribe('orderbook:BTC_TRY');
      expect(websocketService.getSubscriptions()).toContain('orderbook:BTC_TRY');

      websocketService.disconnect();
      expect(websocketService.getSubscriptions()).toHaveLength(0);
    });
  });

  describe('subscribe', () => {
    it('should subscribe to a channel', async () => {
      await websocketService.connect();
      websocketService.subscribe('orderbook:BTC_TRY');

      const subscriptions = websocketService.getSubscriptions();
      expect(subscriptions).toContain('orderbook:BTC_TRY');
    });

    it('should not subscribe if not connected', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      websocketService.subscribe('orderbook:BTC_TRY');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[WebSocket] Cannot subscribe, not connected'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from a channel', async () => {
      await websocketService.connect();
      websocketService.subscribe('orderbook:BTC_TRY');
      expect(websocketService.getSubscriptions()).toContain('orderbook:BTC_TRY');

      websocketService.unsubscribe('orderbook:BTC_TRY');
      expect(websocketService.getSubscriptions()).not.toContain('orderbook:BTC_TRY');
    });
  });

  describe('subscribeToOrderBook', () => {
    it('should subscribe to order book channel', async () => {
      await websocketService.connect();
      const callback = jest.fn();

      websocketService.subscribeToOrderBook('BTC_TRY', callback);

      const subscriptions = websocketService.getSubscriptions();
      expect(subscriptions).toContain('orderbook:BTC_TRY');
    });
  });

  describe('subscribeToTicker', () => {
    it('should subscribe to ticker channel', async () => {
      await websocketService.connect();
      const callback = jest.fn();

      websocketService.subscribeToTicker('BTC_TRY', callback);

      const subscriptions = websocketService.getSubscriptions();
      expect(subscriptions).toContain('ticker:BTC_TRY');
    });
  });

  describe('subscribeToTrades', () => {
    it('should subscribe to trades channel', async () => {
      await websocketService.connect();
      const callback = jest.fn();

      websocketService.subscribeToTrades('BTC_TRY', callback);

      const subscriptions = websocketService.getSubscriptions();
      expect(subscriptions).toContain('trades:BTC_TRY');
    });
  });

  describe('subscribeToOrders', () => {
    it('should subscribe to private orders channel', async () => {
      await websocketService.connect('test-token');
      const callback = jest.fn();

      websocketService.subscribeToOrders(callback);

      const subscriptions = websocketService.getSubscriptions();
      expect(subscriptions).toContain('orders');
    });
  });

  describe('subscribeToBalances', () => {
    it('should subscribe to private balances channel', async () => {
      await websocketService.connect('test-token');
      const callback = jest.fn();

      websocketService.subscribeToBalances(callback);

      const subscriptions = websocketService.getSubscriptions();
      expect(subscriptions).toContain('balances');
    });
  });

  describe('message handling', () => {
    it('should handle order book snapshot message', async () => {
      await websocketService.connect();
      const callback = jest.fn();

      websocketService.subscribeToOrderBook('BTC_TRY', callback);

      // Simulate receiving a message
      const message = {
        type: WebSocketMessageType.ORDER_BOOK_SNAPSHOT,
        symbol: 'BTC_TRY',
        data: {
          lastUpdateId: 123,
          bids: [['850000', '0.5']],
          asks: [['850100', '0.3']],
        },
        timestamp: Date.now(),
      };

      // Access the mock WebSocket instance and trigger onmessage
      const ws = (websocketService as any).ws as MockWebSocket;
      if (ws && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', { data: JSON.stringify(message) }));
      }

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(callback).toHaveBeenCalled();
    });

    it('should handle ping/pong messages', async () => {
      await websocketService.connect();

      const ws = (websocketService as any).ws as MockWebSocket;
      const sendSpy = jest.spyOn(ws, 'send');

      if (ws && ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', { data: JSON.stringify({ type: 'ping' }) })
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({ type: 'pong' }));
    });

    it('should call global message callback', async () => {
      await websocketService.connect();
      const globalCallback = jest.fn();

      websocketService.onMessage(globalCallback);

      const message = {
        type: WebSocketMessageType.TICKER_UPDATE,
        symbol: 'BTC_TRY',
        data: {
          symbol: 'BTC_TRY',
          lastPrice: '850000',
          priceChange: '5000',
          priceChangePercent: '0.59',
          highPrice: '855000',
          lowPrice: '840000',
          volume: '123.45',
          quoteVolume: '104925000',
          openTime: Date.now() - 86400000,
          closeTime: Date.now(),
          firstId: 1,
          lastId: 1000,
          count: 1000,
        },
        timestamp: Date.now(),
      };

      const ws = (websocketService as any).ws as MockWebSocket;
      if (ws && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', { data: JSON.stringify(message) }));
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(globalCallback).toHaveBeenCalled();
    });
  });

  describe('connection status', () => {
    it('should return connection status correctly', async () => {
      expect(websocketService.isConnected()).toBe(false);

      await websocketService.connect();
      expect(websocketService.isConnected()).toBe(true);

      websocketService.disconnect();
      expect(websocketService.isConnected()).toBe(false);
    });
  });

  describe('getSubscriptions', () => {
    it('should return list of active subscriptions', async () => {
      await websocketService.connect();

      websocketService.subscribe('orderbook:BTC_TRY');
      websocketService.subscribe('ticker:BTC_TRY');
      websocketService.subscribe('trades:BTC_TRY');

      const subscriptions = websocketService.getSubscriptions();
      expect(subscriptions).toHaveLength(3);
      expect(subscriptions).toContain('orderbook:BTC_TRY');
      expect(subscriptions).toContain('ticker:BTC_TRY');
      expect(subscriptions).toContain('trades:BTC_TRY');
    });
  });
});
