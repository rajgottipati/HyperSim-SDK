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
	// Initialize SDK with basic configuration
	config := &hypersim.Config{
		Network:           types.NetworkTestnet, // Use testnet for examples
		AIEnabled:         false,                // Disable AI for basic example
		CrossLayerEnabled: true,
		StreamingEnabled:  false,
		Debug:            true,
		Timeout:          30 * time.Second,
	}

	// Create SDK instance
	sdk, err := hypersim.New(config)
	if err != nil {
		log.Fatalf("Failed to create SDK: %v", err)
	}
	defer sdk.Close()

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Example 1: Simple transaction simulation
	fmt.Println("=== Example 1: Simple Transaction Simulation ===")
	err = simulateTransaction(ctx, sdk)
	if err != nil {
		log.Printf("Transaction simulation failed: %v", err)
	}

	// Example 2: Get network status
	fmt.Println("\n=== Example 2: Network Status ===")
	err = getNetworkStatus(ctx, sdk)
	if err != nil {
		log.Printf("Get network status failed: %v", err)
	}

	// Example 3: Risk assessment
	fmt.Println("\n=== Example 3: Risk Assessment ===")
	err = assessTransactionRisk(ctx, sdk)
	if err != nil {
		log.Printf("Risk assessment failed: %v", err)
	}
}

func simulateTransaction(ctx context.Context, sdk *hypersim.SDK) error {
	// Create a sample transaction
	tx := &types.TransactionRequest{
		From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
		To:       "0xA0b86a33E6417A9cDdA68C73E2c96b4DA3AEFc43",
		Value:    "1000000000000000000", // 1 ETH in wei
		GasLimit: "21000",               // Standard gas limit for ETH transfer
		GasPrice: "20000000000",         // 20 Gwei
	}

	fmt.Printf("Simulating transaction from %s to %s\n", tx.From, tx.To)
	fmt.Printf("Value: %s wei (1 ETH)\n", tx.Value)

	// Simulate the transaction
	result, err := sdk.Simulate(ctx, tx)
	if err != nil {
		return fmt.Errorf("simulation failed: %w", err)
	}

	// Display results
	fmt.Printf("Simulation Result:\n")
	fmt.Printf("  Success: %t\n", result.Success)
	fmt.Printf("  Gas Used: %s\n", result.GasUsed)
	fmt.Printf("  Block Type: %s\n", result.BlockType)
	fmt.Printf("  Estimated Block: %d\n", result.EstimatedBlock)

	if result.Error != "" {
		fmt.Printf("  Error: %s\n", result.Error)
	}

	if result.RevertReason != "" {
		fmt.Printf("  Revert Reason: %s\n", result.RevertReason)
	}

	// Display HyperCore data if available
	if result.HyperCoreData != nil {
		fmt.Printf("  HyperCore Data:\n")
		fmt.Printf("    Positions: %d\n", len(result.HyperCoreData.Positions))
		if result.HyperCoreData.MarketData != nil {
			fmt.Printf("    Market Prices: %d\n", len(result.HyperCoreData.MarketData.Prices))
		}
	}

	return nil
}

func getNetworkStatus(ctx context.Context, sdk *hypersim.SDK) error {
	status, err := sdk.GetNetworkStatus(ctx)
	if err != nil {
		return fmt.Errorf("failed to get network status: %w", err)
	}

	fmt.Printf("Network Status:\n")
	fmt.Printf("  Network: %s\n", status.Network)
	fmt.Printf("  Latest Block: %d\n", status.LatestBlock)
	fmt.Printf("  Gas Price: %s wei\n", status.GasPrice)
	fmt.Printf("  Healthy: %t\n", status.IsHealthy)
	fmt.Printf("  Avg Block Time: %.2f seconds\n", status.AvgBlockTime)
	fmt.Printf("  Congestion Level: %s\n", status.CongestionLevel)

	return nil
}

func assessTransactionRisk(ctx context.Context, sdk *hypersim.SDK) error {
	// Create a potentially risky transaction (high gas usage)
	tx := &types.TransactionRequest{
		From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
		To:       "0xA0b86a33E6417A9cDdA68C73E2c96b4DA3AEFc43",
		Value:    "0",
		Data:     "0x1234567890", // Some contract call data
		GasLimit: "500000",       // Higher gas limit
		GasPrice: "50000000000",  // 50 Gwei
	}

	fmt.Printf("Assessing risk for contract interaction transaction\n")

	// Assess risk
	insights, err := sdk.AssessRisk(ctx, tx)
	if err != nil {
		return fmt.Errorf("risk assessment failed: %w", err)
	}

	fmt.Printf("Risk Assessment:\n")
	fmt.Printf("  Risk Level: %s\n", insights.RiskLevel)
	fmt.Printf("  Success Probability: %.2f\n", insights.SuccessProbability)
	fmt.Printf("  Confidence Score: %.2f\n", insights.ConfidenceScore)

	if len(insights.Recommendations) > 0 {
		fmt.Printf("  Recommendations:\n")
		for i, rec := range insights.Recommendations {
			fmt.Printf("    %d. %s\n", i+1, rec)
		}
	}

	if len(insights.SecurityWarnings) > 0 {
		fmt.Printf("  Security Warnings:\n")
		for i, warning := range insights.SecurityWarnings {
			fmt.Printf("    %d. %s\n", i+1, warning)
		}
	}

	if insights.GasOptimization != nil {
		fmt.Printf("  Gas Optimization:\n")
		fmt.Printf("    Current Gas: %s\n", insights.GasOptimization.CurrentGas)
		fmt.Printf("    Optimized Gas: %s\n", insights.GasOptimization.OptimizedGas)
		fmt.Printf("    Potential Savings: %s\n", insights.GasOptimization.Savings)
	}

	return nil
}
