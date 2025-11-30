import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MarketService } from '../services/market.service';
import { TickerService } from '../services/ticker.service';
import { UserOrderHighlightService } from '../services/user-order-highlight.service';

interface OrderbookSubscription {
  symbol: string;
  depth?: number;
}

interface OrderbookMessage {
  type: 'orderbook_snapshot' | 'orderbook_update';
  symbol: string;
  bids: Array<[string, string]>;
  asks: Array<[string, string]>;
  lastUpdateId: number;
  timestamp: string;
}

interface TickerSubscription {
  symbol: string;
  interval?: number; // Update interval in milliseconds (default: 1000ms = 1 second)
}

interface TickerUpdateMessage {
  type: 'ticker_update';
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  timestamp: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure based on environment
  },
  namespace: '/market',
})
export class MarketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MarketGateway.name);
  private clientSubscriptions: Map<string, Set<string>> = new Map(); // clientId -> Set<symbol>
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map(); // symbol -> interval
  private userOrderSubscriptions: Map<string, string> = new Map(); // clientId -> userId
  private readonly UPDATE_INTERVAL_MS = 100; // Batch updates every 100ms

  // Ticker-specific subscriptions and state
  private tickerSubscriptions: Map<string, Set<string>> = new Map(); // clientId -> Set<symbol>
  private tickerIntervals: Map<string, NodeJS.Timeout> = new Map(); // symbol -> interval
  private lastTickerData: Map<string, TickerUpdateMessage> = new Map(); // symbol -> last ticker data for delta detection
  private readonly DEFAULT_TICKER_INTERVAL_MS = 1000; // 1 second default interval

  constructor(
    private readonly marketService: MarketService,
    private readonly tickerService: TickerService,
    private readonly userOrderHighlightService: UserOrderHighlightService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.clientSubscriptions.set(client.id, new Set());

    // Send welcome message
    client.emit('connection', {
      type: 'welcome',
      message: 'Connected to MyCrypto Market WebSocket',
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Clean up orderbook subscriptions
    const subscriptions = this.clientSubscriptions.get(client.id);
    if (subscriptions) {
      subscriptions.forEach((symbol) => {
        this.unsubscribeFromSymbol(client.id, symbol);
      });
      this.clientSubscriptions.delete(client.id);
    }

    // Clean up ticker subscriptions
    const tickerSubs = this.tickerSubscriptions.get(client.id);
    if (tickerSubs) {
      tickerSubs.forEach((symbol) => {
        this.unsubscribeFromTicker(client.id, symbol);
      });
      this.tickerSubscriptions.delete(client.id);
    }

    // Clean up user order subscriptions
    this.userOrderSubscriptions.delete(client.id);
  }

  /**
   * Handle orderbook subscription
   * Client sends: { symbol: 'BTC_TRY', depth: 20 }
   */
  @SubscribeMessage('subscribe_orderbook')
  async handleSubscribeOrderbook(
    @MessageBody() data: OrderbookSubscription,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { symbol, depth = 20 } = data;

      this.logger.log(`Client ${client.id} subscribing to orderbook:${symbol}`);

      // Add to client's subscriptions
      const clientSubs = this.clientSubscriptions.get(client.id) || new Set();
      clientSubs.add(symbol);
      this.clientSubscriptions.set(client.id, clientSubs);

      // Send initial snapshot
      await this.sendOrderbookSnapshot(client, symbol, depth);

      // Start periodic updates if not already running
      if (!this.updateIntervals.has(symbol)) {
        this.startOrderbookUpdates(symbol, depth);
      }

      // Send subscription confirmation
      client.emit('subscribed', {
        type: 'subscription_confirmed',
        channel: `orderbook:${symbol}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Subscription error for client ${client.id}: ${error.message}`);
      client.emit('error', {
        type: 'subscription_error',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle orderbook unsubscription
   * Client sends: { symbol: 'BTC_TRY' }
   */
  @SubscribeMessage('unsubscribe_orderbook')
  handleUnsubscribeOrderbook(
    @MessageBody() data: { symbol: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { symbol } = data;

    this.logger.log(`Client ${client.id} unsubscribing from orderbook:${symbol}`);

    this.unsubscribeFromSymbol(client.id, symbol);

    client.emit('unsubscribed', {
      type: 'unsubscription_confirmed',
      channel: `orderbook:${symbol}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle heartbeat ping
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', {
      type: 'pong',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle user order highlighting subscription
   * Client sends: { userId: 'user-uuid' }
   */
  @SubscribeMessage('subscribe_user_orders')
  async handleSubscribeUserOrders(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { userId } = data;

      if (!userId) {
        throw new Error('User ID is required');
      }

      this.logger.log(`Client ${client.id} subscribing to user_orders for ${userId}`);

      // Store user subscription
      this.userOrderSubscriptions.set(client.id, userId);

      // Send initial highlighted prices
      await this.sendUserOrderPrices(client, userId);

      // Send subscription confirmation
      client.emit('subscribed', {
        type: 'subscription_confirmed',
        channel: `user_orders:${userId}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`User order subscription error for client ${client.id}: ${error.message}`);
      client.emit('error', {
        type: 'subscription_error',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle user order highlighting unsubscription
   */
  @SubscribeMessage('unsubscribe_user_orders')
  handleUnsubscribeUserOrders(@ConnectedSocket() client: Socket) {
    const userId = this.userOrderSubscriptions.get(client.id);

    if (userId) {
      this.logger.log(`Client ${client.id} unsubscribing from user_orders for ${userId}`);
      this.userOrderSubscriptions.delete(client.id);

      client.emit('unsubscribed', {
        type: 'unsubscription_confirmed',
        channel: `user_orders:${userId}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Send user order prices to client
   */
  private async sendUserOrderPrices(client: Socket, userId: string) {
    try {
      const prices = await this.userOrderHighlightService.getHighlightedPrices(userId);
      const event = this.userOrderHighlightService.buildUserOrderPricesEvent(userId, prices);

      client.emit('user_order_prices', event);
    } catch (error) {
      this.logger.error(`Failed to send user order prices for ${userId}: ${error.message}`);
      client.emit('error', {
        type: 'user_order_prices_error',
        userId,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Broadcast user order price updates (call when orders change)
   */
  async broadcastUserOrderUpdate(userId: string) {
    try {
      const prices = await this.userOrderHighlightService.getHighlightedPrices(userId);
      const event = this.userOrderHighlightService.buildUserOrderPricesEvent(userId, prices);

      // Find all clients subscribed to this user's orders
      this.userOrderSubscriptions.forEach((subscribedUserId, clientId) => {
        if (subscribedUserId === userId) {
          this.server.to(clientId).emit('user_order_prices', event);
        }
      });

      this.logger.debug(`Broadcasted user order update for ${userId} to subscribed clients`);
    } catch (error) {
      this.logger.error(`Failed to broadcast user order update for ${userId}: ${error.message}`);
    }
  }

  /**
   * Send initial orderbook snapshot to client
   */
  private async sendOrderbookSnapshot(client: Socket, symbol: string, depth: number) {
    try {
      const orderbook = await this.marketService.getOrderbook(symbol, depth);

      const message: OrderbookMessage = {
        type: 'orderbook_snapshot',
        symbol,
        bids: orderbook.bids.map((b) => [b.price, b.quantity]),
        asks: orderbook.asks.map((a) => [a.price, a.quantity]),
        lastUpdateId: orderbook.lastUpdateId,
        timestamp: orderbook.timestamp,
      };

      client.emit(`orderbook:${symbol}`, message);
    } catch (error) {
      this.logger.error(`Failed to send orderbook snapshot for ${symbol}: ${error.message}`);
      client.emit('error', {
        type: 'snapshot_error',
        symbol,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Start periodic orderbook updates for a symbol
   */
  private startOrderbookUpdates(symbol: string, depth: number) {
    const interval = setInterval(async () => {
      try {
        // Get all clients subscribed to this symbol
        const subscribedClients = this.getSubscribedClients(symbol);

        if (subscribedClients.length === 0) {
          // No subscribers, stop updates
          this.stopOrderbookUpdates(symbol);
          return;
        }

        // Fetch latest orderbook
        const orderbook = await this.marketService.getOrderbook(symbol, depth);

        const message: OrderbookMessage = {
          type: 'orderbook_update',
          symbol,
          bids: orderbook.bids.map((b) => [b.price, b.quantity]),
          asks: orderbook.asks.map((a) => [a.price, a.quantity]),
          lastUpdateId: orderbook.lastUpdateId,
          timestamp: orderbook.timestamp,
        };

        // Broadcast to all subscribed clients
        subscribedClients.forEach((clientId) => {
          this.server.to(clientId).emit(`orderbook:${symbol}`, message);
        });
      } catch (error) {
        this.logger.error(`Failed to broadcast orderbook update for ${symbol}: ${error.message}`);
      }
    }, this.UPDATE_INTERVAL_MS);

    this.updateIntervals.set(symbol, interval);
    this.logger.log(`Started orderbook updates for ${symbol} (${this.UPDATE_INTERVAL_MS}ms interval)`);
  }

  /**
   * Stop periodic orderbook updates for a symbol
   */
  private stopOrderbookUpdates(symbol: string) {
    const interval = this.updateIntervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(symbol);
      this.logger.log(`Stopped orderbook updates for ${symbol}`);
    }
  }

  /**
   * Unsubscribe a client from a symbol
   */
  private unsubscribeFromSymbol(clientId: string, symbol: string) {
    const clientSubs = this.clientSubscriptions.get(clientId);
    if (clientSubs) {
      clientSubs.delete(symbol);

      // Stop updates if no clients are subscribed
      if (this.getSubscribedClients(symbol).length === 0) {
        this.stopOrderbookUpdates(symbol);
      }
    }
  }

  /**
   * Get all client IDs subscribed to a symbol
   */
  private getSubscribedClients(symbol: string): string[] {
    const clients: string[] = [];
    this.clientSubscriptions.forEach((symbols, clientId) => {
      if (symbols.has(symbol)) {
        clients.push(clientId);
      }
    });
    return clients;
  }

  /**
   * Handle ticker subscription
   * Client sends: { symbol: 'BTC_TRY', interval?: 1000 }
   * Channel: ticker:{symbol}
   */
  @SubscribeMessage('subscribe_ticker')
  async handleSubscribeTicker(
    @MessageBody() data: TickerSubscription,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { symbol, interval = this.DEFAULT_TICKER_INTERVAL_MS } = data;

      // Validate interval (min 100ms, max 60s)
      if (interval < 100 || interval > 60000) {
        throw new Error('Interval must be between 100ms and 60000ms');
      }

      this.logger.log(`Client ${client.id} subscribing to ticker:${symbol} with ${interval}ms interval`);

      // Add to client's ticker subscriptions
      const clientTickerSubs = this.tickerSubscriptions.get(client.id) || new Set();
      clientTickerSubs.add(symbol);
      this.tickerSubscriptions.set(client.id, clientTickerSubs);

      // Send initial ticker data
      await this.sendTickerSnapshot(client, symbol);

      // Start periodic updates if not already running for this symbol
      if (!this.tickerIntervals.has(symbol)) {
        this.startTickerUpdates(symbol, interval);
      }

      // Send subscription confirmation
      client.emit('subscribed', {
        type: 'subscription_confirmed',
        channel: `ticker:${symbol}`,
        interval,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Ticker subscription error for client ${client.id}: ${error.message}`);
      client.emit('error', {
        type: 'ticker_subscription_error',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle ticker unsubscription
   * Client sends: { symbol: 'BTC_TRY' }
   */
  @SubscribeMessage('unsubscribe_ticker')
  handleUnsubscribeTicker(
    @MessageBody() data: { symbol: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { symbol } = data;

    this.logger.log(`Client ${client.id} unsubscribing from ticker:${symbol}`);

    this.unsubscribeFromTicker(client.id, symbol);

    client.emit('unsubscribed', {
      type: 'unsubscription_confirmed',
      channel: `ticker:${symbol}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send initial ticker snapshot to client
   */
  private async sendTickerSnapshot(client: Socket, symbol: string) {
    try {
      const ticker = await this.tickerService.getTicker(symbol);

      const message: TickerUpdateMessage = {
        type: 'ticker_update',
        symbol,
        lastPrice: ticker.lastPrice,
        priceChange: ticker.priceChange,
        priceChangePercent: ticker.priceChangePercent,
        timestamp: ticker.timestamp,
      };

      client.emit(`ticker:${symbol}`, message);

      // Store as last data for delta detection
      this.lastTickerData.set(symbol, message);
    } catch (error) {
      this.logger.error(`Failed to send ticker snapshot for ${symbol}: ${error.message}`);
      client.emit('error', {
        type: 'ticker_snapshot_error',
        symbol,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Start periodic ticker updates for a symbol
   * Implements delta updates: only broadcast if price changed
   */
  private startTickerUpdates(symbol: string, intervalMs: number) {
    const interval = setInterval(async () => {
      try {
        // Get all clients subscribed to this ticker
        const subscribedClients = this.getTickerSubscribedClients(symbol);

        if (subscribedClients.length === 0) {
          // No subscribers, stop updates
          this.stopTickerUpdates(symbol);
          return;
        }

        // Fetch latest ticker data
        const ticker = await this.tickerService.getTicker(symbol);

        const message: TickerUpdateMessage = {
          type: 'ticker_update',
          symbol,
          lastPrice: ticker.lastPrice,
          priceChange: ticker.priceChange,
          priceChangePercent: ticker.priceChangePercent,
          timestamp: ticker.timestamp,
        };

        // Delta detection: only send if price changed
        const lastData = this.lastTickerData.get(symbol);
        const priceChanged = !lastData || lastData.lastPrice !== message.lastPrice;

        if (priceChanged) {
          // Price changed - broadcast to all subscribed clients
          subscribedClients.forEach((clientId) => {
            this.server.to(clientId).emit(`ticker:${symbol}`, message);
          });

          // Update last data
          this.lastTickerData.set(symbol, message);

          this.logger.debug(
            `Broadcasted ticker update for ${symbol} to ${subscribedClients.length} clients (price: ${message.lastPrice})`,
          );
        } else {
          this.logger.debug(`Skipped ticker update for ${symbol} (no price change)`);
        }
      } catch (error) {
        this.logger.error(`Failed to broadcast ticker update for ${symbol}: ${error.message}`);
      }
    }, intervalMs);

    this.tickerIntervals.set(symbol, interval);
    this.logger.log(`Started ticker updates for ${symbol} (${intervalMs}ms interval)`);
  }

  /**
   * Stop periodic ticker updates for a symbol
   */
  private stopTickerUpdates(symbol: string) {
    const interval = this.tickerIntervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.tickerIntervals.delete(symbol);
      this.lastTickerData.delete(symbol);
      this.logger.log(`Stopped ticker updates for ${symbol}`);
    }
  }

  /**
   * Unsubscribe a client from a ticker
   */
  private unsubscribeFromTicker(clientId: string, symbol: string) {
    const clientSubs = this.tickerSubscriptions.get(clientId);
    if (clientSubs) {
      clientSubs.delete(symbol);

      // Stop updates if no clients are subscribed
      if (this.getTickerSubscribedClients(symbol).length === 0) {
        this.stopTickerUpdates(symbol);
      }
    }
  }

  /**
   * Get all client IDs subscribed to a ticker symbol
   */
  private getTickerSubscribedClients(symbol: string): string[] {
    const clients: string[] = [];
    this.tickerSubscriptions.forEach((symbols, clientId) => {
      if (symbols.has(symbol)) {
        clients.push(clientId);
      }
    });
    return clients;
  }
}
