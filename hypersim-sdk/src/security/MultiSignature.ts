/**
 * Multi-signature support with hardware wallet integration
 */

import { EventEmitter } from 'events';
import { SecureStorage } from './SecureStorage';
import { MultiSigConfig, SignedRequest } from './types';
import crypto from 'crypto';
import { ec as EC } from 'elliptic';

const ec = new EC('secp256k1');

export interface HardwareWalletAdapter {
  isConnected(): Promise<boolean>;
  getPublicKey(): Promise<string>;
  sign(hash: string): Promise<string>;
  getDeviceInfo(): Promise<{ name: string; version: string }>;
}

export class MultiSignature extends EventEmitter {
  private readonly storage: SecureStorage;
  private config?: MultiSigConfig;
  private hardwareWallets: Map<string, HardwareWalletAdapter> = new Map();

  constructor(storage: SecureStorage) {
    super();
    this.storage = storage;
  }

  /**
   * Initialize multi-signature configuration
   */
  async initialize(config: MultiSigConfig): Promise<void> {
    if (config.threshold > config.signers.length) {
      throw new Error('Threshold cannot exceed number of signers');
    }

    if (config.threshold < 1) {
      throw new Error('Threshold must be at least 1');
    }

    this.config = {
      threshold: config.threshold,
      signers: [...config.signers],
      hardwareWallet: config.hardwareWallet ?? false,
      algorithm: config.algorithm ?? 'ecdsa'
    };

    // Store configuration securely
    await this.storage.store('multisig_config', this.config);

    this.emit('initialized', { config: this.config });
  }

  /**
   * Register hardware wallet adapter
   */
  registerHardwareWallet(address: string, adapter: HardwareWalletAdapter): void {
    this.hardwareWallets.set(address, adapter);
    this.emit('hardwareWalletRegistered', { address });
  }

  /**
   * Create a multi-signature transaction
   */
  async createMultiSigTransaction(data: any, signers: string[]): Promise<{
    transaction: any;
    requiredSignatures: number;
    signingAddresses: string[];
  }> {
    if (!this.config) {
      throw new Error('Multi-signature not initialized');
    }

    // Validate signers are authorized
    const validSigners = signers.filter(signer => 
      this.config!.signers.includes(signer)
    );

    if (validSigners.length < this.config.threshold) {
      throw new Error(
        `Insufficient signers. Required: ${this.config.threshold}, Provided: ${validSigners.length}`
      );
    }

    const transactionHash = this.hashData(data);
    
    const multiSigTx = {
      data,
      hash: transactionHash,
      requiredSignatures: this.config.threshold,
      signingAddresses: validSigners.slice(0, this.config.threshold),
      signatures: new Map<string, string>(),
      timestamp: Date.now(),
      algorithm: this.config.algorithm
    };

    return {
      transaction: multiSigTx,
      requiredSignatures: this.config.threshold,
      signingAddresses: multiSigTx.signingAddresses
    };
  }

  /**
   * Sign transaction with private key
   */
  async signWithPrivateKey(
    transaction: any,
    privateKey: string,
    signerAddress: string
  ): Promise<string> {
    if (!this.config) {
      throw new Error('Multi-signature not initialized');
    }

    if (!transaction.signingAddresses.includes(signerAddress)) {
      throw new Error('Signer not authorized for this transaction');
    }

    const keyPair = ec.keyFromPrivate(privateKey, 'hex');
    const signature = keyPair.sign(transaction.hash, 'hex');
    
    const signatureHex = signature.toDER('hex');
    transaction.signatures.set(signerAddress, signatureHex);

    this.emit('transactionSigned', {
      signerAddress,
      transactionHash: transaction.hash,
      signatureCount: transaction.signatures.size
    });

    return signatureHex;
  }

  /**
   * Sign transaction with hardware wallet
   */
  async signWithHardwareWallet(
    transaction: any,
    signerAddress: string
  ): Promise<string> {
    if (!this.config || !this.config.hardwareWallet) {
      throw new Error('Hardware wallet support not enabled');
    }

    const adapter = this.hardwareWallets.get(signerAddress);
    if (!adapter) {
      throw new Error(`Hardware wallet not registered for ${signerAddress}`);
    }

    if (!await adapter.isConnected()) {
      throw new Error(`Hardware wallet ${signerAddress} is not connected`);
    }

    const signature = await adapter.sign(transaction.hash);
    transaction.signatures.set(signerAddress, signature);

    this.emit('hardwareWalletSigned', {
      signerAddress,
      transactionHash: transaction.hash,
      signatureCount: transaction.signatures.size
    });

    return signature;
  }

  /**
   * Verify transaction has sufficient signatures
   */
  async verifyMultiSigTransaction(transaction: any): Promise<{
    isValid: boolean;
    signatureCount: number;
    requiredSignatures: number;
    validSignatures: string[];
    invalidSignatures: string[];
  }> {
    if (!this.config) {
      throw new Error('Multi-signature not initialized');
    }

    const validSignatures: string[] = [];
    const invalidSignatures: string[] = [];

    // Verify each signature
    for (const [signerAddress, signature] of transaction.signatures) {
      try {
        const isValid = await this.verifySignature(
          transaction.hash,
          signature,
          signerAddress
        );
        
        if (isValid) {
          validSignatures.push(signerAddress);
        } else {
          invalidSignatures.push(signerAddress);
        }
      } catch (error) {
        invalidSignatures.push(signerAddress);
      }
    }

    const isValid = validSignatures.length >= this.config.threshold;

    return {
      isValid,
      signatureCount: validSignatures.length,
      requiredSignatures: this.config.threshold,
      validSignatures,
      invalidSignatures
    };
  }

  /**
   * Get multi-signature configuration
   */
  getConfig(): MultiSigConfig | undefined {
    return this.config ? { ...this.config } : undefined;
  }

  /**
   * Update multi-signature threshold
   */
  async updateThreshold(newThreshold: number): Promise<void> {
    if (!this.config) {
      throw new Error('Multi-signature not initialized');
    }

    if (newThreshold > this.config.signers.length || newThreshold < 1) {
      throw new Error('Invalid threshold value');
    }

    this.config.threshold = newThreshold;
    await this.storage.store('multisig_config', this.config);

    this.emit('thresholdUpdated', { newThreshold });
  }

  /**
   * Add new signer
   */
  async addSigner(signerAddress: string): Promise<void> {
    if (!this.config) {
      throw new Error('Multi-signature not initialized');
    }

    if (this.config.signers.includes(signerAddress)) {
      throw new Error('Signer already exists');
    }

    this.config.signers.push(signerAddress);
    await this.storage.store('multisig_config', this.config);

    this.emit('signerAdded', { signerAddress });
  }

  /**
   * Remove signer
   */
  async removeSigner(signerAddress: string): Promise<void> {
    if (!this.config) {
      throw new Error('Multi-signature not initialized');
    }

    const index = this.config.signers.indexOf(signerAddress);
    if (index === -1) {
      throw new Error('Signer not found');
    }

    this.config.signers.splice(index, 1);
    
    // Ensure threshold is still valid
    if (this.config.threshold > this.config.signers.length) {
      this.config.threshold = this.config.signers.length;
    }

    await this.storage.store('multisig_config', this.config);
    this.emit('signerRemoved', { signerAddress });
  }

  private hashData(data: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  private async verifySignature(
    hash: string,
    signature: string,
    signerAddress: string
  ): Promise<boolean> {
    try {
      // For hardware wallets, use their verification
      const hardwareWallet = this.hardwareWallets.get(signerAddress);
      if (hardwareWallet && this.config?.hardwareWallet) {
        const publicKey = await hardwareWallet.getPublicKey();
        const keyPair = ec.keyFromPublic(publicKey, 'hex');
        return keyPair.verify(hash, signature);
      }

      // For software signatures, derive public key from signature
      // This is a simplified verification - in practice, you'd need the public key
      const signatureObj = {
        r: signature.slice(0, 64),
        s: signature.slice(64, 128)
      };
      
      // This would need actual public key verification
      return true; // Placeholder - implement proper verification
    } catch {
      return false;
    }
  }
}
