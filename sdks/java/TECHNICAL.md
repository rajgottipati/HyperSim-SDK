# HyperSim Java SDK Technical Documentation

This document provides detailed technical information about the HyperSim Java SDK architecture, design decisions, and implementation details.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Concurrency Model](#concurrency-model)
4. [Type System](#type-system)
5. [Plugin Architecture](#plugin-architecture)
6. [Exception Handling](#exception-handling)
7. [Performance Considerations](#performance-considerations)
8. [Testing Strategy](#testing-strategy)

## Architecture Overview

The HyperSim Java SDK is designed as an enterprise-grade solution with the following key architectural principles:

### Layered Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Application Layer                    │
│            (User Code using SDK)                    │
├─────────────────────────────────────────────────────┤
│                 Core SDK Layer                       │
│           (HyperSimSDK, Configurations)            │
├─────────────────────────────────────────────────────┤
│               Client Layer                          │
│     (HyperEVM, HyperCore, WebSocket Clients)       │
├─────────────────────────────────────────────────────┤
│              Plugin System                          │
│           (Hooks, ServiceLoader)                    │
├─────────────────────────────────────────────────────┤
│             Utility Layer                           │
│        (Validation, Formatting, Constants)         │
└─────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Immutability**: Extensive use of records and immutable data structures
2. **Type Safety**: Strong typing with comprehensive validation
3. **Async-First**: CompletableFuture-based API design
4. **Fail-Fast**: Early validation and clear error messages
5. **Extensibility**: Plugin system for customization
6. **Resource Management**: AutoCloseable for proper cleanup

## Core Components

### HyperSimSDK

The main SDK class serves as the primary entry point and orchestrates all operations:

```java
public class HyperSimSDK implements AutoCloseable {
    // Core clients
    private final HyperEVMClient hyperEvmClient;
    private final HyperCoreClient hyperCoreClient;
    private final WebSocketClient wsClient;
    
    // Extension systems
    private final PluginSystem pluginSystem;
    private final AIAnalyzer aiAnalyzer;
    
    // Concurrency
    private final ExecutorService virtualThreadExecutor;
}
```

**Key Responsibilities:**
- Configuration management and validation
- Client lifecycle management
- Operation orchestration with plugin hooks
- Asynchronous operation coordination
- Resource cleanup

### Configuration System

The configuration system uses the builder pattern with immutable records:

```java
public record HyperSimConfig(
    Network network,
    boolean aiEnabled,
    String openaiApiKey,
    // ... other configuration options
) {
    // Validation in compact constructor
    public HyperSimConfig {
        Objects.requireNonNull(network, "Network cannot be null");
        if (aiEnabled && (openaiApiKey == null || openaiApiKey.trim().isEmpty())) {
            throw new IllegalArgumentException("OpenAI API key required when AI features are enabled");
        }
    }
}
```

**Features:**
- Immutable configuration objects
- Builder pattern for easy construction
- Validation at construction time
- Default value handling
- Nested configuration records

### Client Architecture

Each client follows a consistent pattern:

```java
public class HyperEVMClient implements AutoCloseable {
    private final Config config;
    
    public record Config(/* client-specific configuration */) {}
    
    // Main operations
    public SimulationResult simulate(TransactionRequest transaction) { /* ... */ }
    public NetworkStatus getNetworkStatus() { /* ... */ }
    
    // Resource management
    public void close() { /* ... */ }
}
```

## Concurrency Model

### Project Loom Integration

The SDK leverages Java 21's Project Loom for efficient concurrency:

```java
// Virtual thread executor for high concurrency
private final ExecutorService virtualThreadExecutor = 
    Executors.newVirtualThreadPerTaskExecutor();

// All async operations use virtual threads
public CompletableFuture<SimulationResult> simulate(TransactionRequest transaction) {
    return CompletableFuture.supplyAsync(() -> {
        // Simulation logic
    }, virtualThreadExecutor);
}
```

**Benefits:**
- Millions of concurrent operations without blocking OS threads
- Simplified async programming model
- Better resource utilization
- Reduced context switching overhead

### Async Operation Patterns

```java
// Single operation
sdk.simulate(transaction)
   .thenCompose(result -> sdk.getAIInsights(result))
   .thenAccept(insights -> processInsights(insights));

// Concurrent operations
var futures = transactions.stream()
    .map(sdk::simulate)
    .toList();

CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
    .thenApply(v -> futures.stream().map(CompletableFuture::join).toList())
    .thenAccept(results -> processResults(results));
```

## Type System

### Immutable Data Structures

The SDK extensively uses Java 17+ records for immutable data structures:

```java
public record SimulationResult(
    boolean success,
    String gasUsed,
    String returnData,
    // ... other fields
) {
    // Validation in compact constructor
    public SimulationResult {
        Objects.requireNonNull(gasUsed, "Gas used cannot be null");
        if (estimatedBlock < 0) {
            throw new IllegalArgumentException("Estimated block must be non-negative");
        }
    }
}
```

**Advantages:**
- Thread-safe by default
- Clear data contracts
- Automatic equals/hashCode/toString
- Pattern matching support (future Java versions)

### Builder Pattern Integration

Complex types provide builder patterns for easy construction:

```java
var result = SimulationResult.builder()
    .success(true)
    .gasUsed("21000")
    .blockType(BlockType.SMALL)
    .estimatedBlock(1000)
    .build();
```

### Validation Strategy

Validation occurs at multiple levels:

1. **Construction Time**: Record constructors validate parameters
2. **Method Entry**: Public methods validate inputs
3. **Business Logic**: Domain-specific validation rules

```java
public record TransactionRequest(String from, String to, ...) {
    public TransactionRequest {
        if (!isValidAddress(from)) {
            throw new IllegalArgumentException("Invalid from address: " + from);
        }
    }
    
    private static boolean isValidAddress(String address) {
        return address != null && address.matches("^0x[0-9a-fA-F]{40}$");
    }
}
```

## Plugin Architecture

### ServiceLoader Integration

The plugin system uses Java's ServiceLoader for dynamic plugin discovery:

```java
// Plugin discovery
ServiceLoader<Plugin> loader = ServiceLoader.load(Plugin.class);
for (Plugin plugin : loader) {
    registerPlugin(plugin);
}
```

### Hook-Based Extension Points

Plugins can hook into SDK operations using annotations:

```java
public class CustomPlugin implements Plugin {
    @Hook("before-simulation")
    public void beforeSimulation(String requestId, TransactionRequest transaction) {
        // Custom logic before simulation
    }
    
    @Hook("after-simulation") 
    public void afterSimulation(String requestId, SimulationResult result) {
        // Custom logic after simulation
    }
}
```

### Plugin Lifecycle

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Load      │───▶│ Initialize  │───▶│   Execute   │───▶│   Cleanup   │
│  Plugin     │    │   Plugin    │    │    Hooks    │    │   Plugin    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## Exception Handling

### Exception Hierarchy

```
HyperSimException (base)
├── ValidationException (input validation)
├── SimulationException (simulation failures)
├── NetworkException (network connectivity)
├── TimeoutException (operation timeouts)
├── ConfigurationException (config errors)
└── PluginException (plugin system errors)
```

### Error Context Preservation

All exceptions preserve rich context information:

```java
public class NetworkException extends HyperSimException {
    private final String endpoint;
    private final int statusCode;
    
    // Context-rich error reporting
    @Override
    public String toString() {
        return String.format("NetworkException[endpoint=%s, status=%d, message=%s]",
                           endpoint, statusCode, getMessage());
    }
}
```

### Async Exception Handling

```java
sdk.simulate(transaction)
   .exceptionally(throwable -> {
       if (throwable instanceof ValidationException ve) {
           // Handle validation errors
       } else if (throwable instanceof NetworkException ne) {
           // Handle network errors
       }
       return defaultResult;
   });
```

## Performance Considerations

### Connection Pooling

The SDK implements connection pooling for efficient resource usage:

```java
public record ConnectionPoolConfig(
    int maxConnections,
    Duration connectionTimeout,
    Duration idleTimeout,
    boolean enabled
) {}
```

### Retry Logic

Built-in retry logic with exponential backoff:

```java
public record RetryConfig(
    int maxAttempts,
    Duration initialDelay,
    Duration maxDelay,
    double backoffMultiplier,
    boolean jitter
) {}
```

### Metrics Collection

Optional metrics collection for monitoring:

```java
// Metrics automatically collected for:
// - Request latency
// - Success/failure rates
// - Connection pool utilization
// - Plugin execution time
```

### Memory Management

- **Immutable objects**: Reduce garbage collection pressure
- **Object pooling**: Reuse expensive objects where appropriate
- **Streaming**: Process large datasets without loading into memory

## Testing Strategy

### Unit Testing

Comprehensive unit tests with JUnit 5:

```java
@Test
@DisplayName("Should simulate basic transaction")
void shouldSimulateBasicTransaction() {
    var config = HyperSimConfig.simple(Network.MAINNET);
    
    try (var sdk = new HyperSimSDK(config)) {
        var transaction = TransactionRequest.createTransfer(/* ... */);
        var result = sdk.simulate(transaction).join();
        
        assertNotNull(result);
        assertTrue(result.success());
    }
}
```

### Integration Testing

Integration tests verify client interactions:

```java
@Test
@ExtendWith(MockitoExtension.class)
void shouldHandleNetworkFailures() {
    // Mock network conditions and verify error handling
}
```

### Performance Testing

Performance tests validate concurrency and throughput:

```java
@Test
void shouldHandleHighConcurrency() {
    var transactions = generateTransactions(1000);
    var startTime = System.currentTimeMillis();
    
    var results = transactions.parallelStream()
        .map(sdk::simulate)
        .map(CompletableFuture::join)
        .toList();
        
    var duration = System.currentTimeMillis() - startTime;
    assertTrue(duration < 5000); // Should complete within 5 seconds
}
```

## Build and Deployment

### Maven Configuration

The project uses Maven with modern Java features:

```xml
<properties>
    <maven.compiler.source>21</maven.compiler.source>
    <maven.compiler.target>21</maven.compiler.target>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
</properties>
```

### Docker Support

Containerization for easy deployment:

```dockerfile
FROM openjdk:21-jdk-slim
# Project Loom requires --enable-preview flag
ENTRYPOINT ["java", "--enable-preview", "-cp", "..."]
```

### Dependency Management

Careful dependency selection for minimal footprint:
- Jackson for JSON processing
- OkHttp for HTTP client
- SLF4J for logging
- JUnit 5 for testing
- Mockito for mocking

This architecture provides a solid foundation for enterprise-grade transaction simulation with excellent performance, maintainability, and extensibility characteristics.
