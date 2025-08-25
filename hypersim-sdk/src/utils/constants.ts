/**
 * Constants used throughout the SDK
 */

import { Network, NetworkConfig } from '../types/network';

/**
 * Network configuration mapping
 */
export const NETWORK_CONFIGS: Record<Network, NetworkConfig> = {
  [Network.MAINNET]: {
    network: Network.MAINNET,
    chainId: 999,
    rpcUrl: 'https://rpc.hyperliquid.xyz/evm',
    explorerUrl: 'https://explorer.hyperliquid.xyz',
    nativeToken: 'HYPE',
    displayName: 'HyperEVM Mainnet',
  },
  [Network.TESTNET]: {
    network: Network.TESTNET,
    chainId: 998,
    rpcUrl: 'https://rpc.hyperliquid-testnet.xyz/evm',
    explorerUrl: 'https://explorer.hyperliquid-testnet.xyz',
    nativeToken: 'HYPE',
    displayName: 'HyperEVM Testnet',
  },
};

/**
 * HyperCore API endpoints
 */
export const HYPERCORE_ENDPOINTS: Record<Network, string> = {
  [Network.MAINNET]: 'https://api.hyperliquid.xyz',
  [Network.TESTNET]: 'https://api.hyperliquid-testnet.xyz',
};

/**
 * Known precompiled contract addresses
 */
export const PRECOMPILED_CONTRACTS = {
  /** CoreWriter for cross-layer interactions */
  CORE_WRITER: '0x3333333333333333333333333333333333333333',
  /** ERC20 operations */
  ERC20_OPERATIONS: '0x2222222222222222222222222222222222222222',
  /** Read precompiles start address */
  READ_PRECOMPILES_START: '0x0000000000000000000000000000000000000800',
  /** Read precompiles end address */
  READ_PRECOMPILES_END: '0x00000000000000000000000000000000000008ff',
};

/**
 * Gas limits and costs
 */
export const GAS_LIMITS = {
  /** Small block gas limit */
  SMALL_BLOCK: 2_000_000,
  /** Large block gas limit */
  LARGE_BLOCK: 30_000_000,
  /** Basic transaction gas */
  BASIC_TX: 21_000,
  /** Contract deployment base cost */
  CONTRACT_CREATION: 32_000,
  /** Storage write cost */
  STORAGE_WRITE: 20_000,
  /** Storage read cost */
  STORAGE_READ: 200,
};

/**
 * Block timing constants
 */
export const BLOCK_TIMES = {
  /** Small block interval in seconds */
  SMALL_BLOCK_INTERVAL: 1,
  /** Large block interval in seconds */
  LARGE_BLOCK_INTERVAL: 60,
};

/**
 * Transaction types
 */
export const TRANSACTION_TYPES = {
  /** Legacy transaction */
  LEGACY: 0,
  /** EIP-2930 transaction */
  EIP_2930: 1,
  /** EIP-1559 transaction */
  EIP_1559: 2,
};

/**
 * Default configuration values
 */
export const DEFAULTS = {
  /** Request timeout in milliseconds */
  TIMEOUT: 30000,
  /** Gas price in wei (fallback) */
  GAS_PRICE: '1000000000', // 1 Gwei
  /** Gas limit (fallback) */
  GAS_LIMIT: '100000',
  /** OpenAI model */
  AI_MODEL: 'gpt-4-turbo-preview',
  /** Max tokens for AI responses */
  AI_MAX_TOKENS: 2000,
  /** AI temperature */
  AI_TEMPERATURE: 0.1,
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  INVALID_NETWORK: 'Invalid network specified',
  INVALID_ADDRESS: 'Invalid Ethereum address format',
  INVALID_TRANSACTION: 'Invalid transaction format',
  NETWORK_ERROR: 'Network connection failed',
  SIMULATION_FAILED: 'Transaction simulation failed',
  AI_ANALYSIS_FAILED: 'AI analysis failed',
  RATE_LIMITED: 'API rate limit exceeded',
  TIMEOUT: 'Request timed out',
  INSUFFICIENT_FUNDS: 'Insufficient funds for transaction',
  GAS_LIMIT_EXCEEDED: 'Gas limit exceeded',
};

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  SIMULATION_SUCCESS: 'Transaction simulation successful',
  AI_ANALYSIS_COMPLETE: 'AI analysis completed',
  BUNDLE_OPTIMIZED: 'Transaction bundle optimized',
  NETWORK_CONNECTED: 'Successfully connected to network',
};

/**
 * API rate limits
 */
export const RATE_LIMITS = {
  /** OpenAI API requests per minute */
  OPENAI_RPM: 60,
  /** RPC requests per second */
  RPC_RPS: 10,
  /** HyperCore API requests per minute */
  HYPERCORE_RPM: 100,
};

/**
 * Validation constants
 */
export const VALIDATION = {
  /** Maximum gas limit */
  MAX_GAS_LIMIT: 30_000_000,
  /** Maximum transaction bundle size */
  MAX_BUNDLE_SIZE: 100,
  /** Minimum timeout */
  MIN_TIMEOUT: 1000,
  /** Maximum timeout */
  MAX_TIMEOUT: 300000,
  /** Address regex pattern */
  ADDRESS_PATTERN: /^0x[a-fA-F0-9]{40}$/,
  /** Hex string regex pattern */
  HEX_PATTERN: /^0x[a-fA-F0-9]*$/,
  /** Numeric string regex pattern */
  NUMERIC_PATTERN: /^\d+$/,
};

/**
 * Feature flags
 */
export const FEATURES = {
  /** Enable AI analysis */
  AI_ANALYSIS: true,
  /** Enable cross-layer integration */
  CROSS_LAYER: true,
  /** Enable bundle optimization */
  BUNDLE_OPTIMIZATION: true,
  /** Enable security analysis */
  SECURITY_ANALYSIS: true,
  /** Enable performance monitoring */
  PERFORMANCE_MONITORING: true,
};

/**
 * SDK metadata
 */
export const SDK_INFO = {
  NAME: '@hypersim/sdk',
  VERSION: '1.0.0',
  DESCRIPTION: 'TypeScript SDK for HyperEVM transaction simulation with AI-powered analysis',
  AUTHOR: 'MiniMax Agent',
  LICENSE: 'MIT',
  REPOSITORY: 'https://github.com/hypersim/hypersim-sdk',
  HOMEPAGE: 'https://hypersim.dev',
  DOCS: 'https://docs.hypersim.dev',
};

/**
 * Risk thresholds
 */
export const RISK_THRESHOLDS = {
  /** Gas usage threshold for high risk */
  HIGH_GAS_THRESHOLD: 1_000_000,
  /** Value threshold for high risk (in wei) */
  HIGH_VALUE_THRESHOLD: '1000000000000000000', // 1 ETH
  /** Confidence threshold for AI analysis */
  MIN_CONFIDENCE: 0.7,
};

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  /** Default cache TTL in seconds */
  DEFAULT_TTL: 300,
  /** Network status cache TTL */
  NETWORK_STATUS_TTL: 30,
  /** Gas price cache TTL */
  GAS_PRICE_TTL: 10,
  /** Block info cache TTL */
  BLOCK_INFO_TTL: 60,
};
