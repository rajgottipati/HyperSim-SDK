//! Configuration types and builders for HyperSim SDK

use serde::{Deserialize, Serialize};
use crate::types::{Network, SDKOptions};
use crate::plugins::PluginConfig;
use crate::error::{HyperSimError, Result};

/// Main configuration for HyperSim SDK
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HyperSimConfig {
    /// Target network
    network: Network,
    /// Enable AI-powered analysis features
    ai_enabled: bool,
    /// OpenAI API key for AI features
    openai_api_key: Option<String>,
    /// Custom RPC endpoint (overrides default)
    rpc_endpoint: Option<String>,
    /// Request timeout in milliseconds
    timeout_ms: u64,
    /// Enable cross-layer HyperCore integration
    cross_layer_enabled: bool,
    /// Enable WebSocket streaming
    streaming_enabled: bool,
    /// Custom WebSocket endpoint
    ws_endpoint: Option<String>,
    /// Plugin configurations
    plugin_configs: Vec<PluginConfig>,
    /// Enable verbose logging
    debug_enabled: bool,
    /// SDK options
    sdk_options: SDKOptions,
    /// Maximum concurrent connections
    max_connections: u32,
    /// Connection pool configuration
    connection_pool_enabled: bool,
    /// Enable request caching
    cache_enabled: bool,
    /// Cache TTL in seconds
    cache_ttl_secs: u64,
    /// Enable metrics collection
    metrics_enabled: bool,
}

impl HyperSimConfig {
    /// Create a new builder for HyperSimConfig
    pub fn builder() -> HyperSimConfigBuilder {
        HyperSimConfigBuilder::new()
    }

    /// Get the target network
    pub fn network(&self) -> Network {
        self.network
    }

    /// Check if AI features are enabled
    pub fn ai_enabled(&self) -> bool {
        self.ai_enabled
    }

    /// Get the OpenAI API key
    pub fn openai_api_key(&self) -> Option<&str> {
        self.openai_api_key.as_deref()
    }

    /// Get the RPC endpoint (custom or default)
    pub fn rpc_endpoint(&self) -> &str {
        self.rpc_endpoint
            .as_deref()
            .unwrap_or_else(|| self.network.default_rpc_endpoint())
    }

    /// Get the request timeout in milliseconds
    pub fn timeout_ms(&self) -> u64 {
        self.timeout_ms
    }

    /// Check if cross-layer integration is enabled
    pub fn cross_layer_enabled(&self) -> bool {
        self.cross_layer_enabled
    }

    /// Check if WebSocket streaming is enabled
    pub fn streaming_enabled(&self) -> bool {
        self.streaming_enabled
    }

    /// Get the WebSocket endpoint (custom or default)
    pub fn ws_endpoint(&self) -> &str {
        self.ws_endpoint
            .as_deref()
            .unwrap_or_else(|| self.network.default_ws_endpoint())
    }

    /// Get the plugin configurations
    pub fn plugin_configs(&self) -> &[PluginConfig] {
        &self.plugin_configs
    }

    /// Check if debug mode is enabled
    pub fn debug_enabled(&self) -> bool {
        self.debug_enabled
    }

    /// Get the SDK options
    pub fn sdk_options(&self) -> &SDKOptions {
        &self.sdk_options
    }

    /// Get maximum concurrent connections
    pub fn max_connections(&self) -> u32 {
        self.max_connections
    }

    /// Check if connection pooling is enabled
    pub fn connection_pool_enabled(&self) -> bool {
        self.connection_pool_enabled
    }

    /// Check if caching is enabled
    pub fn cache_enabled(&self) -> bool {
        self.cache_enabled
    }

    /// Get cache TTL in seconds
    pub fn cache_ttl_secs(&self) -> u64 {
        self.cache_ttl_secs
    }

    /// Check if metrics collection is enabled
    pub fn metrics_enabled(&self) -> bool {
        self.metrics_enabled
    }

    /// Get the HyperCore endpoint
    pub fn hypercore_endpoint(&self) -> &str {
        self.network.hypercore_endpoint()
    }

    /// Validate the configuration
    pub fn validate(&self) -> Result<()> {
        // Validate network
        if !matches!(self.network, Network::Mainnet | Network::Testnet | Network::Local) {
            return Err(HyperSimError::configuration("Invalid network specified"));
        }

        // Validate timeout
        if self.timeout_ms == 0 {
            return Err(HyperSimError::configuration("Timeout must be greater than 0"));
        }

        if self.timeout_ms > 300000 { // 5 minutes max
            return Err(HyperSimError::configuration("Timeout cannot exceed 300 seconds"));
        }

        // Validate AI configuration
        if self.ai_enabled && self.openai_api_key.is_none() {
            return Err(HyperSimError::configuration(
                "OpenAI API key is required when AI features are enabled"
            ));
        }

        // Validate connection limits
        if self.max_connections == 0 {
            return Err(HyperSimError::configuration("Max connections must be greater than 0"));
        }

        if self.max_connections > 1000 {
            return Err(HyperSimError::configuration("Max connections cannot exceed 1000"));
        }

        // Validate cache TTL
        if self.cache_enabled && self.cache_ttl_secs == 0 {
            return Err(HyperSimError::configuration("Cache TTL must be greater than 0 when caching is enabled"));
        }

        // Validate custom endpoints if provided
        if let Some(ref rpc_endpoint) = self.rpc_endpoint {
            if !rpc_endpoint.starts_with("http://") && !rpc_endpoint.starts_with("https://") {
                return Err(HyperSimError::configuration("RPC endpoint must use HTTP or HTTPS"));
            }
        }

        if let Some(ref ws_endpoint) = self.ws_endpoint {
            if !ws_endpoint.starts_with("ws://") && !ws_endpoint.starts_with("wss://") {
                return Err(HyperSimError::configuration("WebSocket endpoint must use WS or WSS"));
            }
        }

        Ok(())
    }
}

/// Builder for HyperSimConfig with fluent API
#[derive(Debug)]
pub struct HyperSimConfigBuilder {
    network: Option<Network>,
    ai_enabled: bool,
    openai_api_key: Option<String>,
    rpc_endpoint: Option<String>,
    timeout_ms: u64,
    cross_layer_enabled: bool,
    streaming_enabled: bool,
    ws_endpoint: Option<String>,
    plugin_configs: Vec<PluginConfig>,
    debug_enabled: bool,
    sdk_options: SDKOptions,
    max_connections: u32,
    connection_pool_enabled: bool,
    cache_enabled: bool,
    cache_ttl_secs: u64,
    metrics_enabled: bool,
}

impl HyperSimConfigBuilder {
    /// Create a new builder with default values
    pub fn new() -> Self {
        Self {
            network: None,
            ai_enabled: false,
            openai_api_key: None,
            rpc_endpoint: None,
            timeout_ms: 30000,
            cross_layer_enabled: true,
            streaming_enabled: false,
            ws_endpoint: None,
            plugin_configs: Vec::new(),
            debug_enabled: false,
            sdk_options: SDKOptions::default(),
            max_connections: 10,
            connection_pool_enabled: true,
            cache_enabled: true,
            cache_ttl_secs: 300,
            metrics_enabled: true,
        }
    }

    /// Set the target network (required)
    pub fn network(mut self, network: Network) -> Self {
        self.network = Some(network);
        self
    }

    /// Enable or disable AI features
    pub fn ai_enabled(mut self, enabled: bool) -> Self {
        self.ai_enabled = enabled;
        self
    }

    /// Set the OpenAI API key for AI features
    pub fn openai_api_key(mut self, api_key: impl Into<String>) -> Self {
        self.openai_api_key = Some(api_key.into());
        self
    }

    /// Set a custom RPC endpoint
    pub fn rpc_endpoint(mut self, endpoint: impl Into<String>) -> Self {
        self.rpc_endpoint = Some(endpoint.into());
        self
    }

    /// Set the request timeout in milliseconds
    pub fn timeout_ms(mut self, timeout: u64) -> Self {
        self.timeout_ms = timeout;
        self
    }

    /// Enable or disable cross-layer HyperCore integration
    pub fn cross_layer_enabled(mut self, enabled: bool) -> Self {
        self.cross_layer_enabled = enabled;
        self
    }

    /// Enable or disable WebSocket streaming
    pub fn streaming_enabled(mut self, enabled: bool) -> Self {
        self.streaming_enabled = enabled;
        self
    }

    /// Set a custom WebSocket endpoint
    pub fn ws_endpoint(mut self, endpoint: impl Into<String>) -> Self {
        self.ws_endpoint = Some(endpoint.into());
        self
    }

    /// Add a plugin configuration
    pub fn plugin(mut self, plugin_config: PluginConfig) -> Self {
        self.plugin_configs.push(plugin_config);
        self
    }

    /// Add multiple plugin configurations
    pub fn plugins(mut self, plugin_configs: Vec<PluginConfig>) -> Self {
        self.plugin_configs.extend(plugin_configs);
        self
    }

    /// Enable or disable debug mode
    pub fn debug_enabled(mut self, enabled: bool) -> Self {
        self.debug_enabled = enabled;
        self
    }

    /// Set SDK options
    pub fn sdk_options(mut self, options: SDKOptions) -> Self {
        self.sdk_options = options;
        self
    }

    /// Set maximum concurrent connections
    pub fn max_connections(mut self, max: u32) -> Self {
        self.max_connections = max;
        self
    }

    /// Enable or disable connection pooling
    pub fn connection_pool_enabled(mut self, enabled: bool) -> Self {
        self.connection_pool_enabled = enabled;
        self
    }

    /// Enable or disable caching
    pub fn cache_enabled(mut self, enabled: bool) -> Self {
        self.cache_enabled = enabled;
        self
    }

    /// Set cache TTL in seconds
    pub fn cache_ttl_secs(mut self, ttl: u64) -> Self {
        self.cache_ttl_secs = ttl;
        self
    }

    /// Enable or disable metrics collection
    pub fn metrics_enabled(mut self, enabled: bool) -> Self {
        self.metrics_enabled = enabled;
        self
    }

    /// Build the configuration
    pub fn build(self) -> Result<HyperSimConfig> {
        let network = self.network
            .ok_or_else(|| HyperSimError::configuration("Network is required"))?;

        let config = HyperSimConfig {
            network,
            ai_enabled: self.ai_enabled,
            openai_api_key: self.openai_api_key,
            rpc_endpoint: self.rpc_endpoint,
            timeout_ms: self.timeout_ms,
            cross_layer_enabled: self.cross_layer_enabled,
            streaming_enabled: self.streaming_enabled,
            ws_endpoint: self.ws_endpoint,
            plugin_configs: self.plugin_configs,
            debug_enabled: self.debug_enabled,
            sdk_options: self.sdk_options,
            max_connections: self.max_connections,
            connection_pool_enabled: self.connection_pool_enabled,
            cache_enabled: self.cache_enabled,
            cache_ttl_secs: self.cache_ttl_secs,
            metrics_enabled: self.metrics_enabled,
        };

        // Validate the configuration
        config.validate()?;

        Ok(config)
    }
}

impl Default for HyperSimConfigBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_builder() {
        let config = HyperSimConfig::builder()
            .network(Network::Testnet)
            .ai_enabled(true)
            .openai_api_key("test-key")
            .timeout_ms(5000)
            .debug_enabled(true)
            .build()
            .expect("Should build valid config");

        assert_eq!(config.network(), Network::Testnet);
        assert!(config.ai_enabled());
        assert_eq!(config.openai_api_key().unwrap(), "test-key");
        assert_eq!(config.timeout_ms(), 5000);
        assert!(config.debug_enabled());
    }

    #[test]
    fn test_config_validation() {
        // Test missing network
        let result = HyperSimConfig::builder().build();
        assert!(result.is_err());

        // Test AI enabled without API key
        let result = HyperSimConfig::builder()
            .network(Network::Testnet)
            .ai_enabled(true)
            .build();
        assert!(result.is_err());

        // Test invalid timeout
        let result = HyperSimConfig::builder()
            .network(Network::Testnet)
            .timeout_ms(0)
            .build();
        assert!(result.is_err());
    }

    #[test]
    fn test_default_endpoints() {
        let config = HyperSimConfig::builder()
            .network(Network::Mainnet)
            .build()
            .expect("Should build valid config");

        assert_eq!(config.rpc_endpoint(), "https://mainnet.hyperevm.com");
        assert_eq!(config.ws_endpoint(), "wss://mainnet-ws.hyperevm.com");
        assert_eq!(config.hypercore_endpoint(), "https://hypercore-mainnet.hyperevm.com");
    }

    #[test]
    fn test_custom_endpoints() {
        let config = HyperSimConfig::builder()
            .network(Network::Local)
            .rpc_endpoint("http://localhost:8545")
            .ws_endpoint("ws://localhost:8546")
            .build()
            .expect("Should build valid config");

        assert_eq!(config.rpc_endpoint(), "http://localhost:8545");
        assert_eq!(config.ws_endpoint(), "ws://localhost:8546");
    }
}
