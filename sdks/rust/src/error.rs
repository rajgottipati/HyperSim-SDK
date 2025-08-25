//! Error handling for the HyperSim SDK
//!
//! This module provides comprehensive error handling with context-rich error types
//! that maintain performance while providing detailed debugging information.

use std::fmt;
use thiserror::Error;

/// Result type alias for HyperSim SDK operations
pub type Result<T> = std::result::Result<T, HyperSimError>;

/// Main error type for the HyperSim SDK
#[derive(Error, Debug)]
pub enum HyperSimError {
    /// Configuration errors
    #[error("Configuration error: {message}")]
    Configuration { message: String },

    /// Network connection errors
    #[error("Network error: {message}")]
    Network { message: String, source: Option<Box<dyn std::error::Error + Send + Sync>> },

    /// Transaction simulation errors
    #[error("Simulation error: {message}")]
    Simulation { message: String, tx_hash: Option<String> },

    /// WebSocket connection errors
    #[error("WebSocket error: {message}")]
    WebSocket { message: String, url: Option<String> },

    /// AI analysis errors
    #[error("AI analysis error: {message}")]
    AIAnalysis { message: String },

    /// Plugin system errors
    #[error("Plugin error: {message}")]
    Plugin { message: String, plugin_name: Option<String> },

    /// Validation errors for input data
    #[error("Validation error: {message}")]
    Validation { message: String, field: Option<String> },

    /// Serialization/deserialization errors
    #[error("Serialization error: {message}")]
    Serialization { message: String },

    /// Authentication and authorization errors
    #[error("Authentication error: {message}")]
    Authentication { message: String },

    /// Rate limiting errors
    #[error("Rate limit exceeded: {message}")]
    RateLimit { message: String, retry_after: Option<u64> },

    /// Timeout errors
    #[error("Timeout error: operation timed out after {duration_ms}ms")]
    Timeout { duration_ms: u64 },

    /// ABI encoding/decoding errors
    #[error("ABI error: {message}")]
    ABI { message: String },

    /// Connection pool errors
    #[error("Connection pool error: {message}")]
    ConnectionPool { message: String },

    /// Internal SDK errors
    #[error("Internal error: {message}")]
    Internal { message: String },

    /// Unknown or unexpected errors
    #[error("Unknown error: {message}")]
    Unknown { message: String },
}

impl HyperSimError {
    /// Create a new configuration error
    pub fn configuration(message: impl Into<String>) -> Self {
        Self::Configuration { message: message.into() }
    }

    /// Create a new network error with optional source
    pub fn network(message: impl Into<String>) -> Self {
        Self::Network { message: message.into(), source: None }
    }

    /// Create a new network error with source error
    pub fn network_with_source(
        message: impl Into<String>,
        source: Box<dyn std::error::Error + Send + Sync>,
    ) -> Self {
        Self::Network { message: message.into(), source: Some(source) }
    }

    /// Create a new simulation error
    pub fn simulation(message: impl Into<String>) -> Self {
        Self::Simulation { message: message.into(), tx_hash: None }
    }

    /// Create a new simulation error with transaction hash
    pub fn simulation_with_hash(message: impl Into<String>, tx_hash: impl Into<String>) -> Self {
        Self::Simulation { 
            message: message.into(), 
            tx_hash: Some(tx_hash.into()) 
        }
    }

    /// Create a new WebSocket error
    pub fn websocket(message: impl Into<String>) -> Self {
        Self::WebSocket { message: message.into(), url: None }
    }

    /// Create a new WebSocket error with URL
    pub fn websocket_with_url(message: impl Into<String>, url: impl Into<String>) -> Self {
        Self::WebSocket { 
            message: message.into(), 
            url: Some(url.into()) 
        }
    }

    /// Create a new AI analysis error
    pub fn ai_analysis(message: impl Into<String>) -> Self {
        Self::AIAnalysis { message: message.into() }
    }

    /// Create a new plugin error
    pub fn plugin(message: impl Into<String>) -> Self {
        Self::Plugin { message: message.into(), plugin_name: None }
    }

    /// Create a new plugin error with plugin name
    pub fn plugin_with_name(message: impl Into<String>, plugin_name: impl Into<String>) -> Self {
        Self::Plugin { 
            message: message.into(), 
            plugin_name: Some(plugin_name.into()) 
        }
    }

    /// Create a new validation error
    pub fn validation(message: impl Into<String>) -> Self {
        Self::Validation { message: message.into(), field: None }
    }

    /// Create a new validation error with field name
    pub fn validation_with_field(message: impl Into<String>, field: impl Into<String>) -> Self {
        Self::Validation { 
            message: message.into(), 
            field: Some(field.into()) 
        }
    }

    /// Create a new serialization error
    pub fn serialization(message: impl Into<String>) -> Self {
        Self::Serialization { message: message.into() }
    }

    /// Create a new authentication error
    pub fn authentication(message: impl Into<String>) -> Self {
        Self::Authentication { message: message.into() }
    }

    /// Create a new rate limit error
    pub fn rate_limit(message: impl Into<String>) -> Self {
        Self::RateLimit { message: message.into(), retry_after: None }
    }

    /// Create a new rate limit error with retry after
    pub fn rate_limit_with_retry(message: impl Into<String>, retry_after: u64) -> Self {
        Self::RateLimit { 
            message: message.into(), 
            retry_after: Some(retry_after) 
        }
    }

    /// Create a new timeout error
    pub fn timeout(duration_ms: u64) -> Self {
        Self::Timeout { duration_ms }
    }

    /// Create a new ABI error
    pub fn abi(message: impl Into<String>) -> Self {
        Self::ABI { message: message.into() }
    }

    /// Create a new connection pool error
    pub fn connection_pool(message: impl Into<String>) -> Self {
        Self::ConnectionPool { message: message.into() }
    }

    /// Create a new internal error
    pub fn internal(message: impl Into<String>) -> Self {
        Self::Internal { message: message.into() }
    }

    /// Create a new unknown error
    pub fn unknown(message: impl Into<String>) -> Self {
        Self::Unknown { message: message.into() }
    }

    /// Check if error is retryable
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            HyperSimError::Network { .. }
                | HyperSimError::WebSocket { .. }
                | HyperSimError::Timeout { .. }
                | HyperSimError::RateLimit { .. }
                | HyperSimError::ConnectionPool { .. }
        )
    }

    /// Get error category for metrics
    pub fn category(&self) -> &'static str {
        match self {
            HyperSimError::Configuration { .. } => "configuration",
            HyperSimError::Network { .. } => "network",
            HyperSimError::Simulation { .. } => "simulation",
            HyperSimError::WebSocket { .. } => "websocket",
            HyperSimError::AIAnalysis { .. } => "ai_analysis",
            HyperSimError::Plugin { .. } => "plugin",
            HyperSimError::Validation { .. } => "validation",
            HyperSimError::Serialization { .. } => "serialization",
            HyperSimError::Authentication { .. } => "authentication",
            HyperSimError::RateLimit { .. } => "rate_limit",
            HyperSimError::Timeout { .. } => "timeout",
            HyperSimError::ABI { .. } => "abi",
            HyperSimError::ConnectionPool { .. } => "connection_pool",
            HyperSimError::Internal { .. } => "internal",
            HyperSimError::Unknown { .. } => "unknown",
        }
    }
}

// Conversions from common error types
impl From<serde_json::Error> for HyperSimError {
    fn from(err: serde_json::Error) -> Self {
        Self::serialization(format!("JSON error: {}", err))
    }
}

impl From<reqwest::Error> for HyperSimError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            Self::timeout(30000) // Default timeout
        } else if err.is_connect() {
            Self::network(format!("Connection error: {}", err))
        } else {
            Self::network(format!("HTTP error: {}", err))
        }
    }
}

impl From<tokio::time::error::Elapsed> for HyperSimError {
    fn from(_: tokio::time::error::Elapsed) -> Self {
        Self::timeout(0)
    }
}

impl From<tungstenite::Error> for HyperSimError {
    fn from(err: tungstenite::Error) -> Self {
        Self::websocket(format!("WebSocket error: {}", err))
    }
}

impl From<ethers::types::ParseError> for HyperSimError {
    fn from(err: ethers::types::ParseError) -> Self {
        Self::validation(format!("Parse error: {}", err))
    }
}

#[cfg(feature = "cross-layer")]
impl From<ethereum_abi::Error> for HyperSimError {
    fn from(err: ethereum_abi::Error) -> Self {
        Self::abi(format!("ABI error: {}", err))
    }
}

/// Error context trait for adding context to errors
pub trait ErrorContext<T> {
    fn with_context<F>(self, f: F) -> Result<T>
    where
        F: FnOnce() -> String;

    fn context(self, message: &str) -> Result<T>;
}

impl<T, E> ErrorContext<T> for std::result::Result<T, E>
where
    E: std::error::Error + Send + Sync + 'static,
{
    fn with_context<F>(self, f: F) -> Result<T>
    where
        F: FnOnce() -> String,
    {
        self.map_err(|err| {
            HyperSimError::unknown(format!("{}: {}", f(), err))
        })
    }

    fn context(self, message: &str) -> Result<T> {
        self.map_err(|err| {
            HyperSimError::unknown(format!("{}: {}", message, err))
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_creation() {
        let err = HyperSimError::validation("Invalid address");
        assert!(matches!(err, HyperSimError::Validation { .. }));
        assert_eq!(err.category(), "validation");
        assert!(!err.is_retryable());
    }

    #[test]
    fn test_retryable_errors() {
        let network_err = HyperSimError::network("Connection failed");
        assert!(network_err.is_retryable());

        let validation_err = HyperSimError::validation("Invalid input");
        assert!(!validation_err.is_retryable());
    }

    #[test]
    fn test_error_context() {
        let result: std::result::Result<(), std::io::Error> = 
            Err(std::io::Error::new(std::io::ErrorKind::NotFound, "file not found"));
        
        let contextualized = result.context("Failed to read config file");
        assert!(contextualized.is_err());
    }
}
