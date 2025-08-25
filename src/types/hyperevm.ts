/**
 * HyperEVM-specific type definitions for transaction handling,
 * RPC methods, and blockchain interactions
 */

// Network Configuration
export interface HyperEVMNetwork {
  chainId: number;
  name: string;
  rpcUrl: string;
  wsUrl?: string;
  blockExplorer?: string;
  currency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// Transaction Types
export interface HyperEVMTransaction {
  from: string;
  to?: string;
  value?: string;
  data?: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  type?: number;
  chainId?: number;
  accessList?: AccessListEntry[];
}

export interface AccessListEntry {
  address: string;
  storageKeys: string[];
}

export interface TransactionReceipt {
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  blockNumber: number;
  from: string;
  to?: string;
  cumulativeGasUsed: number;
  gasUsed: number;
  contractAddress?: string;
  logs: Log[];
  logsBloom: string;
  status: number;
  type: number;
  effectiveGasPrice: number;
}

export interface Log {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  logIndex: number;
  removed: boolean;
}

// Block Types for Dual-Block Architecture
export interface Block {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  nonce: string;
  difficulty: string;
  totalDifficulty?: string;
  gasLimit: number;
  gasUsed: number;
  miner: string;
  extraData: string;
  transactions: Transaction[];
  size: number;
  uncles: string[];
  baseFeePerGas?: number;
}

export interface Transaction {
  hash: string;
  nonce: number;
  blockHash: string;
  blockNumber: number;
  transactionIndex: number;
  from: string;
  to?: string;
  value: string;
  gas: number;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  input: string;
  v: string;
  r: string;
  s: string;
  type: number;
  chainId: number;
  accessList?: AccessListEntry[];
}

// Dual-Block System Types
export type BlockType = 'small' | 'large';

export interface BlockConfiguration {
  type: BlockType;
  frequency: number; // in seconds
  gasLimit: number;
  targetGasUsage: number;
}

export interface MempoolStatus {
  pendingTransactions: number;
  queuedTransactions: number;
  addressNonces: Record<string, number>;
  estimatedInclusionTime: {
    small: number; // seconds
    large: number; // seconds
  };
}

// RPC Method Types
export interface RPCRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any[];
}

export interface RPCResponse<T = any> {
  jsonrpc: '2.0';
  id: number | string;
  result?: T;
  error?: RPCError;
}

export interface RPCError {
  code: number;
  message: string;
  data?: any;
}

// Gas Estimation
export interface GasEstimation {
  gasLimit: number;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedCost: string;
  recommendedBlockType: BlockType;
  estimatedConfirmationTime: number;
}

// Call Options
export interface CallOptions {
  from?: string;
  to?: string;
  gas?: string;
  gasPrice?: string;
  value?: string;
  data?: string;
  blockNumber?: number | string;
}

// Filter Types
export interface FilterOptions {
  fromBlock?: number | string;
  toBlock?: number | string;
  address?: string | string[];
  topics?: (string | string[] | null)[];
}

export interface LogFilter extends FilterOptions {
  id: string;
}

// Contract Interaction
export interface ContractCall {
  to: string;
  data: string;
  from?: string;
  gas?: string;
  gasPrice?: string;
  value?: string;
}

export interface ContractDeployment {
  data: string;
  from: string;
  gas?: string;
  gasPrice?: string;
  value?: string;
  constructorArgs?: any[];
}

// Precompile Contract Types
export interface PrecompileCall {
  address: string;
  data: string;
  from?: string;
}

export interface PrecompileResult {
  success: boolean;
  returnData: string;
  gasUsed: number;
  error?: string;
}

// Nonce Management
export interface NonceManager {
  getNextNonce(address: string): Promise<number>;
  getPendingNonces(address: string): number[];
  validateNonce(address: string, nonce: number): boolean;
  isNonceAvailable(address: string, nonce: number): boolean;
}

// Connection Pool Types
export interface ConnectionPoolOptions {
  maxConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface PooledConnection {
  id: string;
  url: string;
  isActive: boolean;
  lastUsed: number;
  requestCount: number;
  errorCount: number;
}

// Error Types
export interface EVMError {
  code: number;
  message: string;
  data?: {
    originalError?: {
      code: number;
      message: string;
      data?: string;
    };
  };
}

export interface TransactionError extends EVMError {
  transactionHash?: string;
  receipt?: TransactionReceipt;
}

export interface RevertError extends EVMError {
  reason?: string;
  signature?: string;
  args?: any[];
}

// Fee Estimation
export interface FeeData {
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  baseFeePerGas?: string;
}

// Chain Configuration
export interface ChainConfig {
  chainId: number;
  name: string;
  networkId: number;
  consensus: 'pow' | 'pos' | 'hyperbft';
  forks: Record<string, number>;
  genesis: {
    difficulty: string;
    gasLimit: number;
    timestamp: number;
  };
}

// State Query Types
export interface StateQuery {
  address: string;
  storageKey: string;
  blockNumber?: number | string;
}

export interface StateResult {
  value: string;
  proof?: string[];
}

export interface AccountState {
  address: string;
  balance: string;
  nonce: number;
  codeHash: string;
  storageHash: string;
  code?: string;
}

// Subscription Types for WebSocket
export interface BlockSubscription {
  type: 'blocks';
  includeTransactions?: boolean;
}

export interface TransactionSubscription {
  type: 'pendingTransactions';
  fromAddress?: string;
  toAddress?: string;
}

export interface LogSubscription {
  type: 'logs';
  filter: FilterOptions;
}

export type EVMSubscription = 
  | BlockSubscription 
  | TransactionSubscription 
  | LogSubscription;

// Constants
export const HYPEREVM_NETWORKS = {
  mainnet: {
    chainId: 999,
    name: 'HyperEVM Mainnet',
    rpcUrl: 'https://rpc.hyperliquid.xyz/evm',
    wsUrl: 'wss://api.hyperliquid.xyz/ws',
    blockExplorer: 'https://hypurrscan.io/',
    currency: {
      name: 'Hype',
      symbol: 'HYPE',
      decimals: 18
    }
  },
  testnet: {
    chainId: 998,
    name: 'HyperEVM Testnet',
    rpcUrl: 'https://rpc.hyperliquid-testnet.xyz/evm',
    wsUrl: 'wss://api.hyperliquid.xyz/ws',
    currency: {
      name: 'Test Hype',
      symbol: 'HYPE',
      decimals: 18
    }
  }
} as const;

export const BLOCK_CONFIGURATIONS: Record<BlockType, BlockConfiguration> = {
  small: {
    type: 'small',
    frequency: 1, // 1 second
    gasLimit: 2000000, // 2M gas
    targetGasUsage: 1500000 // 1.5M gas target
  },
  large: {
    type: 'large',
    frequency: 60, // 1 minute
    gasLimit: 30000000, // 30M gas
    targetGasUsage: 25000000 // 25M gas target
  }
} as const;

// Standard EVM Constants
export const EVM_CONSTANTS = {
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  MAX_UINT256: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  NATIVE_TOKEN_ADDRESS: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  CREATE2_FACTORY: '0x4e59b44847b379578588920ca78fbf26c0b4956c',
} as const;

// Gas Limits
export const GAS_LIMITS = {
  SIMPLE_TRANSFER: 21000,
  ERC20_TRANSFER: 65000,
  CONTRACT_DEPLOYMENT: 500000,
  COMPLEX_CONTRACT_CALL: 200000,
  PRECOMPILE_CALL: 50000
} as const;