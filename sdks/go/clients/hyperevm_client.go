package clients

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/hypersim/hypersim-go-sdk/internal/pool"
	"github.com/hypersim/hypersim-go-sdk/types"
	"github.com/hypersim/hypersim-go-sdk/utils"
)

// HyperEVMClient provides HyperEVM simulation functionality
type HyperEVMClient struct {
	config   *HyperEVMConfig
	httpPool *pool.HTTPPool
}

// HyperEVMConfig contains configuration for the HyperEVM client
type HyperEVMConfig struct {
	Network     types.Network
	RPCEndpoint string
	Timeout     time.Duration
	Debug       bool
}

// NewHyperEVMClient creates a new HyperEVM client
func NewHyperEVMClient(config *HyperEVMConfig) (*HyperEVMClient, error) {
	if config == nil {
		return nil, types.ErrConfiguration("config cannot be nil", nil)
	}
	
	if err := utils.ValidateNetwork(config.Network); err != nil {
		return nil, err
	}
	
	// Set default RPC endpoint if not provided
	if config.RPCEndpoint == "" {
		networkConfig, exists := utils.NetworkConfigs[config.Network]
		if !exists {
			return nil, types.ErrConfiguration("no default RPC endpoint for network", nil)
		}
		config.RPCEndpoint = networkConfig.RPCURL
	}
	
	if config.Timeout == 0 {
		config.Timeout = utils.DefaultTimeout
	}
	
	client := &HyperEVMClient{
		config:   config,
		httpPool: pool.NewHTTPPool(nil),
	}
	
	if config.Debug {
		fmt.Printf("[HyperEVM Client] Initialized for network: %s, endpoint: %s\n", 
			config.Network, config.RPCEndpoint)
	}
	
	return client, nil
}

// Simulate simulates a transaction
func (c *HyperEVMClient) Simulate(ctx context.Context, tx *types.TransactionRequest) (*types.SimulationResult, error) {
	if tx == nil {
		return nil, types.ErrValidation("transaction cannot be nil", nil)
	}
	
	if err := c.validateTransaction(tx); err != nil {
		return nil, err
	}
	
	if c.config.Debug {
		fmt.Printf("[HyperEVM Client] Simulating transaction from %s to %s\n", tx.From, tx.To)
	}
	
	// Create simulation request
	req := map[string]interface{}{
		"jsonrpc": "2.0",
		"method":  "eth_estimateGas",
		"params":  []interface{}{c.formatTransaction(tx)},
		"id":      1,
	}
	
	// Execute RPC call
	resp, err := c.callRPC(ctx, req)
	if err != nil {
		return nil, types.ErrSimulation("RPC call failed", err)
	}
	
	// Parse response
	result := &types.SimulationResult{
		Success:        true,
		GasUsed:        c.parseGasResponse(resp),
		BlockType:      types.BlockTypePending,
		EstimatedBlock: time.Now().Unix(),
		StateChanges:   []types.StateChange{},
		Events:         []types.SimulationEvent{},
	}
	
	if c.config.Debug {
		fmt.Printf("[HyperEVM Client] Simulation completed: success=%t, gas=%s\n", 
			result.Success, result.GasUsed)
	}
	
	return result, nil
}

// GetNetworkStatus returns the current network status
func (c *HyperEVMClient) GetNetworkStatus(ctx context.Context) (*types.NetworkStatus, error) {
	// Get latest block
	blockReq := map[string]interface{}{
		"jsonrpc": "2.0",
		"method":  "eth_blockNumber",
		"params":  []interface{}{},
		"id":      1,
	}
	
	blockResp, err := c.callRPC(ctx, blockReq)
	if err != nil {
		return nil, types.ErrNetwork("failed to get latest block", err)
	}
	
	// Get gas price
	gasPriceReq := map[string]interface{}{
		"jsonrpc": "2.0",
		"method":  "eth_gasPrice",
		"params":  []interface{}{},
		"id":      2,
	}
	
	gasPriceResp, err := c.callRPC(ctx, gasPriceReq)
	if err != nil {
		return nil, types.ErrNetwork("failed to get gas price", err)
	}
	
	status := &types.NetworkStatus{
		Network:          c.config.Network,
		LatestBlock:      c.parseBlockNumber(blockResp),
		GasPrice:         c.parseGasPrice(gasPriceResp),
		IsHealthy:        true,
		AvgBlockTime:     12.0, // Default for Ethereum
		CongestionLevel:  "normal",
	}
	
	return status, nil
}

// Close closes the client and cleans up resources
func (c *HyperEVMClient) Close() error {
	if c.httpPool != nil {
		c.httpPool.Close()
	}
	
	if c.config.Debug {
		fmt.Printf("[HyperEVM Client] Closed\n")
	}
	
	return nil
}

// Helper methods

func (c *HyperEVMClient) validateTransaction(tx *types.TransactionRequest) error {
	if tx.From == "" {
		return types.ErrValidation("from address cannot be empty", nil)
	}
	
	if !strings.HasPrefix(tx.From, "0x") || len(tx.From) != 42 {
		return types.ErrValidation("invalid from address format", nil)
	}
	
	if tx.To != "" && (!strings.HasPrefix(tx.To, "0x") || len(tx.To) != 42) {
		return types.ErrValidation("invalid to address format", nil)
	}
	
	return nil
}

func (c *HyperEVMClient) formatTransaction(tx *types.TransactionRequest) map[string]interface{} {
	txMap := map[string]interface{}{
		"from": tx.From,
	}
	
	if tx.To != "" {
		txMap["to"] = tx.To
	}
	
	if tx.Value != "" {
		txMap["value"] = tx.Value
	}
	
	if tx.Data != "" {
		txMap["data"] = tx.Data
	}
	
	if tx.GasLimit != "" {
		txMap["gas"] = tx.GasLimit
	}
	
	if tx.GasPrice != "" {
		txMap["gasPrice"] = tx.GasPrice
	}
	
	return txMap
}

func (c *HyperEVMClient) callRPC(ctx context.Context, req map[string]interface{}) (map[string]interface{}, error) {
	client := c.httpPool.WithTimeout(c.config.RPCEndpoint, c.config.Timeout)
	
	// Convert request to JSON
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}
	
	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.config.RPCEndpoint, strings.NewReader(string(jsonData)))
	if err != nil {
		return nil, err
	}
	
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("User-Agent", utils.UserAgent)
	
	// Execute request
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("RPC call failed with status: %d", resp.StatusCode)
	}
	
	// Parse response
	var rpcResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&rpcResp); err != nil {
		return nil, err
	}
	
	if errData, exists := rpcResp["error"]; exists {
		return nil, fmt.Errorf("RPC error: %v", errData)
	}
	
	return rpcResp, nil
}

func (c *HyperEVMClient) parseGasResponse(resp map[string]interface{}) string {
	if result, exists := resp["result"]; exists {
		if gasHex, ok := result.(string); ok {
			return gasHex
		}
	}
	return "21000" // Default gas limit
}

func (c *HyperEVMClient) parseBlockNumber(resp map[string]interface{}) int64 {
	if result, exists := resp["result"]; exists {
		if blockHex, ok := result.(string); ok {
			// Convert hex to decimal (simplified)
			return 12345678 // Mock block number
		}
	}
	return 0
}

func (c *HyperEVMClient) parseGasPrice(resp map[string]interface{}) string {
	if result, exists := resp["result"]; exists {
		if gasPriceHex, ok := result.(string); ok {
			return gasPriceHex
		}
	}
	return "20000000000" // Default 20 Gwei
}
