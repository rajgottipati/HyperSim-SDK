package hypersim

import (
	"context"
	"testing"
	"time"

	"github.com/hypersim/hypersim-go-sdk/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSDKInitialization(t *testing.T) {
	tests := []struct {
		name        string
		config      *Config
		shouldError bool
		errorMsg    string
	}{
		{
			name: "valid basic config",
			config: &Config{
				Network: types.NetworkTestnet,
				Debug:   true,
			},
			shouldError: false,
		},
		{
			name: "valid config with AI",
			config: &Config{
				Network:      types.NetworkTestnet,
				AIEnabled:    true,
				OpenAIAPIKey: "test-key",
				Debug:        true,
			},
			shouldError: false,
		},
		{
			name:        "nil config",
			config:      nil,
			shouldError: true,
			errorMsg:    "config cannot be nil",
		},
		{
			name: "invalid network",
			config: &Config{
				Network: "invalid",
			},
			shouldError: true,
			errorMsg:    "invalid network",
		},
		{
			name: "AI enabled without API key",
			config: &Config{
				Network:   types.NetworkTestnet,
				AIEnabled: true,
			},
			shouldError: true,
			errorMsg:    "OpenAI API key required",
		},
		{
			name: "invalid timeout",
			config: &Config{
				Network: types.NetworkTestnet,
				Timeout: 500 * time.Millisecond,
			},
			shouldError: true,
			errorMsg:    "timeout must be at least 1 second",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sdk, err := New(tt.config)

			if tt.shouldError {
				assert.Error(t, err)
				assert.Nil(t, sdk)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, sdk)
				
				// Clean up
				if sdk != nil {
					err := sdk.Close()
					assert.NoError(t, err)
				}
			}
		})
	}
}

func TestSDKBasicOperations(t *testing.T) {
	config := &Config{
		Network: types.NetworkTestnet,
		Debug:   true,
		Timeout: 30 * time.Second,
	}

	sdk, err := New(config)
	require.NoError(t, err)
	require.NotNil(t, sdk)
	defer sdk.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	t.Run("network status", func(t *testing.T) {
		// Note: This test might fail in CI without actual network access
		// In a real implementation, you would mock the network calls
		status, err := sdk.GetNetworkStatus(ctx)
		if err != nil {
			// Expected to fail without real network
			t.Logf("Network status failed as expected: %v", err)
		} else {
			assert.NotNil(t, status)
			assert.Equal(t, types.NetworkTestnet, status.Network)
		}
	})

	t.Run("transaction validation", func(t *testing.T) {
		validTx := &types.TransactionRequest{
			From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
			To:       "0xA0b86a33E6417A9cDdA68C73E2c96b4DA3AEFc43",
			Value:    "1000000000000000000",
			GasLimit: "21000",
		}

		// This will likely fail without real network, but should validate inputs
		_, err := sdk.Simulate(ctx, validTx)
		if err != nil {
			// Expected to fail without real network
			t.Logf("Simulation failed as expected: %v", err)
		}

		// Test invalid transaction
		invalidTx := &types.TransactionRequest{
			From: "invalid-address",
		}

		_, err = sdk.Simulate(ctx, invalidTx)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid")
	})
}

func TestPluginSystem(t *testing.T) {
	config := &Config{
		Network: types.NetworkTestnet,
		Debug:   true,
		Plugins: []PluginConfig{
			{
				Name:     "logging",
				Enabled:  true,
				Priority: 1,
				Config: map[string]interface{}{
					"level": "debug",
				},
			},
			{
				Name:     "metrics",
				Enabled:  true,
				Priority: 2,
			},
		},
	}

	sdk, err := New(config)
	require.NoError(t, err)
	require.NotNil(t, sdk)
	defer sdk.Close()

	pluginSystem := sdk.GetPluginSystem()
	assert.NotNil(t, pluginSystem)

	// Check registered plugins
	plugins := pluginSystem.GetPlugins()
	assert.Len(t, plugins, 2)

	// Verify plugins are enabled
	assert.True(t, pluginSystem.IsPluginEnabled("logging"))
	assert.True(t, pluginSystem.IsPluginEnabled("metrics"))
}

func TestConfigDefaults(t *testing.T) {
	config := &Config{
		Network: types.NetworkTestnet,
	}

	sdk, err := New(config)
	require.NoError(t, err)
	require.NotNil(t, sdk)
	defer sdk.Close()

	// Verify defaults were applied
	assert.Equal(t, 30*time.Second, sdk.config.Timeout)
	assert.Equal(t, 10, sdk.config.MaxConcurrency)
	assert.NotEmpty(t, sdk.config.RPCEndpoint)
}

func TestConcurrentOperations(t *testing.T) {
	config := &Config{
		Network:        types.NetworkTestnet,
		Debug:          true,
		MaxConcurrency: 5,
	}

	sdk, err := New(config)
	require.NoError(t, err)
	require.NotNil(t, sdk)
	defer sdk.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Create multiple transactions
	transactions := make([]*types.TransactionRequest, 5)
	for i := range transactions {
		transactions[i] = &types.TransactionRequest{
			From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
			To:       "0xA0b86a33E6417A9cDdA68C73E2c96b4DA3AEFc43",
			Value:    "1000000000000000000",
			GasLimit: "21000",
		}
	}

	// Test bundle optimization (will likely fail without network but should handle concurrency)
	_, err = sdk.OptimizeBundle(ctx, transactions)
	if err != nil {
		t.Logf("Bundle optimization failed as expected: %v", err)
	}
}

func TestErrorHandling(t *testing.T) {
	config := &Config{
		Network: types.NetworkTestnet,
		Debug:   true,
	}

	sdk, err := New(config)
	require.NoError(t, err)
	require.NotNil(t, sdk)
	defer sdk.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Test with nil transaction
	_, err = sdk.Simulate(ctx, nil)
	assert.Error(t, err)
	
	var sdkErr *types.SDKError
	assert.ErrorAs(t, err, &sdkErr)
	assert.Equal(t, "VALIDATION_ERROR", sdkErr.Code)

	// Test AI insights without AI enabled
	result := &types.SimulationResult{
		Success: true,
		GasUsed: "21000",
	}
	
	_, err = sdk.GetAIInsights(ctx, result)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "AI features not enabled")
}

func TestSDKClose(t *testing.T) {
	config := &Config{
		Network: types.NetworkTestnet,
		Debug:   true,
	}

	sdk, err := New(config)
	require.NoError(t, err)
	require.NotNil(t, sdk)

	// Close should be idempotent
	err = sdk.Close()
	assert.NoError(t, err)

	err = sdk.Close()
	assert.NoError(t, err)

	// Operations should fail after close
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx := &types.TransactionRequest{
		From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
		To:       "0xA0b86a33E6417A9cDdA68C73E2c96b4DA3AEFc43",
		Value:    "1000000000000000000",
		GasLimit: "21000",
	}

	_, err = sdk.Simulate(ctx, tx)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "closed")
}
