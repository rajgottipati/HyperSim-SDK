//! Common types and utilities shared across the SDK

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// Connection error type
#[derive(Debug, Clone, thiserror::Error)]
#[error("Connection error: {message}")]
pub struct ConnectionError {
    pub message: String,
}

impl ConnectionError {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

/// Retry strategy configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryConfig {
    /// Maximum number of retry attempts
    pub max_attempts: u32,
    /// Initial retry delay in milliseconds
    pub initial_delay: u64,
    /// Maximum retry delay in milliseconds
    pub max_delay: u64,
    /// Backoff multiplier
    pub backoff_multiplier: f64,
    /// Whether to add random jitter
    pub jitter: bool,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: 3,
            initial_delay: 1000,
            max_delay: 30000,
            backoff_multiplier: 2.0,
            jitter: true,
        }
    }
}

/// Connection pool configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionPoolConfig {
    /// Maximum number of concurrent connections
    pub max_connections: u32,
    /// Connection timeout in milliseconds
    pub connection_timeout: u64,
    /// Idle connection timeout in milliseconds
    pub idle_timeout: u64,
    /// Enable connection pooling
    pub enabled: bool,
}

impl Default for ConnectionPoolConfig {
    fn default() -> Self {
        Self {
            max_connections: 10,
            connection_timeout: 30000,
            idle_timeout: 60000,
            enabled: true,
        }
    }
}

/// Performance metrics for monitoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    /// Total requests made
    pub total_requests: u64,
    /// Successful requests
    pub successful_requests: u64,
    /// Failed requests
    pub failed_requests: u64,
    /// Average response time in milliseconds
    pub average_response_time: f64,
    /// Connection pool statistics
    pub connection_pool: ConnectionPoolStats,
    /// Cache hit ratio (0.0 to 1.0)
    pub cache_hit_ratio: f64,
    /// Uptime in milliseconds
    pub uptime: u64,
}

/// Connection pool statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionPoolStats {
    /// Active connections
    pub active: u32,
    /// Idle connections
    pub idle: u32,
    /// Total connections
    pub total: u32,
}

/// Cache entry with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheEntry<T> {
    /// Cached value
    pub value: T,
    /// Expiration timestamp (Unix timestamp in milliseconds)
    pub expires_at: u64,
    /// Cache hit count
    pub hits: u64,
    /// Last accessed timestamp
    pub last_accessed: u64,
}

impl<T> CacheEntry<T> {
    pub fn new(value: T, ttl_ms: u64) -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        
        Self {
            value,
            expires_at: now + ttl_ms,
            hits: 0,
            last_accessed: now,
        }
    }

    pub fn is_expired(&self) -> bool {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        
        now > self.expires_at
    }

    pub fn access(&mut self) -> &T {
        self.hits += 1;
        self.last_accessed = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        &self.value
    }
}

/// Circuit breaker states
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CircuitBreakerState {
    Closed,
    Open,
    HalfOpen,
}

/// Circuit breaker configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircuitBreakerConfig {
    /// Failure threshold before opening circuit
    pub failure_threshold: u32,
    /// Timeout before attempting to close circuit (milliseconds)
    pub timeout: u64,
    /// Monitoring window in milliseconds
    pub monitoring_window: u64,
    /// Minimum requests before evaluating circuit
    pub minimum_requests: u32,
}

impl Default for CircuitBreakerConfig {
    fn default() -> Self {
        Self {
            failure_threshold: 5,
            timeout: 60000,
            monitoring_window: 10000,
            minimum_requests: 10,
        }
    }
}

/// Rate limiter configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimiterConfig {
    /// Maximum requests per window
    pub max_requests: u32,
    /// Time window in milliseconds
    pub window_ms: u64,
    /// Whether to queue requests when limit is exceeded
    pub queue_requests: bool,
    /// Maximum queue size
    pub max_queue_size: u32,
}

impl Default for RateLimiterConfig {
    fn default() -> Self {
        Self {
            max_requests: 100,
            window_ms: 60000,
            queue_requests: true,
            max_queue_size: 1000,
        }
    }
}

/// Request context for middleware and plugins
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestContext {
    /// Unique request identifier
    pub id: String,
    /// Request method
    pub method: String,
    /// Request URL
    pub url: String,
    /// Request headers
    pub headers: HashMap<String, String>,
    /// Request body (as JSON value)
    pub body: Option<serde_json::Value>,
    /// Request timestamp (Unix timestamp in milliseconds)
    pub timestamp: u64,
    /// Request metadata
    pub metadata: HashMap<String, serde_json::Value>,
}

impl RequestContext {
    pub fn new(id: String, method: String, url: String) -> Self {
        Self {
            id,
            method,
            url,
            headers: HashMap::new(),
            body: None,
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            metadata: HashMap::new(),
        }
    }
}

/// Response context for middleware and plugins
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseContext {
    /// Response status code
    pub status: u16,
    /// Response headers
    pub headers: HashMap<String, String>,
    /// Response body (as JSON value)
    pub body: Option<serde_json::Value>,
    /// Response timestamp (Unix timestamp in milliseconds)
    pub timestamp: u64,
    /// Response time in milliseconds
    pub response_time: u64,
}

/// Health check result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheckResult {
    /// Service name
    pub service: String,
    /// Health status
    pub status: HealthStatus,
    /// Timestamp of check (Unix timestamp in milliseconds)
    pub timestamp: u64,
    /// Response time in milliseconds
    pub response_time: u64,
    /// Additional details
    pub details: Option<HashMap<String, serde_json::Value>>,
    /// Error message if unhealthy
    pub error: Option<String>,
}

/// Health status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
}

/// SDK configuration options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SDKOptions {
    /// Request timeout in milliseconds
    pub timeout: Option<u64>,
    /// Retry configuration
    pub retry: Option<RetryConfig>,
    /// Connection pool configuration
    pub connection_pool: Option<ConnectionPoolConfig>,
    /// Enable caching
    pub cache: Option<bool>,
    /// Cache TTL in seconds
    pub cache_ttl: Option<u64>,
    /// Enable metrics collection
    pub metrics: Option<bool>,
    /// Rate limiter configuration
    pub rate_limit: Option<RateLimiterConfig>,
    /// Circuit breaker configuration
    pub circuit_breaker: Option<CircuitBreakerConfig>,
}

impl Default for SDKOptions {
    fn default() -> Self {
        Self {
            timeout: Some(30000),
            retry: Some(RetryConfig::default()),
            connection_pool: Some(ConnectionPoolConfig::default()),
            cache: Some(true),
            cache_ttl: Some(300), // 5 minutes
            metrics: Some(true),
            rate_limit: Some(RateLimiterConfig::default()),
            circuit_breaker: Some(CircuitBreakerConfig::default()),
        }
    }
}

/// Address type wrapper for Ethereum addresses
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Address(pub String);

impl Address {
    pub fn new(addr: impl Into<String>) -> crate::error::Result<Self> {
        let addr = addr.into();
        if addr.len() != 42 || !addr.starts_with("0x") {
            return Err(crate::error::HyperSimError::validation(
                format!("Invalid Ethereum address format: {}", addr)
            ));
        }
        Ok(Self(addr))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn checksum(&self) -> String {
        // TODO: Implement EIP-55 checksum encoding
        self.0.clone()
    }
}

impl std::fmt::Display for Address {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::str::FromStr for Address {
    type Err = crate::error::HyperSimError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Address::new(s)
    }
}

/// Hash type wrapper
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Hash(pub String);

impl Hash {
    pub fn new(hash: impl Into<String>) -> crate::error::Result<Self> {
        let hash = hash.into();
        if hash.len() != 66 || !hash.starts_with("0x") {
            return Err(crate::error::HyperSimError::validation(
                format!("Invalid hash format: {}", hash)
            ));
        }
        Ok(Self(hash))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Display for Hash {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::str::FromStr for Hash {
    type Err = crate::error::HyperSimError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Hash::new(s)
    }
}

/// Wei amount wrapper for precise decimal handling
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Wei(pub String);

impl Wei {
    pub fn new(amount: impl Into<String>) -> Self {
        Self(amount.into())
    }

    pub fn from_ether(ether: f64) -> Self {
        let wei = (ether * 1e18) as u128;
        Self(wei.to_string())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn to_ether(&self) -> crate::error::Result<f64> {
        let wei: u128 = self.0.parse()
            .map_err(|_| crate::error::HyperSimError::validation("Invalid wei amount"))?;
        Ok(wei as f64 / 1e18)
    }
}

impl std::fmt::Display for Wei {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_address_validation() {
        assert!(Address::new("0x742d35Cc6563C7dE26d1e0d7Ad8e8c61c94c7De1").is_ok());
        assert!(Address::new("invalid").is_err());
        assert!(Address::new("0x123").is_err());
    }

    #[test]
    fn test_hash_validation() {
        assert!(Hash::new("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef").is_ok());
        assert!(Hash::new("invalid").is_err());
        assert!(Hash::new("0x123").is_err());
    }

    #[test]
    fn test_wei_conversion() {
        let wei = Wei::from_ether(1.0);
        assert_eq!(wei.as_str(), "1000000000000000000");
        assert!((wei.to_ether().unwrap() - 1.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_cache_entry() {
        let mut entry = CacheEntry::new("test_value".to_string(), 1000);
        assert!(!entry.is_expired());
        
        let value = entry.access();
        assert_eq!(value, "test_value");
        assert_eq!(entry.hits, 1);
    }
}
