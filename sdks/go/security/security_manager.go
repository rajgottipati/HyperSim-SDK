// Package security provides comprehensive security features for HyperSim Go SDK
package security

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"
)

// SecurityManager orchestrates all security features
type SecurityManager struct {
	config          *SecurityConfig
	apiKeyManager   *APIKeyManager
	multiSig        *MultiSignature
	requestSigner   *RequestSigner
	rateLimiter     *RateLimiter
	secureStorage   *SecureStorage
	securityAuditor *SecurityAuditor
	owaspValidator  *OWASPValidator
	inputSanitizer  *InputSanitizer
	metrics         *SecurityMetrics
	mu              sync.RWMutex
	initialized     bool
	shutdownCh      chan struct{}
}

// SecurityConfig holds security configuration
type SecurityConfig struct {
	APIKeyRotation     bool
	KeyRotationInterval time.Duration
	MultiSigEnabled    bool
	RequestSigning     bool
	RateLimit          *RateLimitConfig
	AuditLogging       bool
	OWASPCompliance    bool
	CertificatePins    []string
	InputValidation    string // "strict", "moderate", "basic"
	Debug              bool
}

// SecurityMetrics tracks security events
type SecurityMetrics struct {
	TotalRequests       int64 `json:"total_requests"`
	BlockedRequests     int64 `json:"blocked_requests"`
	RateLimitViolations int64 `json:"rate_limit_violations"`
	FailedSignatures    int64 `json:"failed_signatures"`
	OWASPViolations     int64 `json:"owasp_violations"`
	KeysRotated         int64 `json:"keys_rotated"`
}

// NewSecurityManager creates a new security manager
func NewSecurityManager(config *SecurityConfig) *SecurityManager {
	if config == nil {
		config = DefaultSecurityConfig()
	}
	
	sm := &SecurityManager{
		config:     config,
		metrics:    &SecurityMetrics{},
		shutdownCh: make(chan struct{}),
	}
	
	// Initialize components
	sm.secureStorage = NewSecureStorage()
	sm.apiKeyManager = NewAPIKeyManager(sm.secureStorage, config.APIKeyRotation, config.KeyRotationInterval)
	sm.multiSig = NewMultiSignature(sm.secureStorage)
	sm.requestSigner = NewRequestSigner(sm.secureStorage)
	sm.rateLimiter = NewRateLimiter(config.RateLimit)
	sm.securityAuditor = NewSecurityAuditor(config.AuditLogging)
	sm.owaspValidator = NewOWASPValidator(config.OWASPCompliance)
	sm.inputSanitizer = NewInputSanitizer(config.InputValidation)
	
	return sm
}

// Initialize starts all security components
func (sm *SecurityManager) Initialize(ctx context.Context) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	
	if sm.initialized {
		return nil
	}
	
	// Initialize all components
	if err := sm.secureStorage.Initialize(ctx); err != nil {
		return fmt.Errorf("failed to initialize secure storage: %w", err)
	}
	
	if err := sm.apiKeyManager.Initialize(ctx); err != nil {
		return fmt.Errorf("failed to initialize API key manager: %w", err)
	}
	
	// Start background tasks
	if sm.config.APIKeyRotation {
		go sm.autoRotateKeys(ctx)
	}
	
	go sm.securityMonitor(ctx)
	
	sm.initialized = true
	return nil
}

// SecureRequest processes and secures an outgoing request
func (sm *SecurityManager) SecureRequest(ctx context.Context, request map[string]interface{}) (map[string]interface{}, error) {
	sm.metrics.TotalRequests++
	
	// Rate limiting check
	if !sm.rateLimiter.IsAllowed(request) {
		sm.metrics.RateLimitViolations++
		sm.metrics.BlockedRequests++
		return nil, fmt.Errorf("rate limit exceeded")
	}
	
	// Input sanitization
	sanitized, err := sm.inputSanitizer.Sanitize(request)
	if err != nil {
		return nil, fmt.Errorf("input sanitization failed: %w", err)
	}
	
	// OWASP compliance check
	if sm.config.OWASPCompliance {
		violations := sm.owaspValidator.Validate(sanitized)
		if len(violations) > 0 {
			sm.metrics.OWASPViolations += int64(len(violations))
			return nil, fmt.Errorf("OWASP violations detected: %v", violations)
		}
	}
	
	// Request signing
	finalRequest := sanitized
	if sm.config.RequestSigning {
		finalRequest, err = sm.requestSigner.SignRequest(sanitized)
		if err != nil {
			return nil, fmt.Errorf("request signing failed: %w", err)
		}
	}
	
	// Add API key
	apiKey, err := sm.apiKeyManager.GetCurrentKey()
	if err != nil {
		return nil, fmt.Errorf("failed to get API key: %w", err)
	}
	
	headers, ok := finalRequest["headers"].(map[string]string)
	if !ok {
		headers = make(map[string]string)
	}
	headers["Authorization"] = fmt.Sprintf("Bearer %s", apiKey.Primary)
	headers["X-API-Key-Rotation"] = fmt.Sprintf("%d", apiKey.RotationCount)
	finalRequest["headers"] = headers
	
	return finalRequest, nil
}

// GetMetrics returns current security metrics
func (sm *SecurityManager) GetMetrics() *SecurityMetrics {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return sm.metrics
}

// Shutdown gracefully stops all security components
func (sm *SecurityManager) Shutdown(ctx context.Context) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	
	if !sm.initialized {
		return nil
	}
	
	close(sm.shutdownCh)
	
	// Shutdown all components
	if err := sm.securityAuditor.Flush(); err != nil {
		return fmt.Errorf("failed to flush audit logs: %w", err)
	}
	
	sm.initialized = false
	return nil
}

// autoRotateKeys performs automatic key rotation
func (sm *SecurityManager) autoRotateKeys(ctx context.Context) {
	ticker := time.NewTicker(sm.config.KeyRotationInterval)
	defer ticker.Stop()
	
	for {
		select {
		case <-ctx.Done():
			return
		case <-sm.shutdownCh:
			return
		case <-ticker.C:
			if err := sm.apiKeyManager.RotateKeys(); err != nil {
				// Log error but continue
				continue
			}
			sm.metrics.KeysRotated++
		}
	}
}

// securityMonitor monitors for security threats
func (sm *SecurityManager) securityMonitor(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-ctx.Done():
			return
		case <-sm.shutdownCh:
			return
		case <-ticker.C:
			// Check for suspicious activities
			sm.checkSuspiciousActivities()
		}
	}
}

func (sm *SecurityManager) checkSuspiciousActivities() {
	// Implementation for detecting suspicious activities
	// This would check rate limit violations, failed authentications, etc.
}

// DefaultSecurityConfig returns default security configuration
func DefaultSecurityConfig() *SecurityConfig {
	return &SecurityConfig{
		APIKeyRotation:      true,
		KeyRotationInterval: 24 * time.Hour,
		MultiSigEnabled:     false,
		RequestSigning:      true,
		RateLimit: &RateLimitConfig{
			RequestsPerWindow: 100,
			WindowDuration:    time.Minute,
			MaxQueueSize:      50,
		},
		AuditLogging:    true,
		OWASPCompliance: true,
		InputValidation: "strict",
		Debug:           false,
	}
}