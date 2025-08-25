package clients

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/hypersim/hypersim-go-sdk/internal/abi"
	"github.com/hypersim/hypersim-go-sdk/internal/pool"
	"github.com/hypersim/hypersim-go-sdk/types"
	"github.com/hypersim/hypersim-go-sdk/utils"
)

// HyperCoreClient provides access to cross-layer HyperCore functionality
type HyperCoreClient struct {
	config     *HyperCoreConfig
	httpPool   *pool.HTTPPool
	abiEncoder *abi.ABIEncoder
}

// HyperCoreConfig contains configuration for the HyperCore client
type HyperCoreConfig struct {
	Network types.Network
	Enabled bool
	Debug   bool
}

// PrecompileAddress contains addresses for HyperCore precompiles
type PrecompileAddress struct {
	PositionsManager string
	MarketData       string
	RiskManager      string
}

var (
	// Precompile addresses for different networks
	MainnetPrecompiles = PrecompileAddress{
		PositionsManager: "0x0000000000000000000000000000000000000100",
		MarketData:       "0x0000000000000000000000000000000000000101",
		RiskManager:      "0x0000000000000000000000000000000000000102",
	}
	
	TestnetPrecompiles = PrecompileAddress{
		PositionsManager: "0x0000000000000000000000000000000000000200",
		MarketData:       "0x0000000000000000000000000000000000000201",
		RiskManager:      "0x0000000000000000000000000000000000000202",
	}
)

// NewHyperCoreClient creates a new HyperCore client
func NewHyperCoreClient(config *HyperCoreConfig) (*HyperCoreClient, error) {
	if config == nil {
		return nil, types.ErrConfiguration("config cannot be nil", nil)
	}
	
	if err := utils.ValidateNetwork(config.Network); err != nil {
		return nil, err
	}
	
	client := &HyperCoreClient{
		config:     config,
		httpPool:   pool.NewHTTPPool(nil),
		abiEncoder: abi.NewABIEncoder(),
	}
	
	if config.Debug {
		fmt.Printf("[HyperCore Client] Initialized for network: %s, enabled: %t\n", config.Network, config.Enabled)
	}
	
	return client, nil
}

// GetRelevantData fetches relevant HyperCore data for a transaction
func (c *HyperCoreClient) GetRelevantData(ctx context.Context, tx *types.TransactionRequest, hyperEVMClient *HyperEVMClient) (*types.HyperCoreData, error) {
	if !c.config.Enabled {
		return nil, nil
	}
	
	if c.config.Debug {
		fmt.Printf("[HyperCore Client] Fetching relevant data for transaction: %s\n", tx.From)
	}
	
	data := &types.HyperCoreData{
		CoreState: make(map[string]interface{}),
	}
	
	// Fetch positions for the sender
	positions, err := c.getPositions(ctx, tx.From, hyperEVMClient)
	if err != nil {
		if c.config.Debug {
			fmt.Printf("[HyperCore Client] Failed to get positions: %v\n", err)
		}
		// Don't fail the whole operation, just log the error
	} else {
		data.Positions = positions
	}
	
	// Fetch market data
	marketData, err := c.getMarketData(ctx, hyperEVMClient)
	if err != nil {
		if c.config.Debug {
			fmt.Printf("[HyperCore Client] Failed to get market data: %v\n", err)
		}
	} else {
		data.MarketData = marketData
	}
	
	// Analyze cross-layer interactions
	interactions := c.analyzeInteractions(tx)
	data.Interactions = interactions
	
	// Set core state
	data.CoreState["lastUpdate"] = time.Now().Unix()
	data.CoreState["network"] = string(c.config.Network)
	data.CoreState["enabled"] = c.config.Enabled
	
	if c.config.Debug {
		fmt.Printf("[HyperCore Client] Retrieved core data: positions=%d, interactions=%d\n", 
			len(data.Positions), len(data.Interactions))
	}
	
	return data, nil
}

// getPositions fetches positions for an address using precompile calls
func (c *HyperCoreClient) getPositions(ctx context.Context, address string, hyperEVMClient *HyperEVMClient) ([]types.Position, error) {
	precompiles := c.getPrecompileAddresses()
	
	// Encode the call to get positions
	callData, err := c.abiEncoder.EncodeFunction("getPositions(address)", []interface{}{address})
	if err != nil {
		return nil, types.ErrSimulation("failed to encode positions call", err)
	}
	
	// Create transaction for precompile call
	tx := &types.TransactionRequest{
		From: address,
		To:   precompiles.PositionsManager,
		Data: callData,
	}
	
	// Simulate the call to get positions
	result, err := hyperEVMClient.Simulate(ctx, tx)
	if err != nil {
		return nil, types.ErrSimulation("failed to call positions precompile", err)
	}
	
	if !result.Success {
		return nil, types.ErrSimulation("positions precompile call failed", nil)
	}
	
	// Decode the response
	positions, err := c.decodePositions(result.ReturnData)
	if err != nil {
		return nil, types.ErrSimulation("failed to decode positions", err)
	}
	
	return positions, nil
}

// getMarketData fetches current market data using precompile calls
func (c *HyperCoreClient) getMarketData(ctx context.Context, hyperEVMClient *HyperEVMClient) (*types.MarketData, error) {
	precompiles := c.getPrecompileAddresses()
	
	// Encode the call to get market data
	callData, err := c.abiEncoder.EncodeFunction("getMarketData()", []interface{}{})
	if err != nil {
		return nil, types.ErrSimulation("failed to encode market data call", err)
	}
	
	// Create transaction for precompile call
	tx := &types.TransactionRequest{
		From: "0x0000000000000000000000000000000000000000", // Zero address for read calls
		To:   precompiles.MarketData,
		Data: callData,
	}
	
	// Simulate the call
	result, err := hyperEVMClient.Simulate(ctx, tx)
	if err != nil {
		return nil, types.ErrSimulation("failed to call market data precompile", err)
	}
	
	if !result.Success {
		return nil, types.ErrSimulation("market data precompile call failed", nil)
	}
	
	// Decode the response
	marketData, err := c.decodeMarketData(result.ReturnData)
	if err != nil {
		return nil, types.ErrSimulation("failed to decode market data", err)
	}
	
	return marketData, nil
}

// analyzeInteractions analyzes potential cross-layer interactions in a transaction
func (c *HyperCoreClient) analyzeInteractions(tx *types.TransactionRequest) []types.CoreInteraction {
	var interactions []types.CoreInteraction
	
	// Check if transaction is interacting with known precompiles
	precompiles := c.getPrecompileAddresses()
	
	switch tx.To {
	case precompiles.PositionsManager:
		interactions = append(interactions, types.CoreInteraction{
			Type:       "READ",
			Precompile: precompiles.PositionsManager,
			Data:       tx.Data,
		})
	case precompiles.MarketData:
		interactions = append(interactions, types.CoreInteraction{
			Type:       "READ",
			Precompile: precompiles.MarketData,
			Data:       tx.Data,
		})
	case precompiles.RiskManager:
		interactions = append(interactions, types.CoreInteraction{
			Type:       "READ",
			Precompile: precompiles.RiskManager,
			Data:       tx.Data,
		})
	}
	
	// Analyze transaction data for potential cross-layer calls
	if tx.Data != "" && tx.Data != "0x" {
		if c.containsPrecompileCall(tx.Data) {
			interactions = append(interactions, types.CoreInteraction{
				Type:       "WRITE",
				Precompile: "unknown",
				Data:       tx.Data,
			})
		}
	}
	
	return interactions
}

// Helper methods

func (c *HyperCoreClient) getPrecompileAddresses() PrecompileAddress {
	switch c.config.Network {
	case types.NetworkMainnet:
		return MainnetPrecompiles
	case types.NetworkTestnet:
		return TestnetPrecompiles
	default:
		return MainnetPrecompiles
	}
}

func (c *HyperCoreClient) decodePositions(data string) ([]types.Position, error) {
	if data == "" || data == "0x" {
		return []types.Position{}, nil
	}
	
	// For this example, return mock positions
	// In a real implementation, decode the ABI-encoded response
	positions := []types.Position{
		{
			Asset:         "ETH",
			Size:          "1000000000000000000", // 1 ETH
			EntryPrice:    "2000000000000000000000", // $2000
			UnrealizedPnL: "0",
			Side:          "LONG",
		},
	}
	
	return positions, nil
}

func (c *HyperCoreClient) decodeMarketData(data string) (*types.MarketData, error) {
	if data == "" || data == "0x" {
		return &types.MarketData{
			Prices:       make(map[string]string),
			Depths:       make(map[string]types.MarketDepth),
			FundingRates: make(map[string]string),
		}, nil
	}
	
	// For this example, return mock market data
	// In a real implementation, decode the ABI-encoded response
	marketData := &types.MarketData{
		Prices: map[string]string{
			"ETH": "2000000000000000000000", // $2000
			"BTC": "50000000000000000000000", // $50000
		},
		Depths: map[string]types.MarketDepth{
			"ETH": {
				Bid:     "1999000000000000000000",
				Ask:     "2001000000000000000000",
				BidSize: "10000000000000000000",
				AskSize: "15000000000000000000",
			},
		},
		FundingRates: map[string]string{
			"ETH": "100", // 0.01%
			"BTC": "50",  // 0.005%
		},
	}
	
	return marketData, nil
}

func (c *HyperCoreClient) containsPrecompileCall(data string) bool {
	// Simple heuristic to detect precompile calls
	// In a real implementation, parse the data more thoroughly
	precompiles := c.getPrecompileAddresses()
	return data != "" && data != "0x" && (
		data[2:10] == "12345678" || // Mock function selector
		len(data) > 10) && (
		precompiles.PositionsManager != "" ||
		precompiles.MarketData != "" ||
		precompiles.RiskManager != "")
}

// Close closes the client and cleans up resources
func (c *HyperCoreClient) Close() error {
	if c.httpPool != nil {
		c.httpPool.Close()
	}
	return nil
}

// GetCoreState returns the current core state
func (c *HyperCoreClient) GetCoreState(ctx context.Context) (map[string]interface{}, error) {
	if !c.config.Enabled {
		return nil, types.ErrConfiguration("HyperCore integration is not enabled", nil)
	}
	
	state := map[string]interface{}{
		"network":    string(c.config.Network),
		"enabled":    c.config.Enabled,
		"timestamp":  time.Now().Unix(),
		"precompiles": c.getPrecompileAddresses(),
	}
	
	return state, nil
}

// ValidatePrecompileCall validates a precompile call
func (c *HyperCoreClient) ValidatePrecompileCall(address string, data string) error {
	precompiles := c.getPrecompileAddresses()
	
	switch address {
	case precompiles.PositionsManager, precompiles.MarketData, precompiles.RiskManager:
		return nil
	default:
		return types.ErrValidation("unknown precompile address", nil)
	}
}

// SimulatePrecompileCall simulates a precompile call
func (c *HyperCoreClient) SimulatePrecompileCall(ctx context.Context, address string, data string, hyperEVMClient *HyperEVMClient) (*types.SimulationResult, error) {
	if err := c.ValidatePrecompileCall(address, data); err != nil {
		return nil, err
	}
	
	tx := &types.TransactionRequest{
		From: "0x0000000000000000000000000000000000000000",
		To:   address,
		Data: data,
	}
	
	return hyperEVMClient.Simulate(ctx, tx)
}
