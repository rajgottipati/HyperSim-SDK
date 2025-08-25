/**
 * Security-related types and interfaces
 */

export interface SecurityConfig {
  /** Enable API key rotation */
  apiKeyRotation?: boolean;
  /** API key rotation interval in milliseconds */
  keyRotationInterval?: number;
  /** Enable multi-signature support */
  multiSignatureEnabled?: boolean;
  /** Enable request signing */
  requestSigning?: boolean;
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;
  /** Security audit logging */
  auditLogging?: boolean;
  /** OWASP compliance checking */
  owaspCompliance?: boolean;
  /** Certificate pinning for WebSockets */
  certificatePinning?: string[];
  /** Input validation level */
  inputValidation?: 'strict' | 'moderate' | 'basic';
}

export interface RateLimitConfig {
  /** Requests per time window */
  requestsPerWindow: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Max queue size for pending requests */
  maxQueueSize?: number;
  /** Enable DDoS protection */
  ddosProtection?: boolean;
  /** DDoS detection threshold */
  ddosThreshold?: number;
}

export interface APIKeyData {
  /** Primary API key */
  primary: string;
  /** Fallback API keys */
  fallbacks: string[];
  /** Key creation timestamp */
  createdAt: number;
  /** Key expiration timestamp */
  expiresAt: number;
  /** Key rotation counter */
  rotationCount: number;
}

export interface MultiSigConfig {
  /** Required signatures */
  threshold: number;
  /** Signer addresses */
  signers: string[];
  /** Hardware wallet support */
  hardwareWallet?: boolean;
  /** Signature algorithm */
  algorithm?: 'ecdsa' | 'schnorr';
}

export interface SignedRequest {
  /** Request data */
  data: any;
  /** Request signature */
  signature: string;
  /** Timestamp */
  timestamp: number;
  /** Nonce to prevent replay */
  nonce: string;
  /** Signer public key */
  publicKey: string;
}

export interface SecurityEvent {
  /** Event type */
  type: SecurityEventType;
  /** Event severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Event timestamp */
  timestamp: number;
  /** Event description */
  description: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export enum SecurityEventType {
  API_KEY_ROTATION = 'api_key_rotation',
  FAILED_SIGNATURE = 'failed_signature',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  DDOS_ATTEMPT = 'ddos_attempt',
  INVALID_INPUT = 'invalid_input',
  OWASP_VIOLATION = 'owasp_violation',
  CERTIFICATE_MISMATCH = 'certificate_mismatch',
  UNAUTHORIZED_ACCESS = 'unauthorized_access'
}

export interface EncryptedData {
  /** Encrypted data */
  data: string;
  /** Initialization vector */
  iv: string;
  /** Salt for key derivation */
  salt: string;
  /** Encryption algorithm */
  algorithm: string;
  /** Key derivation function */
  kdf: string;
}

export interface OWASPViolation {
  /** OWASP category */
  category: string;
  /** Violation severity */
  severity: 'info' | 'warning' | 'error' | 'critical';
  /** Description */
  description: string;
  /** Mitigation suggestions */
  mitigation: string[];
}

export interface SecurityMetrics {
  /** Total requests processed */
  totalRequests: number;
  /** Requests blocked */
  blockedRequests: number;
  /** Rate limit violations */
  rateLimitViolations: number;
  /** Failed signature verifications */
  failedSignatures: number;
  /** OWASP violations detected */
  owaspViolations: number;
  /** API keys rotated */
  keysRotated: number;
}
