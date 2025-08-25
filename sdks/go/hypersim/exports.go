// Package hypersim provides a comprehensive Go SDK for HyperEVM transaction simulation
// with AI-powered analysis and cross-layer HyperCore integration.
//
// The SDK offers:
//   - High-performance concurrent operations using goroutines
//   - AI-powered transaction analysis and optimization
//   - Cross-layer HyperCore integration with proper ABI encoding
//   - Real-time WebSocket streaming for live data
//   - Extensible plugin system with dependency injection
//   - Production-ready error handling and logging
//   - Connection pooling for optimal performance
//
// Example usage:
//
//	config := &hypersim.Config{
//		Network:           types.NetworkTestnet,
//		AIEnabled:         true,
//		OpenAIAPIKey:      "your-api-key",
//		CrossLayerEnabled: true,
//		Debug:            true,
//	}
//
//	sdk, err := hypersim.New(config)
//	if err != nil {
//		log.Fatal(err)
//	}
//	defer sdk.Close()
//
//	tx := &types.TransactionRequest{
//		From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
//		To:       "0xA0b86a33E6417A9cDdA68C73E2c96b4DA3AEFc43",
//		Value:    "1000000000000000000",
//		GasLimit: "21000",
//	}
//
//	result, err := sdk.Simulate(ctx, tx)
//	if err != nil {
//		log.Fatal(err)
//	}
//
//	fmt.Printf("Success: %t, Gas: %s\n", result.Success, result.GasUsed)
package hypersim

// Version information
const (
	// Version is the current SDK version
	Version = "1.0.0"
	
	// Name is the SDK name
	Name = "@hypersim/go-sdk"
	
	// UserAgent is the default user agent string
	UserAgent = Name + "/" + Version
)

// Re-export commonly used types for convenience
import (
	"github.com/hypersim/hypersim-go-sdk/types"
)

// Common types re-exported for convenience
type (
	// Network represents the blockchain network
	Network = types.Network
	
	// TransactionRequest represents a transaction to simulate
	TransactionRequest = types.TransactionRequest
	
	// SimulationResult contains simulation results
	SimulationResult = types.SimulationResult
	
	// AIInsights contains AI analysis results
	AIInsights = types.AIInsights
	
	// BundleOptimization contains bundle optimization results
	BundleOptimization = types.BundleOptimization
	
	// NetworkStatus represents network status
	NetworkStatus = types.NetworkStatus
	
	// WSSubscription represents a WebSocket subscription
	WSSubscription = types.WSSubscription
	
	// WSMessage represents a WebSocket message
	WSMessage = types.WSMessage
	
	// SDKError is the base error type
	SDKError = types.SDKError
)

// Network constants
const (
	// NetworkMainnet represents the mainnet network
	NetworkMainnet = types.NetworkMainnet
	
	// NetworkTestnet represents the testnet network
	NetworkTestnet = types.NetworkTestnet
)

// Risk levels
const (
	// RiskLevelLow represents low risk
	RiskLevelLow = types.RiskLevelLow
	
	// RiskLevelMedium represents medium risk
	RiskLevelMedium = types.RiskLevelMedium
	
	// RiskLevelHigh represents high risk
	RiskLevelHigh = types.RiskLevelHigh
)

// WebSocket subscription types
const (
	// SubTypeBlocks for block subscriptions
	SubTypeBlocks = types.SubTypeBlocks
	
	// SubTypeTransactions for transaction subscriptions
	SubTypeTransactions = types.SubTypeTransactions
	
	// SubTypeSimulations for simulation subscriptions
	SubTypeSimulations = types.SubTypeSimulations
	
	// SubTypeMarketData for market data subscriptions
	SubTypeMarketData = types.SubTypeMarketData
)
