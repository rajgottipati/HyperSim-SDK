"""
OWASP compliance validator for Python SDK
"""

import json
import re
import urllib.parse
from typing import Any, Dict, List

from .types import OWASPViolation


class OWASPValidator:
    """OWASP compliance checking and vulnerability scanning"""
    
    def __init__(self, enabled: bool):
        self.enabled = enabled
        self.checks = self._initialize_checks() if enabled else []
    
    async def validate(self, data: Any) -> List[OWASPViolation]:
        """Validate data against OWASP guidelines"""
        if not self.enabled:
            return []
        
        violations = []
        
        for check in self.checks:
            try:
                violation = await check['func'](data)
                if violation:
                    violations.append(violation)
            except Exception as error:
                print(f'OWASP check failed: {check["name"]}: {error}')
        
        return violations
    
    def get_available_checks(self) -> List[Dict[str, str]]:
        """Get all available OWASP checks"""
        return [{
            'category': check['category'],
            'name': check['name']
        } for check in self.checks]
    
    def _initialize_checks(self) -> List[Dict]:
        """Initialize OWASP compliance checks"""
        return [
            {
                'category': 'A01:2021',
                'name': 'Broken Access Control',
                'func': self._check_broken_access_control
            },
            {
                'category': 'A02:2021',
                'name': 'Cryptographic Failures',
                'func': self._check_cryptographic_failures
            },
            {
                'category': 'A03:2021',
                'name': 'Injection Attacks',
                'func': self._check_injection_attacks
            },
            {
                'category': 'A04:2021',
                'name': 'Insecure Design',
                'func': self._check_insecure_design
            },
            {
                'category': 'A05:2021',
                'name': 'Security Misconfiguration',
                'func': self._check_security_misconfiguration
            },
            {
                'category': 'A06:2021',
                'name': 'Vulnerable Components',
                'func': self._check_vulnerable_components
            },
            {
                'category': 'A07:2021',
                'name': 'Authentication Failures',
                'func': self._check_authentication_failures
            },
            {
                'category': 'A08:2021',
                'name': 'Integrity Failures',
                'func': self._check_integrity_failures
            },
            {
                'category': 'A09:2021',
                'name': 'Logging Failures',
                'func': self._check_logging_failures
            },
            {
                'category': 'A10:2021',
                'name': 'SSRF',
                'func': self._check_ssrf
            }
        ]
    
    async def _check_broken_access_control(self, data: Any) -> OWASPViolation:
        """Check for broken access control issues"""
        if isinstance(data, dict) and 'user_id' in data:
            user_id = str(data['user_id'])
            if re.match(r'^\d+$', user_id):
                return OWASPViolation(
                    category='A01:2021',
                    severity='warning',
                    description='Sequential user ID detected - potential IDOR vulnerability',
                    mitigation=[
                        'Use UUIDs instead of sequential IDs',
                        'Implement proper authorization checks'
                    ]
                )
        return None
    
    async def _check_cryptographic_failures(self, data: Any) -> OWASPViolation:
        """Check for cryptographic failures"""
        if isinstance(data, dict) and 'encryption' in data:
            encryption = str(data['encryption']).lower()
            weak_algorithms = ['md5', 'sha1', 'des', 'rc4']
            if any(alg in encryption for alg in weak_algorithms):
                return OWASPViolation(
                    category='A02:2021',
                    severity='critical',
                    description='Weak cryptographic algorithm detected',
                    mitigation=[
                        'Use SHA-256 or stronger',
                        'Use AES-256 for encryption',
                        'Avoid deprecated algorithms'
                    ]
                )
        return None
    
    async def _check_injection_attacks(self, data: Any) -> OWASPViolation:
        """Check for injection attack patterns"""
        check_string = json.dumps(data) if not isinstance(data, str) else data
        
        # SQL injection patterns
        sql_patterns = [
            r"('|(\-\-)|(;)|(\|)|(\*)|(%))",
            r"(union|select|insert|delete|update|drop|create|alter|exec|execute)\s"
        ]
        
        for pattern in sql_patterns:
            if re.search(pattern, check_string, re.IGNORECASE):
                return OWASPViolation(
                    category='A03:2021',
                    severity='critical',
                    description='Potential SQL injection detected',
                    mitigation=[
                        'Use parameterized queries',
                        'Sanitize all user input',
                        'Use ORM frameworks'
                    ]
                )
        
        # XSS patterns
        xss_patterns = [
            r'<script[^>]*>.*?</script>',
            r'javascript:',
            r'on\w+\s*='
        ]
        
        for pattern in xss_patterns:
            if re.search(pattern, check_string, re.IGNORECASE):
                return OWASPViolation(
                    category='A03:2021',
                    severity='high',
                    description='Potential XSS attack detected',
                    mitigation=[
                        'HTML encode output',
                        'Use Content Security Policy',
                        'Validate and sanitize input'
                    ]
                )
        
        return None
    
    async def _check_insecure_design(self, data: Any) -> OWASPViolation:
        """Check for insecure design issues"""
        if isinstance(data, dict):
            sensitive_keys = ['password', 'secret', 'token', 'key']
            if any(key in data for key in sensitive_keys):
                return OWASPViolation(
                    category='A04:2021',
                    severity='high',
                    description='Sensitive data detected in request',
                    mitigation=[
                        'Remove sensitive data from logs',
                        'Use secure transport',
                        'Hash sensitive values'
                    ]
                )
        return None
    
    async def _check_security_misconfiguration(self, data: Any) -> OWASPViolation:
        """Check for security misconfigurations"""
        if isinstance(data, dict):
            if data.get('debug') is True or 'stack_trace' in data:
                return OWASPViolation(
                    category='A05:2021',
                    severity='warning',
                    description='Debug information exposed',
                    mitigation=[
                        'Disable debug mode in production',
                        'Remove stack traces from responses'
                    ]
                )
        return None
    
    async def _check_vulnerable_components(self, data: Any) -> OWASPViolation:
        """Check for vulnerable components"""
        if isinstance(data, dict) and 'version' in data:
            version = str(data['version'])
            if version.startswith(('1.', '0.')):
                return OWASPViolation(
                    category='A06:2021',
                    severity='warning',
                    description='Potentially outdated component version detected',
                    mitigation=[
                        'Update to latest stable version',
                        'Regularly audit dependencies'
                    ]
                )
        return None
    
    async def _check_authentication_failures(self, data: Any) -> OWASPViolation:
        """Check for authentication failures"""
        if isinstance(data, dict) and 'session_token' in data:
            session_token = str(data['session_token'])
            if len(session_token) < 32:
                return OWASPViolation(
                    category='A07:2021',
                    severity='high',
                    description='Weak session token detected',
                    mitigation=[
                        'Use cryptographically strong tokens',
                        'Implement proper session management'
                    ]
                )
        return None
    
    async def _check_integrity_failures(self, data: Any) -> OWASPViolation:
        """Check for integrity failures"""
        if isinstance(data, dict):
            if ('file_url' in data and 
                'checksum' not in data and 
                'signature' not in data):
                return OWASPViolation(
                    category='A08:2021',
                    severity='warning',
                    description='File transfer without integrity verification',
                    mitigation=[
                        'Use checksums or digital signatures',
                        'Verify file integrity'
                    ]
                )
        return None
    
    async def _check_logging_failures(self, data: Any) -> OWASPViolation:
        """Check for logging failures"""
        if isinstance(data, dict):
            action = data.get('action')
            if (action in ['login', 'delete', 'admin'] and 
                not data.get('logged')):
                return OWASPViolation(
                    category='A09:2021',
                    severity='warning',
                    description='Security-relevant action without logging',
                    mitigation=[
                        'Implement comprehensive audit logging',
                        'Monitor security events'
                    ]
                )
        return None
    
    async def _check_ssrf(self, data: Any) -> OWASPViolation:
        """Check for SSRF vulnerabilities"""
        urls = self._extract_urls(data)
        for url in urls:
            try:
                parsed_url = urllib.parse.urlparse(url)
                hostname = parsed_url.hostname
                
                if hostname:
                    # Check for localhost/private IPs
                    if (hostname.lower() in ['localhost', '127.0.0.1', '0.0.0.0'] or
                        hostname.startswith('192.168.') or
                        hostname.startswith('10.') or
                        hostname.startswith('172.')):
                        return OWASPViolation(
                            category='A10:2021',
                            severity='high',
                            description='Potential SSRF - request to private network',
                            mitigation=[
                                'Validate and whitelist allowed URLs',
                                'Use URL filtering'
                            ]
                        )
            except:
                continue
        
        return None
    
    def _extract_urls(self, data: Any) -> List[str]:
        """Extract URLs from data"""
        urls = []
        url_pattern = re.compile(r'https?://[^\s]+')
        
        def search_object(obj):
            if isinstance(obj, str):
                matches = url_pattern.findall(obj)
                urls.extend(matches)
            elif isinstance(obj, dict):
                for value in obj.values():
                    search_object(value)
            elif isinstance(obj, list):
                for item in obj:
                    search_object(item)
        
        search_object(data)
        return urls
