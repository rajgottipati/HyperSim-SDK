/**
 * Main HyperSim SDK class
 * Orchestrates all components for comprehensive blockchain interaction
 */

import { HyperEVMClient } from '../clients/hyperEVM.js';
import { HyperCoreClient } from '../clients/hyperCore.js';
import { WebSocketClient } from '../clients/websocket.js';
import { AIAnalyzer } from '../ai/analyzer.js';
import { TransactionOptimizer } from '../ai/optimizer.js';
import { TransactionSimulator } from './simulation.js';
import { PluginManager } from '../plugins/system.js';
import { MiddlewareManager } from '../plugins/middleware.js';
import { SDKOptions, SimulateOptions, SimulateResult, HyperSimNetwork, SubscriptionType } from '../types/common.js';
import { NETWORKS } from '../utils/constants.js';
import { HyperSimError, ValidationError } from './errors.js';
import { validateSimulateOptions } from '../utils/validators.js';
import { formatError } from '../utils/formatters.js';

/**
 * Main HyperSim SDK class
 * Provides unified access to all HyperEVM and HyperCore functionality
 */
export class HyperSimSDK {
  private hyperEVMClient: HyperEVMClient;
  private hyperCoreClient: HyperCoreClient;
  private webSocketClient?: WebSocketClient;
  private aiAnalyzer: AIAnalyzer;
  private aiOptimizer: TransactionOptimizer;
  private simulator: TransactionSimulator;
  private pluginManager: PluginManager;
  private middlewareManager: MiddlewareManager;
  private options: Required<SDKOptions>;

  constructor(options: SDKOptions = {}) {
    // Get network configuration first to provide defaults
    const networkConfig = NETWORKS[options.network || 'mainnet'];
    if (!networkConfig) {
      throw new ValidationError(`Invalid network: ${options.network || 'mainnet'}`);
    }

    // Set default options
    this.options = {
      network: 'mainnet',
      rpcUrl: networkConfig.rpcUrl,
      wsUrl: networkConfig.wsUrl,
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      enableAI: false,
      crossLayer: true,
      plugins: [],
      debug: false,
      ...options
    } as Required<SDKOptions>;

    // Initialize middleware manager first
    this.middlewareManager = new MiddlewareManager();
    this.middlewareManager.applyDefaults({
      enableLogging: this.options.debug,
      enableRetry: true,
      enableRateLimit: false,
      enableCache: false,
      enablePerformance: this.options.debug
    });

    // Initialize clients
    this.hyperEVMClient = new HyperEVMClient(
      this.options.rpcUrl,
      {
        timeout: this.options.timeout,
        retries: this.options.retries,
        retryDelay: this.options.retryDelay
      }
    );

    this.hyperCoreClient = new HyperCoreClient(this.hyperEVMClient);

    // Initialize WebSocket client if URL is provided
    if (this.options.wsUrl) {
      this.webSocketClient = new WebSocketClient(this.options.wsUrl, {
        reconnect: true,
        maxReconnectAttempts: 10,
        reconnectDelay: 1000,
        pingInterval: 30000,
        connectionTimeout: 10000
      });
    }

    // Initialize AI components
    this.aiAnalyzer = new AIAnalyzer({
      enabled: this.options.enableAI,
      apiKey: this.options.apiKey
    });

    this.aiOptimizer = new TransactionOptimizer(
      this.options.apiKey ? { apiKey: this.options.apiKey } : undefined
    );

    // Initialize simulation engine
    this.simulator = new TransactionSimulator(
      this.hyperEVMClient,
      this.hyperCoreClient
    );

    // Initialize plugin system
    this.pluginManager = new PluginManager();

    // Install plugins
    this.installPlugins();
  }

  /**
   * Simulate transaction execution with AI analysis and optimization
   * 
   * @param options - Simulation options including transaction details
   * @returns Promise resolving to simulation results with AI insights
   */
  public async simulate(options: SimulateOptions): Promise<SimulateResult> {
    try {
      // Validate input
      const validationErrors = validateSimulateOptions(options);
      if (validationErrors.length > 0) {
        throw new ValidationError(
          `Invalid simulation options: ${validationErrors.map(e => e.message).join(', ')}`
        );
      }

      // Execute simulation
      const result = await this.simulator.simulateTransaction(options);

      // Add AI analysis if enabled
      if (options.aiAnalysis && this.options.enableAI) {
        try {
          result.aiAnalysis = await this.aiAnalyzer.analyzeTransaction(
            options.transaction,
            result
          );
        } catch (aiError) {
          if (this.options.debug) {
            console.warn('AI analysis failed:', formatError(aiError as Error, 'AI Analysis'));
          }
        }
      }

      return result;
    } catch (error) {
      throw new HyperSimError(
        `Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Optimize transaction using AI recommendations
   */
  public async optimizeTransaction(options: SimulateOptions): Promise<{
    original: SimulateOptions;
    optimized: SimulateOptions;
    savings: {
      gasReduction: number;
      costSavings: string;
      timeOptimization: number;
    };
    recommendations: string[];
  }> {
    if (!this.options.enableAI) {
      throw new HyperSimError('AI optimization requires enableAI: true in SDK options');
    }

    // First simulate the original transaction
    const originalResult = await this.simulate(options);

    // Get AI optimization recommendations
    const optimization = await this.aiOptimizer.optimizeTransaction(
      options.transaction,
      originalResult
    );

    const optimizedOptions = {
      ...options,
      transaction: optimization.optimizedTransaction
    };

    return {
      original: options,
      optimized: optimizedOptions,
      savings: optimization.estimatedSavings,
      recommendations: optimization.recommendations.map(r => r.description)
    };
  }

  /**
   * Connect to WebSocket for real-time data
   */
  public async connect(): Promise<void> {
    if (!this.webSocketClient) {
      throw new HyperSimError('WebSocket client not initialized. Provide wsUrl in SDK options.');
    }

    await this.webSocketClient.connect();
  }

  /**
   * Subscribe to real-time data streams
   */
  public subscribe(subscription: SubscriptionType): void {
    if (!this.webSocketClient) {
      throw new HyperSimError('WebSocket client not initialized.');
    }

    this.webSocketClient.subscribe(subscription);
  }

  /**
   * Unsubscribe from data streams
   */
  public unsubscribe(subscription: SubscriptionType): void {
    if (!this.webSocketClient) {
      throw new HyperSimError('WebSocket client not initialized.');
    }

    this.webSocketClient.unsubscribe(subscription);
  }

  /**
   * Listen for WebSocket events
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    if (!this.webSocketClient) {
      throw new HyperSimError('WebSocket client not initialized.');
    }

    this.webSocketClient.on(event, listener);
  }

  /**
   * Disconnect WebSocket
   */
  public disconnect(): void {
    if (this.webSocketClient) {
      this.webSocketClient.disconnect();
    }
  }

  /**
   * Install plugins
   */
  private async installPlugins(): Promise<void> {
    for (const plugin of this.options.plugins) {
      try {
        this.pluginManager.register(plugin);
        await this.middlewareManager.installPlugin(plugin);
      } catch (error) {
        if (this.options.debug) {
          console.warn(`Failed to install plugin ${plugin.name}:`, error);
        }
      }
    }
  }

  /**
   * Get network configuration
   */
  public getNetwork(): HyperSimNetwork {
    return this.options.network;
  }

  /**
   * Get HyperEVM client for direct access
   */
  public getHyperEVMClient(): HyperEVMClient {
    return this.hyperEVMClient;
  }

  /**
   * Get HyperCore client for direct access
   */
  public getHyperCoreClient(): HyperCoreClient {
    return this.hyperCoreClient;
  }

  /**
   * Get WebSocket client for direct access
   */
  public getWebSocketClient(): WebSocketClient | undefined {
    return this.webSocketClient;
  }

  /**
   * Get AI analyzer for direct access
   */
  public getAIAnalyzer(): AIAnalyzer {
    return this.aiAnalyzer;
  }

  /**
   * Get AI optimizer for direct access
   */
  public getAIOptimizer(): TransactionOptimizer {
    return this.aiOptimizer;
  }

  /**
   * Get plugin manager for plugin operations
   */
  public getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  /**
   * Get middleware manager for middleware operations
   */
  public getMiddlewareManager(): MiddlewareManager {
    return this.middlewareManager;
  }

  /**
   * Check if WebSocket is connected
   */
  public isConnected(): boolean {
    return this.webSocketClient?.isConnected() || false;
  }

  /**
   * Get SDK configuration
   */
  public getConfig(): Required<SDKOptions> {
    return { ...this.options };
  }

  /**
   * Update SDK configuration
   */
  public updateConfig(updates: Partial<SDKOptions>): void {
    this.options = { ...this.options, ...updates };
    
    // Update AI components if needed
    if (updates.enableAI !== undefined) {
      this.aiAnalyzer.updateConfig({ enabled: updates.enableAI });
    }
    
    if (updates.apiKey) {
      this.aiAnalyzer.updateConfig({ apiKey: updates.apiKey });
      this.aiOptimizer.updateConfig({ apiKey: updates.apiKey });
    }
  }
}