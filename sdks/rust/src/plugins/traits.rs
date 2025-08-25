//! Plugin trait definitions

use async_trait::async_trait;
use crate::types::{TransactionRequest, SimulationResult, RequestContext};
use crate::error::Result;

/// Main plugin trait that all plugins must implement
#[async_trait]
pub trait Plugin: Send + Sync {
    /// Plugin name
    fn name(&self) -> &str;
    
    /// Plugin version
    fn version(&self) -> &str;
    
    /// Plugin description
    fn description(&self) -> &str;
    
    /// Initialize the plugin
    async fn initialize(&mut self, config: &serde_json::Value) -> Result<()>;
    
    /// Cleanup plugin resources
    async fn shutdown(&mut self) -> Result<()>;
    
    /// Execute before transaction simulation
    async fn before_simulation(&self, _request: &TransactionRequest) -> Result<()> {
        Ok(())
    }
    
    /// Execute after transaction simulation
    async fn after_simulation(&self, _result: &mut SimulationResult) -> Result<()> {
        Ok(())
    }
    
    /// Execute on error
    async fn on_error(&self, _error: &crate::error::HyperSimError) -> Result<()> {
        Ok(())
    }
    
    /// Execute on request (for middleware-style plugins)
    async fn on_request(&self, _context: &RequestContext) -> Result<()> {
        Ok(())
    }
    
    /// Health check for the plugin
    async fn health_check(&self) -> Result<()> {
        Ok(())
    }
}

/// Plugin factory trait for dynamic loading
pub trait PluginFactory: Send + Sync {
    fn create(&self, config: &serde_json::Value) -> Result<Box<dyn Plugin>>;
    fn plugin_name(&self) -> &str;
    fn plugin_version(&self) -> &str;
}

/// Built-in plugin types
pub mod builtin {
    use super::*;
    
    /// Logging plugin
    pub struct LoggingPlugin {
        name: String,
        enabled: bool,
    }
    
    impl LoggingPlugin {
        pub fn new() -> Self {
            Self {
                name: "logging".to_string(),
                enabled: true,
            }
        }
    }
    
    #[async_trait]
    impl Plugin for LoggingPlugin {
        fn name(&self) -> &str {
            &self.name
        }
        
        fn version(&self) -> &str {
            "1.0.0"
        }
        
        fn description(&self) -> &str {
            "Built-in logging plugin"
        }
        
        async fn initialize(&mut self, config: &serde_json::Value) -> Result<()> {
            self.enabled = config.get("enabled")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);
            Ok(())
        }
        
        async fn shutdown(&mut self) -> Result<()> {
            Ok(())
        }
        
        async fn before_simulation(&self, request: &TransactionRequest) -> Result<()> {
            if self.enabled {
                tracing::info!("Starting simulation for transaction from {}", request.from);
            }
            Ok(())
        }
        
        async fn after_simulation(&self, result: &mut SimulationResult) -> Result<()> {
            if self.enabled {
                tracing::info!("Simulation completed: success={}, gas_used={}", 
                    result.success, result.gas_used);
            }
            Ok(())
        }
        
        async fn on_error(&self, error: &crate::error::HyperSimError) -> Result<()> {
            if self.enabled {
                tracing::error!("Plugin error: {}", error);
            }
            Ok(())
        }
    }
    
    /// Metrics collection plugin
    pub struct MetricsPlugin {
        name: String,
        request_count: std::sync::atomic::AtomicU64,
        error_count: std::sync::atomic::AtomicU64,
    }
    
    impl MetricsPlugin {
        pub fn new() -> Self {
            Self {
                name: "metrics".to_string(),
                request_count: std::sync::atomic::AtomicU64::new(0),
                error_count: std::sync::atomic::AtomicU64::new(0),
            }
        }
        
        pub fn get_request_count(&self) -> u64 {
            self.request_count.load(std::sync::atomic::Ordering::SeqCst)
        }
        
        pub fn get_error_count(&self) -> u64 {
            self.error_count.load(std::sync::atomic::Ordering::SeqCst)
        }
    }
    
    #[async_trait]
    impl Plugin for MetricsPlugin {
        fn name(&self) -> &str {
            &self.name
        }
        
        fn version(&self) -> &str {
            "1.0.0"
        }
        
        fn description(&self) -> &str {
            "Built-in metrics collection plugin"
        }
        
        async fn initialize(&mut self, _config: &serde_json::Value) -> Result<()> {
            Ok(())
        }
        
        async fn shutdown(&mut self) -> Result<()> {
            Ok(())
        }
        
        async fn before_simulation(&self, _request: &TransactionRequest) -> Result<()> {
            self.request_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
            Ok(())
        }
        
        async fn on_error(&self, _error: &crate::error::HyperSimError) -> Result<()> {
            self.error_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
            Ok(())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::builtin::*;

    #[tokio::test]
    async fn test_logging_plugin() {
        let mut plugin = LoggingPlugin::new();
        assert_eq!(plugin.name(), "logging");
        assert_eq!(plugin.version(), "1.0.0");
        
        let config = serde_json::json!({ "enabled": true });
        assert!(plugin.initialize(&config).await.is_ok());
    }

    #[tokio::test]
    async fn test_metrics_plugin() {
        let mut plugin = MetricsPlugin::new();
        assert_eq!(plugin.name(), "metrics");
        
        let config = serde_json::json!({});
        assert!(plugin.initialize(&config).await.is_ok());
        
        let initial_count = plugin.get_request_count();
        
        let tx = TransactionRequest::builder()
            .from("0x742d35Cc6563C7dE26d1e0d7Ad8e8c61c94c7De1").unwrap()
            .build().unwrap();
            
        plugin.before_simulation(&tx).await.unwrap();
        
        assert_eq!(plugin.get_request_count(), initial_count + 1);
    }
}
