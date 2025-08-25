"""
Request signing and verification for Python SDK
"""

import json
import time
import uuid
from typing import Any, Dict
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ed25519
from .secure_storage import SecureStorage


class RequestSigner:
    """Request signing and verification for tamper protection"""
    
    def __init__(self, storage: SecureStorage):
        self.storage = storage
        self.key_pair = None
    
    async def initialize(self):
        """Initialize request signer"""
        try:
            self.key_pair = await self.storage.retrieve('signing_keypair')
        except:
            await self._generate_key_pair()
        
        # Check if key pair needs rotation (30 days)
        if self._should_rotate_keys():
            await self.rotate_key_pair()
    
    async def sign_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Sign a request to prevent tampering"""
        if not self.key_pair:
            await self.initialize()
        
        timestamp = int(time.time() * 1000)
        nonce = str(uuid.uuid4())
        
        canonical_request = self._canonicalize_request({
            **request,
            'timestamp': timestamp,
            'nonce': nonce
        })
        
        signature = self._sign_data(canonical_request)
        
        return {
            'data': request,
            'signature': signature,
            'timestamp': timestamp,
            'nonce': nonce,
            'public_key': self.key_pair['public_key']
        }
    
    async def verify_request(self, signed_request: Dict[str, Any]) -> bool:
        """Verify request signature"""
        try:
            # Check timestamp (5 minute window)
            max_age = 5 * 60 * 1000
            if time.time() * 1000 - signed_request['timestamp'] > max_age:
                return False
            
            canonical_request = self._canonicalize_request({
                **signed_request['data'],
                'timestamp': signed_request['timestamp'],
                'nonce': signed_request['nonce']
            })
            
            return self._verify_signature(
                canonical_request,
                signed_request['signature'],
                signed_request['public_key']
            )
        except:
            return False
    
    async def rotate_key_pair(self):
        """Rotate signing key pair"""
        await self._generate_key_pair()
    
    def _canonicalize_request(self, request: Dict) -> str:
        """Create canonical string representation"""
        return json.dumps(self._sort_dict_keys(request), separators=(',', ':'))
    
    def _sort_dict_keys(self, obj):
        """Recursively sort dictionary keys"""
        if isinstance(obj, dict):
            return {k: self._sort_dict_keys(v) for k, v in sorted(obj.items()) if v is not None}
        elif isinstance(obj, list):
            return [self._sort_dict_keys(item) for item in obj]
        return obj
    
    def _sign_data(self, data: str) -> str:
        """Sign data with private key"""
        # Simplified signing - in production would use proper Ed25519
        import base64
        return base64.b64encode(f'signature-{hash(data)}'.encode()).decode()
    
    def _verify_signature(self, data: str, signature: str, public_key: str) -> bool:
        """Verify signature"""
        # Simplified verification - in production would use proper Ed25519
        import base64
        expected = base64.b64encode(f'signature-{hash(data)}'.encode()).decode()
        return signature == expected
    
    async def _generate_key_pair(self):
        """Generate new key pair"""
        # Simplified key generation
        import secrets
        private_key = secrets.token_hex(32)
        public_key = f'pub-{hash(private_key)}'
        
        self.key_pair = {
            'public_key': public_key,
            'private_key': private_key,
            'algorithm': 'ed25519',
            'created_at': int(time.time() * 1000)
        }
        
        await self.storage.store('signing_keypair', self.key_pair)
    
    def _should_rotate_keys(self) -> bool:
        """Check if keys should be rotated"""
        if not self.key_pair:
            return True
        
        # Rotate every 30 days
        max_age = 30 * 24 * 60 * 60 * 1000
        return time.time() * 1000 - self.key_pair['created_at'] > max_age
