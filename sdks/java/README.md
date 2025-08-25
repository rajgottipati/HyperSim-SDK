# HyperSim Java SDK

Enterprise-grade Java SDK for HyperEVM transaction simulation with AI-powered analysis and cross-layer HyperCore integration.

[![Java](https://img.shields.io/badge/Java-21+-orange.svg)](https://openjdk.org/projects/jdk/21/)
[![Maven](https://img.shields.io/badge/Maven-3.6+-blue.svg)](https://maven.apache.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Features

- 🚀 **High-Performance Architecture**: Project Loom virtual threads for exceptional concurrency
- 🤖 **AI-Powered Analysis**: OpenAI integration for intelligent transaction analysis
- 🔗 **Cross-Layer Integration**: Seamless HyperCore data access for enhanced context
- 📡 **Real-time Streaming**: WebSocket support for live blockchain data
- 🔌 **Extensible Plugin System**: ServiceLoader-based architecture for custom extensions
- 🛡️ **Enterprise-Ready**: Comprehensive error handling, connection pooling, and retry logic
- 📊 **Built-in Monitoring**: Metrics collection and performance monitoring
- 🎯 **Type Safety**: Leverage Java's strong type system with modern record types

## Quick Start

### Prerequisites

- Java 21 or higher (with Project Loom support)
- Maven 3.6 or higher

### Installation

Add the dependency to your `pom.xml`:

```xml
<dependency>
    <groupId>io.hypersim</groupId>
    <artifactId>hypersim-java-sdk</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Basic Usage

```java
import io.hypersim.sdk.core.*;
import io.hypersim.sdk.types.*;

public class QuickStart {
    public static void main(String[] args) {
        // Configure the SDK
        var config = HyperSimConfig.builder()
            .network(Network.MAINNET)
            .aiEnabled(true)
            .openaiApiKey("your-openai-api-key")
            .streamingEnabled(true)
            .debug(false)
            .build();
        
        // Initialize SDK with try-with-resources for automatic cleanup
        try (var sdk = new HyperSimSDK(config)) {
            
            // Create a transaction
            var transaction = TransactionRequest.createTransfer(
                "0x1234567890123456789012345678901234567890",
                "0x0987654321098765432109876543210987654321", 
                "1000000000000000000" // 1 ETH in wei
            );
            
            // Simulate the transaction
            var simulationResult = sdk.simulate(transaction).join();
            
            System.out.println("Simulation Success: " + simulationResult.success());
            System.out.println("Gas Used: " + simulationResult.gasUsed());
            System.out.println("Block Type: " + simulationResult.blockType());
            
            // Get AI insights
            if (simulationResult.success()) {
                var aiInsights = sdk.getAIInsights(simulationResult).join();
                System.out.println("Risk Level: " + aiInsights.riskLevel());
                System.out.println("AI Summary: " + aiInsights.summary());
            }
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

## Advanced Features

### Concurrent Transaction Simulation

```java
// Simulate multiple transactions concurrently using virtual threads
var transactions = List.of(
    TransactionRequest.createTransfer("0x1234...", "0x5678...", "1000000000000000000"),
    TransactionRequest.createContractCall("0x1234...", "0xabcd...", "0xa9059cbb..."),
    TransactionRequest.createContractDeployment("0x1234...", "0x608060405234801561001057600080fd5b50...")
);

// All simulations run concurrently
var futures = transactions.stream()
    .map(sdk::simulate)
    .toList();

// Wait for all results
var results = futures.stream()
    .map(CompletableFuture::join)
    .toList();

System.out.println("Simulated " + results.size() + " transactions concurrently");
```

### Bundle Optimization

```java
// Optimize a bundle of transactions for gas efficiency
var transactions = Arrays.asList(
    TransactionRequest.createTransfer("0x1234...", "0x5678...", "500000000000000000"),
    TransactionRequest.createTransfer("0x1234...", "0x9abc...", "300000000000000000"),
    TransactionRequest.createContractCall("0x1234...", "0xdef0...", "0xa9059cbb...")
);

var optimization = sdk.optimizeBundle(transactions).join();

System.out.println("Original Gas: " + optimization.originalGas());
System.out.println("Optimized Gas: " + optimization.optimizedGas());
System.out.println("Gas Saved: " + optimization.gasSaved());
System.out.println("Suggestions: " + optimization.suggestions());
```

### WebSocket Streaming

```java
// Enable real-time data streaming
var config = HyperSimConfig.builder()
    .network(Network.MAINNET)
    .streamingEnabled(true)
    .build();

try (var sdk = new HyperSimSDK(config)) {
    // Connect to WebSocket
    sdk.connectWebSocket().join();
    
    System.out.println("WebSocket connected: " + sdk.isWebSocketConnected());
    
    // WebSocket will provide real-time updates through event handlers
    // (Implementation details would be in WebSocketClient)
}
```

### Custom Plugin Development

Create a custom plugin by implementing the `Plugin` interface:

```java
package com.example.plugins;

import io.hypersim.sdk.plugins.*;
import io.hypersim.sdk.types.*;

public class LoggingPlugin implements Plugin {
    
    @Override
    public String getName() {
        return "LoggingPlugin";
    }
    
    @Override
    public String getVersion() {
        return "1.0.0";
    }
    
    @Override
    public void initialize() {
        System.out.println("Logging plugin initialized");
    }
    
    @Hook("before-simulation")
    public void beforeSimulation(String requestId, TransactionRequest transaction) {
        System.out.println("About to simulate transaction: " + transaction.from() + 
                          " -> " + transaction.to() + " (ID: " + requestId + ")");
    }
    
    @Hook("after-simulation")
    public void afterSimulation(String requestId, SimulationResult result) {
        System.out.println("Simulation completed: success=" + result.success() + 
                          " gasUsed=" + result.gasUsed() + " (ID: " + requestId + ")");
    }
}
```

Register the plugin:

```java
var pluginConfig = new HyperSimConfig.PluginConfig(
    "LoggingPlugin",
    "com.example.plugins.LoggingPlugin",
    Map.of(), // Plugin-specific configuration
    1, // Priority
    true // Enabled
);

var config = HyperSimConfig.builder()
    .network(Network.MAINNET)
    .plugins(List.of(pluginConfig))
    .build();
```

## Configuration Options

### Basic Configuration

```java
var config = HyperSimConfig.simple(Network.MAINNET);
```

### AI-Enabled Configuration

```java
var config = HyperSimConfig.withAI(Network.MAINNET, "your-openai-api-key");
```

### Full-Featured Configuration

```java
var config = HyperSimConfig.builder()
    .network(Network.MAINNET)
    .aiEnabled(true)
    .openaiApiKey("your-openai-api-key")
    .streamingEnabled(true)
    .crossLayerEnabled(true)
    .timeout(Duration.ofSeconds(30))
    .debug(true)
    .metricsEnabled(true)
    .connectionPool(new HyperSimConfig.ConnectionPoolConfig(
        20, // maxConnections
        Duration.ofSeconds(10), // connectionTimeout
        Duration.ofMinutes(5), // idleTimeout
        true // enabled
    ))
    .retry(new HyperSimConfig.RetryConfig(
        3, // maxAttempts
        Duration.ofSeconds(1), // initialDelay
        Duration.ofSeconds(30), // maxDelay
        2.0, // backoffMultiplier
        true // jitter
    ))
    .build();
```

## Error Handling

The SDK provides a comprehensive exception hierarchy:

```java
try {
    var result = sdk.simulate(transaction).join();
} catch (ValidationException e) {
    System.err.println("Invalid input: " + e.getMessage());
    System.err.println("Field: " + e.getField());
    System.err.println("Value: " + e.getValue());
} catch (SimulationException e) {
    System.err.println("Simulation failed: " + e.getMessage());
    System.err.println("Transaction: " + e.getTransactionHash());
    System.err.println("Revert reason: " + e.getRevertReason());
} catch (NetworkException e) {
    System.err.println("Network error: " + e.getMessage());
    System.err.println("Endpoint: " + e.getEndpoint());
    System.err.println("Status code: " + e.getStatusCode());
} catch (TimeoutException e) {
    System.err.println("Operation timed out: " + e.getMessage());
    System.err.println("Operation: " + e.getOperation());
    System.err.println("Timeout: " + e.getTimeout());
}
```

## Performance Optimization

### Virtual Thread Pool

The SDK automatically uses Project Loom virtual threads for maximum concurrency:

```java
// All these operations run concurrently without blocking OS threads
var futures = IntStream.range(0, 1000)
    .mapToObj(i -> TransactionRequest.createTransfer("0x1234...", "0x5678...", "1000000"))
    .map(sdk::simulate)
    .toList();

// Process results as they complete
futures.forEach(future -> 
    future.thenAccept(result -> 
        System.out.println("Result: " + result.success())));
```

### Connection Pooling

Configure connection pooling for optimal resource usage:

```java
var poolConfig = new HyperSimConfig.ConnectionPoolConfig(
    50, // Maximum connections
    Duration.ofSeconds(15), // Connection timeout
    Duration.ofMinutes(10), // Idle timeout
    true // Enable pooling
);

var config = HyperSimConfig.builder()
    .connectionPool(poolConfig)
    .build();
```

## Monitoring and Metrics

Enable metrics collection for monitoring:

```java
var config = HyperSimConfig.builder()
    .network(Network.MAINNET)
    .metricsEnabled(true)
    .metricsPrefix("hypersim.sdk")
    .build();

// Metrics are automatically collected for:
// - Request latency
// - Success/failure rates  
// - Connection pool utilization
// - Plugin execution time
```

## Testing

Run the test suite:

```bash
mvn test
```

Run with coverage:

```bash
mvn test jacoco:report
```

## Building

Build the project:

```bash
mvn clean compile
```

Create JAR with dependencies:

```bash
mvn package
```

Generate Javadoc:

```bash
mvn javadoc:javadoc
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://hypersim.dev/docs/java)
- 💬 [Discord](https://discord.gg/hypersim)
- 🐛 [Issues](https://github.com/hypersim/hypersim-java-sdk/issues)
- 📧 [Email](mailto:support@hypersim.dev)

## Roadmap

- [ ] Enhanced AI analysis with multiple model support
- [ ] Additional WebSocket event types
- [ ] Batch transaction optimization
- [ ] Custom RPC provider support
- [ ] Advanced metrics and tracing
- [ ] GraphQL API integration
- [ ] Kotlin coroutine support

---

Made with ❤️ by the HyperSim team
