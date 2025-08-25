/**
 * HyperEVM specific type definitions
 */

import { Network, BlockType } from './network';

/**
 * HyperEVM precompiled contract addresses
 */
export const HYPEREVM_PRECOMPILES = {
  // Cross-layer interaction contracts
  CORE_WRITER: '0x3333333333333333333333333333333333333333',
  ERC20_OPERATIONS: '0x2222222222222222222222222222222222222222',
  
  // Read precompiles (0x800-0x80C)
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
 * Precompile function signatures
 */
export interface PrecompileCall {
  /** Target precompile address */
  target: string;
  /** Function signature */
  signature: string;
  /** Input parameters */
  params: any[];
  /** Expected return type */
  returnType: string;
}

/**
 * HyperCore L1 action types
 */
export enum L1ActionType {
  SPOT_SEND = 'spotSend',
  SPOT_TRANSFER = 'spotTransfer',
  WITHDRAW = 'withdraw',
  SUB_ACCOUNT_TRANSFER = 'subAccountTransfer',
  VAULT_TRANSFER = 'vaultTransfer'
}

/**
 * L1 action data structure
 */
export interface L1Action {
  /** Action type */
  type: L1ActionType;
  /** Action-specific data */
  data: any;
}

/**
 * Spot send action
 */
export interface SpotSendAction extends L1Action {
  type: L1ActionType.SPOT_SEND;
  data: {
    hyperliquidChain: string;
    signatureChainId: string;
    destination: string;
    token: string;
    amount: string;
    time: number;
  };
}

/**
 * Withdraw action
 */
export interface WithdrawAction extends L1Action {
  type: L1ActionType.WITHDRAW;
  data: {
    hyperliquidChain: string;
    signatureChainId: string;
    destination: string;
    token: string;
    amount: string;
    time: number;
  };
}

/**
 * Vault transfer action
 */
export interface VaultTransferAction extends L1Action {
  type: L1ActionType.VAULT_TRANSFER;
  data: {
    hyperliquidChain: string;
    signatureChainId: string;
    vaultAddress: string;
    isDeposit: boolean;
    usd: string;
    time: number;
  };
}

/**
 * HyperEVM dual-block mempool information
 */
export interface MempoolInfo {
  /** Small block mempool (2M gas limit) */
  smallBlock: {
    pending: number;
    queued: number;
    gasUsed: string;
    gasLimit: string;
  };
  /** Large block mempool (30M gas limit) */
  largeBlock: {
    pending: number;
    queued: number;
    gasUsed: string;
    gasLimit: string;
  };
  /** Maximum nonces per address */
  maxNoncesPerAddress: number;
}

/**
 * HyperEVM gas estimation with block type awareness
 */
export interface HyperEVMGasEstimate {
  /** Estimated gas usage */
  gasUsed: string;
  /** Recommended block type */
  recommendedBlockType: BlockType;
  /** Gas price recommendations */
  gasPriceRecommendations: {
    slow: string;
    standard: string;
    fast: string;
  };
  /** Estimated inclusion time by block type */
  estimatedInclusionTime: {
    smallBlock: number; // seconds
    largeBlock: number; // seconds
  };
}

/**
 * HyperEVM transaction receipt with cross-layer events
 */
export interface HyperEVMTransactionReceipt {
  /** Standard transaction receipt fields */
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  blockNumber: number;
  from: string;
  to?: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  contractAddress?: string;
  logs: LogEntry[];
  status: number;
  /** HyperEVM-specific fields */
  blockType: BlockType;
  l1Events?: L1Event[];
  crossLayerInteractions?: CrossLayerInteraction[];
}

/**
 * Log entry
 */
export interface LogEntry {
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

/**
 * L1 event from HyperCore
 */
export interface L1Event {
  /** Event type */
  type: string;
  /** Event data */
  data: any;
  /** L1 block number */
  l1BlockNumber: number;
  /** Event hash */
  hash: string;
}

/**
 * Cross-layer interaction record
 */
export interface CrossLayerInteraction {
  /** Interaction type */
  type: 'read' | 'write';
  /** Precompile address */
  precompile: string;
  /** Function called */
  function: string;
  /** Input data */
  input: string;
  /** Output data */
  output?: string;
  /** Success status */
  success: boolean;
  /** Gas used */
  gasUsed: string;
}

/**
 * HyperEVM network statistics
 */
export interface HyperEVMNetworkStats {
  /** Current network */
  network: Network;
  /** Total transactions */
  totalTransactions: number;
  /** Transactions per second */
  tps: number;
  /** Block statistics */
  blocks: {
    small: {
      count: number;
      avgGasUsed: string;
      avgTxCount: number;
    };
    large: {
      count: number;
      avgGasUsed: string;
      avgTxCount: number;
    };
  };
  /** Mempool statistics */
  mempool: MempoolInfo;
  /** Average confirmation times */
  avgConfirmationTime: {
    smallBlock: number;
    largeBlock: number;
  };
}

/**
 * HyperEVM account information
 */
export interface HyperEVMAccountInfo {
  /** Account address */
  address: string;
  /** Account balance */
  balance: string;
  /** Account nonce */
  nonce: number;
  /** Pending nonces */
  pendingNonces: number[];
  /** Associated L1 account exists */
  hasL1Account: boolean;
  /** L1 account data */
  l1Account?: {
    spotBalances: Record<string, string>;
    perpPositions: Array<{
      asset: string;
      size: string;
      entryPrice: string;
    }>;
  };
}

/**
 * Simulation options for HyperEVM
 */
export interface HyperEVMSimulationOptions {
  /** Include execution trace */
  includeTrace?: boolean;
  /** Include state changes */
  includeStateChanges?: boolean;
  /** Include cross-layer data */
  includeCrossLayer?: boolean;
  /** Block type preference */
  blockType?: BlockType;
  /** Custom block number for simulation */
  blockNumber?: number;
}

/**
 * HyperEVM fee data with dual-block support
 */
export interface HyperEVMFeeData {
  /** Legacy gas price */
  gasPrice: string;
  /** EIP-1559 max fee per gas */
  maxFeePerGas: string;
  /** EIP-1559 max priority fee per gas */
  maxPriorityFeePerGas: string;
  /** Fee recommendations by block type */
  blockTypeRecommendations: {
    small: {
      gasPrice: string;
      maxFeePerGas: string;
      maxPriorityFeePerGas: string;
    };
    large: {
      gasPrice: string;
      maxFeePerGas: string;
      maxPriorityFeePerGas: string;
    };
  };
}