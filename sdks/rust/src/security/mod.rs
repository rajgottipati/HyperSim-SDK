//! Security module for HyperSim Rust SDK
//! Provides comprehensive security features including API key rotation,
//! multi-signature support, request signing, and OWASP compliance.

pub mod security_manager;
pub mod api_key_manager;
pub mod multi_signature;
pub mod request_signer;
pub mod rate_limiter;
pub mod secure_storage;
pub mod security_auditor;
pub mod owasp_validator;
pub mod input_sanitizer;

pub use security_manager::*;
pub use api_key_manager::*;
pub use multi_signature::*;
pub use request_signer::*;
pub use rate_limiter::*;
pub use secure_storage::*;
pub use security_auditor::*;
pub use owasp_validator::*;
pub use input_sanitizer::*;

use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// Security configuration for the Rust SDK
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub api_key_rotation: bool,
    pub key_rotation_interval: Duration,
    pub multi_sig_enabled: bool,
    pub request_signing: bool,
    pub rate_limit: RateLimitConfig,
    pub audit_logging: bool,
    pub owasp_compliance: bool,
    pub certificate_pins: Vec<String>,
    pub input_validation: String, // "strict", "moderate", "basic"
    pub debug: bool,
}

/// Rate limiting configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    pub requests_per_window: u32,
    pub window_duration: Duration,
    pub max_queue_size: usize,
    pub ddos_protection: bool,
    pub ddos_threshold: u32,
}

/// Security metrics tracking
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SecurityMetrics {
    pub total_requests: u64,
    pub blocked_requests: u64,
    pub rate_limit_violations: u64,
    pub failed_signatures: u64,
    pub owasp_violations: u64,
    pub keys_rotated: u64,
}

/// Security event types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SecurityEventType {
    ApiKeyRotation,
    FailedSignature,
    RateLimitExceeded,
    DdosAttempt,
    InvalidInput,
    OwaspViolation,
    CertificateMismatch,
    UnauthorizedAccess,
}

/// Security event severity levels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

/// Security event structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityEvent {
    pub event_type: SecurityEventType,
    pub severity: Severity,
    pub timestamp: u64,
    pub description: String,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

/// API key data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct APIKeyData {
    pub primary: String,
    pub fallbacks: Vec<String>,
    pub created_at: u64,
    pub expires_at: u64,
    pub rotation_count: u64,
}

/// Multi-signature configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiSigConfig {
    pub threshold: usize,
    pub signers: Vec<String>,
    pub hardware_wallet: bool,
    pub algorithm: String,
}

/// Encrypted data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedData {
    pub data: String,
    pub iv: String,
    pub salt: String,
    pub algorithm: String,
    pub kdf: String,
}

/// OWASP violation details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OWASPViolation {
    pub category: String,
    pub severity: String,
    pub description: String,
    pub mitigation: Vec<String>,
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self {
            api_key_rotation: true,
            key_rotation_interval: Duration::from_secs(24 * 60 * 60), // 24 hours
            multi_sig_enabled: false,
            request_signing: true,
            rate_limit: RateLimitConfig::default(),
            audit_logging: true,
            owasp_compliance: true,
            certificate_pins: vec![],
            input_validation: "strict".to_string(),
            debug: false,
        }
    }
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            requests_per_window: 100,
            window_duration: Duration::from_secs(60),
            max_queue_size: 50,
            ddos_protection: true,
            ddos_threshold: 1000,
        }
    }
}

/// Utility function to get current timestamp
pub fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// Generate secure random string
pub fn generate_secure_key(length: usize) -> Result<String, Box<dyn std::error::Error>> {
    use rand::RngCore;
    let mut rng = rand::thread_rng();
    let mut bytes = vec![0u8; length];
    rng.fill_bytes(&mut bytes);
    Ok(hex::encode(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_security_config_default() {
        let config = SecurityConfig::default();
        assert!(config.api_key_rotation);
        assert!(config.request_signing);
        assert!(config.audit_logging);
        assert!(config.owasp_compliance);
    }

    #[test]
    fn test_generate_secure_key() {
        let key = generate_secure_key(32).unwrap();
        assert_eq!(key.len(), 64); // 32 bytes = 64 hex chars
    }

    #[test]
    fn test_current_timestamp() {
        let timestamp = current_timestamp();
        assert!(timestamp > 0);
    }
}