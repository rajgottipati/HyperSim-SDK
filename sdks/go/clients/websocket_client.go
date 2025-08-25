package clients

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/google/uuid"

	"github.com/hypersim/hypersim-go-sdk/types"
	"github.com/hypersim/hypersim-go-sdk/utils"
)

// WebSocketClient provides real-time streaming functionality
type WebSocketClient struct {
	config        *WebSocketConfig
	conn          *websocket.Conn
	state         types.ConnectionState
	subscriptions map[string]*types.WSSubscription
	handlers      map[string]MessageHandler
	mu            sync.RWMutex
	
	// Channels
	incomingMessages chan *types.WSMessage
	outgoingMessages chan *types.WSMessage
	done             chan struct{}
	
	// Reconnection
	reconnectAttempts int
	reconnectTimer    *time.Timer
	
	// Context for graceful shutdown
	ctx    context.Context
	cancel context.CancelFunc
}

// WebSocketConfig contains configuration for WebSocket client
type WebSocketConfig struct {
	Network          types.Network
	WSEndpoint       string
	ReconnectEnabled bool
	MaxReconnects    int
	ReconnectDelay   time.Duration
	PingInterval     time.Duration
	Debug            bool
}

// MessageHandler handles incoming WebSocket messages
type MessageHandler func(*types.WSMessage) error

// NewWebSocketClient creates a new WebSocket client
func NewWebSocketClient(config *WebSocketConfig) (*WebSocketClient, error) {
	if config == nil {
		return nil, types.ErrConfiguration("config cannot be nil", nil)
	}
	
	if err := utils.ValidateNetwork(config.Network); err != nil {
		return nil, err
	}
	
	// Set defaults
	if config.WSEndpoint == "" {
		networkConfig, exists := utils.NetworkConfigs[config.Network]
		if !exists {
			return nil, types.ErrConfiguration("no default WebSocket endpoint for network", nil)
		}
		config.WSEndpoint = networkConfig.WSURL
	}
	
	if config.MaxReconnects == 0 {
		config.MaxReconnects = utils.MaxReconnectAttempts
	}
	
	if config.ReconnectDelay == 0 {
		config.ReconnectDelay = utils.WebSocketReconnectDelay
	}
	
	if config.PingInterval == 0 {
		config.PingInterval = 30 * time.Second
	}
	
	ctx, cancel := context.WithCancel(context.Background())
	
	client := &WebSocketClient{
		config:           config,
		state:            types.StateDisconnected,
		subscriptions:    make(map[string]*types.WSSubscription),
		handlers:         make(map[string]MessageHandler),
		incomingMessages: make(chan *types.WSMessage, 100),
		outgoingMessages: make(chan *types.WSMessage, 100),
		done:             make(chan struct{}),
		ctx:              ctx,
		cancel:           cancel,
	}
	
	if config.Debug {
		fmt.Printf("[WebSocket Client] Initialized for endpoint: %s\n", config.WSEndpoint)
	}
	
	return client, nil
}

// Connect establishes WebSocket connection
func (c *WebSocketClient) Connect(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	if c.state == types.StateConnected || c.state == types.StateConnecting {
		return nil
	}
	
	c.setState(types.StateConnecting)
	
	if c.config.Debug {
		fmt.Printf("[WebSocket Client] Connecting to %s\n", c.config.WSEndpoint)
	}
	
	// Create dialer with timeout
	dialer := websocket.DefaultDialer
	dialer.HandshakeTimeout = 10 * time.Second
	
	headers := map[string][]string{
		"User-Agent": {utils.UserAgent},
	}
	
	conn, resp, err := dialer.DialContext(ctx, c.config.WSEndpoint, headers)
	if err != nil {
		c.setState(types.StateDisconnected)
		return types.ErrWebSocket("failed to connect", err)
	}
	
	if resp.StatusCode != 101 {
		conn.Close()
		c.setState(types.StateDisconnected)
		return types.ErrWebSocket(fmt.Sprintf("unexpected status code: %d", resp.StatusCode), nil)
	}
	
	c.conn = conn
	c.setState(types.StateConnected)
	c.reconnectAttempts = 0
	
	// Start message handling goroutines
	go c.readPump()
	go c.writePump()
	go c.pingPump()
	
	if c.config.Debug {
		fmt.Printf("[WebSocket Client] Connected successfully\n")
	}
	
	return nil
}

// Disconnect closes the WebSocket connection
func (c *WebSocketClient) Disconnect() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	if c.state == types.StateDisconnected || c.state == types.StateClosed {
		return nil
	}
	
	c.setState(types.StateClosing)
	
	if c.config.Debug {
		fmt.Printf("[WebSocket Client] Disconnecting\n")
	}
	
	// Cancel context to stop all goroutines
	c.cancel()
	
	// Close connection
	if c.conn != nil {
		c.conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
		c.conn.Close()
		c.conn = nil
	}
	
	// Stop reconnection timer
	if c.reconnectTimer != nil {
		c.reconnectTimer.Stop()
		c.reconnectTimer = nil
	}
	
	c.setState(types.StateClosed)
	
	// Signal completion
	close(c.done)
	
	if c.config.Debug {
		fmt.Printf("[WebSocket Client] Disconnected\n")
	}
	
	return nil
}

// Subscribe creates a new subscription
func (c *WebSocketClient) Subscribe(ctx context.Context, subType types.SubscriptionType, params map[string]interface{}) (*types.WSSubscription, error) {
	if c.state != types.StateConnected {
		return nil, types.ErrWebSocket("not connected", nil)
	}
	
	subscriptionID := uuid.New().String()
	
	subscription := &types.WSSubscription{
		ID:      subscriptionID,
		Type:    subType,
		Params:  params,
		Active:  true,
		Created: time.Now().Unix(),
	}
	
	// Send subscription message
	message := &types.WSMessage{
		Type:         "subscribe",
		Subscription: subscriptionID,
		Data: map[string]interface{}{
			"type":   string(subType),
			"params": params,
		},
		Timestamp: time.Now().Unix(),
		RequestID: uuid.New().String(),
	}
	
	select {
	case c.outgoingMessages <- message:
		c.mu.Lock()
		c.subscriptions[subscriptionID] = subscription
		c.mu.Unlock()
		
		if c.config.Debug {
			fmt.Printf("[WebSocket Client] Created subscription: %s (%s)\n", subscriptionID, subType)
		}
		
		return subscription, nil
	case <-ctx.Done():
		return nil, types.ErrTimeout("subscription timeout", ctx.Err())
	}
}

// Unsubscribe removes a subscription
func (c *WebSocketClient) Unsubscribe(ctx context.Context, subscriptionID string) error {
	c.mu.Lock()
	subscription, exists := c.subscriptions[subscriptionID]
	c.mu.Unlock()
	
	if !exists {
		return types.ErrValidation("subscription not found", nil)
	}
	
	// Send unsubscribe message
	message := &types.WSMessage{
		Type:         "unsubscribe",
		Subscription: subscriptionID,
		Timestamp:    time.Now().Unix(),
		RequestID:    uuid.New().String(),
	}
	
	select {
	case c.outgoingMessages <- message:
		c.mu.Lock()
		subscription.Active = false
		delete(c.subscriptions, subscriptionID)
		c.mu.Unlock()
		
		if c.config.Debug {
			fmt.Printf("[WebSocket Client] Unsubscribed: %s\n", subscriptionID)
		}
		
		return nil
	case <-ctx.Done():
		return types.ErrTimeout("unsubscribe timeout", ctx.Err())
	}
}

// SetMessageHandler sets a message handler for a subscription type
func (c *WebSocketClient) SetMessageHandler(subType types.SubscriptionType, handler MessageHandler) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.handlers[string(subType)] = handler
}

// GetState returns the current connection state
func (c *WebSocketClient) GetState() types.ConnectionState {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.state
}

// GetSubscriptions returns active subscriptions
func (c *WebSocketClient) GetSubscriptions() []*types.WSSubscription {
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	subs := make([]*types.WSSubscription, 0, len(c.subscriptions))
	for _, sub := range c.subscriptions {
		if sub.Active {
			subs = append(subs, sub)
		}
	}
	
	return subs
}

// Wait waits for the client to finish (blocking)
func (c *WebSocketClient) Wait() {
	<-c.done
}

// Internal methods

func (c *WebSocketClient) setState(state types.ConnectionState) {
	c.state = state
	if c.config.Debug {
		fmt.Printf("[WebSocket Client] State changed to: %s\n", state.String())
	}
}

func (c *WebSocketClient) readPump() {
	defer func() {
		if c.config.ReconnectEnabled && c.reconnectAttempts < c.config.MaxReconnects {
			c.scheduleReconnect()
		}
	}()
	
	for {
		select {
		case <-c.ctx.Done():
			return
		default:
			if c.conn == nil {
				return
			}
			
			// Set read deadline
			c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
			
			_, data, err := c.conn.ReadMessage()
			if err != nil {
				if c.config.Debug {
					fmt.Printf("[WebSocket Client] Read error: %v\n", err)
				}
				c.setState(types.StateDisconnected)
				return
			}
			
			var message types.WSMessage
			if err := json.Unmarshal(data, &message); err != nil {
				if c.config.Debug {
					fmt.Printf("[WebSocket Client] JSON decode error: %v\n", err)
				}
				continue
			}
			
			// Handle message
			go c.handleMessage(&message)
		}
	}
}

func (c *WebSocketClient) writePump() {
	for {
		select {
		case <-c.ctx.Done():
			return
		case message := <-c.outgoingMessages:
			if c.conn == nil {
				continue
			}
			
			data, err := json.Marshal(message)
			if err != nil {
				if c.config.Debug {
					fmt.Printf("[WebSocket Client] JSON encode error: %v\n", err)
				}
				continue
			}
			
			// Set write deadline
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			
			if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
				if c.config.Debug {
					fmt.Printf("[WebSocket Client] Write error: %v\n", err)
				}
				c.setState(types.StateDisconnected)
				return
			}
		}
	}
}

func (c *WebSocketClient) pingPump() {
	ticker := time.NewTicker(c.config.PingInterval)
	defer ticker.Stop()
	
	for {
		select {
		case <-c.ctx.Done():
			return
		case <-ticker.C:
			if c.conn == nil || c.state != types.StateConnected {
				continue
			}
			
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				if c.config.Debug {
					fmt.Printf("[WebSocket Client] Ping error: %v\n", err)
				}
				c.setState(types.StateDisconnected)
				return
			}
		}
	}
}

func (c *WebSocketClient) handleMessage(message *types.WSMessage) {
	if c.config.Debug {
		fmt.Printf("[WebSocket Client] Received message: %s\n", message.Type)
	}
	
	// Find appropriate handler
	c.mu.RLock()
	var handler MessageHandler
	
	// Try to find subscription-specific handler
	if message.Subscription != "" {
		if sub, exists := c.subscriptions[message.Subscription]; exists {
			handler = c.handlers[string(sub.Type)]
		}
	} else {
		// Try to find general handler
		handler = c.handlers[message.Type]
	}
	c.mu.RUnlock()
	
	if handler != nil {
		if err := handler(message); err != nil {
			if c.config.Debug {
				fmt.Printf("[WebSocket Client] Handler error: %v\n", err)
			}
		}
	}
}

func (c *WebSocketClient) scheduleReconnect() {
	if c.reconnectAttempts >= c.config.MaxReconnects {
		if c.config.Debug {
			fmt.Printf("[WebSocket Client] Max reconnection attempts reached\n")
		}
		return
	}
	
	c.reconnectAttempts++
	c.setState(types.StateReconnecting)
	
	if c.config.Debug {
		fmt.Printf("[WebSocket Client] Scheduling reconnection attempt %d in %v\n", 
			c.reconnectAttempts, c.config.ReconnectDelay)
	}
	
	c.reconnectTimer = time.AfterFunc(c.config.ReconnectDelay, func() {
		if err := c.Connect(context.Background()); err != nil {
			if c.config.Debug {
				fmt.Printf("[WebSocket Client] Reconnection failed: %v\n", err)
			}
			c.scheduleReconnect()
		} else {
			// Resubscribe to active subscriptions
			c.resubscribeAll()
		}
	})
}

func (c *WebSocketClient) resubscribeAll() {
	c.mu.RLock()
	subsToResubscribe := make([]*types.WSSubscription, 0, len(c.subscriptions))
	for _, sub := range c.subscriptions {
		if sub.Active {
			subsToResubscribe = append(subsToResubscribe, sub)
		}
	}
	c.mu.RUnlock()
	
	for _, sub := range subsToResubscribe {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		if _, err := c.Subscribe(ctx, sub.Type, sub.Params); err != nil {
			if c.config.Debug {
				fmt.Printf("[WebSocket Client] Failed to resubscribe %s: %v\n", sub.ID, err)
			}
		}
		cancel()
	}
	
	if c.config.Debug {
		fmt.Printf("[WebSocket Client] Resubscribed to %d subscriptions\n", len(subsToResubscribe))
	}
}

// Close closes the WebSocket client
func (c *WebSocketClient) Close() error {
	return c.Disconnect()
}
