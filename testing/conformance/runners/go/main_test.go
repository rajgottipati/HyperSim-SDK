package main

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSDKInitialization(t *testing.T) {
	runner, err := NewConformanceTestRunner()
	require.NoError(t, err, "Failed to create test runner")

	testCase := map[string]interface{}{
		"id":          "init_001",
		"description": "Initialize SDK with default configuration",
		"name":        "sdk_initialization",
		"input": map[string]interface{}{
			"config": map[string]interface{}{
				"hyperCore": map[string]interface{}{
					"url":    "https://api.hypersim.io/hypercore",
					"apiKey": "test_key_123",
				},
				"hyperEVM": map[string]interface{}{
					"url":    "https://api.hypersim.io/hyperevm",
					"apiKey": "test_key_456",
				},
			},
		},
	}

	result := runner.runTest(testCase)

	assert.True(t, result.Success, "SDK initialization should succeed")
	assert.Less(t, result.ExecutionTimeMs, 1000.0, "Initialization should be fast")

	resultData := result.Result.(map[string]interface{})
	assert.Equal(t, true, resultData["sdk_initialized"])
}

func TestTransactionSimulation(t *testing.T) {
	runner, err := NewConformanceTestRunner()
	require.NoError(t, err, "Failed to create test runner")

	testCase := map[string]interface{}{
		"id":          "sim_001",
		"description": "Simulate basic ERC-20 transfer",
		"name":        "simulate_transaction",
		"input": map[string]interface{}{
			"transaction": map[string]interface{}{
				"to":       "0x742d35Cc6Bb23D8B09F1fD24D4C8AE3c87A86cF0",
				"value":    "1000000000000000000",
				"data":     "0xa9059cbb000000000000000000000000742d35cc6bb23d8b09f1fd24d4c8ae3c87a86cf00000000000000000000000000000000000000000000000000de0b6b3a7640000",
				"gasLimit": "21000",
			},
			"network":     "ethereum",
			"blockNumber": "latest",
		},
	}

	result := runner.runTest(testCase)

	assert.True(t, result.Success, "Transaction simulation should succeed")
	assert.Less(t, result.ExecutionTimeMs, 2000.0, "Simulation should complete within 2 seconds")

	if result.Result != nil {
		resultData := result.Result.(map[string]interface{})
		assert.NotNil(t, resultData["gasUsed"], "Should return gas used")
	}
}

func TestErrorHandling(t *testing.T) {
	runner, err := NewConformanceTestRunner()
	require.NoError(t, err, "Failed to create test runner")

	testCase := map[string]interface{}{
		"id":          "err_001",
		"description": "Handle invalid transaction data",
		"name":        "handle_invalid_input",
		"input": map[string]interface{}{
			"transaction": map[string]interface{}{
				"to":    "invalid_address",
				"value": "not_a_number",
			},
		},
	}

	result := runner.runTest(testCase)

	// For error handling tests, we expect a successful test execution
	// that returns an error result
	assert.True(t, result.Success, "Error handling test should execute successfully")

	if result.Result != nil {
		resultData := result.Result.(map[string]interface{})
		assert.Equal(t, false, resultData["success"], "Should return success: false for invalid input")
		assert.NotNil(t, resultData["error"], "Should return error details")
	}
}

func TestPerformanceRequirements(t *testing.T) {
	runner, err := NewConformanceTestRunner()
	require.NoError(t, err, "Failed to create test runner")

	err = runner.RunAllTests()
	require.NoError(t, err, "Failed to run tests")

	// Check performance requirements
	for _, result := range runner.results {
		switch {
		case result.TestID[:4] == "init":
			assert.Less(t, result.ExecutionTimeMs, 1000.0, "Initialization too slow: %fms", result.ExecutionTimeMs)
		case result.TestID[:3] == "sim":
			assert.Less(t, result.ExecutionTimeMs, 2000.0, "Simulation too slow: %fms", result.ExecutionTimeMs)
		case result.TestID[:2] == "ai":
			assert.Less(t, result.ExecutionTimeMs, 5000.0, "AI analysis too slow: %fms", result.ExecutionTimeMs)
		}
	}
}

func TestConcurrentExecution(t *testing.T) {
	// Test that the runner can handle concurrent test execution
	runner, err := NewConformanceTestRunner()
	require.NoError(t, err, "Failed to create test runner")

	testCase := map[string]interface{}{
		"id":          "init_001",
		"description": "Initialize SDK with default configuration",
		"name":        "sdk_initialization",
		"input": map[string]interface{}{
			"config": map[string]interface{}{
				"hyperCore": map[string]interface{}{
					"url":    "https://api.hypersim.io/hypercore",
					"apiKey": "test_key_123",
				},
			},
		},
	}

	// Run the same test concurrently
	const numGoroutines = 5
	results := make(chan TestResult, numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		go func() {
			results <- runner.runTest(testCase)
		}()
	}

	// Collect results
	for i := 0; i < numGoroutines; i++ {
		select {
		case result := <-results:
			assert.True(t, result.Success, "Concurrent test should succeed")
		case <-time.After(5 * time.Second):
			t.Fatal("Test timed out")
		}
	}
}

func BenchmarkSDKInitialization(b *testing.B) {
	runner, err := NewConformanceTestRunner()
	if err != nil {
		b.Fatalf("Failed to create test runner: %v", err)
	}

	testCase := map[string]interface{}{
		"id":          "init_001",
		"description": "Initialize SDK with default configuration",
		"name":        "sdk_initialization",
		"input": map[string]interface{}{
			"config": map[string]interface{}{
				"hyperCore": map[string]interface{}{
					"url":    "https://api.hypersim.io/hypercore",
					"apiKey": "test_key_123",
				},
			},
		},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		result := runner.runTest(testCase)
		if !result.Success {
			b.Fatalf("Test failed: %v", result.Error)
		}
	}
}
