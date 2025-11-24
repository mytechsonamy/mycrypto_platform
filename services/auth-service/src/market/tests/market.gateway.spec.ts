import { Test, TestingModule } from '@nestjs/testing';
import { MarketGateway } from '../gateways/market.gateway';
import { MarketService } from '../services/market.service';
import { Socket } from 'socket.io';

describe('MarketGateway', () => {
  let gateway: MarketGateway;
  let marketService: MarketService;

  const mockMarketService = {
    getOrderbook: jest.fn(),
  };

  const mockSocket: Partial<Socket> = {
    id: 'mock-socket-id',
    emit: jest.fn(),
    on: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
  };

  const mockServer = {
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketGateway,
        {
          provide: MarketService,
          useValue: mockMarketService,
        },
      ],
    }).compile();

    gateway = module.get<MarketGateway>(MarketGateway);
    marketService = module.get<MarketService>(MarketService);
    gateway.server = mockServer as any;

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clear all intervals to prevent memory leaks
    gateway['updateIntervals'].forEach((interval) => clearInterval(interval));
    gateway['updateIntervals'].clear();
  });

  describe('Gateway Lifecycle', () => {
    it('should initialize gateway successfully', () => {
      const spy = jest.spyOn(gateway['logger'], 'log');
      gateway.afterInit(mockServer as any);

      expect(spy).toHaveBeenCalledWith('WebSocket Gateway initialized');
    });

    it('should handle client connection', () => {
      gateway.handleConnection(mockSocket as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith('connection', {
        type: 'welcome',
        message: 'Connected to MyCrypto Market WebSocket',
        timestamp: expect.any(String),
      });
      expect(gateway['clientSubscriptions'].has(mockSocket.id)).toBe(true);
    });

    it('should handle client disconnection and cleanup subscriptions', () => {
      const socket = mockSocket as Socket;

      // Setup: connect and subscribe
      gateway.handleConnection(socket);
      gateway['clientSubscriptions'].set(socket.id, new Set(['BTC_TRY']));

      // Disconnect
      gateway.handleDisconnect(socket);

      expect(gateway['clientSubscriptions'].has(socket.id)).toBe(false);
    });
  });

  describe('Orderbook Subscription', () => {
    it('should handle orderbook subscription successfully', async () => {
      const socket = mockSocket as Socket;
      const subscriptionData = {
        symbol: 'BTC_TRY',
        depth: 20,
      };

      const orderbookData = {
        symbol: 'BTC_TRY',
        bids: [{ price: '50000', quantity: '1.0' }],
        asks: [{ price: '50001', quantity: '1.0' }],
        lastUpdateId: 12345,
        spread: '1.00000000',
        timestamp: '2025-11-24T00:00:00.000Z',
      };

      mockMarketService.getOrderbook.mockResolvedValue(orderbookData);
      gateway.handleConnection(socket);

      await gateway.handleSubscribeOrderbook(subscriptionData, socket);

      // Verify client was subscribed
      const clientSubs = gateway['clientSubscriptions'].get(socket.id);
      expect(clientSubs?.has('BTC_TRY')).toBe(true);

      // Verify initial snapshot was sent
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'orderbook:BTC_TRY',
        expect.objectContaining({
          type: 'orderbook_snapshot',
          symbol: 'BTC_TRY',
          bids: [['50000', '1.0']],
          asks: [['50001', '1.0']],
        })
      );

      // Verify subscription confirmation was sent
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribed', {
        type: 'subscription_confirmed',
        channel: 'orderbook:BTC_TRY',
        timestamp: expect.any(String),
      });

      // Verify periodic updates were started
      expect(gateway['updateIntervals'].has('BTC_TRY')).toBe(true);
    });

    it('should use default depth of 20 if not provided', async () => {
      const socket = mockSocket as Socket;
      const subscriptionData = {
        symbol: 'BTC_TRY',
      };

      const orderbookData = {
        symbol: 'BTC_TRY',
        bids: [],
        asks: [],
        lastUpdateId: 12346,
        spread: '0',
        timestamp: '2025-11-24T00:00:00.000Z',
      };

      mockMarketService.getOrderbook.mockResolvedValue(orderbookData);
      gateway.handleConnection(socket);

      await gateway.handleSubscribeOrderbook(subscriptionData, socket);

      expect(mockMarketService.getOrderbook).toHaveBeenCalledWith('BTC_TRY', 20);
    });

    it('should handle subscription error and emit error message', async () => {
      const socket = mockSocket as Socket;
      const subscriptionData = {
        symbol: 'BTC_TRY',
        depth: 20,
      };

      mockMarketService.getOrderbook.mockRejectedValue(new Error('Service unavailable'));
      gateway.handleConnection(socket);

      await gateway.handleSubscribeOrderbook(subscriptionData, socket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        type: 'subscription_error',
        message: 'Service unavailable',
        timestamp: expect.any(String),
      });
    });

    it('should allow multiple clients to subscribe to the same symbol', async () => {
      const socket1 = { ...mockSocket, id: 'socket-1', emit: jest.fn() } as any;
      const socket2 = { ...mockSocket, id: 'socket-2', emit: jest.fn() } as any;

      const orderbookData = {
        symbol: 'BTC_TRY',
        bids: [],
        asks: [],
        lastUpdateId: 12347,
        spread: '0',
        timestamp: '2025-11-24T00:00:00.000Z',
      };

      mockMarketService.getOrderbook.mockResolvedValue(orderbookData);

      gateway.handleConnection(socket1);
      gateway.handleConnection(socket2);

      await gateway.handleSubscribeOrderbook({ symbol: 'BTC_TRY' }, socket1);
      await gateway.handleSubscribeOrderbook({ symbol: 'BTC_TRY' }, socket2);

      const subscribedClients = gateway['getSubscribedClients']('BTC_TRY');
      expect(subscribedClients).toHaveLength(2);
      expect(subscribedClients).toContain('socket-1');
      expect(subscribedClients).toContain('socket-2');
    });
  });

  describe('Orderbook Unsubscription', () => {
    it('should handle orderbook unsubscription successfully', async () => {
      const socket = mockSocket as Socket;

      // Setup: connect and subscribe
      gateway.handleConnection(socket);
      gateway['clientSubscriptions'].set(socket.id, new Set(['BTC_TRY']));
      gateway['updateIntervals'].set('BTC_TRY', setInterval(() => {}, 1000));

      // Unsubscribe
      gateway.handleUnsubscribeOrderbook({ symbol: 'BTC_TRY' }, socket);

      const clientSubs = gateway['clientSubscriptions'].get(socket.id);
      expect(clientSubs?.has('BTC_TRY')).toBe(false);

      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribed', {
        type: 'unsubscription_confirmed',
        channel: 'orderbook:BTC_TRY',
        timestamp: expect.any(String),
      });

      // Verify updates were stopped (no more subscribers)
      expect(gateway['updateIntervals'].has('BTC_TRY')).toBe(false);
    });

    it('should not stop updates if other clients are still subscribed', async () => {
      const socket1 = { ...mockSocket, id: 'socket-1', emit: jest.fn() } as any;
      const socket2 = { ...mockSocket, id: 'socket-2', emit: jest.fn() } as any;

      gateway.handleConnection(socket1);
      gateway.handleConnection(socket2);
      gateway['clientSubscriptions'].set('socket-1', new Set(['BTC_TRY']));
      gateway['clientSubscriptions'].set('socket-2', new Set(['BTC_TRY']));
      gateway['updateIntervals'].set('BTC_TRY', setInterval(() => {}, 1000));

      // Unsubscribe socket1
      gateway.handleUnsubscribeOrderbook({ symbol: 'BTC_TRY' }, socket1);

      // Updates should still be running (socket2 is still subscribed)
      expect(gateway['updateIntervals'].has('BTC_TRY')).toBe(true);

      // Unsubscribe socket2
      gateway.handleUnsubscribeOrderbook({ symbol: 'BTC_TRY' }, socket2);

      // Now updates should be stopped
      expect(gateway['updateIntervals'].has('BTC_TRY')).toBe(false);
    });
  });

  describe('Heartbeat', () => {
    it('should respond to ping with pong', () => {
      const socket = mockSocket as Socket;

      gateway.handlePing(socket);

      expect(mockSocket.emit).toHaveBeenCalledWith('pong', {
        type: 'pong',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Periodic Updates', () => {
    it('should stop updates when no clients are subscribed', async () => {
      const socket = mockSocket as Socket;
      const orderbookData = {
        symbol: 'BTC_TRY',
        bids: [],
        asks: [],
        lastUpdateId: 12348,
        spread: '0',
        timestamp: '2025-11-24T00:00:00.000Z',
      };

      mockMarketService.getOrderbook.mockResolvedValue(orderbookData);
      gateway.handleConnection(socket);

      await gateway.handleSubscribeOrderbook({ symbol: 'BTC_TRY' }, socket);

      expect(gateway['updateIntervals'].has('BTC_TRY')).toBe(true);

      // Unsubscribe all clients
      gateway.handleUnsubscribeOrderbook({ symbol: 'BTC_TRY' }, socket);

      expect(gateway['updateIntervals'].has('BTC_TRY')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should emit error if orderbook snapshot fails', async () => {
      const socket = mockSocket as Socket;
      const subscriptionData = {
        symbol: 'BTC_TRY',
        depth: 20,
      };

      mockMarketService.getOrderbook.mockRejectedValue(new Error('Database error'));
      gateway.handleConnection(socket);

      await gateway.handleSubscribeOrderbook(subscriptionData, socket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        type: 'subscription_error',
        message: 'Database error',
        timestamp: expect.any(String),
      });
    });
  });
});
