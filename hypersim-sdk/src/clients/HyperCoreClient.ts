/**
 * HyperCore client for cross-layer data access
 */

import axios, { AxiosInstance } from 'axios';
import { Network } from '../types/network';
import { TransactionRequest, HyperCoreData, Position, MarketData, CoreInteraction } from '../types/simulation';
import { NetworkError, ConfigurationError } from '../types/errors';
import { HYPERCORE_ENDPOINTS } from '../utils/constants';

/**
 * Configuration for HyperCore client
 */
export interface HyperCoreClientConfig {
  /** Target network */
  network: Network;
  /** Enable HyperCore integration */
  enabled?: boolean;
  /** Custom API endpoint */
  apiEndpoint?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Client for accessing HyperCore data and cross-layer interactions
 */
export class HyperCoreClient {
  private readonly config: Required<HyperCoreClientConfig>;
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl: string;

  constructor(config: HyperCoreClientConfig) {
    this.config = {
      ...config,
      enabled: config.enabled ?? true,
      timeout: config.timeout ?? 30000,
      debug: config.debug ?? false,
    };

    if (!this.config.enabled) {
      if (this.config.debug) {
        console.log('[HyperCore Client] Cross-layer integration disabled');
      }
      // Create a minimal HTTP client even when disabled
      this.httpClient = axios.create();
      this.baseUrl = '';
      return;
    }

    this.baseUrl = this.config.apiEndpoint || HYPERCORE_ENDPOINTS[this.config.network];
    
    if (!this.baseUrl) {
      throw new ConfigurationError(`No HyperCore endpoint configured for network: ${this.config.network}`);
    }

    // Initialize HTTP client
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': '@hypersim/sdk v1.0.0',
      },
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      response => response,
      error => {
        if (this.config.debug) {
          console.error('[HyperCore Client] Request failed:', error.response?.data || error.message);
        }
        return Promise.reject(new NetworkError(`HyperCore API error: ${error.message}`));
      }
    );

    if (this.config.debug) {
      console.log('[HyperCore Client] Initialized with endpoint:', this.baseUrl);
    }
  }

  /**
   * Get relevant HyperCore data for a transaction
   */
  async getRelevantData(transaction: TransactionRequest): Promise<HyperCoreData | undefined> {
    if (!this.config.enabled) {
      return undefined;
    }

    try {
      if (this.config.debug) {
        console.log('[HyperCore Client] Fetching relevant data for transaction:', transaction);
      }

      // Fetch core state, positions, and market data in parallel
      const [coreState, positions, marketData] = await Promise.all([
        this.getCoreState(),
        this.getUserPositions(transaction.from),
        this.getMarketData(),
      ]);

      const hyperCoreData: HyperCoreData = {
        coreState,
        positions,
        marketData,
        interactions: await this.analyzeInteractions(transaction),
      };

      if (this.config.debug) {
        console.log('[HyperCore Client] Retrieved HyperCore data:', hyperCoreData);
      }

      return hyperCoreData;
    } catch (error) {
      if (this.config.debug) {
        console.error('[HyperCore Client] Failed to get relevant data:', error);
      }
      // Return undefined instead of throwing to not break simulation
      return undefined;
    }
  }

  /**
   * Get current HyperCore state
   */
  async getCoreState(): Promise<Record<string, any>> {
    if (!this.config.enabled) {
      return {};
    }

    try {
      const response = await this.httpClient.get('/info');
      return response.data || {};
    } catch (error) {
      if (this.config.debug) {
        console.warn('[HyperCore Client] Failed to get core state:', error);
      }
      return {};
    }
  }

  /**
   * Get user positions from HyperCore
   */
  async getUserPositions(userAddress: string): Promise<Position[] | undefined> {
    if (!this.config.enabled || !userAddress) {
      return undefined;
    }

    try {
      const response = await this.httpClient.post('/info', {
        type: 'clearinghouseState',
        user: userAddress,
      });

      const clearinghouseState = response.data;
      if (!clearinghouseState?.assetPositions) {
        return [];
      }

      // Convert clearinghouse positions to our Position format
      const positions: Position[] = clearinghouseState.assetPositions.map((pos: any) => ({
        asset: pos.position?.coin || 'UNKNOWN',
        size: pos.position?.szi || '0',
        entryPrice: pos.position?.entryPx || '0',
        unrealizedPnl: pos.unrealizedPnl || '0',
        side: parseFloat(pos.position?.szi || '0') >= 0 ? 'LONG' : 'SHORT',
      }));

      return positions;
    } catch (error) {
      if (this.config.debug) {
        console.warn('[HyperCore Client] Failed to get user positions:', error);
      }
      return undefined;
    }
  }

  /**
   * Get current market data
   */
  async getMarketData(): Promise<MarketData | undefined> {
    if (!this.config.enabled) {
      return undefined;
    }

    try {
      // Get all mids (market prices)
      const response = await this.httpClient.post('/info', {
        type: 'allMids',
      });

      const allMids = response.data;
      if (!Array.isArray(allMids)) {
        return undefined;
      }

      // Convert to our MarketData format
      const prices: Record<string, string> = {};
      const depths: Record<string, any> = {};
      const fundingRates: Record<string, string> = {};

      allMids.forEach((mid: string, index: number) => {
        const assetName = `ASSET_${index}`; // Would need proper asset mapping
        prices[assetName] = mid;
        // depths and fundingRates would need additional API calls
      });

      return {
        prices,
        depths,
        fundingRates,
      };
    } catch (error) {
      if (this.config.debug) {
        console.warn('[HyperCore Client] Failed to get market data:', error);
      }
      return undefined;
    }
  }

  /**
   * Analyze potential cross-layer interactions
   */
  private async analyzeInteractions(transaction: TransactionRequest): Promise<CoreInteraction[]> {
    const interactions: CoreInteraction[] = [];

    if (!transaction.to || !transaction.data) {
      return interactions;
    }

    // Check if transaction interacts with known precompiles
    const CORE_WRITER_ADDRESS = '0x3333333333333333333333333333333333333333';
    const ERC20_PRECOMPILE = '0x2222222222222222222222222222222222222222';

    if (transaction.to.toLowerCase() === CORE_WRITER_ADDRESS.toLowerCase()) {
      interactions.push({
        type: 'write',
        precompile: CORE_WRITER_ADDRESS,
        data: transaction.data,
        result: 'pending', // Would be determined during simulation
      });
    } else if (transaction.to.toLowerCase() === ERC20_PRECOMPILE.toLowerCase()) {
      interactions.push({
        type: 'read',
        precompile: ERC20_PRECOMPILE,
        data: transaction.data,
        result: 'pending',
      });
    }

    // Check for read precompiles (starting at 0x0800)
    const toAddress = parseInt(transaction.to, 16);
    if (toAddress >= 0x800 && toAddress <= 0x8ff) {
      interactions.push({
        type: 'read',
        precompile: transaction.to,
        data: transaction.data,
        result: 'pending',
      });
    }

    return interactions;
  }

  /**
   * Get metadata about available assets
   */
  async getAssetMetadata(): Promise<Record<string, any>> {
    if (!this.config.enabled) {
      return {};
    }

    try {
      const response = await this.httpClient.post('/info', {
        type: 'meta',
      });

      return response.data?.universe || {};
    } catch (error) {
      if (this.config.debug) {
        console.warn('[HyperCore Client] Failed to get asset metadata:', error);
      }
      return {};
    }
  }

  /**
   * Get funding rates for all assets
   */
  async getFundingRates(): Promise<Record<string, string>> {
    if (!this.config.enabled) {
      return {};
    }

    try {
      const response = await this.httpClient.post('/info', {
        type: 'fundingHistory',
        startTime: Date.now() - 3600000, // Last hour
      });

      // Process funding history to get current rates
      // This is simplified - actual implementation would need proper processing
      return {};
    } catch (error) {
      if (this.config.debug) {
        console.warn('[HyperCore Client] Failed to get funding rates:', error);
      }
      return {};
    }
  }

  /**
   * Check if HyperCore integration is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get client configuration
   */
  getConfig(): HyperCoreClientConfig {
    return { ...this.config };
  }
}
