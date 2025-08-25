/**
 * HyperEVM client for blockchain interactions
 */

import { ethers } from 'ethers';
import { Network, NetworkConfig, NetworkStatus, BlockInfo, BlockType } from '../types/network';
import { TransactionRequest, SimulationResult } from '../types/simulation';
import { NetworkError, SimulationError, TimeoutError } from '../types/errors';
import { NETWORK_CONFIGS } from '../utils/constants';
import { formatTransactionRequest } from '../utils/formatters';

/**
 * Configuration for HyperEVM client
 */
export interface HyperEVMClientConfig {
  /** Target network */
  network: Network;
  /** Custom RPC endpoint (optional) */
  rpcEndpoint?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Client for interacting with HyperEVM network
 */
export class HyperEVMClient {
  private readonly config: Required<HyperEVMClientConfig>;
  private readonly provider: ethers.JsonRpcProvider;
  private readonly networkConfig: NetworkConfig;

  constructor(config: HyperEVMClientConfig) {
    this.config = {
      ...config,
      timeout: config.timeout ?? 30000,
      debug: config.debug ?? false,
    };

    this.networkConfig = NETWORK_CONFIGS[this.config.network];
    const rpcUrl = this.config.rpcEndpoint || this.networkConfig.rpcUrl;

    // Initialize ethers provider with timeout
    this.provider = new ethers.JsonRpcProvider(rpcUrl, {
      name: this.networkConfig.displayName,
      chainId: this.networkConfig.chainId,
    });

    if (this.config.debug) {
      console.log('[HyperEVM Client] Initialized with network:', this.config.network, 'RPC:', rpcUrl);
    }
  }

  /**
   * Simulate a transaction on HyperEVM
   */
  async simulate(transaction: TransactionRequest): Promise<SimulationResult> {
    try {
      const formattedTx = formatTransactionRequest(transaction);
      
      if (this.config.debug) {
        console.log('[HyperEVM Client] Simulating transaction:', formattedTx);
      }

      // Use eth_call for simulation
      const callResult = await this.provider.call({
        from: formattedTx.from,
        to: formattedTx.to,
        value: formattedTx.value,
        data: formattedTx.data,
        gasLimit: formattedTx.gasLimit,
        gasPrice: formattedTx.gasPrice,
      });

      // Estimate gas usage
      const gasEstimate = await this.provider.estimateGas({
        from: formattedTx.from,
        to: formattedTx.to,
        value: formattedTx.value,
        data: formattedTx.data,
      });

      // Get current block to determine block type and estimate inclusion
      const currentBlock = await this.provider.getBlock('latest');
      if (!currentBlock) {
        throw new NetworkError('Unable to fetch current block');
      }

      // Determine block type based on gas usage
      const blockType = this.determineBlockType(gasEstimate);
      const estimatedBlock = currentBlock.number + (blockType === BlockType.SMALL ? 1 : 1);

      const result: SimulationResult = {
        success: true,
        gasUsed: gasEstimate.toString(),
        returnData: callResult,
        blockType,
        estimatedBlock,
        stateChanges: [],
        events: [],
      };

      if (this.config.debug) {
        console.log('[HyperEVM Client] Simulation successful:', result);
      }

      return result;
    } catch (error: any) {
      if (this.config.debug) {
        console.error('[HyperEVM Client] Simulation failed:', error);
      }

      // Handle different types of errors
      if (error.code === 'TIMEOUT') {
        throw new TimeoutError('Transaction simulation timed out', this.config.timeout);
      }

      if (error.reason || error.message?.includes('revert')) {
        const revertReason = error.reason || error.message;
        return {
          success: false,
          gasUsed: '0',
          error: 'Transaction would revert',
          revertReason,
          blockType: BlockType.SMALL,
          estimatedBlock: 0,
          stateChanges: [],
          events: [],
        };
      }

      throw new SimulationError(`HyperEVM simulation failed: ${error.message}`);
    }
  }

  /**
   * Get network status and health information
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    try {
      const [latestBlock, gasPrice, blockTime] = await Promise.all([
        this.provider.getBlockNumber(),
        this.provider.getFeeData(),
        this.getAverageBlockTime(),
      ]);

      return {
        network: this.config.network,
        latestBlock,
        gasPrice: gasPrice.gasPrice?.toString() || '0',
        isHealthy: true,
        avgBlockTime: blockTime,
        congestionLevel: this.assessCongestionLevel(gasPrice.gasPrice?.toString() || '0'),
      };
    } catch (error) {
      if (this.config.debug) {
        console.error('[HyperEVM Client] Failed to get network status:', error);
      }
      throw new NetworkError(`Failed to get network status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get block information
   */
  async getBlockInfo(blockNumber?: number): Promise<BlockInfo> {
    try {
      const block = await this.provider.getBlock(blockNumber ?? 'latest');
      if (!block) {
        throw new NetworkError('Block not found');
      }

      const blockType = this.determineBlockTypeFromGasLimit(block.gasLimit);

      return {
        number: block.number,
        hash: block.hash,
        type: blockType,
        timestamp: block.timestamp,
        gasLimit: block.gasLimit.toString(),
        gasUsed: block.gasUsed.toString(),
        transactionCount: block.transactions.length,
      };
    } catch (error) {
      throw new NetworkError(`Failed to get block info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      throw new NetworkError(`Failed to get transaction receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address: string, blockTag?: string | number): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address, blockTag);
      return balance.toString();
    } catch (error) {
      throw new NetworkError(`Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get account nonce
   */
  async getNonce(address: string, blockTag?: string | number): Promise<number> {
    try {
      return await this.provider.getTransactionCount(address, blockTag);
    } catch (error) {
      throw new NetworkError(`Failed to get nonce: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Determine block type based on gas usage
   */
  private determineBlockType(gasUsed: bigint): BlockType {
    // Small blocks: up to 2M gas, Large blocks: up to 30M gas
    const SMALL_BLOCK_LIMIT = 2_000_000n;
    return gasUsed <= SMALL_BLOCK_LIMIT ? BlockType.SMALL : BlockType.LARGE;
  }

  /**
   * Determine block type from gas limit
   */
  private determineBlockTypeFromGasLimit(gasLimit: bigint): BlockType {
    const SMALL_BLOCK_LIMIT = 2_500_000n; // Small block limit with buffer
    return gasLimit <= SMALL_BLOCK_LIMIT ? BlockType.SMALL : BlockType.LARGE;
  }

  /**
   * Get average block time
   */
  private async getAverageBlockTime(): Promise<number> {
    try {
      const [currentBlock, pastBlock] = await Promise.all([
        this.provider.getBlock('latest'),
        this.provider.getBlock('latest').then(b => 
          b ? this.provider.getBlock(b.number - 10) : null
        ),
      ]);

      if (!currentBlock || !pastBlock) {
        return 1; // Default to 1 second (small block interval)
      }

      const timeDiff = currentBlock.timestamp - pastBlock.timestamp;
      const blockDiff = currentBlock.number - pastBlock.number;
      
      return blockDiff > 0 ? timeDiff / blockDiff : 1;
    } catch {
      return 1; // Default fallback
    }
  }

  /**
   * Assess network congestion level
   */
  private assessCongestionLevel(gasPrice: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    // These thresholds are estimates and may need adjustment
    if (gasPriceGwei < 10) return 'LOW';
    if (gasPriceGwei < 50) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Get the underlying ethers provider
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(): NetworkConfig {
    return this.networkConfig;
  }
}
