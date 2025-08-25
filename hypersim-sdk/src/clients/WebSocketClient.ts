/**
 * WebSocket streaming client for real-time HyperEVM and HyperCore data
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { Network } from '../types/network';
import { NetworkError, ConnectionError } from '../types/errors';
import { HYPERCORE_ENDPOINTS } from '../utils/constants';

/**
 * WebSocket subscription types
 */
export type SubscriptionType = 
  | 'trades'
  | 'book'
  | 'bbo'
  | 'userFills'
  | 'userOrders'
  | 'userEvents'
  | 'candle'
  | 'l2Book'
  | 'notification';

/**
 * WebSocket subscription request
 */
export interface WSSubscription {
  type: SubscriptionType;
  coin?: string;
  user?: string;
  interval?: string;
}

/**
 * WebSocket message structure
 */
export interface WSMessage {
  channel: string;
  data: any;
  timestamp?: number;
}

/**
 * WebSocket client configuration
 */
export interface WebSocketClientConfig {
  /** Network to connect to */
  network: Network;
  /** Custom WebSocket endpoint */
  wsEndpoint?: string;
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  /** Reconnect interval in milliseconds */
  reconnectInterval?: number;
  /** Max reconnection attempts */
  maxReconnectAttempts?: number;
  /** Heartbeat interval in milliseconds */
  heartbeatInterval?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Enable compression */
  compression?: boolean;
}

/**
 * Connection states
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * WebSocket streaming client for HyperEVM real-time data
 */
export class WebSocketClient extends EventEmitter {
  private readonly config: Required<WebSocketClientConfig>;
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private subscriptions = new Set<string>();
  private reconnectAttempts = 0;
  private heartbeatTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private connectionTimer?: NodeJS.Timeout;
  private lastHeartbeat = 0;
  private messageQueue: any[] = [];
  private metrics = {
    messagesReceived: 0,
    messagesSent: 0,
    reconnections: 0,
    errors: 0,
    lastActivity: 0
  };

  constructor(config: WebSocketClientConfig) {
    super();
    
    this.config = {
      network: config.network,
      wsEndpoint: config.wsEndpoint || this.getDefaultEndpoint(config.network),
      connectionTimeout: config.connectionTimeout || 10000,
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
      debug: config.debug || false,
      compression: config.compression || true
    };

    if (this.config.debug) {
      console.log('[WebSocket Client] Initialized with config:', {
        network: this.config.network,
        endpoint: this.config.wsEndpoint,
        compression: this.config.compression
      });
    }
  }

  /**
   * Connect to WebSocket endpoint
   */
  async connect(): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTED) {
      if (this.config.debug) {
        console.log('[WebSocket Client] Already connected');
      }
      return;
    }

    if (this.connectionState === ConnectionState.CONNECTING) {
      if (this.config.debug) {
        console.log('[WebSocket Client] Connection already in progress');
      }
      return;
    }

    this.setConnectionState(ConnectionState.CONNECTING);

    try {
      await this.establishConnection();
    } catch (error) {
      this.setConnectionState(ConnectionState.ERROR);
      throw new ConnectionError(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.config.debug) {
      console.log('[WebSocket Client] Disconnecting...');
    }

    this.clearTimers();
    this.reconnectAttempts = 0;
    
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }

    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.subscriptions.clear();
    this.messageQueue = [];
  }

  /**
   * Subscribe to a data stream
   */
  async subscribe(subscription: WSSubscription): Promise<void> {
    const subKey = this.getSubscriptionKey(subscription);
    
    if (this.subscriptions.has(subKey)) {
      if (this.config.debug) {
        console.log(`[WebSocket Client] Already subscribed to: ${subKey}`);
      }
      return;
    }

    const message = {
      method: 'subscribe',
      subscription
    };

    await this.sendMessage(message);
    this.subscriptions.add(subKey);

    if (this.config.debug) {
      console.log(`[WebSocket Client] Subscribed to: ${subKey}`);
    }
  }

  /**
   * Unsubscribe from a data stream
   */
  async unsubscribe(subscription: WSSubscription): Promise<void> {
    const subKey = this.getSubscriptionKey(subscription);
    
    if (!this.subscriptions.has(subKey)) {
      if (this.config.debug) {
        console.log(`[WebSocket Client] Not subscribed to: ${subKey}`);
      }
      return;
    }

    const message = {
      method: 'unsubscribe',
      subscription
    };

    await this.sendMessage(message);
    this.subscriptions.delete(subKey);

    if (this.config.debug) {
      console.log(`[WebSocket Client] Unsubscribed from: ${subKey}`);
    }
  }

  /**
   * Send a message to the WebSocket
   */
  private async sendMessage(message: any): Promise<void> {
    if (this.connectionState !== ConnectionState.CONNECTED) {
      this.messageQueue.push(message);
      if (this.config.debug) {
        console.log('[WebSocket Client] Message queued (not connected)');
      }
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message);
      if (this.config.debug) {
        console.log('[WebSocket Client] Message queued (WebSocket not ready)');
      }
      return;
    }

    try {
      const serialized = JSON.stringify(message);
      this.ws.send(serialized);
      this.metrics.messagesSent++;
      
      if (this.config.debug) {
        console.log('[WebSocket Client] Message sent:', message);
      }
    } catch (error) {
      console.error('[WebSocket Client] Failed to send message:', error);
      this.messageQueue.push(message);
    }
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) {
      return;
    }

    if (this.config.debug) {
      console.log(`[WebSocket Client] Processing ${this.messageQueue.length} queued messages`);
    }

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach(message => {
      this.sendMessage(message).catch(error => {
        console.error('[WebSocket Client] Failed to send queued message:', error);
      });
    });
  }

  /**
   * Establish WebSocket connection
   */
  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.config.wsEndpoint, {
        handshakeTimeout: this.config.connectionTimeout,
      });

      this.connectionTimer = setTimeout(() => {
        ws.terminate();
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);

      ws.on('open', () => {
        this.clearConnectionTimer();
        this.ws = ws;
        this.setConnectionState(ConnectionState.CONNECTED);
        this.reconnectAttempts = 0;
        this.setupHeartbeat();
        this.processMessageQueue();
        
        if (this.config.debug) {
          console.log('[WebSocket Client] Connected successfully');
        }
        
        resolve();
      });

      ws.on('message', (data) => {
        this.handleMessage(data);
      });

      ws.on('close', (code, reason) => {
        this.handleClose(code, reason.toString());
      });

      ws.on('error', (error) => {
        this.clearConnectionTimer();
        this.handleError(error);
        reject(error);
      });

      ws.on('ping', () => {
        if (this.config.debug) {
          console.log('[WebSocket Client] Received ping');
        }
        ws.pong();
      });
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      this.metrics.messagesReceived++;
      this.metrics.lastActivity = Date.now();
      
      if (message.type === 'heartbeat') {
        this.lastHeartbeat = Date.now();
        return;
      }

      if (this.config.debug) {
        console.log('[WebSocket Client] Message received:', message);
      }

      // Emit message event with proper structure
      const wsMessage: WSMessage = {
        channel: message.channel || 'unknown',
        data: message.data || message,
        timestamp: message.timestamp || Date.now()
      };

      this.emit('message', wsMessage);
      
      // Emit specific event types
      if (message.channel) {
        this.emit(message.channel, wsMessage.data);
      }
    } catch (error) {
      console.error('[WebSocket Client] Failed to parse message:', error);
      this.metrics.errors++;
    }
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(code: number, reason: string): void {
    if (this.config.debug) {
      console.log(`[WebSocket Client] Connection closed: ${code} - ${reason}`);
    }

    this.clearTimers();
    this.ws = null;

    if (code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      this.setConnectionState(ConnectionState.DISCONNECTED);
    }

    this.emit('close', { code, reason });
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: Error): void {
    console.error('[WebSocket Client] WebSocket error:', error);
    this.metrics.errors++;
    this.setConnectionState(ConnectionState.ERROR);
    this.emit('error', error);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.setConnectionState(ConnectionState.RECONNECTING);
    this.reconnectAttempts++;
    this.metrics.reconnections++;

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    if (this.config.debug) {
      console.log(`[WebSocket Client] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('[WebSocket Client] Reconnection failed:', error);
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          this.setConnectionState(ConnectionState.ERROR);
          this.emit('maxReconnectAttemptsReached');
        }
      });
    }, delay);
  }

  /**
   * Setup heartbeat mechanism
   */
  private setupHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
        
        // Check for stale connection
        const now = Date.now();
        if (this.lastHeartbeat > 0 && now - this.lastHeartbeat > this.config.heartbeatInterval * 2) {
          if (this.config.debug) {
            console.log('[WebSocket Client] Stale connection detected, reconnecting...');
          }
          this.ws.terminate();
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    this.clearConnectionTimer();
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  /**
   * Clear connection timer
   */
  private clearConnectionTimer(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = undefined;
    }
  }

  /**
   * Set connection state and emit event
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('stateChange', state);
      
      if (this.config.debug) {
        console.log(`[WebSocket Client] State changed to: ${state}`);
      }
    }
  }

  /**
   * Get subscription key
   */
  private getSubscriptionKey(subscription: WSSubscription): string {
    const parts = [subscription.type];
    if (subscription.coin) parts.push(subscription.coin);
    if (subscription.user) parts.push(subscription.user);
    if (subscription.interval) parts.push(subscription.interval);
    return parts.join(':');
  }

  /**
   * Get default WebSocket endpoint for network
   */
  private getDefaultEndpoint(network: Network): string {
    return 'wss://api.hyperliquid.xyz/ws'; // Same endpoint for both mainnet and testnet
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }

  /**
   * Get client metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Get active subscriptions
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }
}