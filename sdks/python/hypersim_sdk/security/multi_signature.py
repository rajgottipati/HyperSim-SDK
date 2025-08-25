"""
Multi-signature support for Python SDK
"""

import hashlib
import json
from typing import Dict, List, Optional
from .secure_storage import SecureStorage
from .types import MultiSigConfig


class MultiSignature:
    """Multi-signature support with hardware wallet integration"""
    
    def __init__(self, storage: SecureStorage):
        self.storage = storage
        self.config: Optional[MultiSigConfig] = None
        self.hardware_wallets: Dict[str, any] = {}
    
    async def initialize(self, config: MultiSigConfig):
        """Initialize multi-signature configuration"""
        if config.threshold > len(config.signers):
            raise ValueError('Threshold cannot exceed number of signers')
        
        if config.threshold < 1:
            raise ValueError('Threshold must be at least 1')
        
        self.config = config
        await self.storage.store('multisig_config', config)
    
    async def create_multisig_transaction(self, data: dict, signers: List[str]) -> dict:
        """Create a multi-signature transaction"""
        if not self.config:
            raise Exception('Multi-signature not initialized')
        
        valid_signers = [s for s in signers if s in self.config.signers]
        
        if len(valid_signers) < self.config.threshold:
            raise Exception(f'Insufficient signers. Required: {self.config.threshold}, Provided: {len(valid_signers)}')
        
        transaction_hash = self._hash_data(data)
        
        return {
            'data': data,
            'hash': transaction_hash,
            'required_signatures': self.config.threshold,
            'signing_addresses': valid_signers[:self.config.threshold],
            'signatures': {},
            'timestamp': int(__import__('time').time() * 1000),
            'algorithm': self.config.algorithm
        }
    
    def _hash_data(self, data: dict) -> str:
        """Hash transaction data"""
        return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
