/**
 * API Key Management with automatic rotation and fallback support
 */

import { EventEmitter } from 'events';
import { SecureStorage } from './SecureStorage';
import { APIKeyData } from './types';
import crypto from 'crypto';

export interface APIKeyManagerConfig {
  rotationEnabled: boolean;
  rotationInterval: number;
  maxFallbackKeys?: number;
  keyLength?: number;
}

export class APIKeyManager extends EventEmitter {
  private readonly storage: SecureStorage;
  private readonly config: Required<APIKeyManagerConfig>;
  private currentKeys?: APIKeyData;
  private rotationTimer?: NodeJS.Timeout;

  constructor(storage: SecureStorage, config: APIKeyManagerConfig) {
    super();
    this.storage = storage;
    this.config = {
      rotationEnabled: config.rotationEnabled,
      rotationInterval: config.rotationInterval,
      maxFallbackKeys: config.maxFallbackKeys ?? 3,
      keyLength: config.keyLength ?? 32
    };
  }

  /**
   * Initialize API key management
   */
  async initialize(initialKeys?: { primary: string; fallbacks?: string[] }): Promise<void> {
    if (initialKeys) {
      // Use provided keys
      this.currentKeys = {
        primary: initialKeys.primary,
        fallbacks: initialKeys.fallbacks ?? [],
        createdAt: Date.now(),
        expiresAt: Date.now() + this.config.rotationInterval,
        rotationCount: 0
      };
      await this.storage.store('api_keys', this.currentKeys);
    } else {
      // Try to load existing keys
      try {
        this.currentKeys = await this.storage.retrieve<APIKeyData>('api_keys');
      } catch {
        // Generate new keys if none exist
        await this.generateNewKeys();
      }
    }

    // Validate keys are not expired
    if (this.currentKeys && this.currentKeys.expiresAt < Date.now()) {
      await this.rotateKeys();
    }
  }

  /**
   * Get current API keys
   */
  async getCurrentKey(): Promise<APIKeyData> {
    if (!this.currentKeys) {
      await this.initialize();
    }

    // Check if rotation is needed
    if (this.currentKeys!.expiresAt < Date.now()) {
      await this.rotateKeys();
    }

    return this.currentKeys!;
  }

  /**
   * Rotate API keys
   */
  async rotateKeys(): Promise<void> {
    if (!this.config.rotationEnabled) {
      throw new Error('API key rotation is disabled');
    }

    const oldKeys = this.currentKeys;
    
    // Generate new primary key
    const newPrimary = this.generateSecureKey();
    
    // Move old primary to fallbacks
    const newFallbacks = oldKeys ? [oldKeys.primary, ...oldKeys.fallbacks] : [];
    
    // Limit fallback keys
    if (newFallbacks.length > this.config.maxFallbackKeys) {
      newFallbacks.splice(this.config.maxFallbackKeys);
    }

    this.currentKeys = {
      primary: newPrimary,
      fallbacks: newFallbacks,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.rotationInterval,
      rotationCount: oldKeys ? oldKeys.rotationCount + 1 : 1
    };

    // Store new keys securely
    await this.storage.store('api_keys', this.currentKeys);

    // Emit rotation event
    this.emit('keyRotated', {
      newPrimary: newPrimary,
      rotationCount: this.currentKeys.rotationCount,
      timestamp: Date.now()
    });
  }

  /**
   * Validate an API key
   */
  async validateKey(key: string): Promise<boolean> {
    const current = await this.getCurrentKey();
    
    // Check primary key
    if (current.primary === key) {
      return true;
    }

    // Check fallback keys
    return current.fallbacks.includes(key);
  }

  /**
   * Force key rotation
   */
  async forceRotation(): Promise<void> {
    await this.rotateKeys();
  }

  /**
   * Get key rotation status
   */
  getRotationStatus(): {
    isRotationEnabled: boolean;
    nextRotation: number;
    rotationCount: number;
    keysCount: number;
  } {
    return {
      isRotationEnabled: this.config.rotationEnabled,
      nextRotation: this.currentKeys?.expiresAt ?? 0,
      rotationCount: this.currentKeys?.rotationCount ?? 0,
      keysCount: 1 + (this.currentKeys?.fallbacks.length ?? 0)
    };
  }

  /**
   * Update rotation interval
   */
  updateRotationInterval(intervalMs: number): void {
    this.config.rotationInterval = intervalMs;
    
    if (this.currentKeys) {
      this.currentKeys.expiresAt = this.currentKeys.createdAt + intervalMs;
    }
  }

  private async generateNewKeys(): Promise<void> {
    const primary = this.generateSecureKey();
    const fallbacks = Array.from({ length: 2 }, () => this.generateSecureKey());

    this.currentKeys = {
      primary,
      fallbacks,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.rotationInterval,
      rotationCount: 0
    };

    await this.storage.store('api_keys', this.currentKeys);
  }

  private generateSecureKey(): string {
    const buffer = crypto.randomBytes(this.config.keyLength);
    return `hsk_${buffer.toString('hex')}`; // HyperSim Key prefix
  }
}
