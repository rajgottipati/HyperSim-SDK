/**
 * Request signing and verification for tamper protection
 */

import crypto from 'crypto';
import { SecureStorage } from './SecureStorage';
import { SignedRequest } from './types';

export interface SigningKeyPair {
  publicKey: string;
  privateKey: string;
  algorithm: string;
  createdAt: number;
}

export class RequestSigner {
  private readonly storage: SecureStorage;
  private keyPair?: SigningKeyPair;

  constructor(storage: SecureStorage) {
    this.storage = storage;
  }

  /**
   * Initialize request signer
   */
  async initialize(): Promise<void> {
    try {
      this.keyPair = await this.storage.retrieve<SigningKeyPair>('signing_keypair');
    } catch {
      // Generate new key pair if none exists
      await this.generateKeyPair();
    }

    // Check if key pair is old and needs rotation
    if (this.keyPair && this.shouldRotateKeys()) {
      await this.rotateKeyPair();
    }
  }

  /**
   * Sign a request to prevent tampering
   */
  async signRequest(request: any): Promise<SignedRequest> {
    if (!this.keyPair) {
      await this.initialize();
    }

    const timestamp = Date.now();
    const nonce = crypto.randomUUID();
    
    // Create canonical string representation
    const canonicalRequest = this.canonicalizeRequest({
      ...request,
      timestamp,
      nonce
    });

    // Sign the canonical request
    const signature = this.signData(canonicalRequest, this.keyPair!.privateKey);

    return {
      data: request,
      signature,
      timestamp,
      nonce,
      publicKey: this.keyPair!.publicKey
    };
  }

  /**
   * Verify request signature
   */
  async verifyRequest(signedRequest: SignedRequest): Promise<boolean> {
    try {
      // Check timestamp to prevent replay attacks (5 minute window)
      const maxAge = 5 * 60 * 1000;
      if (Date.now() - signedRequest.timestamp > maxAge) {
        return false;
      }

      // Recreate canonical request
      const canonicalRequest = this.canonicalizeRequest({
        ...signedRequest.data,
        timestamp: signedRequest.timestamp,
        nonce: signedRequest.nonce
      });

      // Verify signature
      return this.verifySignature(
        canonicalRequest,
        signedRequest.signature,
        signedRequest.publicKey
      );
    } catch {
      return false;
    }
  }

  /**
   * Sign response to ensure integrity
   */
  async signResponse(response: any, originalRequest: SignedRequest): Promise<any> {
    if (!this.keyPair) {
      await this.initialize();
    }

    const timestamp = Date.now();
    const responseData = {
      ...response,
      timestamp,
      requestNonce: originalRequest.nonce
    };

    const canonical = this.canonicalizeRequest(responseData);
    const signature = this.signData(canonical, this.keyPair!.privateKey);

    return {
      ...responseData,
      signature,
      publicKey: this.keyPair!.publicKey
    };
  }

  /**
   * Verify response signature
   */
  async verifyResponse(response: any, originalRequest: SignedRequest): Promise<boolean> {
    try {
      if (!response.signature || !response.publicKey) {
        return false;
      }

      // Verify request nonce matches
      if (response.requestNonce !== originalRequest.nonce) {
        return false;
      }

      // Create canonical response for verification
      const canonicalResponse = this.canonicalizeRequest({
        ...response,
        // Remove signature for verification
        signature: undefined,
        publicKey: undefined
      });

      return this.verifySignature(
        canonicalResponse,
        response.signature,
        response.publicKey
      );
    } catch {
      return false;
    }
  }

  /**
   * Get current public key for verification
   */
  async getPublicKey(): Promise<string> {
    if (!this.keyPair) {
      await this.initialize();
    }
    return this.keyPair!.publicKey;
  }

  /**
   * Rotate signing key pair
   */
  async rotateKeyPair(): Promise<void> {
    await this.generateKeyPair();
  }

  /**
   * Generate HMAC for lightweight signing
   */
  generateHMAC(data: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify HMAC
   */
  verifyHMAC(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  private async generateKeyPair(): Promise<void> {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    this.keyPair = {
      publicKey: Buffer.from(publicKey).toString('base64'),
      privateKey: Buffer.from(privateKey).toString('base64'),
      algorithm: 'ed25519',
      createdAt: Date.now()
    };

    await this.storage.store('signing_keypair', this.keyPair);
  }

  private canonicalizeRequest(request: any): string {
    // Sort keys and stringify to create canonical representation
    const sortedRequest = this.sortObjectKeys(request);
    return JSON.stringify(sortedRequest);
  }

  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }

    const sortedKeys = Object.keys(obj).sort();
    const sortedObj: any = {};
    
    for (const key of sortedKeys) {
      if (obj[key] !== undefined) {
        sortedObj[key] = this.sortObjectKeys(obj[key]);
      }
    }

    return sortedObj;
  }

  private signData(data: string, privateKey: string): string {
    const privateKeyBuffer = Buffer.from(privateKey, 'base64');
    const privateKeyPem = privateKeyBuffer.toString();
    
    const sign = crypto.createSign('Ed25519');
    sign.update(data);
    return sign.sign(privateKeyPem, 'base64');
  }

  private verifySignature(data: string, signature: string, publicKey: string): boolean {
    try {
      const publicKeyBuffer = Buffer.from(publicKey, 'base64');
      const publicKeyPem = publicKeyBuffer.toString();
      
      const verify = crypto.createVerify('Ed25519');
      verify.update(data);
      return verify.verify(publicKeyPem, signature, 'base64');
    } catch {
      return false;
    }
  }

  private shouldRotateKeys(): boolean {
    if (!this.keyPair) return true;
    
    // Rotate keys every 30 days
    const maxAge = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - this.keyPair.createdAt > maxAge;
  }
}
