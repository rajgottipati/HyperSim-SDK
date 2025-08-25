//! Core SDK implementation and configuration

pub mod config;
pub mod sdk;

pub use config::{HyperSimConfig, HyperSimConfigBuilder};
pub use sdk::HyperSimSDK;

// Re-export builder for convenience
pub use config::HyperSimConfigBuilder as HyperSimSDKBuilder;
