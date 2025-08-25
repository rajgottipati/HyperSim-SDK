package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/hypersim/hypersim-go-sdk/hypersim"
	"github.com/hypersim/hypersim-go-sdk/types"
)

func main() {
	// Initialize SDK with AI and cross-layer features enabled
	config := &hypersim.Config{
		Network:           types.NetworkTestnet,
		AIEnabled:         true,
		OpenAIAPIKey:      "your-openai-api-key", // Replace with actual key
		CrossLayerEnabled: true,
		StreamingEnabled:  false,
		Debug:            true,
		Timeout:          60 * time.Second, // Longer timeout for AI operations
		MaxConcurrency:   5,                // Limit concurrent operations
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

	// Example 1: AI-powered transaction analysis
	fmt.Println("=== Example 1: AI-Powered Analysis ===")
	err = performAIAnalysis(ctx, sdk)
	if err != nil {
		log.Printf("AI analysis failed: %v", err)
	}

	// Example 2: Bundle optimization
	fmt.Println("\n=== Example 2: Bundle Optimization ===")
	err = optimizeTransactionBundle(ctx, sdk)
	if err != nil {
		log.Printf("Bundle optimization failed: %v", err)
	}

	// Example 3: Cross-layer HyperCore integration
	fmt.Println("\n=== Example 3: Cross-layer Integration ===")
	err = demonstrateCrossLayerIntegration(ctx, sdk)
	if err != nil {
		log.Printf("Cross-layer integration failed: %v", err)
	}
}

func performAIAnalysis(ctx context.Context, sdk *hypersim.SDK) error {
	// Create a transaction for analysis
	tx := &types.TransactionRequest{
		From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
		To:       "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI token contract
		Value:    "0",
		Data:     "0xa9059cbb000000000000000000000000a0b86a33e6417a9cdda68c73e2c96b4da3aefc43000000000000000000000000000000000000000000000000000de0b6b3a7640000", // transfer function call
		GasLimit: "65000",
		GasPrice: "30000000000", // 30 Gwei
	}

	fmt.Printf("Performing AI analysis for token transfer transaction\n")

	// First simulate the transaction
	result, err := sdk.Simulate(ctx, tx)
	if err != nil {
		return fmt.Errorf("simulation failed: %w", err)
	}

	fmt.Printf("Simulation completed: success=%t, gas=%s\n", result.Success, result.GasUsed)

	// Get AI insights
	insights, err := sdk.GetAIInsights(ctx, result)
	if err != nil {
		return fmt.Errorf("AI analysis failed: %w", err)
	}

	// Display AI insights
	fmt.Printf("\nAI Analysis Results:\n")
	fmt.Printf("  Risk Level: %s\n", insights.RiskLevel)
	fmt.Printf("  Success Probability: %.2f%%\n", insights.SuccessProbability*100)
	fmt.Printf("  Confidence Score: %.2f\n", insights.ConfidenceScore)
	fmt.Printf("  Similar Transactions: %d\n", insights.SimilarTransactions)

	if insights.GasOptimization != nil {
		fmt.Printf("\n  Gas Optimization:\n")
		fmt.Printf("    Current: %s gas\n", insights.GasOptimization.CurrentGas)
		fmt.Printf("    Optimized: %s gas\n", insights.GasOptimization.OptimizedGas)
		fmt.Printf("    Savings: %s gas\n", insights.GasOptimization.Savings)
		
		if len(insights.GasOptimization.Suggestions) > 0 {
			fmt.Printf("    Suggestions:\n")
			for i, suggestion := range insights.GasOptimization.Suggestions {
				fmt.Printf("      %d. %s\n", i+1, suggestion)
			}
		}
	}

	if len(insights.Recommendations) > 0 {
		fmt.Printf("\n  AI Recommendations:\n")
		for i, rec := range insights.Recommendations {
			fmt.Printf("    %d. %s\n", i+1, rec)
		}
	}

	if len(insights.SecurityWarnings) > 0 {
		fmt.Printf("\n  Security Warnings:\n")
		for i, warning := range insights.SecurityWarnings {
			fmt.Printf("    %d. %s\n", i+1, warning)
		}
	}

	return nil
}

func optimizeTransactionBundle(ctx context.Context, sdk *hypersim.SDK) error {
	// Create a bundle of transactions
	transactions := []*types.TransactionRequest{
		{
			From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
			To:       "0xA0b86a33E6417A9cDdA68C73E2c96b4DA3AEFc43",
			Value:    "1000000000000000000", // 1 ETH
			GasLimit: "21000",
			GasPrice: "25000000000", // 25 Gwei
		},
		{
			From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
			To:       "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI token
			Value:    "0",
			Data:     "0xa9059cbb000000000000000000000000a0b86a33e6417a9cdda68c73e2c96b4da3aefc43000000000000000000000000000000000000000000000000000de0b6b3a7640000",
			GasLimit: "65000",
			GasPrice: "25000000000",
		},
		{
			From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
			To:       "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH contract
			Value:    "2000000000000000000", // 2 ETH
			Data:     "0xd0e30db0", // deposit function
			GasLimit: "50000",
			GasPrice: "25000000000",
		},
	}

	fmt.Printf("Optimizing bundle of %d transactions\n", len(transactions))

	// Optimize the bundle
	optimization, err := sdk.OptimizeBundle(ctx, transactions)
	if err != nil {
		return fmt.Errorf("bundle optimization failed: %w", err)
	}

	// Display optimization results
	fmt.Printf("\nBundle Optimization Results:\n")
	fmt.Printf("  Original Gas: %s\n", optimization.OriginalGas)
	fmt.Printf("  Optimized Gas: %s\n", optimization.OptimizedGas)
	fmt.Printf("  Gas Saved: %s\n", optimization.GasSaved)

	fmt.Printf("\n  Recommended Order:\n")
	for i, index := range optimization.ReorderedIndices {
		fmt.Printf("    %d. Transaction %d\n", i+1, index+1)
	}

	if len(optimization.Suggestions) > 0 {
		fmt.Printf("\n  Optimization Suggestions:\n")
		for i, suggestion := range optimization.Suggestions {
			fmt.Printf("    %d. %s\n", i+1, suggestion)
		}
	}

	if len(optimization.Warnings) > 0 {
		fmt.Printf("\n  Warnings:\n")
		for i, warning := range optimization.Warnings {
			fmt.Printf("    %d. %s\n", i+1, warning)
		}
	}

	return nil
}

func demonstrateCrossLayerIntegration(ctx context.Context, sdk *hypersim.SDK) error {
	// Create a transaction that might interact with HyperCore
	tx := &types.TransactionRequest{
		From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
		To:       "0x0000000000000000000000000000000000000100", // Example precompile address
		Value:    "0",
		Data:     "0x12345678", // Example precompile call
		GasLimit: "100000",
		GasPrice: "20000000000",
	}

	fmt.Printf("Demonstrating cross-layer HyperCore integration\n")

	// Simulate with cross-layer data
	result, err := sdk.Simulate(ctx, tx)
	if err != nil {
		return fmt.Errorf("cross-layer simulation failed: %w", err)
	}

	fmt.Printf("Simulation Result:\n")
	fmt.Printf("  Success: %t\n", result.Success)
	fmt.Printf("  Gas Used: %s\n", result.GasUsed)

	// Display HyperCore data
	if result.HyperCoreData != nil {
		fmt.Printf("\n  HyperCore Integration:\n")
		fmt.Printf("    Core State Keys: %d\n", len(result.HyperCoreData.CoreState))
		
		// Display core state information
		if network, exists := result.HyperCoreData.CoreState["network"]; exists {
			fmt.Printf("    Network: %v\n", network)
		}
		if lastUpdate, exists := result.HyperCoreData.CoreState["lastUpdate"]; exists {
			fmt.Printf("    Last Update: %v\n", lastUpdate)
		}

		// Display positions
		if len(result.HyperCoreData.Positions) > 0 {
			fmt.Printf("\n    Positions (%d):\n", len(result.HyperCoreData.Positions))
			for i, pos := range result.HyperCoreData.Positions {
				fmt.Printf("      %d. Asset: %s, Size: %s, Side: %s\n", 
					i+1, pos.Asset, pos.Size, pos.Side)
				fmt.Printf("         Entry Price: %s, PnL: %s\n", 
					pos.EntryPrice, pos.UnrealizedPnL)
			}
		}

		// Display market data
		if result.HyperCoreData.MarketData != nil {
			marketData := result.HyperCoreData.MarketData
			fmt.Printf("\n    Market Data:\n")
			
			if len(marketData.Prices) > 0 {
				fmt.Printf("      Prices:\n")
				for asset, price := range marketData.Prices {
					fmt.Printf("        %s: %s\n", asset, price)
				}
			}
			
			if len(marketData.FundingRates) > 0 {
				fmt.Printf("      Funding Rates:\n")
				for asset, rate := range marketData.FundingRates {
					fmt.Printf("        %s: %s\n", asset, rate)
				}
			}
		}

		// Display cross-layer interactions
		if len(result.HyperCoreData.Interactions) > 0 {
			fmt.Printf("\n    Cross-layer Interactions (%d):\n", len(result.HyperCoreData.Interactions))
			for i, interaction := range result.HyperCoreData.Interactions {
				fmt.Printf("      %d. Type: %s, Precompile: %s\n", 
					i+1, interaction.Type, interaction.Precompile)
				if interaction.Result != "" {
					fmt.Printf("         Result: %s\n", interaction.Result)
				}
			}
		}
	} else {
		fmt.Printf("  No HyperCore data available\n")
	}

	return nil
}
