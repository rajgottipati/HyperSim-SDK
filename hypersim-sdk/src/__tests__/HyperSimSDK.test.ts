/**
 * Comprehensive tests for the HyperSim SDK
 */

import { HyperSimSDK, Network } from '../index';
import { LoggingPlugin, MetricsPlugin } from '../plugins';

describe('HyperSimSDK', () => {
  let sdk: HyperSimSDK;

  beforeEach(() => {
    sdk = new HyperSimSDK({
      network: Network.TESTNET,
      aiEnabled: false,
      debug: true
    });
  });

  afterEach(async () => {
    await sdk.shutdown();
  });

  describe('Basic SDK functionality', () => {
    it('should initialize with correct configuration', () => {
      expect(sdk).toBeDefined();
      expect(sdk.getNetworkStatus).toBeDefined();
    });

    it('should simulate a basic transaction', async () => {
      const transaction = {
        from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        gasLimit: '21000'
      };

      const result = await sdk.simulate(transaction);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.gasUsed).toBeDefined();
      expect(result.blockType).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const invalidTransaction = {
        from: 'invalid-address',
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000'
      };

      await expect(sdk.simulate(invalidTransaction as any))
        .rejects
        .toThrow('must be a valid Ethereum address');
    });
  });

  describe('Plugin System', () => {
    it('should initialize with plugins', async () => {
      const loggingPlugin = new LoggingPlugin({ level: 'debug' });
      const metricsPlugin = new MetricsPlugin();
      
      const sdkWithPlugins = new HyperSimSDK({
        network: Network.TESTNET,
        plugins: [
          { plugin: loggingPlugin, enabled: true },
          { plugin: metricsPlugin, enabled: true }
        ],
        debug: true
      });
      
      const plugins = sdkWithPlugins.getPlugins();
      expect(plugins).toHaveLength(2);
      expect(plugins.some(p => p.name === 'logging')).toBe(true);
      expect(plugins.some(p => p.name === 'metrics')).toBe(true);
      
      await sdkWithPlugins.shutdown();
    });

    it('should add and remove plugins at runtime', async () => {
      const loggingPlugin = new LoggingPlugin();
      
      await sdk.addPlugin({ plugin: loggingPlugin, enabled: true });
      
      let plugins = sdk.getPlugins();
      expect(plugins.some(p => p.name === 'logging')).toBe(true);
      
      await sdk.removePlugin('logging');
      
      plugins = sdk.getPlugins();
      expect(plugins.some(p => p.name === 'logging')).toBe(false);
    });

    it('should enable and disable plugins', async () => {
      const loggingPlugin = new LoggingPlugin();
      
      await sdk.addPlugin({ plugin: loggingPlugin, enabled: true });
      
      let plugins = sdk.getPlugins();
      const loggingPluginInfo = plugins.find(p => p.name === 'logging');
      expect(loggingPluginInfo?.enabled).toBe(true);
      
      await sdk.enablePlugin('logging', false);
      
      plugins = sdk.getPlugins();
      const disabledLoggingPlugin = plugins.find(p => p.name === 'logging');
      expect(disabledLoggingPlugin?.enabled).toBe(false);
    });
  });

  describe('WebSocket functionality', () => {
    it('should handle WebSocket not enabled', () => {
      expect(() => sdk.connectWebSocket())
        .rejects
        .toThrow('WebSocket streaming not enabled');
    });

    it('should initialize with WebSocket enabled', () => {
      const wsSDK = new HyperSimSDK({
        network: Network.TESTNET,
        streamingEnabled: true,
        debug: true
      });
      
      expect(wsSDK.isConnected()).toBe(false);
      
      wsSDK.shutdown();
    });
  });

  describe('Network status', () => {
    it('should get network status', async () => {
      const status = await sdk.getNetworkStatus();
      
      expect(status).toBeDefined();
      expect(status.network).toBe(Network.TESTNET);
      expect(status.latestBlock).toBeGreaterThan(0);
      expect(status.isHealthy).toBeDefined();
    });
  });

  describe('Risk assessment', () => {
    it('should assess risk for a transaction', async () => {
      const transaction = {
        from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        gasLimit: '21000'
      };

      const riskAssessment = await sdk.assessRisk(transaction);
      
      expect(riskAssessment).toBeDefined();
      expect(riskAssessment.riskLevel).toBeDefined();
      expect(riskAssessment.factors).toBeDefined();
      expect(Array.isArray(riskAssessment.factors)).toBe(true);
    });
  });

  describe('Bundle optimization', () => {
    it('should optimize transaction bundle', async () => {
      const transactions = [
        {
          from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
          to: '0x1234567890123456789012345678901234567890',
          value: '1000000000000000000',
          gasLimit: '21000'
        },
        {
          from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
          to: '0x0987654321098765432109876543210987654321',
          value: '500000000000000000',
          gasLimit: '21000'
        }
      ];

      const optimization = await sdk.optimizeBundle(transactions);
      
      expect(optimization).toBeDefined();
      expect(optimization.originalGas).toBeDefined();
      expect(optimization.optimizedGas).toBeDefined();
      expect(optimization.gasSaved).toBeDefined();
      expect(optimization.suggestions).toBeDefined();
      expect(optimization.reorderedIndices).toBeDefined();
    });
  });
});