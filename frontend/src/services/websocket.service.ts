/**
 * WebSocket service for real-time trading data
 * Uses native WebSocket API for compatibility
 */

import { WebSocketMessage, WebSocketMessageType, TradingPair } from '../types/trading.types';

type MessageCallback = (data: WebSocketMessage) => void;
type ErrorCallback = (error: Event) => void;
type CloseCallback = () => void;

interface SubscriptionCallbacks {
  onMessage: MessageCallback;
  onError?: ErrorCallback;
  onClose?: CloseCallback;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private subscriptions: Set<string> = new Set();
  private messageCallbacks: Map<string, MessageCallback[]> = new Map();
  private globalMessageCallback: MessageCallback | null = null;
  private isReconnecting = false;
  private shouldReconnect = true;
  private token: string | null = null;

  constructor(url?: string) {
    this.url = url || process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws';
  }

  /**
   * Connect to WebSocket server
   * @param token - Authentication token (optional)
   */
  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          resolve();
          return;
        }

        this.token = token || null;
        this.shouldReconnect = true;

        // Build URL with token if provided
        const wsUrl = this.token ? `${this.url}?token=${this.token}` : this.url;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected');
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.startHeartbeat();

          // Resubscribe to channels after reconnection
          if (this.isReconnecting && this.subscriptions.size > 0) {
            this.subscriptions.forEach((channel) => {
              this.sendMessage({ action: 'subscribe', channel });
            });
          }

          this.isReconnecting = false;
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[WebSocket] Disconnected');
          this.stopHeartbeat();

          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.handleReconnect();
          }
        };
      } catch (error) {
        console.error('[WebSocket] Connection error:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscriptions.clear();
    this.messageCallbacks.clear();
    this.globalMessageCallback = null;
  }

  /**
   * Subscribe to a channel
   * @param channel - Channel name (e.g., 'orderbook:BTC_TRY')
   */
  subscribe(channel: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot subscribe, not connected');
      return;
    }

    this.subscriptions.add(channel);
    this.sendMessage({ action: 'subscribe', channel });
  }

  /**
   * Unsubscribe from a channel
   * @param channel - Channel name
   */
  unsubscribe(channel: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot unsubscribe, not connected');
      return;
    }

    this.subscriptions.delete(channel);
    this.messageCallbacks.delete(channel);
    this.sendMessage({ action: 'unsubscribe', channel });
  }

  /**
   * Subscribe to order book updates for a symbol
   */
  subscribeToOrderBook(symbol: TradingPair, callback: MessageCallback): void {
    const channel = `orderbook:${symbol}`;
    this.subscribe(channel);
    this.addMessageCallback(channel, callback);
  }

  /**
   * Subscribe to ticker updates for a symbol
   */
  subscribeToTicker(symbol: TradingPair, callback: MessageCallback): void {
    const channel = `ticker:${symbol}`;
    this.subscribe(channel);
    this.addMessageCallback(channel, callback);
  }

  /**
   * Subscribe to trade updates for a symbol
   */
  subscribeToTrades(symbol: TradingPair, callback: MessageCallback): void {
    const channel = `trades:${symbol}`;
    this.subscribe(channel);
    this.addMessageCallback(channel, callback);
  }

  /**
   * Subscribe to private order updates (requires authentication)
   */
  subscribeToOrders(callback: MessageCallback): void {
    const channel = 'orders';
    this.subscribe(channel);
    this.addMessageCallback(channel, callback);
  }

  /**
   * Subscribe to private balance updates (requires authentication)
   */
  subscribeToBalances(callback: MessageCallback): void {
    const channel = 'balances';
    this.subscribe(channel);
    this.addMessageCallback(channel, callback);
  }

  /**
   * Register a global message callback
   */
  onMessage(callback: MessageCallback): void {
    this.globalMessageCallback = callback;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get current subscriptions
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      // Handle ping/pong for heartbeat
      if ((message as any).type === 'ping') {
        this.sendMessage({ type: 'pong' });
        this.resetHeartbeatTimeout();
        return;
      }

      // Extract channel from message type and symbol
      let channel = '';
      if ('symbol' in message) {
        const typePrefix = message.type.replace('_', '').toLowerCase();
        channel = `${typePrefix}:${message.symbol}`;
      } else if (message.type === WebSocketMessageType.ORDER_UPDATE) {
        channel = 'orders';
      } else if (message.type === WebSocketMessageType.BALANCE_UPDATE) {
        channel = 'balances';
      }

      // Call channel-specific callbacks
      const callbacks = this.messageCallbacks.get(channel) || [];
      callbacks.forEach((callback) => callback(message));

      // Call global callback
      if (this.globalMessageCallback) {
        this.globalMessageCallback(message);
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  /**
   * Send a message to the WebSocket server
   */
  private sendMessage(data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send message, not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify(data));
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error);
    }
  }

  /**
   * Add a callback for a specific channel
   */
  private addMessageCallback(channel: string, callback: MessageCallback): void {
    const callbacks = this.messageCallbacks.get(channel) || [];
    callbacks.push(callback);
    this.messageCallbacks.set(channel, callbacks);
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnect(): void {
    if (this.isReconnecting) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    console.log(
      `[WebSocket] Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    setTimeout(() => {
      this.connect(this.token || undefined)
        .then(() => {
          console.log('[WebSocket] Reconnected successfully');
        })
        .catch((error) => {
          console.error('[WebSocket] Reconnection failed:', error);
          this.isReconnecting = false;
        });
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    // Send ping every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendMessage({ type: 'ping' });
        this.setHeartbeatTimeout();
      }
    }, 30000);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * Set heartbeat timeout (close connection if no pong received)
   */
  private setHeartbeatTimeout(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
    }

    this.heartbeatTimeout = setTimeout(() => {
      console.warn('[WebSocket] Heartbeat timeout, closing connection');
      if (this.ws) {
        this.ws.close();
      }
    }, 35000); // 5 seconds after ping
  }

  /**
   * Reset heartbeat timeout
   */
  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();

export default websocketService;
