/**
 * Secure storage with encryption at rest
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { EncryptedData } from './types';

interface StorageConfig {
  storageDir?: string;
  encryptionKey?: string;
  keyDerivation?: 'pbkdf2' | 'scrypt';
  iterations?: number;
  memoryInMemoryOnly?: boolean;
}

export class SecureStorage {
  private readonly config: Required<StorageConfig>;
  private readonly inMemoryStore: Map<string, any> = new Map();
  private encryptionKey?: Buffer;

  constructor(config: StorageConfig = {}) {
    this.config = {
      storageDir: config.storageDir ?? path.join(os.tmpdir(), '.hypersim-secure'),
      encryptionKey: config.encryptionKey ?? this.generateMasterKey(),
      keyDerivation: config.keyDerivation ?? 'scrypt',
      iterations: config.iterations ?? 100000,
      memoryInMemoryOnly: config.memoryInMemoryOnly ?? false
    };
  }

  /**
   * Initialize secure storage
   */
  async initialize(): Promise<void> {
    // Derive encryption key
    this.encryptionKey = await this.deriveKey(this.config.encryptionKey);
    
    // Create storage directory if using file storage
    if (!this.config.memoryInMemoryOnly) {
      try {
        await fs.mkdir(this.config.storageDir, { recursive: true, mode: 0o700 });
      } catch (error) {
        console.warn('Failed to create storage directory, falling back to memory-only storage');
        this.config.memoryInMemoryOnly = true;
      }
    }
  }

  /**
   * Store encrypted data
   */
  async store<T>(key: string, data: T): Promise<void> {
    if (!this.encryptionKey) {
      await this.initialize();
    }

    const serialized = JSON.stringify(data);
    const encrypted = await this.encrypt(serialized);

    if (this.config.memoryInMemoryOnly) {
      this.inMemoryStore.set(key, encrypted);
    } else {
      const filePath = this.getFilePath(key);
      await fs.writeFile(filePath, JSON.stringify(encrypted), { mode: 0o600 });
    }
  }

  /**
   * Retrieve and decrypt data
   */
  async retrieve<T>(key: string): Promise<T> {
    if (!this.encryptionKey) {
      await this.initialize();
    }

    let encrypted: EncryptedData;

    if (this.config.memoryInMemoryOnly) {
      encrypted = this.inMemoryStore.get(key);
      if (!encrypted) {
        throw new Error(`Key '${key}' not found in secure storage`);
      }
    } else {
      const filePath = this.getFilePath(key);
      try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        encrypted = JSON.parse(fileContent);
      } catch {
        throw new Error(`Key '${key}' not found in secure storage`);
      }
    }

    const decrypted = await this.decrypt(encrypted);
    return JSON.parse(decrypted);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (this.config.memoryInMemoryOnly) {
      return this.inMemoryStore.has(key);
    } else {
      const filePath = this.getFilePath(key);
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Delete data
   */
  async delete(key: string): Promise<boolean> {
    if (this.config.memoryInMemoryOnly) {
      return this.inMemoryStore.delete(key);
    } else {
      const filePath = this.getFilePath(key);
      try {
        await fs.unlink(filePath);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * List all keys
   */
  async listKeys(): Promise<string[]> {
    if (this.config.memoryInMemoryOnly) {
      return Array.from(this.inMemoryStore.keys());
    } else {
      try {
        const files = await fs.readdir(this.config.storageDir);
        return files
          .filter(file => file.endsWith('.enc'))
          .map(file => file.replace('.enc', ''));
      } catch {
        return [];
      }
    }
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    if (this.config.memoryInMemoryOnly) {
      this.inMemoryStore.clear();
    } else {
      try {
        const files = await fs.readdir(this.config.storageDir);
        await Promise.all(
          files
            .filter(file => file.endsWith('.enc'))
            .map(file => fs.unlink(path.join(this.config.storageDir, file)))
        );
      } catch {
        // Directory might not exist
      }
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    keyCount: number;
    storageType: 'memory' | 'file';
    totalSize?: number;
  }> {
    const keys = await this.listKeys();
    const stats = {
      keyCount: keys.length,
      storageType: this.config.memoryInMemoryOnly ? 'memory' as const : 'file' as const
    };

    if (!this.config.memoryInMemoryOnly) {
      try {
        const files = await fs.readdir(this.config.storageDir);
        let totalSize = 0;
        
        for (const file of files.filter(f => f.endsWith('.enc'))) {
          const filePath = path.join(this.config.storageDir, file);
          const stat = await fs.stat(filePath);
          totalSize += stat.size;
        }
        
        return { ...stats, totalSize };
      } catch {
        return stats;
      }
    }

    return stats;
  }

  /**
   * Rotate encryption key
   */
  async rotateKey(newKey?: string): Promise<void> {
    const oldKey = this.encryptionKey;
    const newMasterKey = newKey ?? this.generateMasterKey();
    const newEncryptionKey = await this.deriveKey(newMasterKey);

    // Get all keys to re-encrypt
    const keys = await this.listKeys();
    
    // Re-encrypt all data with new key
    for (const key of keys) {
      const data = await this.retrieve(key);
      this.encryptionKey = newEncryptionKey;
      await this.store(key, data);
    }

    this.config.encryptionKey = newMasterKey;
    this.encryptionKey = newEncryptionKey;
  }

  private async encrypt(data: string): Promise<EncryptedData> {
    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey!);
    cipher.setAAD(salt);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();

    return {
      data: encrypted + tag.toString('hex'),
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      algorithm: 'aes-256-gcm',
      kdf: this.config.keyDerivation
    };
  }

  private async decrypt(encryptedData: EncryptedData): Promise<string> {
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    
    // Extract tag from data (last 32 hex characters = 16 bytes)
    const data = encryptedData.data.slice(0, -32);
    const tag = Buffer.from(encryptedData.data.slice(-32), 'hex');
    
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey!);
    decipher.setAAD(salt);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private async deriveKey(masterKey: string): Promise<Buffer> {
    const salt = crypto.createHash('sha256').update('hypersim-sdk').digest();
    
    if (this.config.keyDerivation === 'scrypt') {
      return new Promise((resolve, reject) => {
        crypto.scrypt(masterKey, salt, 32, {
          N: 16384,
          r: 8,
          p: 1
        }, (err, key) => {
          if (err) reject(err);
          else resolve(key);
        });
      });
    } else {
      return new Promise((resolve, reject) => {
        crypto.pbkdf2(masterKey, salt, this.config.iterations, 32, 'sha256', (err, key) => {
          if (err) reject(err);
          else resolve(key);
        });
      });
    }
  }

  private generateMasterKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private getFilePath(key: string): string {
    // Sanitize key for filesystem
    const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.config.storageDir, `${sanitized}.enc`);
  }
}
