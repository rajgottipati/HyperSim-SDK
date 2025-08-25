import { EventEmitter } from 'events';
import { WebSocketOptions, WebSocketMessage, SubscriptionType, ConnectionState } from '../types/common.js';
import { HyperSimError, NetworkError } from '../core/errors.js';

/**
 * WebSocket client for real-time data streaming from Hyperliquid
 * Implements streaming-first architecture with robust connection management
 */
export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private options: WebSocketOptions;
  private connectionState: ConnectionState = 'disconnected';
  private subscriptions: Map<string, SubscriptionType> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | undefined;
  private connectionTimeout: NodeJS.Timeout | undefined;
  private messageQueue: WebSocketMessage[] = [];
  private isReconnecting = false;

  constructor(url: string = 'wss://api.hyperliquid.xyz/ws', options: WebSocketOptions = {}) {
    super();
    this.url = url;
    this.options = {
      reconnect: true,
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      pingInterval: 30000,
      connectionTimeout: 10000,
      ...options
    };
  }

  /**
   * Establish WebSocket connection with retry logic
   */
  public async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.connectionState = 'connecting';
    
    return new Promise((resolve, reject) => {
      try {
        // Use WebSocket for both Node.js and browser environments
        const WSConstructor = typeof window !== 'undefined' 
          ? window.WebSocket 
          : eval('require')('ws');
        
        const ws = new WSConstructor(this.url);
        this.ws = ws;
        
        // Connection timeout
        this.connectionTimeout = setTimeout(() => {
          if (this.connectionState === 'connecting') {
            ws.close();
            reject(new NetworkError(`Connection timeout after ${this.options.connectionTimeout}ms`));
          }
        }, this.options.connectionTimeout);

        ws.onopen = (event: Event) => {
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = undefined;
          }
          
          this.setupPingInterval();
          this.resubscribeAll();
          this.processMessageQueue();
          
          this.emit('connected');
          resolve();
        };

        ws.onmessage = (event: MessageEvent) => {
          this.handleMessage(event.data);
        };

        ws.onclose = (event: CloseEvent) => {
          this.handleDisconnection(event.code, event.reason);
        };

        ws.onerror = (error: Event) => {
          this.emit('error', new NetworkError(`WebSocket error: ${error}`));
        };

      } catch (error) {
        this.connectionState = 'disconnected';
        reject(new NetworkError(`Failed to create WebSocket connection: ${error}`));
      }
    });
  }

  /**
   * Subscribe to real-time data stream
   */
  public subscribe(subscription: SubscriptionType): void {
    const key = this.getSubscriptionKey(subscription);
    this.subscriptions.set(key, subscription);

    const message: WebSocketMessage = {
      method: 'subscribe',
      subscription
    };

    this.sendMessage(message);
  }

  /**
   * Unsubscribe from data stream
   */
  public unsubscribe(subscription: SubscriptionType): void {
    const key = this.getSubscriptionKey(subscription);
    this.subscriptions.delete(key);

    const message: WebSocketMessage = {
      method: 'unsubscribe',
      subscription
    };

    this.sendMessage(message);
  }

  /**
   * Send message to WebSocket server
   */
  private sendMessage(message: WebSocketMessage): void {
    if (this.connectionState === 'connected' && this.ws?.readyState === 1) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        this.emit('error', new NetworkError(`Failed to send message: ${error}`));
      }
    } else {
      // Queue message for later if not connected
      this.messageQueue.push(message);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      // Handle different message types
      if (message.channel) {
        this.emit('data', {
          channel: message.channel,
          data: message.data,
          timestamp: Date.now()
        });
      } else if (message.type === 'pong') {
        this.emit('pong');
      } else {
        this.emit('message', message);
      }
    } catch (error) {
      this.emit('error', new HyperSimError(`Failed to parse WebSocket message: ${error}`));
    }
  }

  /**
   * Handle WebSocket disconnection with reconnection logic
   */
  private handleDisconnection(code: number, reason: string): void {
    this.connectionState = 'disconnected';
    this.clearPingInterval();
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    this.emit('disconnected', { code, reason });

    // Attempt reconnection if enabled and not a manual close
    if (this.options.reconnect && code !== 1000 && !this.isReconnecting) {
      this.attemptReconnection();
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private async attemptReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );
    
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        this.emit('reconnectFailed', error);
        this.attemptReconnection();
      }
    }, delay);
  }

  /**
   * Setup ping interval to keep connection alive
   */
  private setupPingInterval(): void {
    if (this.options.pingInterval) {
      this.pingInterval = setInterval(() => {
        if (this.connectionState === 'connected') {
          this.ping();
        }
      }, this.options.pingInterval);
    }
  }

  /**
   * Clear ping interval
   */
  private clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }

  /**
   * Send ping to keep connection alive
   */
  private ping(): void {
    this.sendMessage({ method: 'ping' });
  }

  /**
   * Resubscribe to all active subscriptions after reconnection
   */
  private resubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      const message: WebSocketMessage = {
        method: 'subscribe',
        subscription
      };
      this.sendMessage(message);
    });
  }

  /**
   * Process queued messages after reconnection
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  /**
   * Generate unique key for subscription tracking
   */
  private getSubscriptionKey(subscription: SubscriptionType): string {
    return JSON.stringify(subscription);
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get active subscriptions
   */
  public getSubscriptions(): SubscriptionType[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Close WebSocket connection
   */
  public disconnect(): void {
    this.options.reconnect = false;
    this.clearPingInterval();
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.connectionState = 'disconnected';
    this.subscriptions.clear();
    this.messageQueue = [];
  }

  /**
   * Check if WebSocket is connected
   */
  public isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === 1;
  }
}

/**
 * Factory function to create WebSocket client with default configuration
 */
export function createWebSocketClient(options?: WebSocketOptions): WebSocketClient {
  return new WebSocketClient('wss://api.hyperliquid.xyz/ws', options);
}

/**
 * WebSocket client with connection pooling for high-throughput applications
 */
export class PooledWebSocketClient {
  private pools: Map<string, WebSocketClient[]> = new Map();
  private currentIndex: Map<string, number> = new Map();
  private poolSize: number;

  constructor(poolSize: number = 3) {
    this.poolSize = poolSize;
  }

  /**
   * Get or create a WebSocket connection from the pool
   */
  public async getConnection(url?: string): Promise<WebSocketClient> {
    const poolKey = url || 'default';
    
    if (!this.pools.has(poolKey)) {
      this.pools.set(poolKey, []);
      this.currentIndex.set(poolKey, 0);
    }
    
    const pool = this.pools.get(poolKey)!;
    
    if (pool.length < this.poolSize) {
      const client = new WebSocketClient(url);
      await client.connect();
      pool.push(client);
      return client;
    }
    
    // Round-robin selection from existing pool
    const index = this.currentIndex.get(poolKey)! % pool.length;
    this.currentIndex.set(poolKey, index + 1);
    
    const client = pool[index];
    if (!client) {
      throw new Error(`Client not found at index ${index}`);
    }
    
    if (!client.isConnected()) {
      await client.connect();
    }
    
    return client;
  }

  /**
   * Close all connections in all pools
   */
  public disconnect(): void {
    this.pools.forEach((pool) => {
      pool.forEach((client) => client.disconnect());
    });
    this.pools.clear();
    this.currentIndex.clear();
  }
}