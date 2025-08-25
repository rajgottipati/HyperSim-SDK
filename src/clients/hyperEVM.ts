/**
 * HyperEVM RPC client for blockchain interactions
 * Handles JSON-RPC communication with HyperEVM nodes
 */

import { NetworkError, APIError, TimeoutError, ValidationError } from '../core/errors.js';
import { validateAddress, validateTransactionHash } from '../utils/validators.js';
import { RequestOptions, Response } from '../types/common.js';
import { 
  HyperEVMTransaction, 
  TransactionReceipt, 
  Block, 
  CallOptions, 
  FilterOptions,
  RPCRequest,
  RPCResponse,
  GasEstimation
} from '../types/hyperevm.js';

/**
 * Configuration options for HyperEVM client
 */
interface HyperEVMClientOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  userAgent?: string;
}

/**
 * HyperEVM RPC client
 */
export class HyperEVMClient {
  private rpcUrl: string;
  private options: Required<HyperEVMClientOptions>;
  private requestId = 1;

  constructor(rpcUrl: string, options: HyperEVMClientOptions = {}) {
    this.rpcUrl = rpcUrl;
    this.options = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      userAgent: 'HyperSim-SDK/1.0.0',
      ...options
    };
  }

  /**
   * Make a raw JSON-RPC call
   */
  public async call<T = any>(
    method: string,
    params: any[] = [],
    timeout?: number
  ): Promise<T> {
    const request: RPCRequest = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    };

    const response = await this.makeRequest(request, timeout);
    
    if (response.error) {
      throw new APIError(
        `RPC error: ${response.error.message}`,
        response.error.code,
        response.error.data
      );
    }

    return response.result as T;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    request: RPCRequest,
    timeout?: number
  ): Promise<RPCResponse<T>> {
    const requestTimeout = timeout || this.options.timeout;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

        const response = await fetch(this.rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': this.options.userAgent
          },
          body: JSON.stringify(request),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new APIError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status
          );
        }

        const data = await response.json();
        return data as RPCResponse<T>;
      } catch (error: any) {
        lastError = error;
        
        if (error.name === 'AbortError') {
          lastError = new TimeoutError('RPC request', requestTimeout);
        } else if (error.message.includes('fetch')) {
          lastError = new NetworkError(`Network request failed: ${error.message}`);
        }

        // Don't retry on validation errors or non-retryable API errors
        if (error instanceof ValidationError || 
            (error instanceof APIError && error.statusCode && error.statusCode < 500 && error.statusCode !== 429)) {
          break;
        }

        // Wait before retrying
        if (attempt < this.options.retries) {
          await new Promise(resolve => 
            setTimeout(resolve, this.options.retryDelay * attempt)
          );
        }
      }
    }

    throw lastError || new NetworkError('Request failed after all retries');
  }

  // Standard Ethereum RPC methods

  /**
   * Get the current block number
   */
  public async getBlockNumber(): Promise<number> {
    const result = await this.call('eth_blockNumber');
    return parseInt(result, 16);
  }

  /**
   * Get block by hash or number
   */
  public async getBlock(
    blockHashOrNumber: string | number,
    includeTransactions = false
  ): Promise<Block> {
    const blockId = typeof blockHashOrNumber === 'number' 
      ? `0x${blockHashOrNumber.toString(16)}`
      : blockHashOrNumber;
      
    return this.call('eth_getBlockByHash', [blockId, includeTransactions]);
  }

  /**
   * Get transaction by hash
   */
  public async getTransaction(hash: string): Promise<HyperEVMTransaction> {
    if (!validateTransactionHash(hash)) {
      throw new ValidationError('Invalid transaction hash', 'hash', hash);
    }
    
    return this.call('eth_getTransactionByHash', [hash]);
  }

  /**
   * Get transaction receipt
   */
  public async getTransactionReceipt(hash: string): Promise<TransactionReceipt | null> {
    if (!validateTransactionHash(hash)) {
      throw new ValidationError('Invalid transaction hash', 'hash', hash);
    }
    
    return this.call('eth_getTransactionReceipt', [hash]);
  }

  /**
   * Get account balance
   */
  public async getBalance(
    address: string,
    blockNumber: number | string = 'latest'
  ): Promise<string> {
    if (!validateAddress(address)) {
      throw new ValidationError('Invalid address', 'address', address);
    }
    
    const blockId = typeof blockNumber === 'number'
      ? `0x${blockNumber.toString(16)}`
      : blockNumber;
      
    return this.call('eth_getBalance', [address, blockId]);
  }

  /**
   * Get account nonce
   */
  public async getNonce(
    address: string,
    blockNumber: number | string = 'latest'
  ): Promise<number> {
    if (!validateAddress(address)) {
      throw new ValidationError('Invalid address', 'address', address);
    }
    
    const blockId = typeof blockNumber === 'number'
      ? `0x${blockNumber.toString(16)}`
      : blockNumber;
      
    const result = await this.call('eth_getTransactionCount', [address, blockId]);
    return parseInt(result, 16);
  }

  /**
   * Call contract method (read-only)
   */
  public async callContract(
    options: CallOptions,
    blockNumber: number | string = 'latest'
  ): Promise<string> {
    const blockId = typeof blockNumber === 'number'
      ? `0x${blockNumber.toString(16)}`
      : blockNumber;
      
    return this.call('eth_call', [options, blockId]);
  }

  /**
   * Estimate gas for transaction
   */
  public async estimateGas(options: CallOptions): Promise<number> {
    const result = await this.call('eth_estimateGas', [options]);
    return parseInt(result, 16);
  }

  /**
   * Get current gas price
   */
  public async getGasPrice(): Promise<string> {
    return this.call('eth_gasPrice');
  }

  /**
   * Send raw transaction
   */
  public async sendRawTransaction(signedTransaction: string): Promise<string> {
    return this.call('eth_sendRawTransaction', [signedTransaction]);
  }

  /**
   * Get contract code
   */
  public async getCode(
    address: string,
    blockNumber: number | string = 'latest'
  ): Promise<string> {
    if (!validateAddress(address)) {
      throw new ValidationError('Invalid address', 'address', address);
    }
    
    const blockId = typeof blockNumber === 'number'
      ? `0x${blockNumber.toString(16)}`
      : blockNumber;
      
    return this.call('eth_getCode', [address, blockId]);
  }

  /**
   * Get storage value at position
   */
  public async getStorageAt(
    address: string,
    position: string,
    blockNumber: number | string = 'latest'
  ): Promise<string> {
    if (!validateAddress(address)) {
      throw new ValidationError('Invalid address', 'address', address);
    }
    
    const blockId = typeof blockNumber === 'number'
      ? `0x${blockNumber.toString(16)}`
      : blockNumber;
      
    return this.call('eth_getStorageAt', [address, position, blockId]);
  }

  /**
   * Get logs matching filter
   */
  public async getLogs(filter: FilterOptions): Promise<any[]> {
    // Convert block numbers to hex
    const processedFilter = { ...filter };
    
    if (typeof filter.fromBlock === 'number') {
      processedFilter.fromBlock = `0x${filter.fromBlock.toString(16)}`;
    }
    
    if (typeof filter.toBlock === 'number') {
      processedFilter.toBlock = `0x${filter.toBlock.toString(16)}`;
    }
    
    return this.call('eth_getLogs', [processedFilter]);
  }

  /**
   * Create new filter
   */
  public async newFilter(filter: FilterOptions): Promise<string> {
    return this.call('eth_newFilter', [filter]);
  }

  /**
   * Get filter changes
   */
  public async getFilterChanges(filterId: string): Promise<any[]> {
    return this.call('eth_getFilterChanges', [filterId]);
  }

  /**
   * Get chain ID
   */
  public async getChainId(): Promise<number> {
    const result = await this.call('eth_chainId');
    return parseInt(result, 16);
  }

  /**
   * Get network ID
   */
  public async getNetworkId(): Promise<number> {
    const result = await this.call('net_version');
    return parseInt(result, 10);
  }

  /**
   * Check if client is syncing
   */
  public async getSyncing(): Promise<boolean | object> {
    return this.call('eth_syncing');
  }

  /**
   * Get fee history (EIP-1559 support)
   */
  public async getFeeHistory(
    blockCount: number,
    newestBlock: number | string = 'latest',
    rewardPercentiles?: number[]
  ): Promise<any> {
    const blockId = typeof newestBlock === 'number'
      ? `0x${newestBlock.toString(16)}`
      : newestBlock;
      
    return this.call('eth_feeHistory', [
      `0x${blockCount.toString(16)}`,
      blockId,
      rewardPercentiles
    ]);
  }

  /**
   * Get gas estimation with detailed breakdown
   */
  public async getGasEstimation(
    transaction: Partial<HyperEVMTransaction>
  ): Promise<GasEstimation> {
    const gasLimit = await this.estimateGas(transaction as CallOptions);
    const gasPrice = await this.getGasPrice();
    
    // Determine block type based on gas usage
    const blockType = gasLimit <= 2000000 ? 'small' : 'large';
    const confirmationTime = blockType === 'small' ? 1 : 60;
    
    const estimatedCost = (BigInt(gasLimit) * BigInt(gasPrice)).toString();
    
    return {
      gasLimit,
      gasPrice,
      estimatedCost,
      recommendedBlockType: blockType,
      estimatedConfirmationTime: confirmationTime
    };
  }

  /**
   * Batch multiple RPC calls
   */
  public async batch(calls: { method: string; params: any[] }[]): Promise<any[]> {
    const requests = calls.map((call, index) => ({
      jsonrpc: '2.0' as const,
      id: this.requestId + index,
      method: call.method,
      params: call.params
    }));
    
    this.requestId += calls.length;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
    
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.options.userAgent
        },
        body: JSON.stringify(requests),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new APIError(`HTTP ${response.status}: ${response.statusText}`, response.status);
      }
      
      const results = await response.json();
      return Array.isArray(results) ? results.map(r => r.result) : [results.result];
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new TimeoutError('Batch RPC request', this.options.timeout);
      }
      throw error;
    }
  }

  /**
   * Update client configuration
   */
  public updateConfig(options: Partial<HyperEVMClientOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current configuration
   */
  public getConfig(): Required<HyperEVMClientOptions> {
    return { ...this.options };
  }

  /**
   * Get RPC URL
   */
  public getRpcUrl(): string {
    return this.rpcUrl;
  }
}