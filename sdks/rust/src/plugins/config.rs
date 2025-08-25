//! Plugin configuration types

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Configuration for a plugin
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginConfig {
    /// Plugin name
    pub name: String,
    /// Plugin version requirement
    pub version: Option<String>,
    /// Whether plugin is enabled
    pub enabled: bool,
    /// Plugin-specific configuration parameters
    pub config: HashMap<String, serde_json::Value>,
    /// Plugin priority (lower numbers = higher priority)
    pub priority: u32,
}

impl PluginConfig {
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            version: None,
            enabled: true,
            config: HashMap::new(),
            priority: 100,
        }
    }

    pub fn version(mut self, version: impl Into<String>) -> Self {
        self.version = Some(version.into());
        self
    }

    pub fn enabled(mut self, enabled: bool) -> Self {
        self.enabled = enabled;
        self
    }

    pub fn config_value(mut self, key: impl Into<String>, value: impl Into<serde_json::Value>) -> Self {
        self.config.insert(key.into(), value.into());
        self
    }

    pub fn priority(mut self, priority: u32) -> Self {
        self.priority = priority;
        self
    }
}
