package types

// SubscriptionType represents the type of WebSocket subscription
type SubscriptionType string

const (
	SubTypeBlocks        SubscriptionType = "blocks"
	SubTypeTransactions  SubscriptionType = "transactions"
	SubTypeSimulations   SubscriptionType = "simulations"
	SubTypeMarketData    SubscriptionType = "marketData"
)

// ConnectionState represents WebSocket connection state
type ConnectionState int

const (
	StateDisconnected ConnectionState = iota
	StateConnecting
	StateConnected
	StateReconnecting
	StateClosing
	StateClosed
)

func (s ConnectionState) String() string {
	switch s {
	case StateDisconnected:
		return "disconnected"
	case StateConnecting:
		return "connecting"
	case StateConnected:
		return "connected"
	case StateReconnecting:
		return "reconnecting"
	case StateClosing:
		return "closing"
	case StateClosed:
		return "closed"
	default:
		return "unknown"
	}
}

// WSMessage represents a WebSocket message
type WSMessage struct {
	Type          string      `json:"type"`
	Subscription  string      `json:"subscription,omitempty"`
	Data          interface{} `json:"data,omitempty"`
	Timestamp     int64       `json:"timestamp"`
	RequestID     string      `json:"requestId,omitempty"`
	Error         string      `json:"error,omitempty"`
}

// WSSubscription represents a WebSocket subscription
type WSSubscription struct {
	ID       string           `json:"id"`
	Type     SubscriptionType `json:"type"`
	Params   map[string]interface{} `json:"params,omitempty"`
	Active   bool             `json:"active"`
	Created  int64            `json:"created"`
}
