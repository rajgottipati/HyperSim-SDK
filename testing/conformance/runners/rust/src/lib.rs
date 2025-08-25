#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;

    #[tokio::test]
    async fn test_sdk_initialization() {
        let runner = ConformanceTestRunner::new().await.expect("Failed to create runner");
        
        let test_case = serde_json::json!({
            "id": "init_001",
            "description": "Initialize SDK with default configuration",
            "name": "sdk_initialization",
            "input": {
                "config": {
                    "hyperCore": {
                        "url": "https://api.hypersim.io/hypercore",
                        "apiKey": "test_key_123"
                    },
                    "hyperEVM": {
                        "url": "https://api.hypersim.io/hyperevm",
                        "apiKey": "test_key_456"
                    }
                }
            }
        });
        
        let result = runner.run_test(&test_case).await;
        assert!(result.success, "SDK initialization should succeed");
        assert!(result.execution_time_ms < 1000.0, "Initialization should be fast");
        
        let result_data = result.result.unwrap();
        assert_eq!(result_data["sdk_initialized"], true);
    }

    #[tokio::test]
    async fn test_transaction_simulation() {
        let runner = ConformanceTestRunner::new().await.expect("Failed to create runner");
        
        let test_case = serde_json::json!({
            "id": "sim_001",
            "description": "Simulate basic ERC-20 transfer",
            "name": "simulate_transaction",
            "input": {
                "transaction": {
                    "to": "0x742d35Cc6Bb23D8B09F1fD24D4C8AE3c87A86cF0",
                    "value": "1000000000000000000",
                    "data": "0xa9059cbb000000000000000000000000742d35cc6bb23d8b09f1fd24d4c8ae3c87a86cf00000000000000000000000000000000000000000000000000de0b6b3a7640000",
                    "gasLimit": "21000"
                },
                "network": "ethereum",
                "blockNumber": "latest"
            }
        });
        
        let result = runner.run_test(&test_case).await;
        assert!(result.success, "Transaction simulation should succeed");
        assert!(result.execution_time_ms < 2000.0, "Simulation should complete within 2 seconds");
        
        let result_data = result.result.unwrap();
        assert!(result_data["gasUsed"].is_number(), "Should return gas used");
    }

    #[tokio::test]
    async fn test_error_handling() {
        let runner = ConformanceTestRunner::new().await.expect("Failed to create runner");
        
        let test_case = serde_json::json!({
            "id": "err_001",
            "description": "Handle invalid transaction data",
            "name": "handle_invalid_input",
            "input": {
                "transaction": {
                    "to": "invalid_address",
                    "value": "not_a_number"
                }
            }
        });
        
        let result = runner.run_test(&test_case).await;
        
        // For error handling tests, we expect a successful test execution
        // that returns an error result
        assert!(result.success, "Error handling test should execute successfully");
        
        let result_data = result.result.unwrap();
        assert_eq!(result_data["success"], false, "Should return success: false for invalid input");
        assert!(result_data["error"].is_object(), "Should return error details");
    }

    #[tokio::test]
    async fn test_performance_requirements() {
        let mut runner = ConformanceTestRunner::new().await.expect("Failed to create runner");
        let _results = runner.run_all_tests().await.expect("Failed to run tests");
        
        // Check performance requirements
        for result in &runner.results {
            if result.test_id.starts_with("init") {
                assert!(result.execution_time_ms < 1000.0, "Initialization too slow: {}ms", result.execution_time_ms);
            } else if result.test_id.starts_with("sim") {
                assert!(result.execution_time_ms < 2000.0, "Simulation too slow: {}ms", result.execution_time_ms);
            } else if result.test_id.starts_with("ai") {
                assert!(result.execution_time_ms < 5000.0, "AI analysis too slow: {}ms", result.execution_time_ms);
            }
        }
    }
}
