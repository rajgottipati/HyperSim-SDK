import { Network } from '../types/network';
import { TransactionRequest, SimulationResult, BundleOptimization } from '../types/simulation';
import { AIInsights, RiskLevel } from '../types/ai';
import { HyperEVMClient } from '../clients/HyperEVMClient';
import { HyperCoreClient } from '../clients/HyperCoreClient';
import { AIAnalyzer } from '../ai/AIAnalyzer';
import { ValidationError, SimulationError, NetworkError } from '../types/errors';
import { validateTransactionRequest, validateNetwork } from '../utils/validators';

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
  /** Enable verbose logging */
  debug?: boolean;
}

/**
 * Main SDK class for HyperEVM transaction simulation
 * 
 * Provides comprehensive transaction simulation capabilities with:
 * - Real HyperEVM network integration
 * - Cross-layer HyperCore data access
 * - AI-powered analysis and optimization
 * - Production-ready error handling
 */
export class HyperSimSDK {
  private readonly config: Required<HyperSimConfig>;
  private readonly hyperEvmClient: HyperEVMClient;
  private readonly hyperCoreClient: HyperCoreClient;
  private readonly aiAnalyzer?: AIAnalyzer;

  /**
   * Initialize HyperSim SDK
   * @param config - SDK configuration
   */
  constructor(config: HyperSimConfig) {
    this.validateConfig(config);
    
    this.config = {
      ...config,
      aiEnabled: config.aiEnabled ?? true,
      timeout: config.timeout ?? 30000,
      crossLayerEnabled: config.crossLayerEnabled ?? true,
      debug: config.debug ?? false,
    };

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

    // Initialize AI analyzer if enabled
    if (this.config.aiEnabled && this.config.openaiApiKey) {
      this.aiAnalyzer = new AIAnalyzer({
        apiKey: this.config.openaiApiKey,
        debug: this.config.debug,
      });
    }

    if (this.config.debug) {
      console.log('[HyperSim SDK] Initialized with config:', {
        network: this.config.network,
        aiEnabled: this.config.aiEnabled,
        crossLayerEnabled: this.config.crossLayerEnabled,
      });
    }
  }

  /**
   * Simulate a transaction on HyperEVM
   * @param transaction - Transaction to simulate
   * @returns Simulation result with success/failure prediction and analysis
   */
  async simulate(transaction: TransactionRequest): Promise<SimulationResult> {
    try {
      validateTransactionRequest(transaction);
      
      if (this.config.debug) {
        console.log('[HyperSim SDK] Starting simulation for transaction:', transaction);
      }

      // Perform simulation on HyperEVM
      const simulationResult = await this.hyperEvmClient.simulate(transaction);
      
      // Fetch cross-layer data if enabled
      if (this.config.crossLayerEnabled) {
        const hyperCoreData = await this.hyperCoreClient.getRelevantData(transaction);
        simulationResult.hyperCoreData = hyperCoreData;
      }

      return simulationResult;
    } catch (error) {
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

    try {
      return await this.aiAnalyzer.analyzeSimulation(simulationResult);
    } catch (error) {
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
}
