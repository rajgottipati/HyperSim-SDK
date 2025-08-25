/**
 * Network constants and configuration for HyperSim SDK
 */

import { NetworkConfig, HyperSimNetwork } from '../types/common.js';

/**
 * Network configurations for HyperEVM
 */
export const NETWORKS: Record<HyperSimNetwork, NetworkConfig> = {
  mainnet: {
    chainId: 999,
    name: 'HyperEVM Mainnet',
    rpcUrl: 'https://rpc.hyperliquid.xyz/evm',
    wsUrl: 'wss://api.hyperliquid.xyz/ws'
  },
  testnet: {
    chainId: 998,
    name: 'HyperEVM Testnet',
    rpcUrl: 'https://rpc.hyperliquid-testnet.xyz/evm',
    wsUrl: 'wss://api.hyperliquid.xyz/ws'
  }
} as const;

/**
 * HyperCore precompile contract addresses
 */
export const HYPERCORE_PRECOMPILE_ADDRESSES = {
  POSITION: '0x0000000000000000000000000000000000000800',
  SPOT_BALANCE: '0x0000000000000000000000000000000000000801',
  VAULT_EQUITY: '0x0000000000000000000000000000000000000802',
  WITHDRAWABLE: '0x0000000000000000000000000000000000000803',
  DELEGATIONS: '0x0000000000000000000000000000000000000804',
  DELEGATOR_SUMMARY: '0x0000000000000000000000000000000000000805',
  MARK_PX: '0x0000000000000000000000000000000000000806',
  ORACLE_PX: '0x0000000000000000000000000000000000000807',
  SPOT_PX: '0x0000000000000000000000000000000000000808',
  L1_BLOCK_NUMBER: '0x0000000000000000000000000000000000000809',
  PERP_ASSET_INFO: '0x000000000000000000000000000000000000080a',
  SPOT_INFO: '0x000000000000000000000000000000000000080b',
  TOKEN_INFO: '0x000000000000000000000000000000000000080c'
} as const;

/**
 * Core writer contract address
 */
export const CORE_WRITER_ADDRESS = '0x3333333333333333333333333333333333333333' as const;

/**
 * ERC20 transfer contract address
 */
export const ERC20_TRANSFER_ADDRESS = '0x2222222222222222222222222222222222222222' as const;

/**
 * Common asset indices
 */
export const ASSET_INDICES = {
  USDC: 0,
  ETH: 1,
  BTC: 2,
  SOL: 3,
  DOGE: 4,
  HYPE: 5
} as const;

/**
 * Block type configurations
 */
export const BLOCK_CONFIGS = {
  small: {
    gasLimit: 2000000,
    frequency: 1, // seconds
    description: 'Small blocks for fast confirmation'
  },
  large: {
    gasLimit: 30000000,
    frequency: 60, // seconds
    description: 'Large blocks for complex transactions'
  }
} as const;

/**
 * Default timeouts and limits
 */
export const DEFAULT_CONFIG = {
  RPC_TIMEOUT: 30000,
  WS_TIMEOUT: 10000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  MAX_RETRY_DELAY: 30000,
  PING_INTERVAL: 30000,
  MAX_RECONNECT_ATTEMPTS: 10
} as const;

/**
 * Gas limits for different operations
 */
export const GAS_LIMITS = {
  SIMPLE_TRANSFER: 21000,
  ERC20_TRANSFER: 65000,
  CONTRACT_DEPLOYMENT: 500000,
  COMPLEX_CONTRACT_CALL: 200000,
  PRECOMPILE_CALL: 50000,
  L1_ACTION: 100000
} as const;

/**
 * WebSocket subscription types
 */
export const WS_SUBSCRIPTION_TYPES = {
  TRADES: 'trades',
  L2_BOOK: 'l2Book',
  CANDLE: 'candle',
  USER_EVENTS: 'userEvents',
  USER_FILLS: 'userFills',
  USER_POSITIONS: 'userPositions'
} as const;

/**
 * Supported candle intervals
 */
export const CANDLE_INTERVALS = {
  '1m': '1m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d'
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  
  // API errors
  API_ERROR: 'API_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_TRANSACTION: 'INVALID_TRANSACTION',
  
  // Simulation errors
  SIMULATION_ERROR: 'SIMULATION_ERROR',
  GAS_ESTIMATION_FAILED: 'GAS_ESTIMATION_FAILED',
  
  // WebSocket errors
  WEBSOCKET_ERROR: 'WEBSOCKET_ERROR',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  SUBSCRIPTION_FAILED: 'SUBSCRIPTION_FAILED',
  
  // Plugin errors
  PLUGIN_ERROR: 'PLUGIN_ERROR',
  PLUGIN_NOT_FOUND: 'PLUGIN_NOT_FOUND',
  PLUGIN_INITIALIZATION_FAILED: 'PLUGIN_INITIALIZATION_FAILED',
  
  // AI errors
  AI_ERROR: 'AI_ERROR',
  AI_ANALYSIS_FAILED: 'AI_ANALYSIS_FAILED',
  AI_OPTIMIZATION_FAILED: 'AI_OPTIMIZATION_FAILED',
  
  // Cross-layer errors
  CROSS_LAYER_ERROR: 'CROSS_LAYER_ERROR',
  PRECOMPILE_ERROR: 'PRECOMPILE_ERROR',
  L1_ACCOUNT_NOT_FOUND: 'L1_ACCOUNT_NOT_FOUND'
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

/**
 * WebSocket close codes
 */
export const WS_CLOSE_CODES = {
  NORMAL_CLOSURE: 1000,
  GOING_AWAY: 1001,
  PROTOCOL_ERROR: 1002,
  UNSUPPORTED_DATA: 1003,
  NO_STATUS_RECEIVED: 1005,
  ABNORMAL_CLOSURE: 1006,
  INVALID_FRAME_PAYLOAD: 1007,
  POLICY_VIOLATION: 1008,
  MESSAGE_TOO_BIG: 1009,
  MANDATORY_EXTENSION: 1010,
  INTERNAL_ERROR: 1011,
  SERVICE_RESTART: 1012,
  TRY_AGAIN_LATER: 1013,
  TLS_HANDSHAKE: 1015
} as const;

/**
 * Rate limiting defaults
 */
export const RATE_LIMITS = {
  DEFAULT_RPS: 10,
  DEFAULT_BURST: 20,
  DEFAULT_WINDOW_MS: 1000,
  WEBSOCKET_RPS: 100,
  WEBSOCKET_BURST: 200
} as const;

/**
 * Cache settings
 */
export const CACHE_CONFIG = {
  DEFAULT_TTL: 60000, // 1 minute
  MAX_SIZE: 100,
  PRICE_TTL: 5000, // 5 seconds for price data
  BALANCE_TTL: 10000, // 10 seconds for balance data
  POSITION_TTL: 5000 // 5 seconds for position data
} as const;