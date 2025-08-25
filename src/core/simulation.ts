/**
 * Transaction simulation engine for HyperSim SDK
 * Handles transaction simulation, state analysis, and cross-layer integration
 */

import { HyperEVMClient } from '../clients/hyperEVM.js';
import { HyperCoreClient } from '../clients/hyperCore.js';
import { SimulateOptions, SimulateResult, StateChange } from '../types/common.js';
import { HyperEVMTransaction, BlockType, GasEstimation } from '../types/hyperevm.js';
import { SimulationError, ValidationError } from './errors.js';
import { validateTransaction } from '../utils/validators.js';
import { formatWei, formatGas } from '../utils/formatters.js';

/**
 * Transaction simulation engine
 */
export class TransactionSimulator {
  constructor(
    private hyperEVMClient: HyperEVMClient,
    private hyperCoreClient: HyperCoreClient
  ) {}

  /**
   * Simulate transaction execution
   */
  public async simulateTransaction(options: SimulateOptions): Promise<SimulateResult> {
    try {
      // Validate transaction
      const validationErrors = validateTransaction(options.transaction);
      if (validationErrors.length > 0) {
        throw new ValidationError(
          `Invalid transaction: ${validationErrors.map(e => e.message).join(', ')}`
        );
      }

      // Perform simulation
      const simulationResult = await this.executeSimulation(options);
      
      // Fetch HyperCore data if requested
      if (options.hyperCoreData) {
        simulationResult.hyperCoreData = await this.fetchHyperCoreData(options.transaction);
      }

      // Add dual-block analysis
      if (options.dualBlocks) {
        simulationResult.blockTypeRecommendation = this.analyzeBlockType(simulationResult.gasUsed);
      }

      return simulationResult;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new SimulationError(
        `Transaction simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        (options.transaction as any).hash,
        undefined,
        { originalError: error }
      );
    }
  }

  /**
   * Execute the core simulation logic
   */
  private async executeSimulation(options: SimulateOptions): Promise<SimulateResult> {
    const transaction = options.transaction;
    const blockNumber = options.blockNumber || 'latest';

    try {
      // Use eth_call to simulate the transaction
      const callResult = await this.hyperEVMClient.call({
        from: transaction.from,
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        gas: transaction.gas,
        gasPrice: transaction.gasPrice
      }, blockNumber);

      // Estimate gas usage
      const gasEstimate = await this.hyperEVMClient.estimateGas({
        from: transaction.from,
        to: transaction.to,
        value: transaction.value,
        data: transaction.data
      });

      // Calculate transaction cost
      const gasPrice = transaction.gasPrice || '0';
      const estimatedCost = this.calculateTransactionCost(gasEstimate, gasPrice);

      // Analyze state changes (simplified)
      const stateChanges = await this.analyzeStateChanges(transaction, blockNumber);

      return {
        success: true,
        gasUsed: gasEstimate,
        gasPrice,
        result: callResult,
        stateChanges,
        estimatedCost,
        timestamp: Date.now()
      };
    } catch (error: any) {
      // Handle simulation failure
      return {
        success: false,
        gasUsed: 0,
        gasPrice: transaction.gasPrice || '0',
        error: error.message || 'Simulation failed',
        estimatedCost: '0',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Fetch HyperCore cross-layer data
   */
  private async fetchHyperCoreData(transaction: HyperEVMTransaction): Promise<any> {
    try {
      const crossLayerData: any = {};

      // If transaction involves a user address, fetch their L1 state
      if (transaction.from) {
        try {
          // Fetch user positions
          crossLayerData.positions = await this.hyperCoreClient.getUserPositions(transaction.from);
          
          // Fetch user balances
          crossLayerData.balances = await this.hyperCoreClient.getUserBalances(transaction.from);
        } catch (error) {
          console.warn('Failed to fetch HyperCore user data:', error);
        }
      }

      // Fetch current L1 block info
      try {
        crossLayerData.l1Block = await this.hyperCoreClient.getCurrentL1Block();
      } catch (error) {
        console.warn('Failed to fetch L1 block info:', error);
      }

      // Fetch relevant asset prices if available
      try {
        crossLayerData.prices = await this.hyperCoreClient.getAssetPrices(['ETH', 'BTC', 'SOL']);
      } catch (error) {
        console.warn('Failed to fetch asset prices:', error);
      }

      return crossLayerData;
    } catch (error) {
      console.warn('Failed to fetch HyperCore data:', error);
      return null;
    }
  }

  /**
   * Analyze state changes from transaction
   */
  private async analyzeStateChanges(
    transaction: HyperEVMTransaction,
    blockNumber: number | string
  ): Promise<StateChange[]> {
    const stateChanges: StateChange[] = [];

    try {
      // For value transfers, add balance change
      if (transaction.value && Number(transaction.value) > 0 && transaction.to) {
        // Get current balances
        const fromBalance = await this.hyperEVMClient.getBalance(transaction.from, blockNumber);
        const toBalance = transaction.to ? await this.hyperEVMClient.getBalance(transaction.to, blockNumber) : '0';

        const value = BigInt(transaction.value);
        
        stateChanges.push({
          address: transaction.from,
          key: 'balance',
          before: fromBalance,
          after: (BigInt(fromBalance) - value).toString()
        });

        if (transaction.to) {
          stateChanges.push({
            address: transaction.to,
            key: 'balance',
            before: toBalance,
            after: (BigInt(toBalance) + value).toString()
          });
        }
      }

      // For contract interactions, this would analyze storage changes
      // This is a simplified implementation
      if (transaction.data && transaction.data !== '0x' && transaction.to) {
        stateChanges.push({
          address: transaction.to,
          key: 'contract_state',
          before: 'unknown',
          after: 'modified'
        });
      }
    } catch (error) {
      console.warn('Failed to analyze state changes:', error);
    }

    return stateChanges;
  }

  /**
   * Calculate transaction cost in HYPE
   */
  private calculateTransactionCost(gasUsed: number, gasPrice: string): string {
    if (!gasPrice || gasPrice === '0') {
      return '0';
    }

    const cost = BigInt(gasUsed) * BigInt(gasPrice);
    return formatWei(cost.toString());
  }

  /**
   * Analyze optimal block type for dual-block system
   */
  private analyzeBlockType(gasUsed: number): {
    recommended: BlockType;
    reasoning: string;
    estimatedConfirmationTime: number;
  } {
    const SMALL_BLOCK_GAS_LIMIT = 2000000; // 2M gas
    
    if (gasUsed <= SMALL_BLOCK_GAS_LIMIT) {
      return {
        recommended: 'small',
        reasoning: `Transaction uses ${formatGas(gasUsed)} gas, which fits in small blocks (≤${formatGas(SMALL_BLOCK_GAS_LIMIT)})`,
        estimatedConfirmationTime: 1 // 1 second
      };
    } else {
      return {
        recommended: 'large',
        reasoning: `Transaction uses ${formatGas(gasUsed)} gas, which requires large blocks (>${formatGas(SMALL_BLOCK_GAS_LIMIT)})`,
        estimatedConfirmationTime: 60 // 60 seconds
      };
    }
  }

  /**
   * Batch simulate multiple transactions
   */
  public async simulateBatch(transactions: SimulateOptions[]): Promise<SimulateResult[]> {
    const results: SimulateResult[] = [];
    
    for (const options of transactions) {
      try {
        const result = await this.simulateTransaction(options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          gasUsed: 0,
          gasPrice: '0',
          error: error instanceof Error ? error.message : 'Batch simulation failed',
          estimatedCost: '0',
          timestamp: Date.now()
        });
      }
    }
    
    return results;
  }

  /**
   * Simulate with different gas prices to find optimal pricing
   */
  public async simulateWithGasPriceOptimization(
    options: SimulateOptions,
    gasPriceRange: { min: string; max: string; steps: number }
  ): Promise<{
    simulations: (SimulateResult & { gasPrice: string; totalCost: string })[];
    recommended: { gasPrice: string; reasoning: string };
  }> {
    const simulations: (SimulateResult & { gasPrice: string; totalCost: string })[] = [];
    
    const minPrice = BigInt(gasPriceRange.min);
    const maxPrice = BigInt(gasPriceRange.max);
    const steps = gasPriceRange.steps;
    const stepSize = (maxPrice - minPrice) / BigInt(steps - 1);
    
    for (let i = 0; i < steps; i++) {
      const gasPrice = (minPrice + BigInt(i) * stepSize).toString();
      const simulationOptions = {
        ...options,
        transaction: {
          ...options.transaction,
          gasPrice
        }
      };
      
      try {
        const result = await this.simulateTransaction(simulationOptions);
        const totalCost = this.calculateTransactionCost(result.gasUsed, gasPrice);
        
        simulations.push({
          ...result,
          gasPrice,
          totalCost
        });
      } catch (error) {
        // Skip failed simulations
        continue;
      }
    }
    
    // Recommend the middle gas price that still confirms quickly
    const recommendedIndex = Math.floor(simulations.length / 3); // Lower third for faster confirmation
    const recommended = simulations[recommendedIndex];
    
    return {
      simulations,
      recommended: {
        gasPrice: recommended.gasPrice,
        reasoning: `Recommended gas price balances cost (${recommended.totalCost} HYPE) with confirmation speed`
      }
    };
  }

  /**
   * Estimate confirmation time based on network conditions
   */
  public async estimateConfirmationTime(
    gasPrice: string,
    gasLimit: number
  ): Promise<{
    blockType: BlockType;
    estimatedTime: number;
    confidence: number;
  }> {
    const blockType: BlockType = gasLimit <= 2000000 ? 'small' : 'large';
    
    // In a real implementation, this would analyze current network conditions
    const baseTime = blockType === 'small' ? 1 : 60; // seconds
    const confidence = 0.85; // 85% confidence
    
    return {
      blockType,
      estimatedTime: baseTime,
      confidence
    };
  }
}