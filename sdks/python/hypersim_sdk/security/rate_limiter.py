"""
Rate limiting with DDoS protection for Python SDK
"""

import asyncio
import time
from typing import Any, Dict, List
from .types import RateLimitConfig


class RateLimiter:
    """Rate limiting with DDoS protection"""
    
    def __init__(self, config: RateLimitConfig):
        self.config = config
        self.limits: Dict[str, Dict] = {}
        self.ddos_metrics = {
            'requests_per_second': 0,
            'unique_ips': set(),
            'suspicious_patterns': 0,
            'blocked_requests': 0
        }
        
        # Start cleanup and monitoring tasks
        asyncio.create_task(self._cleanup_task())
        if config.ddos_protection:
            asyncio.create_task(self._monitor_ddos())
    
    async def check_limit(self, request: Dict[str, Any]) -> bool:
        """Check if request is within rate limit"""
        identifier = self._get_identifier(request)
        now = int(time.time() * 1000)
        
        # Check for DDoS patterns
        if self.config.ddos_protection and self._is_ddos_request(request, identifier):
            self.ddos_metrics['blocked_requests'] += 1
            return False
        
        if identifier not in self.limits:
            self.limits[identifier] = {
                'count': 0,
                'window': now,
                'queue': [],
                'suspicious_activity': 0,
                'last_request': 0
            }
        
        entry = self.limits[identifier]
        
        # Reset window if expired
        if now - entry['window'] >= self.config.window_ms:
            entry['count'] = 0
            entry['window'] = now
            entry['suspicious_activity'] = 0
        
        # Check for suspicious patterns
        time_since_last = now - entry['last_request']
        if time_since_last < 100:  # Less than 100ms between requests
            entry['suspicious_activity'] += 1
            if entry['suspicious_activity'] > 10:
                return False
        
        entry['last_request'] = now
        
        # Check rate limit
        if entry['count'] >= self.config.requests_per_window:
            if (self.config.max_queue_size > 0 and 
                len(entry['queue']) < self.config.max_queue_size):
                # Queue the request
                future = asyncio.get_event_loop().create_future()
                entry['queue'].append({
                    'request': request,
                    'future': future,
                    'timestamp': now
                })
                return await future
            return False
        
        entry['count'] += 1
        self._update_ddos_metrics(request, identifier)
        return True
    
    def get_status(self, identifier: str) -> Dict:
        """Get current rate limit status for identifier"""
        entry = self.limits.get(identifier)
        
        if not entry:
            return {
                'count': 0,
                'limit': self.config.requests_per_window,
                'remaining': self.config.requests_per_window,
                'reset_time': int(time.time() * 1000) + self.config.window_ms,
                'queue_length': 0
            }
        
        remaining = max(0, self.config.requests_per_window - entry['count'])
        reset_time = entry['window'] + self.config.window_ms
        
        return {
            'count': entry['count'],
            'limit': self.config.requests_per_window,
            'remaining': remaining,
            'reset_time': reset_time,
            'queue_length': len(entry['queue'])
        }
    
    def get_ddos_metrics(self) -> Dict:
        """Get DDoS metrics"""
        return {
            'requests_per_second': self.ddos_metrics['requests_per_second'],
            'unique_ips': len(self.ddos_metrics['unique_ips']),
            'suspicious_patterns': self.ddos_metrics['suspicious_patterns'],
            'blocked_requests': self.ddos_metrics['blocked_requests']
        }
    
    def reset(self, identifier: str):
        """Reset rate limit for identifier"""
        self.limits.pop(identifier, None)
    
    def reset_all(self):
        """Reset all rate limits"""
        self.limits.clear()
        self.ddos_metrics = {
            'requests_per_second': 0,
            'unique_ips': set(),
            'suspicious_patterns': 0,
            'blocked_requests': 0
        }
    
    def _get_identifier(self, request: Dict[str, Any]) -> str:
        """Get request identifier for rate limiting"""
        return (request.get('ip') or 
                request.get('client_id') or 
                request.get('headers', {}).get('x-forwarded-for') or 
                'default')
    
    def _is_ddos_request(self, request: Dict[str, Any], identifier: str) -> bool:
        """Check if request shows DDoS patterns"""
        now = int(time.time() * 1000)
        entry = self.limits.get(identifier)
        
        # Check if requests are coming too fast
        if entry and (now - entry['last_request']) < 10:
            return True
        
        # Check overall system load
        if self.ddos_metrics['requests_per_second'] > self.config.ddos_threshold:
            return True
        
        # Check for suspicious user agents
        user_agent = request.get('headers', {}).get('user-agent', '')
        if not user_agent or len(user_agent) < 10:
            self.ddos_metrics['suspicious_patterns'] += 1
            return self.ddos_metrics['suspicious_patterns'] > 50
        
        return False
    
    def _update_ddos_metrics(self, request: Dict[str, Any], identifier: str):
        """Update DDoS monitoring metrics"""
        self.ddos_metrics['requests_per_second'] += 1
        
        ip = self._extract_ip(request)
        if ip:
            self.ddos_metrics['unique_ips'].add(ip)
    
    def _extract_ip(self, request: Dict[str, Any]) -> str:
        """Extract IP address from request"""
        return (request.get('ip') or
                request.get('headers', {}).get('x-forwarded-for', '').split(',')[0] or
                request.get('headers', {}).get('x-real-ip') or
                None)
    
    async def _cleanup_task(self):
        """Periodic cleanup of old entries"""
        while True:
            await asyncio.sleep(60)  # Run every minute
            now = int(time.time() * 1000)
            expired_threshold = now - (self.config.window_ms * 2)
            
            expired_keys = [
                key for key, entry in self.limits.items()
                if entry['window'] < expired_threshold and not entry['queue']
            ]
            
            for key in expired_keys:
                del self.limits[key]
    
    async def _monitor_ddos(self):
        """Monitor for DDoS attacks"""
        while True:
            await asyncio.sleep(1)  # Check every second
            
            # Reset per-second counter
            self.ddos_metrics['requests_per_second'] = 0
            
            # Clear old IPs (keep only last minute)
            if len(self.ddos_metrics['unique_ips']) > 1000:
                self.ddos_metrics['unique_ips'].clear()
