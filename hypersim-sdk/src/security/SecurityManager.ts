/**
 * Central security manager that orchestrates all security features
 */

import { EventEmitter } from 'events';
import { APIKeyManager } from './APIKeyManager';
import { MultiSignature } from './MultiSignature';
import { RequestSigner } from './RequestSigner';
import { RateLimiter } from './RateLimiter';
import { SecureStorage } from './SecureStorage';
import { SecurityAuditor } from './SecurityAuditor';
import { OWASPValidator } from './OWASPValidator';
import { SecureWebSocket } from './SecureWebSocket';
import { InputSanitizer } from './InputSanitizer';
import { SecurityConfig, SecurityEvent, SecurityMetrics, SecurityEventType } from './types';

export class SecurityManager extends EventEmitter {
  private readonly config: Required<SecurityConfig>;
  private readonly apiKeyManager: APIKeyManager;
  private readonly multiSig: MultiSignature;
  private readonly requestSigner: RequestSigner;
  private readonly rateLimiter: RateLimiter;
  private readonly secureStorage: SecureStorage;
  private readonly auditor: SecurityAuditor;
  private readonly owaspValidator: OWASPValidator;
  private readonly inputSanitizer: InputSanitizer;
  private readonly metrics: SecurityMetrics;
  private rotationTimer?: NodeJS.Timeout;

  constructor(config: SecurityConfig) {
    super();
    
    // Set defaults for security config
    this.config = {
      apiKeyRotation: config.apiKeyRotation ?? true,
      keyRotationInterval: config.keyRotationInterval ?? 24 * 60 * 60 * 1000, // 24 hours
      multiSignatureEnabled: config.multiSignatureEnabled ?? false,
      requestSigning: config.requestSigning ?? true,
      rateLimit: {
        requestsPerWindow: 100,
        windowMs: 60000,
        maxQueueSize: 50,
        ddosProtection: true,
        ddosThreshold: 1000,
        ...config.rateLimit
      },
      auditLogging: config.auditLogging ?? true,
      owaspCompliance: config.owaspCompliance ?? true,
      certificatePinning: config.certificatePinning ?? [],
      inputValidation: config.inputValidation ?? 'strict'
    };

    // Initialize metrics
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      rateLimitViolations: 0,
      failedSignatures: 0,
      owaspViolations: 0,
      keysRotated: 0
    };

    // Initialize security components
    this.secureStorage = new SecureStorage();
    this.apiKeyManager = new APIKeyManager(this.secureStorage, {
      rotationEnabled: this.config.apiKeyRotation,
      rotationInterval: this.config.keyRotationInterval
    });
    this.multiSig = new MultiSignature(this.secureStorage);
    this.requestSigner = new RequestSigner(this.secureStorage);
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
    this.auditor = new SecurityAuditor(this.config.auditLogging);
    this.owaspValidator = new OWASPValidator(this.config.owaspCompliance);
    this.inputSanitizer = new InputSanitizer(this.config.inputValidation);

    // Setup event listeners
    this.setupEventListeners();

    // Start API key rotation if enabled
    if (this.config.apiKeyRotation) {
      this.startKeyRotation();
    }
  }

  /**
   * Process and secure an outgoing request
   */
  async secureRequest(request: any): Promise<any> {
    try {
      this.metrics.totalRequests++;

      // 1. Rate limiting check
      if (!await this.rateLimiter.checkLimit(request)) {
        this.metrics.rateLimitViolations++;
        this.metrics.blockedRequests++;
        await this.logSecurityEvent({
          type: SecurityEventType.RATE_LIMIT_EXCEEDED,
          severity: 'medium',
          timestamp: Date.now(),
          description: 'Rate limit exceeded for request'
        });
        throw new Error('Rate limit exceeded');
      }

      // 2. Input validation and sanitization
      const sanitizedRequest = await this.inputSanitizer.sanitize(request);
      
      // 3. OWASP compliance check
      if (this.config.owaspCompliance) {
        const violations = await this.owaspValidator.validate(sanitizedRequest);
        if (violations.length > 0) {
          this.metrics.owaspViolations += violations.length;
          await this.logSecurityEvent({
            type: SecurityEventType.OWASP_VIOLATION,
            severity: 'high',
            timestamp: Date.now(),
            description: `OWASP violations detected: ${violations.map(v => v.category).join(', ')}`,
            metadata: { violations }
          });
        }
      }

      // 4. Request signing
      let finalRequest = sanitizedRequest;
      if (this.config.requestSigning) {
        finalRequest = await this.requestSigner.signRequest(sanitizedRequest);
      }

      // 5. Add API key
      const apiKey = await this.apiKeyManager.getCurrentKey();
      finalRequest.headers = {
        ...finalRequest.headers,
        'Authorization': `Bearer ${apiKey.primary}`,
        'X-API-Key-Rotation': apiKey.rotationCount.toString()
      };

      return finalRequest;
    } catch (error) {
      this.metrics.blockedRequests++;
      throw error;
    }
  }

  /**
   * Verify an incoming response
   */
  async verifyResponse(response: any, originalRequest: any): Promise<boolean> {
    try {
      // Verify response signature if request was signed
      if (this.config.requestSigning && originalRequest.signature) {
        const isValid = await this.requestSigner.verifyResponse(response, originalRequest);
        if (!isValid) {
          this.metrics.failedSignatures++;
          await this.logSecurityEvent({
            type: SecurityEventType.FAILED_SIGNATURE,
            severity: 'high',
            timestamp: Date.now(),
            description: 'Response signature verification failed'
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      await this.logSecurityEvent({
        type: SecurityEventType.FAILED_SIGNATURE,
        severity: 'high',
        timestamp: Date.now(),
        description: `Response verification error: ${error.message}`
      });
      return false;
    }
  }

  /**
   * Create secure WebSocket connection
   */
  createSecureWebSocket(url: string, options?: any): SecureWebSocket {
    return new SecureWebSocket(url, {
      ...options,
      certificatePins: this.config.certificatePinning,
      auditor: this.auditor
    });
  }

  /**
   * Get security metrics
   */
  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * Get API key manager for external access
   */
  getAPIKeyManager(): APIKeyManager {
    return this.apiKeyManager;
  }

  /**
   * Get multi-signature handler
   */
  getMultiSignature(): MultiSignature {
    return this.multiSig;
  }

  /**
   * Shutdown security manager
   */
  async shutdown(): Promise<void> {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
    await this.auditor.flush();
  }

  private setupEventListeners(): void {
    this.apiKeyManager.on('keyRotated', async (event) => {
      this.metrics.keysRotated++;
      await this.logSecurityEvent({
        type: SecurityEventType.API_KEY_ROTATION,
        severity: 'low',
        timestamp: Date.now(),
        description: 'API key rotation completed',
        metadata: event
      });
    });

    this.rateLimiter.on('ddosDetected', async (event) => {
      await this.logSecurityEvent({
        type: SecurityEventType.DDOS_ATTEMPT,
        severity: 'critical',
        timestamp: Date.now(),
        description: 'DDoS attempt detected',
        metadata: event
      });
    });
  }

  private startKeyRotation(): void {
    this.rotationTimer = setInterval(async () => {
      try {
        await this.apiKeyManager.rotateKeys();
      } catch (error) {
        await this.logSecurityEvent({
          type: SecurityEventType.API_KEY_ROTATION,
          severity: 'high',
          timestamp: Date.now(),
          description: `API key rotation failed: ${error.message}`
        });
      }
    }, this.config.keyRotationInterval);
  }

  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    await this.auditor.log(event);
    this.emit('securityEvent', event);
  }
}
