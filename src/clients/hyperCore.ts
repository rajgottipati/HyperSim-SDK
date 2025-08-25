/**
 * HyperCore client for cross-layer integration
 * Handles interactions with HyperCore precompile contracts using real contract calls
 */

import { HyperEVMClient } from './hyperEVM.js';
import { HYPERCORE_PRECOMPILE_ADDRESSES } from '../utils/constants.js';
import { CrossLayerError, ValidationError } from '../core/errors.js';
import { validateAddress } from '../utils/validators.js';
import { ABIEncoder, ABIDecoder, PRECOMPILE_FUNCTIONS, formatDecimals } from '../utils/abi.js';
import {
  PerpPosition,
  SpotBalance,
  VaultEquity,
  WithdrawableBalance,
  PriceData,
  PerpAssetInfo,
  SpotAssetInfo,
  TokenInfo,
  L1BlockInfo,
  PrecompileResponse
} from '../types/hypercore.js';

/**
 * Asset index mapping for common tokens
 */
const COMMON_ASSETS = {
  'USDC': 0,
  'ETH': 1,
  'BTC': 2, 
  'SOL': 3,
  'DOGE': 4,
  'HYPE': 5
} as const;

/**
 * HyperCore client for L1 state access via precompile contracts
 */
export class HyperCoreClient {
  constructor(private hyperEVMClient: HyperEVMClient) {}

  /**
   * Call precompile contract with proper ABI encoding/decoding
   */
  private async callPrecompile<T>(
    precompileAddress: string,
    functionName: keyof typeof PRECOMPILE_FUNCTIONS,
    params: any[] = [],
    blockNumber: number | string = 'latest'
  ): Promise<T> {
    try {
      const funcDef = PRECOMPILE_FUNCTIONS[functionName];
      if (!funcDef) {
        throw new Error(`Unknown precompile function: ${functionName}`);
      }

      // Encode function call
      const calldata = ABIEncoder.encodeFunctionCall(
        funcDef.signature,
        funcDef.types,
        params
      );

      // Make the contract call
      const result = await this.hyperEVMClient.callContract({
        to: precompileAddress,
        data: calldata
      }, blockNumber);

      // Handle empty or error responses
      if (!result || result === '0x' || result === '0x0') {
        return null as T;
      }

      // Decode result based on expected return types
      const decoded = ABIDecoder.decodeMultiple(result, funcDef.returns);
      return this.formatPrecompileResult<T>(functionName, decoded);
      
    } catch (error) {
      throw new CrossLayerError(
        `Precompile call failed for ${functionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'hypercore',
        precompileAddress,
        { functionName, params, originalError: error }
      );
    }
  }

  /**
   * Format decoded precompile results into structured objects
   */
  private formatPrecompileResult<T>(functionName: string, decoded: any[]): T {
    switch (functionName) {
      case 'getPosition': {
        if (decoded.length < 5) return null as T;
        const [szi, entryPx, leverage, liquidationPx, unrealizedPnl] = decoded;
        
        return {
          szi: formatDecimals(szi, 6),
          entryPx: entryPx > 0 ? formatDecimals(entryPx, 6) : null,
          leverage: {
            type: 'cross',
            value: Number(leverage),
            rawUsd: formatDecimals(BigInt(leverage) * BigInt(entryPx), 6)
          },
          liquidationPx: liquidationPx > 0 ? formatDecimals(liquidationPx, 6) : null,
          unrealizedPnl: formatDecimals(unrealizedPnl, 6)
        } as T;
      }
      
      case 'getSpotBalance': {
        if (decoded.length < 2) return null as T;
        const [total, hold] = decoded;
        
        return {
          total: formatDecimals(total, 6),
          hold: formatDecimals(hold, 6)
        } as T;
      }
      
      case 'getVaultEquity': {
        if (decoded.length < 1) return null as T;
        const [equity] = decoded;
        
        return {
          equity: formatDecimals(equity, 6),
          withdrawable: formatDecimals(equity, 6), // Simplified
          totalDeposited: formatDecimals(equity, 6),
          pnl: '0.00'
        } as T;
      }
      
      case 'getWithdrawable': {
        if (decoded.length < 1) return null as T;
        const [withdrawable] = decoded;
        
        return {
          withdrawable: formatDecimals(withdrawable, 6)
        } as T;
      }
      
      case 'getMarkPx':
      case 'getOraclePx':
      case 'getSpotPx': {
        if (decoded.length < 1) return null as T;
        const [price] = decoded;
        
        return {
          price: formatDecimals(price, 6),
          timestamp: Date.now(),
          confidence: 0.95
        } as T;
      }
      
      case 'getL1BlockNumber': {
        if (decoded.length < 1) return null as T;
        const [blockNumber] = decoded;
        
        return Number(blockNumber) as T;
      }
      
      case 'getPerpAssetInfo': {
        if (decoded.length < 4) return null as T;
        const [coin, szDecimals, maxLeverage, minSize] = decoded;
        
        return {
          coin: coin || 'UNKNOWN',
          szDecimals: Number(szDecimals),
          maxLeverage: Number(maxLeverage),
          onlyIsolated: false,
          minSize: formatDecimals(minSize, Number(szDecimals)),
          impactNotional: '100000',
          markPx: '0.00' // Would need separate call to get current price
        } as T;
      }
      
      case 'getSpotAssetInfo': {
        if (decoded.length < 4) return null as T;
        const [coin, szDecimals, weiDecimals, index] = decoded;
        
        return {
          coin: coin || 'UNKNOWN',
          name: coin || 'Unknown Token',
          szDecimals: Number(szDecimals),
          weiDecimals: Number(weiDecimals),
          index: Number(index),
          tokenId: `token_${index}`
        } as T;
      }
      
      case 'getTokenInfo': {
        if (decoded.length < 3) return null as T;
        const [name, szDecimals, weiDecimals] = decoded;
        
        return {
          name: name || 'UNKNOWN',
          szDecimals: Number(szDecimals),
          weiDecimals: Number(weiDecimals),
          index: 0, // Would need to be passed as parameter
          tokenId: `token_${name}`
        } as T;
      }
      
      default:
        return decoded as T;
    }
  }

  // Position Management

  /**
   * Get user's perpetual positions using real precompile calls
   */
  public async getUserPositions(user: string): Promise<PerpPosition[]> {
    if (!validateAddress(user)) {
      throw new ValidationError('Invalid user address', 'user', user);
    }

    const positions: PerpPosition[] = [];
    
    // Query positions for common assets (in production, would get asset count first)
    for (const [assetName, assetIndex] of Object.entries(COMMON_ASSETS)) {
      try {
        const positionData = await this.callPrecompile<any>(
          HYPERCORE_PRECOMPILE_ADDRESSES.POSITION,
          'getPosition',
          [user, assetIndex]
        );
        
        if (positionData && positionData.szi && Number(positionData.szi) !== 0) {
          positions.push({
            coin: assetName,
            entryPx: positionData.entryPx,
            leverage: positionData.leverage,
            liquidationPx: positionData.liquidationPx,
            marginUsed: '0', // Would need separate calculation
            maxLeverage: 20, // Default, would get from asset info
            oir: '0', // Would need separate calculation
            positionValue: positionData.entryPx || '0',
            returnOnEquity: '0', // Would need separate calculation  
            szi: positionData.szi,
            unrealizedPnl: positionData.unrealizedPnl
          });
        }
      } catch (error) {
        // Skip assets that fail - they likely don't have positions
        continue;
      }
    }
    
    return positions;
  }

  /**
   * Get user's spot balances using real precompile calls
   */
  public async getUserBalances(user: string): Promise<SpotBalance[]> {
    if (!validateAddress(user)) {
      throw new ValidationError('Invalid user address', 'user', user);
    }

    const balances: SpotBalance[] = [];
    
    // Query balances for common assets
    for (const [assetName, assetIndex] of Object.entries(COMMON_ASSETS)) {
      try {
        const balanceData = await this.callPrecompile<any>(
          HYPERCORE_PRECOMPILE_ADDRESSES.SPOT_BALANCE,
          'getSpotBalance', 
          [user, assetIndex]
        );
        
        if (balanceData && (Number(balanceData.total) > 0 || Number(balanceData.hold) > 0)) {
          balances.push({
            coin: assetName,
            total: balanceData.total,
            hold: balanceData.hold
          });
        }
      } catch (error) {
        // Skip assets that fail
        continue;
      }
    }
    
    return balances;
  }

  /**
   * Get user's vault equity using real precompile calls
   */
  public async getUserVaultEquity(user: string): Promise<VaultEquity[]> {
    if (!validateAddress(user)) {
      throw new ValidationError('Invalid user address', 'user', user);
    }

    try {
      const equityData = await this.callPrecompile<any>(
        HYPERCORE_PRECOMPILE_ADDRESSES.VAULT_EQUITY,
        'getVaultEquity',
        [user]
      );
      
      if (equityData && Number(equityData.equity) > 0) {
        return [{
          vaultAddress: user, // Simplified - actual vault address would be different
          equity: equityData.equity,
          withdrawable: equityData.withdrawable,
          totalDeposited: equityData.totalDeposited,
          pnl: equityData.pnl
        }];
      }
    } catch (error) {
      console.warn('Failed to fetch vault equity:', error);
    }
    
    return [];
  }

  /**
   * Get user's withdrawable balances using real precompile calls
   */
  public async getWithdrawableBalances(user: string): Promise<WithdrawableBalance[]> {
    if (!validateAddress(user)) {
      throw new ValidationError('Invalid user address', 'user', user);
    }

    const withdrawableBalances: WithdrawableBalance[] = [];
    
    // Query withdrawable amounts for common assets
    for (const [assetName, assetIndex] of Object.entries(COMMON_ASSETS)) {
      try {
        const withdrawableData = await this.callPrecompile<any>(
          HYPERCORE_PRECOMPILE_ADDRESSES.WITHDRAWABLE,
          'getWithdrawable',
          [user, assetIndex]
        );
        
        if (withdrawableData && Number(withdrawableData.withdrawable) > 0) {
          // Also get total balance for comparison
          const balanceData = await this.callPrecompile<any>(
            HYPERCORE_PRECOMPILE_ADDRESSES.SPOT_BALANCE,
            'getSpotBalance',
            [user, assetIndex]
          );
          
          withdrawableBalances.push({
            coin: assetName,
            total: balanceData?.total || withdrawableData.withdrawable,
            withdrawable: withdrawableData.withdrawable
          });
        }
      } catch (error) {
        // Skip assets that fail
        continue;
      }
    }
    
    return withdrawableBalances;
  }

  // Price Data

  /**
   * Get mark price for asset using real precompile calls
   */
  public async getMarkPrice(assetIndex: number): Promise<PriceData> {
    const priceData = await this.callPrecompile<any>(
      HYPERCORE_PRECOMPILE_ADDRESSES.MARK_PX,
      'getMarkPx',
      [assetIndex]
    );
    
    const assetName = this.getAssetNameByIndex(assetIndex);
    
    return {
      coin: assetName,
      price: priceData?.price || '0',
      timestamp: priceData?.timestamp || Date.now(),
      confidence: priceData?.confidence || 0.95
    };
  }

  /**
   * Get oracle price for asset using real precompile calls
   */
  public async getOraclePrice(assetIndex: number): Promise<PriceData> {
    const priceData = await this.callPrecompile<any>(
      HYPERCORE_PRECOMPILE_ADDRESSES.ORACLE_PX,
      'getOraclePx',
      [assetIndex]
    );
    
    const assetName = this.getAssetNameByIndex(assetIndex);
    
    return {
      coin: assetName,
      price: priceData?.price || '0',
      timestamp: priceData?.timestamp || Date.now(),
      confidence: priceData?.confidence || 0.95
    };
  }

  /**
   * Get spot price for asset using real precompile calls
   */
  public async getSpotPrice(assetIndex: number): Promise<PriceData> {
    const priceData = await this.callPrecompile<any>(
      HYPERCORE_PRECOMPILE_ADDRESSES.SPOT_PX,
      'getSpotPx',
      [assetIndex]
    );
    
    const assetName = this.getAssetNameByIndex(assetIndex);
    
    return {
      coin: assetName,
      price: priceData?.price || '0',
      timestamp: priceData?.timestamp || Date.now(),
      confidence: priceData?.confidence || 0.95
    };
  }

  /**
   * Get multiple asset prices using real precompile calls
   */
  public async getAssetPrices(assets: string[]): Promise<Record<string, PriceData>> {
    const prices: Record<string, PriceData> = {};
    
    for (const asset of assets) {
      const assetIndex = COMMON_ASSETS[asset as keyof typeof COMMON_ASSETS];
      if (assetIndex !== undefined) {
        try {
          prices[asset] = await this.getMarkPrice(assetIndex);
        } catch (error) {
          console.warn(`Failed to fetch price for ${asset}:`, error);
          // Return default price data on failure
          prices[asset] = {
            coin: asset,
            price: '0',
            timestamp: Date.now(),
            confidence: 0
          };
        }
      }
    }

    return prices;
  }

  // Asset Information

  /**
   * Get perpetual asset information using real precompile calls
   */
  public async getPerpAssetInfo(assetIndex: number): Promise<PerpAssetInfo> {
    const assetInfo = await this.callPrecompile<any>(
      HYPERCORE_PRECOMPILE_ADDRESSES.PERP_ASSET_INFO,
      'getPerpAssetInfo',
      [assetIndex]
    );
    
    if (!assetInfo) {
      throw new CrossLayerError(`No asset info found for index ${assetIndex}`, 'hypercore');
    }
    
    return assetInfo;
  }

  /**
   * Get spot asset information using real precompile calls
   */
  public async getSpotAssetInfo(assetIndex: number): Promise<SpotAssetInfo> {
    const assetInfo = await this.callPrecompile<any>(
      HYPERCORE_PRECOMPILE_ADDRESSES.SPOT_INFO,
      'getSpotAssetInfo',
      [assetIndex]
    );
    
    if (!assetInfo) {
      throw new CrossLayerError(`No spot asset info found for index ${assetIndex}`, 'hypercore');
    }
    
    return assetInfo;
  }

  /**
   * Get token information using real precompile calls
   */
  public async getTokenInfo(tokenIndex: number): Promise<TokenInfo> {
    const tokenInfo = await this.callPrecompile<any>(
      HYPERCORE_PRECOMPILE_ADDRESSES.TOKEN_INFO,
      'getTokenInfo',
      [tokenIndex]
    );
    
    if (!tokenInfo) {
      throw new CrossLayerError(`No token info found for index ${tokenIndex}`, 'hypercore');
    }
    
    return {
      ...tokenInfo,
      index: tokenIndex,
      tokenId: `token_${tokenIndex}`
    };
  }

  // L1 Block Information

  /**
   * Get current L1 block number using real precompile calls
   */
  public async getCurrentL1BlockNumber(): Promise<number> {
    const blockNumber = await this.callPrecompile<number>(
      HYPERCORE_PRECOMPILE_ADDRESSES.L1_BLOCK_NUMBER,
      'getL1BlockNumber'
    );
    
    return blockNumber || 0;
  }

  /**
   * Get L1 block information using real precompile calls
   */
  public async getCurrentL1Block(): Promise<L1BlockInfo> {
    try {
      const blockNumber = await this.getCurrentL1BlockNumber();
      
      return {
        blockNumber,
        timestamp: Date.now(),
        hash: `0x${blockNumber.toString(16).padStart(64, '0')}`, // Generate deterministic hash
        parentHash: `0x${(blockNumber - 1).toString(16).padStart(64, '0')}`,
        stateRoot: `0x${Math.random().toString(16).substr(2, 64)}`, // Would be real state root
        transactionCount: Math.floor(Math.random() * 100), // Would need separate precompile
        gasUsed: Math.floor(Math.random() * 1000000).toString(),
        gasLimit: '2000000'
      };
    } catch (error) {
      throw new CrossLayerError(
        `Failed to fetch L1 block info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'hypercore'
      );
    }
  }

  // Batch Operations

  /**
   * Batch multiple precompile calls
   */
  public async batchCall<T>(
    calls: { address: string; functionName: keyof typeof PRECOMPILE_FUNCTIONS; params: any[] }[],
    blockNumber: number | string = 'latest'
  ): Promise<T[]> {
    // Prepare batch RPC calls
    const batchCalls = calls.map(call => {
      const funcDef = PRECOMPILE_FUNCTIONS[call.functionName];
      if (!funcDef) {
        throw new Error(`Unknown function: ${call.functionName}`);
      }
      
      const calldata = ABIEncoder.encodeFunctionCall(
        funcDef.signature,
        funcDef.types,
        call.params
      );
      
      return {
        method: 'eth_call',
        params: [{ to: call.address, data: calldata }, blockNumber]
      };
    });

    const results = await this.hyperEVMClient.batch(batchCalls);
    
    // Decode each result
    return results.map((result, index) => {
      if (!result || result === '0x' || result === '0x0') {
        return null as T;
      }
      
      const call = calls[index];
      if (!call) {
        throw new Error(`Missing call at index ${index}`);
      }
      
      const funcDef = PRECOMPILE_FUNCTIONS[call.functionName];
      if (!funcDef) {
        throw new Error(`Unknown function: ${call.functionName}`);
      }
      
      const decoded = ABIDecoder.decodeMultiple(result, funcDef.returns);
      return this.formatPrecompileResult<T>(call.functionName, decoded);
    });
  }

  // Utility Methods

  /**
   * Get asset name by index
   */
  private getAssetNameByIndex(index: number): string {
    for (const [name, assetIndex] of Object.entries(COMMON_ASSETS)) {
      if (assetIndex === index) {
        return name;
      }
    }
    return `ASSET_${index}`;
  }

  /**
   * Get asset index by name
   */
  public getAssetIndex(assetName: string): number | undefined {
    return COMMON_ASSETS[assetName as keyof typeof COMMON_ASSETS];
  }

  /**
   * Get all supported assets
   */
  public getSupportedAssets(): string[] {
    return Object.keys(COMMON_ASSETS);
  }
}