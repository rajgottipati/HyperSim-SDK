"""
Security audit logging for Python SDK
"""

import asyncio
import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from .types import SecurityEvent, SecurityEventType


class SecurityAuditor:
    """Security audit logging and monitoring"""
    
    def __init__(
        self,
        enabled: bool,
        log_directory: Optional[str] = None,
        max_log_size: int = 10 * 1024 * 1024,  # 10MB
        rotate_daily: bool = True,
        enable_remote_logging: bool = False,
        remote_endpoint: Optional[str] = None,
        buffer_size: int = 100,
        flush_interval: int = 30
    ):
        self.enabled = enabled
        self.log_directory = log_directory or os.path.join(
            os.path.expanduser('~'), '.hypersim-audit'
        )
        self.max_log_size = max_log_size
        self.rotate_daily = rotate_daily
        self.enable_remote_logging = enable_remote_logging
        self.remote_endpoint = remote_endpoint
        self.buffer_size = buffer_size
        self.flush_interval = flush_interval
        
        self.event_buffer: List[SecurityEvent] = []
        self.current_log_file: Optional[str] = None
        
        if enabled:
            asyncio.create_task(self._initialize())
    
    async def log(self, event: SecurityEvent):
        """Log security event"""
        if not self.enabled:
            return
        
        # Add to buffer
        self.event_buffer.append(event)
        
        # Flush if buffer is full or event is critical
        if (len(self.event_buffer) >= self.buffer_size or 
            event.severity.value == 'critical'):
            await self.flush()
    
    async def log_auth(self, success: bool, user_id: Optional[str] = None, 
                      ip: Optional[str] = None, user_agent: Optional[str] = None):
        """Log authentication event"""
        event = SecurityEvent(
            event_type=SecurityEventType.UNAUTHORIZED_ACCESS,
            severity='low' if success else 'medium',
            timestamp=int(time.time() * 1000),
            description='Successful authentication' if success else 'Failed authentication attempt',
            metadata={
                'user_id': user_id,
                'ip': ip,
                'user_agent': user_agent,
                'success': success
            }
        )
        await self.log(event)
    
    async def log_api_usage(self, endpoint: str, method: str, status_code: int, 
                           response_time: float, user_id: Optional[str] = None):
        """Log API usage"""
        severity = 'medium' if status_code >= 400 else 'low'
        
        event = SecurityEvent(
            event_type=SecurityEventType.UNAUTHORIZED_ACCESS,
            severity=severity,
            timestamp=int(time.time() * 1000),
            description=f'API {method} {endpoint} - {status_code}',
            metadata={
                'endpoint': endpoint,
                'method': method,
                'status_code': status_code,
                'response_time': response_time,
                'user_id': user_id
            }
        )
        await self.log(event)
    
    async def log_data_access(self, resource: str, action: str, 
                             user_id: Optional[str] = None, success: bool = True):
        """Log data access"""
        event = SecurityEvent(
            event_type=SecurityEventType.UNAUTHORIZED_ACCESS,
            severity='low' if success else 'high',
            timestamp=int(time.time() * 1000),
            description=f'Data {action} on {resource}',
            metadata={
                'resource': resource,
                'action': action,
                'user_id': user_id,
                'success': success
            }
        )
        await self.log(event)
    
    async def flush(self):
        """Flush buffered events to storage"""
        if not self.event_buffer:
            return
        
        events = self.event_buffer.copy()
        self.event_buffer.clear()
        
        try:
            # Write to file
            await self._write_to_file(events)
            
            # Send to remote endpoint if enabled
            if self.enable_remote_logging and self.remote_endpoint:
                await self._send_to_remote(events)
        
        except Exception as error:
            # Add events back to buffer if write failed
            self.event_buffer.extend(events)
            print(f'Failed to flush audit logs: {error}')
    
    async def query_logs(self, filter_params: Dict) -> List[SecurityEvent]:
        """Query audit logs with filtering"""
        # In production: implement proper log querying
        return []
    
    async def get_stats(self, time_range: Dict) -> Dict:
        """Get security statistics"""
        # In production: implement statistics calculation
        return {
            'total_events': 0,
            'events_by_severity': {},
            'events_by_type': {},
            'top_ips': [],
            'top_users': []
        }
    
    async def archive_logs(self, older_than_days: int):
        """Archive old logs"""
        # In production: implement log archival
        pass
    
    async def shutdown(self):
        """Shutdown auditor"""
        await self.flush()
    
    async def _initialize(self):
        """Initialize audit logging"""
        if not self.enabled:
            return
        
        # Create log directory
        try:
            Path(self.log_directory).mkdir(parents=True, exist_ok=True, mode=0o700)
        except Exception as error:
            print(f'Failed to create audit log directory: {error}')
        
        # Set up periodic flushing
        asyncio.create_task(self._periodic_flush())
        
        self.current_log_file = self._get_current_log_file()
    
    async def _write_to_file(self, events: List[SecurityEvent]):
        """Write events to log file"""
        if not self.current_log_file:
            self.current_log_file = self._get_current_log_file()
        
        log_entries = []
        for event in events:
            log_entries.append(json.dumps({
                'type': event.event_type.value,
                'severity': event.severity.value,
                'timestamp': event.timestamp,
                'description': event.description,
                'metadata': event.metadata
            }))
        
        try:
            with open(self.current_log_file, 'a', encoding='utf-8') as f:
                f.write('\n'.join(log_entries) + '\n')
            
            # Check file size for rotation
            if os.path.getsize(self.current_log_file) > self.max_log_size:
                await self._rotate_log()
        
        except Exception as error:
            print(f'Failed to write audit log: {error}')
            raise
    
    async def _send_to_remote(self, events: List[SecurityEvent]):
        """Send events to remote endpoint"""
        # In production: implement remote logging with proper error handling
        pass
    
    async def _periodic_flush(self):
        """Periodic flush task"""
        while True:
            await asyncio.sleep(self.flush_interval)
            await self.flush()
    
    def _get_current_log_file(self) -> str:
        """Get current log file path"""
        today = datetime.now().strftime('%Y-%m-%d')
        return os.path.join(self.log_directory, f'security-audit-{today}.log')
    
    async def _rotate_log(self):
        """Rotate log file"""
        timestamp = datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
        rotated_file = self.current_log_file.replace('.log', f'-{timestamp}.log')
        
        try:
            os.rename(self.current_log_file, rotated_file)
            self.current_log_file = self._get_current_log_file()
        except Exception as error:
            print(f'Failed to rotate log file: {error}')
