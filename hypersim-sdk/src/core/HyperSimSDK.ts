import { Network } from '../types/network';
import { TransactionRequest, SimulationResult, BundleOptimization } from '../types/simulation';
import { AIInsights, RiskLevel } from '../types/ai';
import { HyperEVMClient } from '../clients/HyperEVMClient';
import { HyperCoreClient } from '../clients/HyperCoreClient';
import { WebSocketClient, WSSubscription, WSMessage } from '../clients/WebSocketClient';
import { AIAnalyzer } from '../ai/AIAnalyzer';
import { PluginSystem, Plugin, PluginConfig } from '../plugins/PluginSystem';
import { ValidationError, SimulationError, NetworkError } from '../types/errors';
import { validateTransactionRequest, validateNetwork } from '../utils/validators';
import { SecurityManager, SecurityConfig, SecurityMetrics } from '../security';
import { EventEmitter } from 'events';

/**
 * Configuration interface for HyperSim SDK initialization
 */
export interface HyperSimConfig {
  /** Network to connect to (mainnet or testnet) */
  network: Network;
  /** Enable AI-powered analysis features */
  aiEnabled?: boolean;
  /** OpenAI API key for AI features */
  openaiApiKey?: string;
  /** Custom RPC endpoint (optional) */
  rpcEndpoint?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Enable cross-layer HyperCore integration */
  crossLayerEnabled?: boolean;
  /** Enable WebSocket streaming */
  streamingEnabled?: boolean;
  /** Custom WebSocket endpoint */
  wsEndpoint?: string;
  /** Plugin configurations */
  plugins?: PluginConfig[];
  /** Enable verbose logging */
  debug?: boolean;
  /** Security configuration */
  security?: SecurityConfig;
}

/**
 * Main SDK class for HyperEVM transaction simulation
 * 
 * Provides comprehensive transaction simulation capabilities with:
 * - Real HyperEVM network integration
 * - Cross-layer HyperCore data access
 * - AI-powered analysis and optimization
 * - WebSocket streaming for real-time data
 * - Plugin system for extensibility
 * - Production-ready error handling
 */
export class HyperSimSDK extends EventEmitter {
  private readonly config: Required<HyperSimConfig>;
  private readonly hyperEvmClient: HyperEVMClient;
  private readonly hyperCoreClient: HyperCoreClient;
  private readonly wsClient?: WebSocketClient;
  private readonly pluginSystem: PluginSystem;
  private readonly aiAnalyzer?: AIAnalyzer;
  private readonly securityManager: SecurityManager;
  private requestCounter = 0;

  /**
   * Initialize HyperSim SDK
   * @param config - SDK configuration
   */
  constructor(config: HyperSimConfig) {
    super();
    
    this.validateConfig(config);
    
    this.config = {
      ...config,
      aiEnabled: config.aiEnabled ?? true,
      timeout: config.timeout ?? 30000,
      crossLayerEnabled: config.crossLayerEnabled ?? true,
      streamingEnabled: config.streamingEnabled ?? false,
      plugins: config.plugins ?? [],
      debug: config.debug ?? false,
      security: config.security ?? {}
    };

    // Initialize security manager first
    this.securityManager = new SecurityManager(this.config.security);

    // Initialize clients
    this.hyperEvmClient = new HyperEVMClient({
      network: this.config.network,
      rpcEndpoint: this.config.rpcEndpoint,
      timeout: this.config.timeout,
      debug: this.config.debug,
    });

    this.hyperCoreClient = new HyperCoreClient({
      network: this.config.network,
      enabled: this.config.crossLayerEnabled,
      debug: this.config.debug,
    });

    // Initialize plugin system
    this.pluginSystem = new PluginSystem({ debug: this.config.debug });
    
    // Initialize WebSocket client if streaming is enabled
    if (this.config.streamingEnabled) {
      this.wsClient = new WebSocketClient({
        network: this.config.network,
        wsEndpoint: this.config.wsEndpoint,
        debug: this.config.debug,
      });
      this.setupWebSocketEventHandlers();
    }

    // Initialize AI analyzer if enabled
    if (this.config.aiEnabled && this.config.openaiApiKey) {
      this.aiAnalyzer = new AIAnalyzer({
        apiKey: this.config.openaiApiKey,
        debug: this.config.debug,
      });
    }

    // Initialize plugins
    this.initializePlugins();

    if (this.config.debug) {
      console.log('[HyperSim SDK] Initialized with config:', {
        network: this.config.network,
        aiEnabled: this.config.aiEnabled,
        crossLayerEnabled: this.config.crossLayerEnabled,
        streamingEnabled: this.config.streamingEnabled,
        pluginCount: this.config.plugins.length,
      });
    }
  }

  /**
   * Simulate a transaction on HyperEVM
   * @param transaction - Transaction to simulate
   * @returns Simulation result with success/failure prediction and analysis
   */
  async simulate(transaction: TransactionRequest): Promise<SimulationResult> {
    const requestId = this.generateRequestId();
    
    try {
      validateTransactionRequest(transaction);
      
      // Secure the request
      const securedTransaction = await this.securityManager.secureRequest({
        ...transaction,
        requestId,
        timestamp: Date.now()
      });
      
      // Execute before-simulation hooks
      await this.pluginSystem.executeHooks('before-simulation', {
        requestId,
        timestamp: Date.now(),
        data: securedTransaction
      }, securedTransaction);
      
      if (this.config.debug) {
        console.log('[HyperSim SDK] Starting simulation for transaction:', securedTransaction);
      }

      // Perform simulation on HyperEVM
      const simulationResult = await this.hyperEvmClient.simulate(securedTransaction);
      
      // Verify response integrity
      const isValidResponse = await this.securityManager.verifyResponse(simulationResult, securedTransaction);
      if (!isValidResponse) {
        throw new SimulationError('Response integrity verification failed');
      }
      
      // Fetch cross-layer data if enabled
      if (this.config.crossLayerEnabled) {
        const hyperCoreData = await this.hyperCoreClient.getRelevantData(securedTransaction);
        simulationResult.hyperCoreData = hyperCoreData;
      }

      // Execute after-simulation hooks
      await this.pluginSystem.executeHooks('after-simulation', {
        requestId,
        timestamp: Date.now(),
        data: simulationResult
      }, simulationResult);

      return simulationResult;
    } catch (error) {
      // Execute error hooks
      await this.pluginSystem.executeHooks('on-error', {
        requestId,
        timestamp: Date.now(),
        data: error
      }, error);
      
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new SimulationError(`Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get AI-powered insights for a simulation result
   * @param simulationResult - Result from simulate() method
   * @returns AI analysis with optimization suggestions and risk assessment
   */
  async getAIInsights(simulationResult: SimulationResult): Promise<AIInsights> {
    if (!this.aiAnalyzer) {
      throw new ValidationError('AI features not enabled. Initialize with aiEnabled: true and provide openaiApiKey');
    }

    const requestId = this.generateRequestId();
    
    try {
      // Execute before-ai-analysis hooks
      await this.pluginSystem.executeHooks('before-ai-analysis', {
        requestId,
        timestamp: Date.now(),
        data: simulationResult
      });
      
      const insights = await this.aiAnalyzer.analyzeSimulation(simulationResult);
      
      // Execute after-ai-analysis hooks
      await this.pluginSystem.executeHooks('after-ai-analysis', {
        requestId,
        timestamp: Date.now(),
        data: insights
      }, insights);
      
      return insights;
    } catch (error) {
      await this.pluginSystem.executeHooks('on-error', {
        requestId,
        timestamp: Date.now(),
        data: error
      }, error);
      
      throw new SimulationError(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimize a bundle of transactions
   * @param transactions - Array of transactions to optimize
   * @returns Optimization suggestions including gas savings and reordering
   */
  async optimizeBundle(transactions: TransactionRequest[]): Promise<BundleOptimization> {
    if (transactions.length === 0) {
      throw new ValidationError('Transaction bundle cannot be empty');
    }

    try {
      // Simulate each transaction
      const simulations = await Promise.all(
        transactions.map(tx => this.simulate(tx))
      );

      // Analyze bundle with AI if available
      if (this.aiAnalyzer) {
        return await this.aiAnalyzer.optimizeBundle(simulations);
      } else {
        // Basic optimization without AI
        return this.basicBundleOptimization(simulations);
      }
    } catch (error) {
      throw new SimulationError(`Bundle optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assess risk level for a transaction
   * @param transaction - Transaction to assess
   * @returns Risk level and detailed risk factors
   */
  async assessRisk(transaction: TransactionRequest): Promise<{ riskLevel: RiskLevel; factors: string[] }> {
    const simulation = await this.simulate(transaction);
    
    if (this.aiAnalyzer) {
      const insights = await this.aiAnalyzer.analyzeSimulation(simulation);
      return {
        riskLevel: insights.riskLevel,
        factors: insights.securityWarnings || []
      };
    }

    // Basic risk assessment without AI
    return this.basicRiskAssessment(simulation);
  }

  /**
   * Get network status and health metrics
   */
  async getNetworkStatus(): Promise<{
    network: Network;
    latestBlock: number;
    gasPrice: string;
    isHealthy: boolean;
  }> {
    return await this.hyperEvmClient.getNetworkStatus();
  }

  // Security-related methods

  /**
   * Get security metrics
   */
  getSecurityMetrics(): SecurityMetrics {
    return this.securityManager.getMetrics();
  }

  /**
   * Force API key rotation
   */
  async rotateAPIKeys(): Promise<void> {
    await this.securityManager.getAPIKeyManager().forceRotation();
  }

  /**
   * Create multi-signature transaction
   */
  async createMultiSigTransaction(
    transaction: TransactionRequest,
    signers: string[]
  ): Promise<any> {
    return await this.securityManager.getMultiSignature().createMultiSigTransaction(transaction, signers);
  }

  /**
   * Create secure WebSocket connection
   */
  createSecureWebSocket(url: string, options?: any) {
    return this.securityManager.createSecureWebSocket(url, options);
  }

  /**
   * Validate SDK configuration
   */
  private validateConfig(config: HyperSimConfig): void {
    validateNetwork(config.network);
    
    if (config.aiEnabled && !config.openaiApiKey) {
      throw new ValidationError('OpenAI API key required when AI features are enabled');
    }

    if (config.timeout && config.timeout < 1000) {
      throw new ValidationError('Timeout must be at least 1000ms');
    }
  }

  /**
   * Basic bundle optimization without AI
   */
  private basicBundleOptimization(simulations: SimulationResult[]): BundleOptimization {
    const totalGas = simulations.reduce((sum, sim) => sum + parseInt(sim.gasUsed), 0);
    
    return {
      originalGas: totalGas.toString(),
      optimizedGas: totalGas.toString(), // No optimization without AI
      gasSaved: '0',
      suggestions: ['Enable AI features for advanced bundle optimization'],
      reorderedIndices: simulations.map((_, index) => index) // No reordering
    };
  }

  /**
   * Basic risk assessment without AI
   */
  private basicRiskAssessment(simulation: SimulationResult): { riskLevel: RiskLevel; factors: string[] } {
    const factors: string[] = [];
    let riskLevel: RiskLevel = 'LOW';

    if (!simulation.success) {
      factors.push('Transaction simulation failed');
      riskLevel = 'HIGH';
    }

    if (parseInt(simulation.gasUsed) > 1000000) {
      factors.push('High gas usage detected');
      riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM';
    }

    return { riskLevel, factors };
  }

  /**
   * Initialize plugins
   */
  private async initializePlugins(): Promise<void> {
    for (const pluginConfig of this.config.plugins) {
      try {
        await this.pluginSystem.registerPlugin(pluginConfig);
      } catch (error) {
        console.error(`[HyperSim SDK] Failed to register plugin '${pluginConfig.plugin.name}':`, error);
      }
    }
    
    await this.pluginSystem.initialize();
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketEventHandlers(): void {
    if (!this.wsClient) return;

    this.wsClient.on('message', (message: WSMessage) => {
      this.emit('message', message);
    });

    this.wsClient.on('stateChange', (state) => {
      this.emit('connectionStateChange', state);
      
      if (state === 'connected') {
        this.pluginSystem.executeHooks('on-connect', {
          requestId: this.generateRequestId(),
          timestamp: Date.now()
        }, { endpoint: this.wsClient?.getConfig?.()?.wsEndpoint || 'unknown' });
      }
    });

    this.wsClient.on('close', (closeInfo) => {
      this.emit('connectionClosed', closeInfo);
      
      this.pluginSystem.executeHooks('on-disconnect', {
        requestId: this.generateRequestId(),
        timestamp: Date.now()
      }, closeInfo);
    });

    this.wsClient.on('error', (error) => {
      this.emit('error', error);
    });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestCounter}`;
  }

  // WebSocket streaming methods
  
  /**
   * Connect to WebSocket for real-time data
   */
  async connectWebSocket(): Promise<void> {
    if (!this.wsClient) {
      throw new ValidationError('WebSocket streaming not enabled. Initialize with streamingEnabled: true');
    }
    
    await this.wsClient.connect();
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.wsClient) {
      this.wsClient.disconnect();
    }
  }

  /**
   * Subscribe to real-time data stream
   */
  async subscribe(subscription: WSSubscription): Promise<void> {
    if (!this.wsClient) {
      throw new ValidationError('WebSocket streaming not enabled');
    }
    
    await this.wsClient.subscribe(subscription);
  }

  /**
   * Unsubscribe from data stream
   */
  async unsubscribe(subscription: WSSubscription): Promise<void> {
    if (!this.wsClient) {
      throw new ValidationError('WebSocket streaming not enabled');
    }
    
    await this.wsClient.unsubscribe(subscription);
  }

  /**
   * Check WebSocket connection status
   */
  isConnected(): boolean {
    return this.wsClient?.isConnected() || false;
  }

  // Plugin system methods
  
  /**
   * Add a plugin at runtime
   */
  async addPlugin(pluginConfig: PluginConfig): Promise<void> {
    await this.pluginSystem.registerPlugin(pluginConfig);
  }

  /**
   * Remove a plugin
   */
  async removePlugin(pluginName: string): Promise<void> {
    await this.pluginSystem.unregisterPlugin(pluginName);
  }

  /**
   * Get list of registered plugins
   */
  getPlugins(): Array<{ name: string; enabled: boolean; version: string }> {
    return this.pluginSystem.getPlugins();
  }

  /**
   * Enable/disable a plugin
   */
  async enablePlugin(pluginName: string, enabled: boolean = true): Promise<void> {
    if (enabled) {
      await this.pluginSystem.enablePlugin(pluginName);
    } else {
      await this.pluginSystem.disablePlugin(pluginName);
    }
  }

  /**
   * Cleanup and shutdown SDK
   */
  async shutdown(): Promise<void> {
    if (this.wsClient) {
      this.wsClient.disconnect();
    }
    
    // Shutdown security manager
    await this.securityManager.shutdown();
    
    await this.pluginSystem.shutdown();
    
    this.removeAllListeners();
    
    if (this.config.debug) {
      console.log('[HyperSim SDK] Shutdown complete');
    }
  }
