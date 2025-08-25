"""
API Key Management with automatic rotation for Python SDK
"""

import asyncio
import secrets
import time
from typing import Optional, List

from .secure_storage import SecureStorage
from .types import APIKeyData


class APIKeyManager:
    """API Key Management with automatic rotation and fallback support"""
    
    def __init__(
        self,
        storage: SecureStorage,
        rotation_enabled: bool = True,
        rotation_interval: int = 24 * 60 * 60 * 1000,  # 24 hours
        max_fallback_keys: int = 3,
        key_length: int = 32
    ):
        self.storage = storage
        self.rotation_enabled = rotation_enabled
        self.rotation_interval = rotation_interval
        self.max_fallback_keys = max_fallback_keys
        self.key_length = key_length
        self.current_keys: Optional[APIKeyData] = None
    
    async def initialize(self, initial_keys: Optional[dict] = None):
        """Initialize API key management"""
        if initial_keys:
            # Use provided keys
            self.current_keys = APIKeyData(
                primary=initial_keys['primary'],
                fallbacks=initial_keys.get('fallbacks', []),
                created_at=int(time.time() * 1000),
                expires_at=int(time.time() * 1000) + self.rotation_interval,
                rotation_count=0
            )
            await self.storage.store('api_keys', self.current_keys)
        else:
            # Try to load existing keys
            try:
                self.current_keys = await self.storage.retrieve('api_keys')
            except:
                # Generate new keys if none exist
                await self._generate_new_keys()
        
        # Validate keys are not expired
        if (self.current_keys and 
            self.current_keys.expires_at < int(time.time() * 1000)):
            await self.rotate_keys()
    
    async def get_current_key(self) -> APIKeyData:
        """Get current API keys"""
        if not self.current_keys:
            await self.initialize()
        
        # Check if rotation is needed
        if self.current_keys.expires_at < int(time.time() * 1000):
            await self.rotate_keys()
        
        return self.current_keys
    
    async def rotate_keys(self):
        """Rotate API keys"""
        if not self.rotation_enabled:
            raise Exception('API key rotation is disabled')
        
        old_keys = self.current_keys
        
        # Generate new primary key
        new_primary = self._generate_secure_key()
        
        # Move old primary to fallbacks
        new_fallbacks = [old_keys.primary] if old_keys else []
        if old_keys:
            new_fallbacks.extend(old_keys.fallbacks)
        
        # Limit fallback keys
        if len(new_fallbacks) > self.max_fallback_keys:
            new_fallbacks = new_fallbacks[:self.max_fallback_keys]
        
        self.current_keys = APIKeyData(
            primary=new_primary,
            fallbacks=new_fallbacks,
            created_at=int(time.time() * 1000),
            expires_at=int(time.time() * 1000) + self.rotation_interval,
            rotation_count=old_keys.rotation_count + 1 if old_keys else 1
        )
        
        # Store new keys securely
        await self.storage.store('api_keys', self.current_keys)
        
        # Emit rotation event (in a real implementation)
        # self.emit('keyRotated', {...})
    
    async def validate_key(self, key: str) -> bool:
        """Validate an API key"""
        current = await self.get_current_key()
        
        # Check primary key
        if current.primary == key:
            return True
        
        # Check fallback keys
        return key in current.fallbacks
    
    async def force_rotation(self):
        """Force key rotation"""
        await self.rotate_keys()
    
    def get_rotation_status(self) -> dict:
        """Get key rotation status"""
        return {
            'is_rotation_enabled': self.rotation_enabled,
            'next_rotation': self.current_keys.expires_at if self.current_keys else 0,
            'rotation_count': self.current_keys.rotation_count if self.current_keys else 0,
            'keys_count': 1 + len(self.current_keys.fallbacks) if self.current_keys else 0
        }
    
    def update_rotation_interval(self, interval_ms: int):
        """Update rotation interval"""
        self.rotation_interval = interval_ms
        
        if self.current_keys:
            self.current_keys.expires_at = (
                self.current_keys.created_at + interval_ms
            )
    
    async def _generate_new_keys(self):
        """Generate new API keys"""
        primary = self._generate_secure_key()
        fallbacks = [self._generate_secure_key() for _ in range(2)]
        
        self.current_keys = APIKeyData(
            primary=primary,
            fallbacks=fallbacks,
            created_at=int(time.time() * 1000),
            expires_at=int(time.time() * 1000) + self.rotation_interval,
            rotation_count=0
        )
        
        await self.storage.store('api_keys', self.current_keys)
    
    def _generate_secure_key(self) -> str:
        """Generate a cryptographically secure API key"""
        key_bytes = secrets.token_bytes(self.key_length)
        return f"hsk_{key_bytes.hex()}"  # HyperSim Key prefix
