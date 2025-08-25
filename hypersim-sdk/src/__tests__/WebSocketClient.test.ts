/**
 * Tests for WebSocket client
 */

import { WebSocketClient, ConnectionState, Network } from '../index';
import WS from 'ws';

// Mock WebSocket
jest.mock('ws');
const MockedWebSocket = WS as jest.MockedClass<typeof WS>;

describe('WebSocketClient', () => {
  let wsClient: WebSocketClient;
  let mockWs: jest.Mocked<WS>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock WebSocket instance
    mockWs = {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      terminate: jest.fn(),
      ping: jest.fn(),
      pong: jest.fn(),
      readyState: WS.OPEN,
      removeAllListeners: jest.fn()
    } as unknown as jest.Mocked<WS>;
    
    MockedWebSocket.mockImplementation(() => mockWs);
    
    wsClient = new WebSocketClient({
      network: Network.TESTNET,
      debug: true
    });
  });

  afterEach(() => {
    wsClient.disconnect();
  });

  describe('Connection management', () => {
    it('should initialize with disconnected state', () => {
      expect(wsClient.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
      expect(wsClient.isConnected()).toBe(false);
    });

    it('should handle connection establishment', async () => {
      const connectPromise = wsClient.connect();
      
      // Simulate successful connection
      const onOpenHandler = mockWs.on.mock.calls.find(call => call[0] === 'open')?.[1] as Function;
      expect(onOpenHandler).toBeDefined();
      
      onOpenHandler();
      
      await connectPromise;
      
      expect(wsClient.getConnectionState()).toBe(ConnectionState.CONNECTED);
      expect(wsClient.isConnected()).toBe(true);
    });

    it('should handle connection errors', async () => {
      const connectPromise = wsClient.connect();
      
      // Simulate connection error
      const onErrorHandler = mockWs.on.mock.calls.find(call => call[0] === 'error')?.[1] as Function;
      expect(onErrorHandler).toBeDefined();
      
      const error = new Error('Connection failed');
      onErrorHandler(error);
      
      await expect(connectPromise).rejects.toThrow('Failed to connect');
    });

    it('should handle connection close', async () => {
      // First connect
      const connectPromise = wsClient.connect();
      const onOpenHandler = mockWs.on.mock.calls.find(call => call[0] === 'open')?.[1] as Function;
      onOpenHandler();
      await connectPromise;
      
      // Then close
      const onCloseHandler = mockWs.on.mock.calls.find(call => call[0] === 'close')?.[1] as Function;
      expect(onCloseHandler).toBeDefined();
      
      onCloseHandler(1000, 'Normal closure');
      
      expect(wsClient.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });
  });

  describe('Subscription management', () => {
    beforeEach(async () => {
      // Connect first
      const connectPromise = wsClient.connect();
      const onOpenHandler = mockWs.on.mock.calls.find(call => call[0] === 'open')?.[1] as Function;
      onOpenHandler();
      await connectPromise;
    });

    it('should subscribe to data streams', async () => {
      const subscription = {
        type: 'trades' as const,
        coin: 'ETH'
      };
      
      await wsClient.subscribe(subscription);
      
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          method: 'subscribe',
          subscription
        })
      );
      
      const subscriptions = wsClient.getSubscriptions();
      expect(subscriptions).toContain('trades:ETH');
    });

    it('should unsubscribe from data streams', async () => {
      const subscription = {
        type: 'trades' as const,
        coin: 'ETH'
      };
      
      await wsClient.subscribe(subscription);
      await wsClient.unsubscribe(subscription);
      
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          method: 'unsubscribe',
          subscription
        })
      );
      
      const subscriptions = wsClient.getSubscriptions();
      expect(subscriptions).not.toContain('trades:ETH');
    });
  });

  describe('Message handling', () => {
    beforeEach(async () => {
      // Connect first
      const connectPromise = wsClient.connect();
      const onOpenHandler = mockWs.on.mock.calls.find(call => call[0] === 'open')?.[1] as Function;
      onOpenHandler();
      await connectPromise;
    });

    it('should handle incoming messages', () => {
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')?.[1] as Function;
      expect(messageHandler).toBeDefined();
      
      const testMessage = {
        channel: 'trades',
        data: {
          coin: 'ETH',
          price: '2000.00',
          size: '1.5'
        }
      };
      
      let receivedMessage: any;
      wsClient.on('message', (msg) => {
        receivedMessage = msg;
      });
      
      messageHandler(Buffer.from(JSON.stringify(testMessage)));
      
      expect(receivedMessage).toBeDefined();
      expect(receivedMessage.channel).toBe('trades');
      expect(receivedMessage.data).toEqual(testMessage.data);
    });

    it('should handle heartbeat messages', () => {
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')?.[1] as Function;
      
      const heartbeatMessage = {
        type: 'heartbeat',
        timestamp: Date.now()
      };
      
      let receivedMessage: any;
      wsClient.on('message', (msg) => {
        receivedMessage = msg;
      });
      
      messageHandler(Buffer.from(JSON.stringify(heartbeatMessage)));
      
      // Heartbeat messages should not be emitted as regular messages
      expect(receivedMessage).toBeUndefined();
    });
  });

  describe('Metrics', () => {
    it('should track connection metrics', () => {
      const metrics = wsClient.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.messagesReceived).toBeDefined();
      expect(metrics.messagesSent).toBeDefined();
      expect(metrics.reconnections).toBeDefined();
      expect(metrics.errors).toBeDefined();
    });
  });
});