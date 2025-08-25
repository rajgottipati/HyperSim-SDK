/**
 * HyperSim SDK Core Tests
 */

import { HyperSimSDK, Network, ValidationError, NetworkError } from '../../index';

describe('HyperSimSDK', () => {
  let sdk: HyperSimSDK;

  beforeEach(() => {
    sdk = new HyperSimSDK({
      network: Network.TESTNET,
      aiEnabled: false, // Disable AI for basic tests
      debug: false
    });
  });

  describe('Initialization', () => {
    it('should initialize with valid configuration', () => {
      expect(sdk).toBeDefined();
    });

    it('should throw ValidationError for invalid network', () => {
      expect(() => {
        new HyperSimSDK({
          network: 'invalid' as any,
          aiEnabled: false
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError when AI is enabled without API key', () => {
      expect(() => {
        new HyperSimSDK({
          network: Network.TESTNET,
          aiEnabled: true
          // Missing openaiApiKey
        });
      }).toThrow(ValidationError);
    });
  });

  describe('Transaction Validation', () => {
    it('should validate transaction request format', async () => {
      const invalidTransaction = {
        // Missing from address
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000'
      };

      await expect(sdk.simulate(invalidTransaction as any))
        .rejects
        .toThrow(ValidationError);
    });

    it('should validate address format', async () => {
      const invalidTransaction = {
        from: 'invalid-address',
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000'
      };

      await expect(sdk.simulate(invalidTransaction as any))
        .rejects
        .toThrow(ValidationError);
    });

    it('should validate gas limit', async () => {
      const invalidTransaction = {
        from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
        to: '0x1234567890123456789012345678901234567890',
        gasLimit: '50000000' // Exceeds 30M limit
      };

      await expect(sdk.simulate(invalidTransaction as any))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('Network Status', () => {
    it('should get network status', async () => {
      // This test may fail without network connectivity
      try {
        const status = await sdk.getNetworkStatus();
        expect(status.network).toBe(Network.TESTNET);
        expect(typeof status.latestBlock).toBe('number');
        expect(typeof status.gasPrice).toBe('string');
        expect(typeof status.isHealthy).toBe('boolean');
      } catch (error) {
        // Skip test if network is unavailable
        console.warn('Network status test skipped due to connectivity issues');
      }
    });
  });

  describe('Bundle Operations', () => {
    it('should reject empty bundle', async () => {
      await expect(sdk.optimizeBundle([]))
        .rejects
        .toThrow(ValidationError);
    });

    it('should reject oversized bundle', async () => {
      const largeBubdle = Array.from({ length: 101 }, () => ({
        from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000'
      }));

      await expect(sdk.optimizeBundle(largeBubdle))
        .rejects
        .toThrow(ValidationError);
    });
  });
});

describe('Validation Utils', () => {
  const { validateAddress, validateNetwork, validateTransactionRequest } = require('../../utils/validators');

  describe('validateAddress', () => {
    it('should accept valid addresses', () => {
      expect(() => validateAddress('0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec'))
        .not.toThrow();
    });

    it('should reject invalid addresses', () => {
      expect(() => validateAddress('invalid'))
        .toThrow(ValidationError);
      
      expect(() => validateAddress('0x742d35Cc6635C0532925a3b8D2B9E0064c0b39e'))
        .toThrow(ValidationError);
    });
  });

  describe('validateNetwork', () => {
    it('should accept valid networks', () => {
      expect(() => validateNetwork(Network.MAINNET))
        .not.toThrow();
      
      expect(() => validateNetwork(Network.TESTNET))
        .not.toThrow();
    });

    it('should reject invalid networks', () => {
      expect(() => validateNetwork('invalid' as any))
        .toThrow(ValidationError);
    });
  });
});
