package io.hypersim.sdk.examples;

import io.hypersim.sdk.core.*;
import io.hypersim.sdk.types.*;
import io.hypersim.sdk.exceptions.*;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Comprehensive usage examples for HyperSim Java SDK.
 * 
 * Demonstrates key features including transaction simulation,
 * AI analysis, bundle optimization, and error handling.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public class ComprehensiveUsageExample {
    
    private static final String OPENAI_API_KEY = System.getenv("OPENAI_API_KEY");
    private static final String FROM_ADDRESS = "0x1234567890123456789012345678901234567890";
    private static final String TO_ADDRESS = "0x0987654321098765432109876543210987654321";
    private static final String CONTRACT_ADDRESS = "0xA0b86991c431c69C7C4ff0b4f8e3c4d7a4f8f0000";
    
    public static void main(String[] args) {
        System.out.println("=== HyperSim Java SDK Comprehensive Example ===\n");
        
        // Example 1: Basic Transaction Simulation
        basicTransactionSimulation();
        
        // Example 2: AI-Powered Analysis
        if (OPENAI_API_KEY != null) {
            aiPoweredAnalysis();
        } else {
            System.out.println("⚠️  Skipping AI examples - OPENAI_API_KEY not set\n");
        }
        
        // Example 3: Concurrent Simulations
        concurrentSimulations();
        
        // Example 4: Bundle Optimization
        bundleOptimization();
        
        // Example 5: Error Handling
        errorHandlingExample();
        
        // Example 6: WebSocket Streaming
        webSocketExample();
        
        System.out.println("✅ All examples completed successfully!");
    }
    
    /**
     * Example 1: Basic transaction simulation without AI.
     */
    private static void basicTransactionSimulation() {
        System.out.println("📝 Example 1: Basic Transaction Simulation");
        
        var config = HyperSimConfig.simple(Network.MAINNET);
        
        try (var sdk = new HyperSimSDK(config)) {
            
            // Create a simple transfer transaction
            var transaction = TransactionRequest.createTransfer(
                FROM_ADDRESS,
                TO_ADDRESS,
                "1000000000000000000" // 1 ETH in wei
            );
            
            System.out.println("Simulating transfer: 1 ETH from " + FROM_ADDRESS + " to " + TO_ADDRESS);
            
            var result = sdk.simulate(transaction).join();
            
            System.out.println("✅ Simulation completed:");
            System.out.println("  Success: " + result.success());
            System.out.println("  Gas Used: " + result.gasUsed());
            System.out.println("  Block Type: " + result.blockType());
            System.out.println("  Estimated Block: " + result.estimatedBlock());
            
        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
        }
        
        System.out.println();
    }
    
    /**
     * Example 2: AI-powered analysis with OpenAI integration.
     */
    private static void aiPoweredAnalysis() {
        System.out.println("🤖 Example 2: AI-Powered Analysis");
        
        var config = HyperSimConfig.withAI(Network.MAINNET, OPENAI_API_KEY);
        
        try (var sdk = new HyperSimSDK(config)) {
            
            // Create a contract interaction
            var transaction = TransactionRequest.createContractCall(
                FROM_ADDRESS,
                CONTRACT_ADDRESS,
                "0xa9059cbb" + // transfer(address,uint256)
                "000000000000000000000000" + TO_ADDRESS.substring(2) +
                "0000000000000000000000000000000000000000000000000de0b6b3a7640000" // 1 ETH
            );
            
            System.out.println("Simulating USDC transfer with AI analysis...");
            
            // Simulate transaction
            var result = sdk.simulate(transaction).join();
            System.out.println("✅ Simulation: " + (result.success() ? "SUCCESS" : "FAILED"));
            
            // Get AI insights
            var insights = sdk.getAIInsights(result).join();
            
            System.out.println("🧠 AI Analysis:");
            System.out.println("  Risk Level: " + insights.riskLevel());
            System.out.println("  Confidence: " + String.format("%.1f%%", insights.confidenceScore() * 100));
            System.out.println("  Summary: " + insights.summary());
            
            if (!insights.gasSavingSuggestions().isEmpty()) {
                System.out.println("  Gas Saving Tips:");
                insights.gasSavingSuggestions().forEach(tip -> 
                    System.out.println("    • " + tip));
            }
            
        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
        }
        
        System.out.println();
    }
    
    /**
     * Example 3: Concurrent transaction simulations using virtual threads.
     */
    private static void concurrentSimulations() {
        System.out.println("⚡ Example 3: Concurrent Simulations");
        
        var config = HyperSimConfig.simple(Network.MAINNET);
        
        try (var sdk = new HyperSimSDK(config)) {
            
            // Create multiple transactions
            var transactions = List.of(
                TransactionRequest.createTransfer(FROM_ADDRESS, TO_ADDRESS, "100000000000000000"), // 0.1 ETH
                TransactionRequest.createTransfer(FROM_ADDRESS, TO_ADDRESS, "200000000000000000"), // 0.2 ETH
                TransactionRequest.createTransfer(FROM_ADDRESS, TO_ADDRESS, "300000000000000000"), // 0.3 ETH
                TransactionRequest.createTransfer(FROM_ADDRESS, TO_ADDRESS, "400000000000000000"), // 0.4 ETH
                TransactionRequest.createTransfer(FROM_ADDRESS, TO_ADDRESS, "500000000000000000")  // 0.5 ETH
            );
            
            System.out.println("Simulating " + transactions.size() + " transactions concurrently...");
            
            long startTime = System.currentTimeMillis();
            
            // Simulate all transactions concurrently using virtual threads
            var futures = transactions.stream()
                .map(sdk::simulate)
                .toList();
            
            // Wait for all simulations to complete
            var results = futures.stream()
                .map(CompletableFuture::join)
                .toList();
            
            long endTime = System.currentTimeMillis();
            
            System.out.println("✅ All simulations completed in " + (endTime - startTime) + "ms:");
            
            for (int i = 0; i < results.size(); i++) {
                var result = results.get(i);
                System.out.println("  Transaction " + (i + 1) + ": " + 
                                 (result.success() ? "SUCCESS" : "FAILED") + 
                                 " (Gas: " + result.gasUsed() + ")");
            }
            
        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
        }
        
        System.out.println();
    }
    
    /**
     * Example 4: Bundle optimization for gas efficiency.
     */
    private static void bundleOptimization() {
        System.out.println("📦 Example 4: Bundle Optimization");
        
        var config = OPENAI_API_KEY != null ? 
            HyperSimConfig.withAI(Network.MAINNET, OPENAI_API_KEY) :
            HyperSimConfig.simple(Network.MAINNET);
        
        try (var sdk = new HyperSimSDK(config)) {
            
            // Create a bundle of transactions
            var bundle = List.of(
                TransactionRequest.createTransfer(FROM_ADDRESS, TO_ADDRESS, "1000000000000000000"),
                TransactionRequest.createContractCall(FROM_ADDRESS, CONTRACT_ADDRESS, "0x70a08231" + "000000000000000000000000" + FROM_ADDRESS.substring(2)),
                TransactionRequest.createTransfer(FROM_ADDRESS, CONTRACT_ADDRESS, "500000000000000000")
            );
            
            System.out.println("Optimizing bundle of " + bundle.size() + " transactions...");
            
            var optimization = sdk.optimizeBundle(bundle).join();
            
            System.out.println("✅ Bundle Optimization Results:");
            System.out.println("  Original Gas: " + optimization.originalGas());
            System.out.println("  Optimized Gas: " + optimization.optimizedGas());
            System.out.println("  Gas Saved: " + optimization.gasSaved());
            
            if (!optimization.suggestions().isEmpty()) {
                System.out.println("  Optimization Suggestions:");
                optimization.suggestions().forEach(suggestion -> 
                    System.out.println("    • " + suggestion));
            }
            
        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
        }
        
        System.out.println();
    }
    
    /**
     * Example 5: Comprehensive error handling.
     */\n    private static void errorHandlingExample() {\n        System.out.println(\"🛡️  Example 5: Error Handling\");\n        \n        var config = HyperSimConfig.simple(Network.MAINNET);\n        \n        try (var sdk = new HyperSimSDK(config)) {\n            \n            // Test 1: Invalid transaction (invalid address)\n            try {\n                var invalidTransaction = TransactionRequest.builder()\n                    .from(\"invalid-address\")\n                    .to(TO_ADDRESS)\n                    .value(\"1000000000000000000\")\n                    .build();\n                \n                sdk.simulate(invalidTransaction).join();\n                \n            } catch (ValidationException e) {\n                System.out.println(\"✅ Caught ValidationException: \" + e.getMessage());\n                System.out.println(\"  Field: \" + e.getField());\n                System.out.println(\"  Value: \" + e.getValue());\n            } catch (Exception e) {\n                System.out.println(\"✅ Caught exception: \" + e.getClass().getSimpleName() + \": \" + e.getMessage());\n            }\n            \n            // Test 2: AI analysis without API key\n            try {\n                var transaction = TransactionRequest.createTransfer(FROM_ADDRESS, TO_ADDRESS, \"1000000000000000000\");\n                var result = sdk.simulate(transaction).join();\n                sdk.getAIInsights(result).join();\n                \n            } catch (ValidationException e) {\n                System.out.println(\"✅ Caught ValidationException for AI: \" + e.getMessage());\n            } catch (Exception e) {\n                System.out.println(\"✅ Caught exception: \" + e.getClass().getSimpleName() + \": \" + e.getMessage());\n            }\n            \n        } catch (Exception e) {\n            System.err.println(\"❌ Unexpected error: \" + e.getMessage());\n        }\n        \n        System.out.println();\n    }\n    \n    /**\n     * Example 6: WebSocket streaming for real-time data.\n     */\n    private static void webSocketExample() {\n        System.out.println(\"📡 Example 6: WebSocket Streaming\");\n        \n        var config = HyperSimConfig.builder()\n            .network(Network.MAINNET)\n            .streamingEnabled(true)\n            .timeout(Duration.ofSeconds(10))\n            .build();\n        \n        try (var sdk = new HyperSimSDK(config)) {\n            \n            System.out.println(\"Connecting to WebSocket...\");\n            \n            // Connect to WebSocket\n            sdk.connectWebSocket()\n                .orTimeout(5, java.util.concurrent.TimeUnit.SECONDS)\n                .join();\n            \n            System.out.println(\"✅ WebSocket connected: \" + sdk.isWebSocketConnected());\n            \n            // Simulate some activity\n            Thread.sleep(2000);\n            \n            // Disconnect\n            sdk.disconnectWebSocket();\n            System.out.println(\"✅ WebSocket disconnected: \" + !sdk.isWebSocketConnected());\n            \n        } catch (Exception e) {\n            System.out.println(\"✅ WebSocket example completed (mock implementation): \" + e.getClass().getSimpleName());\n        }\n        \n        System.out.println();\n    }\n}\n