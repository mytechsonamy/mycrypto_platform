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

  constructor(
    private readonly marketService: MarketService,
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

    // Clean up client subscriptions
    const subscriptions = this.clientSubscriptions.get(client.id);
    if (subscriptions) {
      subscriptions.forEach((symbol) => {
        this.unsubscribeFromSymbol(client.id, symbol);
      });
      this.clientSubscriptions.delete(client.id);
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
}
