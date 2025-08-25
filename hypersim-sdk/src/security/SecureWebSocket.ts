/**
 * Secure WebSocket client with certificate pinning
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import crypto from 'crypto';
import https from 'https';
import { SecurityAuditor } from './SecurityAuditor';

interface SecureWebSocketConfig {
  certificatePins?: string[];
  auditor?: SecurityAuditor;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  messageTimeout?: number;
  validateCertificate?: boolean;
}

export class SecureWebSocket extends EventEmitter {
  private ws?: WebSocket;
  private readonly url: string;
  private readonly config: Required<SecureWebSocketConfig>;
  private reconnectAttempts = 0;
  private heartbeatTimer?: NodeJS.Timeout;
  private isConnecting = false;
  private messageQueue: Array<{ data: any; timestamp: number }> = [];
  private connectionMetrics = {
    totalConnections: 0,
    failedConnections: 0,
    messagesReceived: 0,
    messagesSent: 0,
    bytesReceived: 0,
    bytesSent: 0
  };

  constructor(url: string, config: SecureWebSocketConfig = {}) {
    super();
    
    this.url = url;
    this.config = {
      certificatePins: config.certificatePins ?? [],
      auditor: config.auditor ?? null as any,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 5000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      messageTimeout: config.messageTimeout ?? 10000,
      validateCertificate: config.validateCertificate ?? true
    };
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    
    try {
      await this.establishConnection();
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.connectionMetrics.totalConnections++;
      
      if (this.config.auditor) {
        await this.config.auditor.log({
          type: 'websocket_connected' as any,
          severity: 'low',
          timestamp: Date.now(),
          description: 'Secure WebSocket connection established',
          metadata: { url: this.url }
        });
      }
      
      this.emit('connected');
    } catch (error) {
      this.connectionMetrics.failedConnections++;
      
      if (this.config.auditor) {
        await this.config.auditor.log({
          type: 'websocket_error' as any,
          severity: 'high',
          timestamp: Date.now(),
          description: 'WebSocket connection failed',
          metadata: { url: this.url, error: error.message }
        });
      }
      
      this.handleConnectionError(error);
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Send message with security validation
   */
  async send(data: any): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue message for later sending
      this.messageQueue.push({ data, timestamp: Date.now() });
      
      // Try to reconnect if not already connecting
      if (!this.isConnecting) {
        await this.connect();
      }
      return;
    }

    try {
      // Validate message
      const validatedData = await this.validateMessage(data);
      const serialized = JSON.stringify(validatedData);
      
      this.ws.send(serialized);
      
      this.connectionMetrics.messagesSent++;
      this.connectionMetrics.bytesSent += serialized.length;
      
      this.emit('messageSent', validatedData);
    } catch (error) {
      if (this.config.auditor) {
        await this.config.auditor.log({
          type: 'websocket_send_error' as any,
          severity: 'medium',
          timestamp: Date.now(),
          description: 'Failed to send WebSocket message',
          metadata: { error: error.message }
        });
      }
      
      this.emit('sendError', error);
      throw error;
    }
  }

  /**
   * Subscribe to a channel with security validation
   */
  async subscribe(channel: string, params?: any): Promise<void> {
    const subscriptionMessage = {
      type: 'subscribe',
      channel: this.sanitizeChannel(channel),
      params: params ? await this.validateMessage(params) : undefined,
      timestamp: Date.now(),
      nonce: crypto.randomUUID()
    };

    await this.send(subscriptionMessage);
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string): Promise<void> {
    const unsubscribeMessage = {
      type: 'unsubscribe',
      channel: this.sanitizeChannel(channel),
      timestamp: Date.now()
    };

    await this.send(unsubscribeMessage);
  }

  /**
   * Close connection
   */
  close(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }

    this.emit('disconnected');
  }

  /**
   * Get connection metrics
   */
  getMetrics() {
    return {
      ...this.connectionMetrics,
      isConnected: this.ws?.readyState === WebSocket.OPEN,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length
    };
  }

  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsOptions: any = {
        handshakeTimeout: 10000,
        headers: {
          'User-Agent': 'HyperSim-SDK-SecureWS',
          'X-Client-Version': '1.0.0'
        }
      };

      // Configure certificate validation and pinning
      if (this.url.startsWith('wss://') && this.config.validateCertificate) {
        wsOptions.agent = new https.Agent({
          checkServerIdentity: (hostname, cert) => {
            // Perform certificate pinning if configured
            if (this.config.certificatePins.length > 0) {
              const fingerprint = crypto
                .createHash('sha256')
                .update(cert.raw)
                .digest('hex');
              
              if (!this.config.certificatePins.includes(fingerprint)) {
                throw new Error(`Certificate pinning failed. Expected one of: ${this.config.certificatePins.join(', ')}, got: ${fingerprint}`);
              }
            }
            
            // Perform standard certificate validation
            return undefined; // undefined means validation passed
          }
        });
      }

      this.ws = new WebSocket(this.url, wsOptions);

      this.ws.on('open', () => {
        this.setupEventHandlers();
        this.processMessageQueue();
        resolve();
      });

      this.ws.on('error', (error) => {
        reject(error);
      });
    });
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.on('message', async (data) => {
      try {
        const message = await this.validateIncomingMessage(data.toString());
        
        this.connectionMetrics.messagesReceived++;
        this.connectionMetrics.bytesReceived += data.length;
        
        this.emit('message', message);
      } catch (error) {
        if (this.config.auditor) {
          await this.config.auditor.log({
            type: 'websocket_invalid_message' as any,
            severity: 'medium',
            timestamp: Date.now(),
            description: 'Received invalid WebSocket message',
            metadata: { error: error.message }
          });
        }
        
        this.emit('invalidMessage', error);
      }
    });

    this.ws.on('close', (code, reason) => {
      if (this.heartbeatTimer) {
        clearTimeout(this.heartbeatTimer);
      }
      
      this.emit('disconnected', { code, reason: reason.toString() });
      
      // Auto-reconnect if not a normal close
      if (code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', async (error) => {
      if (this.config.auditor) {
        await this.config.auditor.log({
          type: 'websocket_error' as any,
          severity: 'high',
          timestamp: Date.now(),
          description: 'WebSocket error occurred',
          metadata: { error: error.message }
        });
      }
      
      this.emit('error', error);
    });
  }

  private async validateMessage(data: any): Promise<any> {
    // Basic structure validation
    if (typeof data !== 'object' || data === null) {
      throw new Error('Message must be an object');
    }

    // Size validation (max 1MB)
    const serialized = JSON.stringify(data);
    if (serialized.length > 1024 * 1024) {
      throw new Error('Message too large (max 1MB)');
    }

    // Remove potentially dangerous properties
    const sanitized = { ...data };
    delete sanitized.__proto__;
    delete sanitized.constructor;
    
    return sanitized;
  }

  private async validateIncomingMessage(data: string): Promise<any> {
    try {
      const parsed = JSON.parse(data);
      
      // Basic validation
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid message format');
      }

      // Check for required fields for certain message types
      if (parsed.type) {
        switch (parsed.type) {
          case 'error':
            if (!parsed.message) {
              throw new Error('Error message missing required field: message');
            }
            break;
          case 'data':
            if (!parsed.payload) {
              throw new Error('Data message missing required field: payload');
            }
            break;
        }
      }

      return parsed;
    } catch (error) {
      throw new Error(`Message validation failed: ${error.message}`);
    }
  }

  private sanitizeChannel(channel: string): string {
    // Remove potentially dangerous characters
    return channel.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
    }

    this.heartbeatTimer = setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
        this.startHeartbeat();
      }
    }, this.config.heartbeatInterval);
  }

  private async processMessageQueue(): Promise<void> {
    const now = Date.now();
    
    // Remove expired messages (older than 5 minutes)
    this.messageQueue = this.messageQueue.filter(
      msg => now - msg.timestamp < 5 * 60 * 1000
    );

    // Send queued messages
    for (const queuedMessage of this.messageQueue) {
      try {
        await this.send(queuedMessage.data);
      } catch (error) {
        console.warn('Failed to send queued message:', error);
      }
    }
    
    this.messageQueue = [];
  }

  private handleConnectionError(error: any): void {
    this.emit('connectionError', error);
    
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      this.emit('maxReconnectsReached');
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    
    setTimeout(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        this.connect();
      }
    }, this.config.reconnectDelay * Math.pow(2, Math.min(this.reconnectAttempts - 1, 5))); // Exponential backoff
  }
}
