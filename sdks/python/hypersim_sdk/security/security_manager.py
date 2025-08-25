"""
Central security manager for Python SDK
"""

import asyncio
import time
from typing import Any, Dict, Optional

from .api_key_manager import APIKeyManager
from .multi_signature import MultiSignature
from .request_signer import RequestSigner
from .rate_limiter import RateLimiter
from .secure_storage import SecureStorage
from .security_auditor import SecurityAuditor
from .owasp_validator import OWASPValidator
from .secure_websocket import SecureWebSocket
from .input_sanitizer import InputSanitizer
from .types import (
    SecurityConfig, SecurityEvent, SecurityMetrics, 
    SecurityEventType, Severity
)


class SecurityManager:
    """Central security manager that orchestrates all security features"""
    
    def __init__(self, config: Optional[SecurityConfig] = None):
        self.config = config or SecurityConfig()
        
        # Initialize metrics
        self.metrics = SecurityMetrics()
        
        # Initialize storage
        self.secure_storage = SecureStorage()
        
        # Initialize security components
        self.api_key_manager = APIKeyManager(
            self.secure_storage,
            rotation_enabled=self.config.api_key_rotation,
            rotation_interval=self.config.key_rotation_interval
        )
        
        self.multi_sig = MultiSignature(self.secure_storage)
        self.request_signer = RequestSigner(self.secure_storage)
        self.rate_limiter = RateLimiter(self.config.rate_limit)
        self.auditor = SecurityAuditor(self.config.audit_logging)
        self.owasp_validator = OWASPValidator(self.config.owasp_compliance)
        self.input_sanitizer = InputSanitizer(self.config.input_validation)
        
        # Setup event listeners
        self._setup_event_listeners()
        
        # Start key rotation if enabled
        if self.config.api_key_rotation:
            asyncio.create_task(self._start_key_rotation())
    
    async def secure_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Process and secure an outgoing request"""
        try:
            self.metrics.total_requests += 1
            
            # 1. Rate limiting check
            if not await self.rate_limiter.check_limit(request):
                self.metrics.rate_limit_violations += 1
                self.metrics.blocked_requests += 1
                await self._log_security_event(
                    SecurityEventType.RATE_LIMIT_EXCEEDED,
                    Severity.MEDIUM,
                    'Rate limit exceeded for request'
                )
                raise Exception('Rate limit exceeded')
            
            # 2. Input validation and sanitization
            sanitized_request = await self.input_sanitizer.sanitize(request)
            
            # 3. OWASP compliance check
            if self.config.owasp_compliance:
                violations = await self.owasp_validator.validate(sanitized_request)
                if violations:
                    self.metrics.owasp_violations += len(violations)
                    await self._log_security_event(
                        SecurityEventType.OWASP_VIOLATION,
                        Severity.HIGH,
                        f'OWASP violations detected: {[v.category for v in violations]}',
                        {'violations': violations}
                    )
            
            # 4. Request signing
            final_request = sanitized_request
            if self.config.request_signing:
                final_request = await self.request_signer.sign_request(sanitized_request)
            
            # 5. Add API key
            api_key = await self.api_key_manager.get_current_key()
            final_request.setdefault('headers', {})
            final_request['headers']['Authorization'] = f'Bearer {api_key.primary}'
            final_request['headers']['X-API-Key-Rotation'] = str(api_key.rotation_count)
            
            return final_request
            
        except Exception as error:
            self.metrics.blocked_requests += 1
            raise error
    
    async def verify_response(self, response: Any, original_request: Any) -> bool:
        """Verify an incoming response"""
        try:
            # Verify response signature if request was signed
            if (self.config.request_signing and 
                hasattr(original_request, 'signature')):
                
                is_valid = await self.request_signer.verify_response(
                    response, original_request
                )
                if not is_valid:
                    self.metrics.failed_signatures += 1
                    await self._log_security_event(
                        SecurityEventType.FAILED_SIGNATURE,
                        Severity.HIGH,
                        'Response signature verification failed'
                    )
                    return False
            
            return True
            
        except Exception as error:
            await self._log_security_event(
                SecurityEventType.FAILED_SIGNATURE,
                Severity.HIGH,
                f'Response verification error: {str(error)}'
            )
            return False
    
    def create_secure_websocket(self, url: str, options: Optional[Dict] = None) -> SecureWebSocket:
        """Create secure WebSocket connection"""
        ws_options = options or {}
        ws_options.update({
            'certificate_pins': self.config.certificate_pinning,
            'auditor': self.auditor
        })
        return SecureWebSocket(url, ws_options)
    
    def get_metrics(self) -> SecurityMetrics:
        """Get security metrics"""
        return self.metrics
    
    def get_api_key_manager(self) -> APIKeyManager:
        """Get API key manager"""
        return self.api_key_manager
    
    def get_multi_signature(self) -> MultiSignature:
        """Get multi-signature handler"""
        return self.multi_sig
    
    async def shutdown(self):
        """Shutdown security manager"""
        await self.auditor.flush()
    
    def _setup_event_listeners(self):
        """Setup event listeners for security components"""
        # This would be implemented with proper event handling
        pass
    
    async def _start_key_rotation(self):
        """Start periodic key rotation"""
        while True:
            await asyncio.sleep(self.config.key_rotation_interval / 1000)
            try:
                await self.api_key_manager.rotate_keys()
            except Exception as error:
                await self._log_security_event(
                    SecurityEventType.API_KEY_ROTATION,
                    Severity.HIGH,
                    f'API key rotation failed: {str(error)}'
                )
    
    async def _log_security_event(
        self, 
        event_type: SecurityEventType,
        severity: Severity,
        description: str,
        metadata: Optional[Dict] = None
    ):
        """Log security event"""
        event = SecurityEvent(
            event_type=event_type,
            severity=severity,
            timestamp=int(time.time() * 1000),
            description=description,
            metadata=metadata
        )
        await self.auditor.log(event)
