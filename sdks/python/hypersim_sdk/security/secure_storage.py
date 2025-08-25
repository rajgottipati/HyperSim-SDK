"""
Secure storage with encryption at rest for Python SDK
"""

import json
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, TypeVar
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import secrets
base64 = __import__('base64')

from .types import EncryptedData

T = TypeVar('T')


class SecureStorage:
    """Secure storage with encryption at rest"""
    
    def __init__(
        self,
        storage_dir: Optional[str] = None,
        encryption_key: Optional[str] = None,
        key_derivation: str = 'pbkdf2',
        iterations: int = 100000,
        memory_only: bool = False
    ):
        self.storage_dir = storage_dir or os.path.join(
            tempfile.gettempdir(), '.hypersim-secure'
        )
        self.master_key = encryption_key or self._generate_master_key()
        self.key_derivation = key_derivation
        self.iterations = iterations
        self.memory_only = memory_only
        self.in_memory_store: Dict[str, Any] = {}
        self.encryption_key: Optional[bytes] = None
    
    async def initialize(self):
        """Initialize secure storage"""
        # Derive encryption key
        self.encryption_key = await self._derive_key(self.master_key)
        
        # Create storage directory if using file storage
        if not self.memory_only:
            try:
                Path(self.storage_dir).mkdir(parents=True, exist_ok=True, mode=0o700)
            except Exception:
                print('Failed to create storage directory, falling back to memory-only')
                self.memory_only = True
    
    async def store(self, key: str, data: T) -> None:
        """Store encrypted data"""
        if not self.encryption_key:
            await self.initialize()
        
        serialized = json.dumps(data, default=str)
        encrypted = await self._encrypt(serialized)
        
        if self.memory_only:
            self.in_memory_store[key] = encrypted
        else:
            file_path = self._get_file_path(key)
            with open(file_path, 'w', opener=lambda path, flags: 
                     os.open(path, flags, 0o600)) as f:
                json.dump(encrypted.__dict__, f)
    
    async def retrieve(self, key: str) -> T:
        """Retrieve and decrypt data"""
        if not self.encryption_key:
            await self.initialize()
        
        if self.memory_only:
            encrypted_data = self.in_memory_store.get(key)
            if not encrypted_data:
                raise KeyError(f"Key '{key}' not found in secure storage")
        else:
            file_path = self._get_file_path(key)
            try:
                with open(file_path, 'r') as f:
                    encrypted_dict = json.load(f)
                    encrypted_data = EncryptedData(**encrypted_dict)
            except FileNotFoundError:
                raise KeyError(f"Key '{key}' not found in secure storage")
        
        decrypted = await self._decrypt(encrypted_data)
        return json.loads(decrypted)
    
    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        if self.memory_only:
            return key in self.in_memory_store
        else:
            file_path = self._get_file_path(key)
            return Path(file_path).exists()
    
    async def delete(self, key: str) -> bool:
        """Delete data"""
        if self.memory_only:
            return self.in_memory_store.pop(key, None) is not None
        else:
            file_path = self._get_file_path(key)
            try:
                os.unlink(file_path)
                return True
            except FileNotFoundError:
                return False
    
    async def list_keys(self) -> List[str]:
        """List all keys"""
        if self.memory_only:
            return list(self.in_memory_store.keys())
        else:
            try:
                files = os.listdir(self.storage_dir)
                return [f.replace('.enc', '') for f in files if f.endswith('.enc')]
            except FileNotFoundError:
                return []
    
    async def clear(self):
        """Clear all data"""
        if self.memory_only:
            self.in_memory_store.clear()
        else:
            try:
                files = os.listdir(self.storage_dir)
                for file in files:
                    if file.endswith('.enc'):
                        os.unlink(os.path.join(self.storage_dir, file))
            except FileNotFoundError:
                pass
    
    async def get_stats(self) -> dict:
        """Get storage statistics"""
        keys = await self.list_keys()
        stats = {
            'key_count': len(keys),
            'storage_type': 'memory' if self.memory_only else 'file'
        }
        
        if not self.memory_only:
            try:
                files = os.listdir(self.storage_dir)
                total_size = sum(
                    os.path.getsize(os.path.join(self.storage_dir, f))
                    for f in files if f.endswith('.enc')
                )
                stats['total_size'] = total_size
            except FileNotFoundError:
                pass
        
        return stats
    
    async def rotate_key(self, new_key: Optional[str] = None):
        """Rotate encryption key"""
        new_master_key = new_key or self._generate_master_key()
        new_encryption_key = await self._derive_key(new_master_key)
        
        # Get all keys to re-encrypt
        keys = await self.list_keys()
        
        # Re-encrypt all data with new key
        old_encryption_key = self.encryption_key
        for key in keys:
            data = await self.retrieve(key)
            self.encryption_key = new_encryption_key
            await self.store(key, data)
        
        self.master_key = new_master_key
        self.encryption_key = new_encryption_key
    
    async def _encrypt(self, data: str) -> EncryptedData:
        """Encrypt data"""
        salt = secrets.token_bytes(32)
        iv = secrets.token_bytes(16)
        
        cipher = Cipher(
            algorithms.AES(self.encryption_key),
            modes.CBC(iv),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()
        
        # Pad data to AES block size
        padded_data = self._pad_data(data.encode('utf-8'))
        encrypted = encryptor.update(padded_data) + encryptor.finalize()
        
        return EncryptedData(
            data=base64.b64encode(encrypted).decode('utf-8'),
            iv=base64.b64encode(iv).decode('utf-8'),
            salt=base64.b64encode(salt).decode('utf-8'),
            algorithm='aes-256-cbc',
            kdf=self.key_derivation
        )
    
    async def _decrypt(self, encrypted_data: EncryptedData) -> str:
        """Decrypt data"""
        salt = base64.b64decode(encrypted_data.salt)
        iv = base64.b64decode(encrypted_data.iv)
        data = base64.b64decode(encrypted_data.data)
        
        cipher = Cipher(
            algorithms.AES(self.encryption_key),
            modes.CBC(iv),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        
        decrypted = decryptor.update(data) + decryptor.finalize()
        unpadded = self._unpad_data(decrypted)
        
        return unpadded.decode('utf-8')
    
    async def _derive_key(self, master_key: str) -> bytes:
        """Derive encryption key from master key"""
        salt = b'hypersim-sdk'  # Static salt for consistency
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=self.iterations,
            backend=default_backend()
        )
        
        return kdf.derive(master_key.encode())
    
    def _generate_master_key(self) -> str:
        """Generate a new master key"""
        return secrets.token_hex(32)
    
    def _get_file_path(self, key: str) -> str:
        """Get file path for a key"""
        # Sanitize key for filesystem
        sanitized = ''.join(c for c in key if c.isalnum() or c in '_-')
        return os.path.join(self.storage_dir, f'{sanitized}.enc')
    
    def _pad_data(self, data: bytes) -> bytes:
        """Pad data to AES block size using PKCS7"""
        block_size = 16
        padding_length = block_size - (len(data) % block_size)
        padding = bytes([padding_length] * padding_length)
        return data + padding
    
    def _unpad_data(self, data: bytes) -> bytes:
        """Remove PKCS7 padding"""
        padding_length = data[-1]
        return data[:-padding_length]
