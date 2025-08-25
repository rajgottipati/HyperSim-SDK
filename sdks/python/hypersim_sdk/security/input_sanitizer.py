"""
Input validation and sanitization for Python SDK
"""

import re
import html
import urllib.parse
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass


@dataclass
class SanitizationRules:
    """Sanitization rules for input validation"""
    max_length: Optional[int] = None
    allowed_characters: Optional[str] = None  # Regex pattern
    blocked_patterns: Optional[List[str]] = None
    html_encode: bool = False
    sql_escape: bool = False
    remove_null_bytes: bool = True
    trim_whitespace: bool = True


class InputSanitizer:
    """Input validation and sanitization to prevent injection attacks"""
    
    def __init__(self, validation_level: str = 'strict'):
        self.validation_level = validation_level
        self.default_rules = self._initialize_default_rules()
    
    async def sanitize(
        self, 
        data: Any, 
        custom_rules: Optional[Dict[str, SanitizationRules]] = None
    ) -> Any:
        """Sanitize input data based on validation level"""
        rules = {**self.default_rules, **(custom_rules or {})}
        return self._sanitize_value(data, rules, 'root')
    
    def sanitize_field(
        self, 
        value: Any, 
        field_name: str, 
        rules: Optional[SanitizationRules] = None
    ) -> Any:
        """Validate and sanitize a specific field"""
        field_rules = rules or self._get_field_rules(field_name)
        return self._apply_sanitization_rules(value, field_rules)
    
    def detect_threats(self, input_str: str) -> List[Dict[str, str]]:
        """Check if input contains potentially malicious patterns"""
        threats = []
        
        patterns = {
            'sqlInjection': {
                'patterns': [
                    r"('|(\-\-)|(;)|(\|)|(\*)|(%))",
                    r"(union|select|insert|delete|update|drop|create|alter|exec|execute)\s",
                    r"(or|and)\s+\d+\s*=\s*\d+"
                ],
                'severity': 'critical'
            },
            'xss': {
                'patterns': [
                    r"<script[^>]*>.*?</script>",
                    r"javascript:",
                    r"on\w+\s*=",
                    r"<iframe[^>]*>.*?</iframe>",
                    r"eval\s*\("
                ],
                'severity': 'high'
            },
            'commandInjection': {
                'patterns': [
                    r"[;&|`$\(\)]",
                    r"(bash|sh|cmd|powershell)\s",
                    r"\.\.[/\\]"
                ],
                'severity': 'critical'
            },
            'pathTraversal': {
                'patterns': [
                    r"\.\.[/\\]",
                    r"/(etc|proc|sys|dev)/",
                    r"\\(windows|system32)\\"
                ],
                'severity': 'high'
            }
        }
        
        for threat_type, config in patterns.items():
            for pattern in config['patterns']:
                if re.search(pattern, input_str, re.IGNORECASE):
                    threats.append({
                        'type': threat_type,
                        'pattern': pattern,
                        'severity': config['severity']
                    })
        
        return threats
    
    def html_encode(self, input_str: str) -> str:
        """HTML encode string to prevent XSS"""
        return html.escape(input_str, quote=True)
    
    def sql_escape(self, input_str: str) -> str:
        """SQL escape string to prevent SQL injection"""
        return input_str.replace("'", "''")
    
    def remove_dangerous_patterns(self, input_str: str) -> str:
        """Remove dangerous characters and patterns"""
        sanitized = input_str
        
        # Remove null bytes
        sanitized = sanitized.replace('\x00', '')
        
        # Remove common injection patterns
        sanitized = re.sub(r'<script[^>]*>.*?</script>', '', sanitized, flags=re.IGNORECASE | re.DOTALL)
        sanitized = re.sub(r'javascript:', '', sanitized, flags=re.IGNORECASE)
        sanitized = re.sub(r'on\w+\s*=', '', sanitized, flags=re.IGNORECASE)
        
        # Remove SQL injection patterns in strict mode
        if self.validation_level == 'strict':
            sanitized = re.sub(
                r'(union|select|insert|delete|update|drop|create|alter|exec|execute)\s',
                '', sanitized, flags=re.IGNORECASE
            )
            sanitized = re.sub(r"('|(\-\-)|(;)|(\|)|(\*)|(%))", '', sanitized)
        
        return sanitized
    
    def validate_email(self, email: str) -> bool:
        """Validate email address format"""
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(email_regex, email)) and len(email) <= 254
    
    def validate_url(self, url: str) -> Dict[str, Union[bool, List[str]]]:
        """Validate URL format and safety"""
        issues = []
        is_valid = False
        is_safe = True
        
        try:
            parsed = urllib.parse.urlparse(url)
            is_valid = bool(parsed.scheme and parsed.netloc)
            
            # Check protocol
            if parsed.scheme not in ['http', 'https']:
                issues.append('Unsafe protocol')
                is_safe = False
            
            # Check for private/local addresses
            hostname = parsed.hostname.lower() if parsed.hostname else ''
            if (hostname in ['localhost', '127.0.0.1', '0.0.0.0'] or
                hostname.startswith('192.168.') or
                hostname.startswith('10.') or
                re.match(r'^172\.(1[6-9]|2[0-9]|3[01])\.', hostname)):
                issues.append('Private/internal network address')
                is_safe = False
            
            # Check for suspicious patterns
            if 'javascript:' in url.lower() or 'data:' in url.lower():
                issues.append('Potentially dangerous URL scheme')
                is_safe = False
        
        except Exception:
            issues.append('Invalid URL format')
        
        return {
            'is_valid': is_valid,
            'is_safe': is_safe,
            'issues': issues
        }
    
    def _sanitize_value(self, value: Any, rules: Dict[str, SanitizationRules], path: str) -> Any:
        """Recursively sanitize values"""
        if value is None:
            return value
        
        if isinstance(value, str):
            return self._apply_sanitization_rules(value, self._get_field_rules(path, rules))
        
        if isinstance(value, (int, float, bool)):
            return value
        
        if isinstance(value, list):
            return [self._sanitize_value(item, rules, f'{path}[{i}]') 
                   for i, item in enumerate(value)]
        
        if isinstance(value, dict):
            sanitized = {}
            for key, val in value.items():
                # Skip dangerous keys
                if key in ['__proto__', 'constructor', 'prototype']:
                    continue
                
                sanitized_key = self.sanitize_field(key, 'objectKey')
                sanitized[sanitized_key] = self._sanitize_value(val, rules, f'{path}.{key}')
            
            return sanitized
        
        return value
    
    def _apply_sanitization_rules(self, value: str, rules: SanitizationRules) -> str:
        """Apply sanitization rules to a string value"""
        sanitized = value
        
        # Trim whitespace
        if rules.trim_whitespace:
            sanitized = sanitized.strip()
        
        # Remove null bytes
        if rules.remove_null_bytes:
            sanitized = sanitized.replace('\x00', '')
        
        # Check length limit
        if rules.max_length and len(sanitized) > rules.max_length:
            sanitized = sanitized[:rules.max_length]
        
        # Apply character filtering
        if rules.allowed_characters:
            matches = re.findall(rules.allowed_characters, sanitized)
            sanitized = ''.join(matches)
        
        # Remove blocked patterns
        if rules.blocked_patterns:
            for pattern in rules.blocked_patterns:
                sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
        
        # HTML encode
        if rules.html_encode:
            sanitized = self.html_encode(sanitized)
        
        # SQL escape
        if rules.sql_escape:
            sanitized = self.sql_escape(sanitized)
        
        return sanitized
    
    def _get_field_rules(self, field_name: str, custom_rules: Optional[Dict] = None) -> SanitizationRules:
        """Get sanitization rules for a field"""
        if custom_rules and field_name in custom_rules:
            return custom_rules[field_name]
        
        return self.default_rules.get(field_name, self.default_rules['default'])
    
    def _initialize_default_rules(self) -> Dict[str, SanitizationRules]:
        """Initialize default sanitization rules"""
        base_rules = SanitizationRules(
            remove_null_bytes=True,
            trim_whitespace=True
        )
        
        strict_rules = SanitizationRules(
            remove_null_bytes=True,
            trim_whitespace=True,
            blocked_patterns=[
                r'<script[^>]*>.*?</script>',
                r'javascript:',
                r'on\w+\s*=',
                r'(union|select|insert|delete|update|drop|create|alter|exec|execute)\s'
            ]
        )
        
        return {
            'default': strict_rules if self.validation_level == 'strict' else base_rules,
            'email': SanitizationRules(
                max_length=254,
                allowed_characters=r'[a-zA-Z0-9._%+-@]',
                remove_null_bytes=True,
                trim_whitespace=True
            ),
            'username': SanitizationRules(
                max_length=50,
                allowed_characters=r'[a-zA-Z0-9_-]',
                remove_null_bytes=True,
                trim_whitespace=True
            ),
            'password': SanitizationRules(
                max_length=128,
                remove_null_bytes=True,
                trim_whitespace=False  # Preserve whitespace in passwords
            ),
            'url': SanitizationRules(
                max_length=2048,
                blocked_patterns=[
                    r'javascript:',
                    r'data:',
                    r'vbscript:'
                ],
                remove_null_bytes=True,
                trim_whitespace=True
            ),
            'objectKey': SanitizationRules(
                max_length=100,
                allowed_characters=r'[a-zA-Z0-9_]',
                remove_null_bytes=True,
                trim_whitespace=True
            )
        }
