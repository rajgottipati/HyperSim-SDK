package utils

import (
	"time"

	"github.com/hypersim/hypersim-go-sdk/types"
)

// NetworkConfigs contains configuration for different networks
var NetworkConfigs = map[types.Network]types.NetworkConfig{
	types.NetworkMainnet: {
		DisplayName:  "HyperEVM Mainnet",
		ChainID:      42161, // Example chainID - adjust for actual HyperEVM
		RPCURL:       "https://mainnet.hyperevm.example.com",
		WSURL:        "wss://mainnet.hyperevm.example.com/ws",
		ExplorerURL:  "https://explorer.hyperevm.example.com",
		BlockTime:    time.Second * 2, // 2 second average block time
	},
	types.NetworkTestnet: {
		DisplayName:  "HyperEVM Testnet",
		ChainID:      421614, // Example testnet chainID
		RPCURL:       "https://testnet.hyperevm.example.com",
		WSURL:        "wss://testnet.hyperevm.example.com/ws",
		ExplorerURL:  "https://testnet-explorer.hyperevm.example.com",
		BlockTime:    time.Second * 2, // 2 second average block time
	},
}

// Gas limits and pricing constants
const (
	// MaxGasLimit is the maximum gas limit allowed
	MaxGasLimit = 30_000_000
	
	// SmallBlockGasLimit is the gas limit for small blocks
	SmallBlockGasLimit = 2_000_000
	
	// DefaultGasLimit is the default gas limit for transactions
	DefaultGasLimit = 21_000
	
	// DefaultTimeout is the default request timeout
	DefaultTimeout = 30 * time.Second
	
	// WebSocketReconnectDelay is the delay before reconnecting
	WebSocketReconnectDelay = 5 * time.Second
	
	// MaxReconnectAttempts is the maximum number of reconnection attempts
	MaxReconnectAttempts = 10
	
	// PluginExecutionTimeout is the timeout for plugin execution
	PluginExecutionTimeout = 10 * time.Second
	
	// ConnectionPoolSize is the default HTTP connection pool size
	ConnectionPoolSize = 10
	
	// MaxIdleConnections is the maximum number of idle connections
	MaxIdleConnections = 20
	
	// IdleConnTimeout is the timeout for idle connections
	IdleConnTimeout = 90 * time.Second
)

// SDK information
const (
	SDKName    = "@hypersim/go-sdk"
	SDKVersion = "1.0.0"
	UserAgent  = SDKName + "/" + SDKVersion
)

// AI service constants
const (
	// OpenAIModel is the default OpenAI model to use
	OpenAIModel = "gpt-3.5-turbo"
	
	// MaxTokens is the maximum number of tokens for AI responses
	MaxTokens = 1000
	
	// AITimeout is the timeout for AI requests
	AITimeout = 30 * time.Second
)

// Address validation patterns
const (
	// EthereumAddressPattern is the regex pattern for Ethereum addresses
	EthereumAddressPattern = `^0x[a-fA-F0-9]{40}$`
	
	// TransactionHashPattern is the regex pattern for transaction hashes
	TransactionHashPattern = `^0x[a-fA-F0-9]{64}$`
)
