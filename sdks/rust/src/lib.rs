//! # HyperSim SDK for Rust
//!
//! A high-performance Rust SDK for HyperEVM transaction simulation with cross-layer HyperCore integration.
//!
//! ## Features
//!
//! - **Zero-cost abstractions** - Built with Rust's zero-cost abstraction philosophy
//! - **Memory safety** - Compile-time guarantees without runtime overhead
//! - **High-performance streaming** - Async/await with tokio and futures
//! - **WebSocket support** - Real-time streaming with tokio-tungstenite
//! - **Cross-layer integration** - HyperCore data access with ABI encoding
//! - **Plugin system** - Dynamic dispatch with trait objects
//! - **AI-powered analysis** - Optional AI insights and optimization
//! - **Comprehensive error handling** - Custom error types with context
//! - **Connection pooling** - Performance-optimized connection management
//!
//! ## Quick Start
//!
//! ```rust,no_run
//! use hypersim_sdk::prelude::*;
//!
//! #[tokio::main]
//! async fn main() -> Result<()> {
//!     let config = HyperSimConfig::builder()
//!         .network(Network::Mainnet)
//!         .ai_enabled(true)
//!         .streaming_enabled(true)
//!         .build()?;
//!
//!     let sdk = HyperSimSDK::new(config).await?;
//!
//!     let tx = TransactionRequest::builder()
//!         .from("0x742d35Cc6563C7dE26d1e0d7Ad8e8c61c94c7De1")
//!         .to("0xA0b86a33E6427e8Fc8e0B3b1e5C6b6e4f7A8C1234")
//!         .value("1000000000000000000")
//!         .build()?;
//!
//!     let result = sdk.simulate(tx).await?;
//!     println!("Simulation successful: {}", result.success);
//!
//!     Ok(())
//! }
//! ```
//!
//! ## Architecture
//!
//! The SDK is organized into several modules:
//!
//! - [`core`] - Main SDK implementation and configuration
//! - [`clients`] - Network clients for HyperEVM, HyperCore, and WebSocket
//! - [`types`] - Type definitions and data structures
//! - [`utils`] - Utility functions and helpers
//! - [`plugins`] - Plugin system implementation
//! - [`ai`] - AI-powered analysis and optimization
//! - [`error`] - Error types and handling

pub mod ai;
pub mod clients;
pub mod core;
pub mod error;
pub mod plugins;
pub mod types;
pub mod utils;

// Re-export main components
pub use core::{HyperSimConfig, HyperSimSDK, HyperSimSDKBuilder};
pub use error::{HyperSimError, Result};
pub use types::*;

// Prelude module for common imports
pub mod prelude {
    pub use crate::core::{HyperSimConfig, HyperSimSDK, HyperSimSDKBuilder};
    pub use crate::error::{HyperSimError, Result};
    pub use crate::types::{
        Network, TransactionRequest, TransactionRequestBuilder, SimulationResult,
        BundleOptimization, AIInsights, RiskLevel, BlockType
    };
    pub use crate::clients::{HyperEVMClient, HyperCoreClient, WebSocketClient};
    pub use crate::plugins::{Plugin, PluginConfig, PluginSystem};
    pub use crate::ai::AIAnalyzer;
}

// SDK metadata
pub const SDK_VERSION: &str = env!("CARGO_PKG_VERSION");
pub const SDK_NAME: &str = env!("CARGO_PKG_NAME");
pub const SDK_DESCRIPTION: &str = env!("CARGO_PKG_DESCRIPTION");

#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;

    #[tokio::test]
    async fn test_sdk_creation() {
        let config = HyperSimConfig::builder()
            .network(Network::Testnet)
            .timeout_ms(5000)
            .build()
            .expect("Failed to build config");

        assert_eq!(config.network(), Network::Testnet);
        assert_eq!(config.timeout_ms(), 5000);
    }

    #[test]
    fn test_sdk_metadata() {
        assert!(!SDK_VERSION.is_empty());
        assert_eq!(SDK_NAME, "hypersim-sdk");
        assert!(!SDK_DESCRIPTION.is_empty());
    }
}
