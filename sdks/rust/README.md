# HyperSim SDK for Rust 🦀

[![Crates.io](https://img.shields.io/crates/v/hypersim-sdk.svg)](https://crates.io/crates/hypersim-sdk)
[![Documentation](https://docs.rs/hypersim-sdk/badge.svg)](https://docs.rs/hypersim-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust Version](https://img.shields.io/badge/rust-1.70+-blue.svg)](https://www.rust-lang.org)

A high-performance Rust SDK for HyperEVM transaction simulation with cross-layer HyperCore integration. Built with zero-cost abstractions, memory safety, and sub-millisecond performance in mind.

## ✨ Features

- **🚀 Zero-Cost Abstractions** - Maximum performance with compile-time optimizations
- **🔒 Memory Safety** - Rust's ownership model prevents memory-related bugs
- **⚡ High-Performance Streaming** - Async/await with tokio for concurrent operations
- **🌐 WebSocket Support** - Real-time streaming with tokio-tungstenite
- **🔗 Cross-Layer Integration** - HyperCore data access with proper ABI encoding
- **🧩 Plugin System** - Dynamic dispatch with trait objects for extensibility
- **🤖 AI-Powered Analysis** - Optional AI insights and transaction optimization
- **🛡️ Comprehensive Error Handling** - Rich error types with context
- **🏊 Connection Pooling** - Performance-optimized connection management
- **📊 Built-in Metrics** - Performance monitoring and observability

## 🚀 Quick Start

Add this to your `Cargo.toml`:

```toml
[dependencies]
hypersim-sdk = { version = "1.0", features = ["full"] }
tokio = { version = "1.0", features = ["full"] }
```

### Basic Usage

```rust
use hypersim_sdk::prelude::*;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize the SDK
    let config = HyperSimConfig::builder()
        .network(Network::Mainnet)
        .ai_enabled(true)
        .streaming_enabled(true)
        .build()?;

    let sdk = HyperSimSDK::new(config).await?;

    // Create a transaction
    let tx = TransactionRequest::builder()
        .from("0x742d35Cc6563C7dE26d1e0d7Ad8e8c61c94c7De1")?
        .to("0xA0b86a33E6427e8Fc8e0B3b1e5C6b6e4f7A8C1234")?
        .value("1000000000000000000") // 1 ETH
        .gas_limit("21000")
        .build()?;

    // Simulate the transaction
    let result = sdk.simulate(tx).await?;
    println!("Simulation successful: {}", result.success);
    println!("Gas used: {}", result.gas_used);

    // Get AI insights (if enabled)
    let insights = sdk.get_ai_insights(&result).await?;
    println!("Risk level: {:?}", insights.risk_level);
    
    Ok(())
}
```

### Advanced Usage with Streaming

```rust
use hypersim_sdk::prelude::*;

#[tokio::main]
async fn main() -> Result<()> {
    let config = HyperSimConfig::builder()
        .network(Network::Mainnet)
        .streaming_enabled(true)
        .build()?;

    let sdk = HyperSimSDK::new(config).await?;

    // Subscribe to new block headers
    let subscription = sdk.subscribe(
        SubscriptionType::NewHeads,
        SubscriptionParams {
            filter: None,
            include_details: true,
            limit: None,
        }
    ).await?;

    println!("Subscribed to new blocks: {}", subscription.id);

    // Perform other operations while streaming...
    let tx = TransactionRequest::builder()
        .from("0x742d35Cc6563C7dE26d1e0d7Ad8e8c61c94c7De1")?
        .to("0xA0b86a33E6427e8Fc8e0B3b1e5C6b6e4f7A8C1234")?
        .value("1000000000000000000")
        .build()?;

    let result = sdk.simulate(tx).await?;
    println!("Simulation result: {:?}", result.success);

    Ok(())
}
```

### Bundle Optimization

```rust
use hypersim_sdk::prelude::*;

#[tokio::main]
async fn main() -> Result<()> {
    let config = HyperSimConfig::builder()
        .network(Network::Mainnet)
        .ai_enabled(true)
        .build()?;

    let sdk = HyperSimSDK::new(config).await?;

    // Create multiple transactions
    let transactions = vec![
        TransactionRequest::builder()
            .from("0x742d35Cc6563C7dE26d1e0d7Ad8e8c61c94c7De1")?
            .to("0xA0b86a33E6427e8Fc8e0B3b1e5C6b6e4f7A8C1234")?
            .value("1000000000000000000")
            .build()?,
        TransactionRequest::builder()
            .from("0x742d35Cc6563C7dE26d1e0d7Ad8e8c61c94c7De1")?
            .to("0xB0b86a33E6427e8Fc8e0B3b1e5C6b6e4f7A8C5678")?
            .value("500000000000000000")
            .build()?,
    ];

    // Optimize the bundle
    let optimization = sdk.optimize_bundle(transactions).await?;
    println!("Gas savings: {}", optimization.gas_savings);
    println!("Time savings: {:.2}s", optimization.time_savings);
    println!("Success probability: {:.1}%", optimization.success_probability * 100.0);

    Ok(())
}
```

## 📚 Architecture

The SDK is organized into several high-performance modules:

- **`core`** - Main SDK implementation and configuration with builder pattern
- **`clients`** - Network clients for HyperEVM, HyperCore, and WebSocket connections
- **`types`** - Type-safe data structures with comprehensive serialization support
- **`utils`** - High-performance utilities for validation, formatting, and ABI encoding
- **`plugins`** - Dynamic plugin system with trait objects for extensibility
- **`ai`** - AI-powered analysis and optimization (optional feature)
- **`error`** - Rich error handling with context and categorization

## 🔧 Configuration

The SDK supports extensive configuration options:

```rust
use hypersim_sdk::prelude::*;

let config = HyperSimConfig::builder()
    // Network settings
    .network(Network::Mainnet)
    .rpc_endpoint("https://custom-rpc.example.com")
    .ws_endpoint("wss://custom-ws.example.com")
    
    // Performance settings
    .timeout_ms(10000)
    .max_connections(20)
    .connection_pool_enabled(true)
    
    // Feature flags
    .ai_enabled(true)
    .openai_api_key("your-api-key")
    .streaming_enabled(true)
    .cross_layer_enabled(true)
    
    // Caching and optimization
    .cache_enabled(true)
    .cache_ttl_secs(600)
    .metrics_enabled(true)
    
    // Debug and logging
    .debug_enabled(false)
    .build()?;
```

## 🧩 Plugin System

Extend the SDK functionality with custom plugins:

```rust
use hypersim_sdk::prelude::*;
use async_trait::async_trait;

pub struct CustomMetricsPlugin {
    name: String,
    metrics: HashMap<String, u64>,
}

#[async_trait]
impl Plugin for CustomMetricsPlugin {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn version(&self) -> &str {
        "1.0.0"
    }
    
    fn description(&self) -> &str {
        "Custom metrics collection plugin"
    }
    
    async fn initialize(&mut self, config: &serde_json::Value) -> Result<()> {
        // Plugin initialization logic
        Ok(())
    }
    
    async fn before_simulation(&self, request: &TransactionRequest) -> Result<()> {
        println!("Processing transaction from: {}", request.from);
        Ok(())
    }
    
    async fn after_simulation(&self, result: &mut SimulationResult) -> Result<()> {
        println!("Simulation completed: success={}", result.success);
        Ok(())
    }
    
    async fn shutdown(&mut self) -> Result<()> {
        // Cleanup logic
        Ok(())
    }
}

// Register the plugin
let plugin_config = PluginConfig::new("custom-metrics")
    .enabled(true)
    .priority(50)
    .config_value("collect_gas_metrics", true);

let config = HyperSimConfig::builder()
    .network(Network::Testnet)
    .plugin(plugin_config)
    .build()?;
```

## 🚀 Performance Optimizations

The SDK is built for maximum performance:

### Zero-Cost Abstractions
- Compile-time optimizations with no runtime overhead
- Efficient memory layout with `#[repr(C)]` where appropriate
- Inlined critical path functions

### Async/Await Optimization
- Tokio-based async runtime for high concurrency
- Connection pooling to minimize connection overhead
- Streaming responses for real-time data

### Memory Management
- Minimal allocations with `SmallVec` and `Bytes`
- Reference counting with `Arc` for shared data
- Lock-free data structures where possible

### Benchmarks

```bash
cargo bench
```

Example performance results:
```
simulate_transaction     time:   [1.2ms 1.3ms 1.4ms]
batch_simulate_100       time:   [45ms 48ms 52ms]
websocket_subscribe      time:   [0.5ms 0.6ms 0.7ms]
abi_encode_function      time:   [2.1μs 2.3μs 2.5μs]
```

## 🛡️ Error Handling

The SDK provides rich error handling with context:

```rust
use hypersim_sdk::prelude::*;

match sdk.simulate(tx).await {
    Ok(result) => {
        println!("Success: {}", result.success);
    }
    Err(HyperSimError::Network { message, .. }) => {
        eprintln!("Network error: {}", message);
    }
    Err(HyperSimError::Validation { message, field }) => {
        eprintln!("Validation error in {}: {}", 
            field.unwrap_or("unknown".to_string()), message);
    }
    Err(HyperSimError::Simulation { message, tx_hash }) => {
        eprintln!("Simulation failed for {:?}: {}", tx_hash, message);
    }
    Err(e) => {
        eprintln!("Other error: {}", e);
    }
}
```

## 🔌 Features

The SDK supports optional features for different use cases:

```toml
[dependencies]
hypersim-sdk = { version = "1.0", features = ["ai", "streaming", "plugins", "cross-layer"] }
```

Available features:
- **`ai`** - AI-powered analysis and optimization
- **`streaming`** - WebSocket streaming support  
- **`plugins`** - Plugin system for extensibility
- **`cross-layer`** - HyperCore cross-layer integration
- **`full`** - All features enabled

## 📊 Monitoring and Metrics

Built-in metrics collection for observability:

```rust
let metrics = sdk.get_metrics().await;
println!("Total requests: {}", metrics.total_requests);
println!("Success rate: {:.2}%", 
    metrics.successful_requests as f64 / metrics.total_requests as f64 * 100.0);
println!("Average response time: {:.2}ms", metrics.average_response_time);
println!("Cache hit ratio: {:.2}%", metrics.cache_hit_ratio * 100.0);
```

## 🧪 Testing

Run the test suite:

```bash
# Unit tests
cargo test

# Integration tests  
cargo test --test integration

# All tests with features
cargo test --all-features

# Performance tests
cargo test --release --test performance
```

## 📖 Examples

The `examples/` directory contains comprehensive examples:

- **`basic_simulation.rs`** - Simple transaction simulation
- **`streaming_events.rs`** - WebSocket event streaming
- **`bundle_optimization.rs`** - Transaction bundle optimization
- **`plugin_development.rs`** - Custom plugin development
- **`cross_layer_integration.rs`** - HyperCore integration
- **`performance_testing.rs`** - Performance benchmarking

Run an example:
```bash
cargo run --example basic_simulation --features full
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔒 Security

For security issues, please email security@hypersim.com instead of using the issue tracker.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📚 [Documentation](https://docs.rs/hypersim-sdk)
- 💬 [Discord Community](https://discord.gg/hypersim)
- 🐛 [Issue Tracker](https://github.com/hypersim/hypersim-sdk-rust/issues)
- 📧 [Email Support](mailto:support@hypersim.com)

## 🗺️ Roadmap

- [ ] **v1.1** - Enhanced AI analysis with more ML models
- [ ] **v1.2** - Multi-chain support beyond Ethereum
- [ ] **v1.3** - Advanced MEV detection and optimization
- [ ] **v1.4** - Real-time gas price optimization
- [ ] **v2.0** - Full HyperCore integration with state proofs

---

Built with ❤️ by the HyperSim team. Star ⭐ this repo if you find it useful!
