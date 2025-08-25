"""
Security configuration types for Python SDK
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Union, Any
from enum import Enum


class SecurityEventType(Enum):
    """Types of security events"""
    API_KEY_ROTATION = "api_key_rotation"
    FAILED_SIGNATURE = "failed_signature"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    DDOS_ATTEMPT = "ddos_attempt"
    INVALID_INPUT = "invalid_input"
    OWASP_VIOLATION = "owasp_violation"
    CERTIFICATE_MISMATCH = "certificate_mismatch"
    UNAUTHORIZED_ACCESS = "unauthorized_access"


class Severity(Enum):
    """Security event severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class RateLimitConfig:
    """Rate limiting configuration"""
    requests_per_window: int = 100
    window_ms: int = 60000
    max_queue_size: int = 50
    ddos_protection: bool = True
    ddos_threshold: int = 1000


@dataclass
class SecurityConfig:
    """Main security configuration"""
    api_key_rotation: bool = True
    key_rotation_interval: int = 24 * 60 * 60 * 1000  # 24 hours
    multi_signature_enabled: bool = False
    request_signing: bool = True
    rate_limit: RateLimitConfig = field(default_factory=RateLimitConfig)
    audit_logging: bool = True
    owasp_compliance: bool = True
    certificate_pinning: List[str] = field(default_factory=list)
    input_validation: str = 'strict'  # 'strict', 'moderate', 'basic'


@dataclass
class APIKeyData:
    """API key data structure"""
    primary: str
    fallbacks: List[str]
    created_at: int
    expires_at: int
    rotation_count: int


@dataclass
class MultiSigConfig:
    """Multi-signature configuration"""
    threshold: int
    signers: List[str]
    hardware_wallet: bool = False
    algorithm: str = 'ecdsa'


@dataclass
class SignedRequest:
    """Signed request structure"""
    data: Any
    signature: str
    timestamp: int
    nonce: str
    public_key: str


@dataclass
class SecurityEvent:
    """Security event structure"""
    event_type: SecurityEventType
    severity: Severity
    timestamp: int
    description: str
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class EncryptedData:
    """Encrypted data structure"""
    data: str
    iv: str
    salt: str
    algorithm: str
    kdf: str


@dataclass
class OWASPViolation:
    """OWASP violation details"""
    category: str
    severity: str
    description: str
    mitigation: List[str]


@dataclass
class SecurityMetrics:
    """Security metrics structure"""
    total_requests: int = 0
    blocked_requests: int = 0
    rate_limit_violations: int = 0
    failed_signatures: int = 0
    owasp_violations: int = 0
    keys_rotated: int = 0
