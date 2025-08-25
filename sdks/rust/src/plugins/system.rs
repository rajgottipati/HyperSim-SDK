//! Plugin system implementation

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};

use crate::plugins::{Plugin, PluginConfig};
use crate::plugins::traits::builtin::{LoggingPlugin, MetricsPlugin};
use crate::types::{TransactionRequest, SimulationResult};
use crate::error::{HyperSimError, Result};

/// Plugin system for managing and executing plugins
pub struct PluginSystem {
    /// Loaded plugins
    plugins: Arc<RwLock<HashMap<String, Box<dyn Plugin>>>>,
    /// Plugin execution order (by priority)
    execution_order: Arc<RwLock<Vec<String>>>,
    /// Whether system is initialized
    initialized: bool,
}

impl PluginSystem {
    /// Create a new plugin system
    pub async fn new() -> Result<Self> {
        let mut system = Self {
            plugins: Arc::new(RwLock::new(HashMap::new())),
            execution_order: Arc::new(RwLock::new(Vec::new())),
            initialized: true,
        };

        // Load built-in plugins
        system.load_builtin_plugins().await?;

        Ok(system)
    }

    /// Load a plugin from configuration
    pub async fn load_plugin(&self, config: PluginConfig) -> Result<()> {
        if !config.enabled {
            debug!("Plugin {} is disabled, skipping", config.name);
            return Ok();
        }

        info!("Loading plugin: {}", config.name);

        // Create plugin instance
        let mut plugin = self.create_plugin(&config.name)?;

        // Initialize plugin with configuration
        let config_value = serde_json::to_value(&config.config)
            .map_err(|e| HyperSimError::plugin(format!("Invalid plugin config: {}", e)))?;
        
        plugin.initialize(&config_value).await?;

        // Store plugin
        let mut plugins = self.plugins.write().await;
        plugins.insert(config.name.clone(), plugin);

        // Update execution order
        self.update_execution_order(config.name, config.priority).await;

        info!("Plugin {} loaded successfully", config.name);
        Ok(())
    }

    /// Execute before simulation hooks
    pub async fn execute_before_simulation(&self, request: &TransactionRequest) -> Result<()> {
        let execution_order = self.execution_order.read().await;
        let plugins = self.plugins.read().await;

        for plugin_name in execution_order.iter() {
            if let Some(plugin) = plugins.get(plugin_name) {
                if let Err(e) = plugin.before_simulation(request).await {
                    error!("Plugin {} before_simulation failed: {}", plugin_name, e);
                    // Continue with other plugins even if one fails
                }
            }
        }

        Ok(())
    }

    /// Execute after simulation hooks
    pub async fn execute_after_simulation(&self, result: &mut SimulationResult) -> Result<()> {
        let execution_order = self.execution_order.read().await;
        let plugins = self.plugins.read().await;

        for plugin_name in execution_order.iter() {
            if let Some(plugin) = plugins.get(plugin_name) {
                if let Err(e) = plugin.after_simulation(result).await {
                    error!("Plugin {} after_simulation failed: {}", plugin_name, e);
                    // Continue with other plugins even if one fails
                }
            }
        }

        Ok(())
    }

    /// Execute error hooks
    pub async fn execute_on_error(&self, error: &HyperSimError) -> Result<()> {
        let execution_order = self.execution_order.read().await;
        let plugins = self.plugins.read().await;

        for plugin_name in execution_order.iter() {
            if let Some(plugin) = plugins.get(plugin_name) {
                if let Err(e) = plugin.on_error(error).await {
                    warn!("Plugin {} on_error failed: {}", plugin_name, e);
                    // Continue with other plugins even if one fails
                }
            }
        }

        Ok(())
    }

    /// Get loaded plugin names
    pub async fn get_loaded_plugins(&self) -> Vec<String> {
        let plugins = self.plugins.read().await;
        plugins.keys().cloned().collect()
    }

    /// Check if a plugin is loaded
    pub async fn is_plugin_loaded(&self, name: &str) -> bool {
        let plugins = self.plugins.read().await;
        plugins.contains_key(name)
    }

    /// Unload a plugin
    pub async fn unload_plugin(&self, name: &str) -> Result<()> {
        info!("Unloading plugin: {}", name);

        let mut plugins = self.plugins.write().await;
        if let Some(mut plugin) = plugins.remove(name) {
            // Shutdown the plugin
            if let Err(e) = plugin.shutdown().await {
                warn!("Plugin {} shutdown failed: {}", name, e);
            }
        }

        // Update execution order
        let mut execution_order = self.execution_order.write().await;
        execution_order.retain(|n| n != name);

        info!("Plugin {} unloaded", name);
        Ok(())
    }

    /// Run health checks on all plugins
    pub async fn health_check(&self) -> Result<HashMap<String, bool>> {
        let plugins = self.plugins.read().await;
        let mut health_status = HashMap::new();

        for (name, plugin) in plugins.iter() {
            let healthy = plugin.health_check().await.is_ok();
            health_status.insert(name.clone(), healthy);
            
            if !healthy {
                warn!("Plugin {} failed health check", name);
            }
        }

        Ok(health_status)
    }

    /// Shutdown the plugin system
    pub async fn shutdown(&self) -> Result<()> {
        info!("Shutting down plugin system");

        let mut plugins = self.plugins.write().await;
        for (name, mut plugin) in plugins.drain() {
            if let Err(e) = plugin.shutdown().await {
                warn!("Plugin {} shutdown failed: {}", name, e);
            }
        }

        let mut execution_order = self.execution_order.write().await;
        execution_order.clear();

        info!("Plugin system shutdown completed");
        Ok(())
    }

    // Private methods

    async fn load_builtin_plugins(&mut self) -> Result<()> {
        // Load default logging plugin
        let logging_config = PluginConfig::new("logging")
            .priority(10)
            .config_value("enabled", true);
        self.load_plugin(logging_config).await?;

        // Load default metrics plugin
        let metrics_config = PluginConfig::new("metrics")
            .priority(20)
            .config_value("enabled", true);
        self.load_plugin(metrics_config).await?;

        Ok(())
    }

    fn create_plugin(&self, name: &str) -> Result<Box<dyn Plugin>> {
        match name {
            "logging" => Ok(Box::new(LoggingPlugin::new())),
            "metrics" => Ok(Box::new(MetricsPlugin::new())),
            _ => Err(HyperSimError::plugin(format!("Unknown plugin: {}", name))),
        }
    }

    async fn update_execution_order(&self, plugin_name: String, priority: u32) {
        let mut execution_order = self.execution_order.write().await;
        
        // Remove if already exists
        execution_order.retain(|name| name != &plugin_name);
        
        // Find insertion position based on priority
        let position = execution_order
            .iter()
            .position(|name| {
                // Get priority of existing plugin (default to 100)
                // In a real implementation, we'd store priorities separately
                false // For now, just append
            })
            .unwrap_or(execution_order.len());
            
        execution_order.insert(position, plugin_name);
    }
}

impl std::fmt::Debug for PluginSystem {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PluginSystem")
            .field("initialized", &self.initialized)
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_plugin_system_creation() {
        let system = PluginSystem::new().await.unwrap();
        let plugins = system.get_loaded_plugins().await;
        
        // Should have built-in plugins loaded
        assert!(plugins.contains(&"logging".to_string()));
        assert!(plugins.contains(&"metrics".to_string()));
    }

    #[tokio::test]
    async fn test_plugin_loading() {
        let system = PluginSystem::new().await.unwrap();
        
        let config = PluginConfig::new("test-logging")
            .enabled(true)
            .priority(50);
        
        // This would fail because "test-logging" is not a known plugin
        // In a real implementation, we'd have plugin discovery
        assert!(system.load_plugin(config).await.is_err());
    }

    #[tokio::test]
    async fn test_plugin_health_check() {
        let system = PluginSystem::new().await.unwrap();
        let health = system.health_check().await.unwrap();
        
        // Built-in plugins should be healthy
        assert_eq!(health.get("logging"), Some(&true));
        assert_eq!(health.get("metrics"), Some(&true));
    }
}
