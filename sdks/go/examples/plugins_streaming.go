package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/hypersim/hypersim-go-sdk/hypersim"
	"github.com/hypersim/hypersim-go-sdk/plugins"
	"github.com/hypersim/hypersim-go-sdk/types"
)

func main() {
	// Initialize SDK with all features enabled including plugins
	config := &hypersim.Config{
		Network:           types.NetworkTestnet,
		AIEnabled:         false, // Disable AI for this example
		CrossLayerEnabled: true,
		StreamingEnabled:  true,
		Debug:            true,
		Timeout:          30 * time.Second,
		MaxConcurrency:   5,
		
		// Configure built-in plugins
		Plugins: []hypersim.PluginConfig{
			{
				Name:     "logging",
				Enabled:  true,
				Priority: 1,
				Config: map[string]interface{}{
					"level":       "info",
					"showHeaders": false,
					"showBody":    true,
				},
			},
			{
				Name:     "metrics",
				Enabled:  true,
				Priority: 2,
				Config: map[string]interface{}{
					"collectTiming": true,
					"collectCounts": true,
				},
			},
			{
				Name:     "retry",
				Enabled:  true,
				Priority: 3,
				Config: map[string]interface{}{
					"maxAttempts":      3,
					"initialDelay":     "1s",
					"maxDelay":         "10s",
					"backoffMultiplier": 2.0,
				},
			},
		},
	}

	// Create SDK instance
	sdk, err := hypersim.New(config)
	if err != nil {
		log.Fatalf("Failed to create SDK: %v", err)
	}
	defer sdk.Close()

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	// Example 1: Plugin system demonstration
	fmt.Println("=== Example 1: Plugin System ===")
	demonstratePluginSystem(ctx, sdk)

	// Example 2: WebSocket streaming
	fmt.Println("\n=== Example 2: WebSocket Streaming ===")
	err = demonstrateWebSocketStreaming(ctx, sdk)
	if err != nil {
		log.Printf("WebSocket streaming failed: %v", err)
	}

	// Example 3: Multiple concurrent simulations with plugin monitoring
	fmt.Println("\n=== Example 3: Concurrent Simulations ===")
	err = performConcurrentSimulations(ctx, sdk)
	if err != nil {
		log.Printf("Concurrent simulations failed: %v", err)
	}
	
	// Display final metrics
	fmt.Println("\n=== Final Metrics ===")
	displayMetrics(sdk)
}

func demonstratePluginSystem(ctx context.Context, sdk *hypersim.SDK) {
	pluginSystem := sdk.GetPluginSystem()
	
	// Get plugin information
	plugins := pluginSystem.GetPlugins()
	fmt.Printf("Registered Plugins (%d):\n", len(plugins))
	
	for i, plugin := range plugins {
		fmt.Printf("  %d. %s v%s (enabled: %t, healthy: %t)\n", 
			i+1, plugin.Name, plugin.Version, plugin.Enabled, plugin.Healthy)
		fmt.Printf("     Description: %s\n", plugin.Description)
	}

	// Test plugin functionality with a transaction
	tx := &types.TransactionRequest{
		From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
		To:       "0xA0b86a33E6417A9cDdA68C73E2c96b4DA3AEFc43",
		Value:    "1000000000000000000",
		GasLimit: "21000",
		GasPrice: "20000000000",
	}

	fmt.Printf("\nRunning transaction with plugin monitoring...\n")
	_, err := sdk.Simulate(ctx, tx)
	if err != nil {
		log.Printf("Simulation with plugins failed: %v", err)
	} else {
		fmt.Printf("Transaction completed successfully with plugin monitoring\n")
	}
}

func demonstrateWebSocketStreaming(ctx context.Context, sdk *hypersim.SDK) error {
	fmt.Printf("Connecting to WebSocket for real-time data...\n")

	// Connect to WebSocket
	err := sdk.ConnectWebSocket(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect WebSocket: %w", err)
	}

	// Set up message handlers
	sdk.SetWebSocketHandler(types.SubTypeBlocks, func(msg *types.WSMessage) error {
		fmt.Printf("[WebSocket] New block: %+v\n", msg.Data)
		return nil
	})

	sdk.SetWebSocketHandler(types.SubTypeTransactions, func(msg *types.WSMessage) error {
		fmt.Printf("[WebSocket] New transaction: %+v\n", msg.Data)
		return nil
	})

	// Subscribe to block updates
	blockParams := map[string]interface{}{
		"includeTransactions": false,
	}
	
	subscription, err := sdk.Subscribe(ctx, types.SubTypeBlocks, blockParams)
	if err != nil {
		return fmt.Errorf("failed to subscribe to blocks: %w", err)
	}

	fmt.Printf("Subscribed to blocks (ID: %s)\n", subscription.ID)

	// Subscribe to transaction updates for a specific address
	txParams := map[string]interface{}{
		"address": "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
	}
	
	txSubscription, err := sdk.Subscribe(ctx, types.SubTypeTransactions, txParams)
	if err != nil {
		return fmt.Errorf("failed to subscribe to transactions: %w", err)
	}

	fmt.Printf("Subscribed to transactions (ID: %s)\n", txSubscription.ID)

	// Listen for a short period
	fmt.Printf("Listening for WebSocket events for 10 seconds...\n")
	time.Sleep(10 * time.Second)

	fmt.Printf("WebSocket streaming example completed\n")
	return nil
}

func performConcurrentSimulations(ctx context.Context, sdk *hypersim.SDK) error {
	// Create multiple transactions to simulate concurrently
	transactions := []*types.TransactionRequest{
		{
			From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
			To:       "0xA0b86a33E6417A9cDdA68C73E2c96b4DA3AEFc43",
			Value:    "1000000000000000000",
			GasLimit: "21000",
			GasPrice: "20000000000",
		},
		{
			From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
			To:       "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
			Value:    "0",
			Data:     "0x70a08231000000000000000000000000742d35cc6634c0532925a3b8d9c1ddcfab6e4444", // balanceOf call
			GasLimit: "50000",
			GasPrice: "25000000000",
		},
		{
			From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
			To:       "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
			Value:    "500000000000000000", // 0.5 ETH
			Data:     "0xd0e30db0",          // WETH deposit
			GasLimit: "45000",
			GasPrice: "22000000000",
		},
		{
			From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
			To:       "0x6B175474E89094C44Da98b954EedeAC495271d0F",
			Value:    "0",
			Data:     "0x70a08231000000000000000000000000742d35cc6634c0532925a3b8d9c1ddcfab6e4444", // DAI balanceOf
			GasLimit: "40000",
			GasPrice: "24000000000",
		},
		{
			From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
			To:       "0xA0b86a33E6417A9cDdA68C73E2c96b4DA3AEFc43",
			Value:    "2000000000000000000", // 2 ETH
			GasLimit: "21000",
			GasPrice: "30000000000",
		},
	}

	fmt.Printf("Performing %d concurrent simulations with plugin monitoring...\n", len(transactions))

	start := time.Now()

	// Use channels to collect results
	resultChan := make(chan *types.SimulationResult, len(transactions))
	errorChan := make(chan error, len(transactions))

	// Launch concurrent simulations
	for i, tx := range transactions {
		go func(index int, transaction *types.TransactionRequest) {
			simCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
			defer cancel()

			fmt.Printf("Starting simulation %d\n", index+1)
			result, err := sdk.Simulate(simCtx, transaction)
			if err != nil {
				errorChan <- fmt.Errorf("simulation %d failed: %w", index+1, err)
				return
			}

			fmt.Printf("Simulation %d completed: success=%t, gas=%s\n", 
				index+1, result.Success, result.GasUsed)
			resultChan <- result
		}(i, tx)
	}

	// Collect results
	var results []*types.SimulationResult
	var errors []error

	for i := 0; i < len(transactions); i++ {
		select {
		case result := <-resultChan:
			results = append(results, result)
		case err := <-errorChan:
			errors = append(errors, err)
		case <-ctx.Done():
			return fmt.Errorf("context cancelled: %w", ctx.Err())
		}
	}

	duration := time.Since(start)

	// Display results
	fmt.Printf("\nConcurrent Simulation Results:\n")
	fmt.Printf("  Total Duration: %v\n", duration)
	fmt.Printf("  Successful Simulations: %d\n", len(results))
	fmt.Printf("  Failed Simulations: %d\n", len(errors))

	if len(errors) > 0 {
		fmt.Printf("  Errors:\n")
		for i, err := range errors {
			fmt.Printf("    %d. %v\n", i+1, err)
		}
	}

	// Calculate statistics
	if len(results) > 0 {
		totalGas := int64(0)
		successCount := 0

		for _, result := range results {
			if result.Success {
				successCount++
			}
			// Parse gas used
			if gas, err := parseGasUsed(result.GasUsed); err == nil {
				totalGas += gas
			}
		}

		fmt.Printf("\n  Statistics:\n")
		fmt.Printf("    Success Rate: %.2f%%\n", float64(successCount)/float64(len(results))*100)
		fmt.Printf("    Total Gas Used: %d\n", totalGas)
		fmt.Printf("    Average Gas per Transaction: %d\n", totalGas/int64(len(results)))
		fmt.Printf("    Simulations per Second: %.2f\n", float64(len(results))/duration.Seconds())
	}

	return nil
}

func displayMetrics(sdk *hypersim.SDK) {
	pluginSystem := sdk.GetPluginSystem()
	
	// Get metrics from the metrics plugin if available
	if pluginSystem.HasPlugin("metrics") && pluginSystem.IsPluginEnabled("metrics") {
		fmt.Printf("Plugin system metrics available\n")
		fmt.Printf("Note: Metrics are automatically displayed when plugins are cleaned up\n")
	} else {
		fmt.Printf("Metrics plugin not enabled\n")
	}

	// Display plugin status
	plugins := pluginSystem.GetPlugins()
	fmt.Printf("\nFinal Plugin Status:\n")
	for _, plugin := range plugins {
		status := "healthy"
		if !plugin.Healthy {
			status = "unhealthy"
		}
		fmt.Printf("  %s: %s (%s)\n", plugin.Name, status, plugin.Version)
	}
}

// Helper function to parse gas used
func parseGasUsed(gasStr string) (int64, error) {
	// Handle hex format
	if len(gasStr) > 2 && gasStr[:2] == "0x" {
		return parseHexInt(gasStr)
	}
	
	// Handle decimal format
	gas := int64(0)
	for _, r := range gasStr {
		if r >= '0' && r <= '9' {
			gas = gas*10 + int64(r-'0')
		} else {
			break
		}
	}
	
	return gas, nil
}

func parseHexInt(hexStr string) (int64, error) {
	result := int64(0)
	hexStr = hexStr[2:] // Remove 0x prefix
	
	for _, r := range hexStr {
		result *= 16
		if r >= '0' && r <= '9' {
			result += int64(r - '0')
		} else if r >= 'a' && r <= 'f' {
			result += int64(r - 'a' + 10)
		} else if r >= 'A' && r <= 'F' {
			result += int64(r - 'A' + 10)
		}
	}
	
	return result, nil
}
