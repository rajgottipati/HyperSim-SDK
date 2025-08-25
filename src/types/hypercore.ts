/**
 * HyperCore-specific type definitions for cross-layer integration,
 * precompile contracts, and L1 state management
 */

// Core L1 State Types
export interface PerpPosition {
  coin: string;
  entryPx: string | null;
  leverage: {
    type: 'cross' | 'isolated';
    value: number;
    rawUsd: string;
  };
  liquidationPx: string | null;
  marginUsed: string;
  maxLeverage: number;
  oir: string;
  positionValue: string;
  returnOnEquity: string;
  szi: string;
  unrealizedPnl: string;
}

export interface SpotBalance {
  coin: string;
  hold: string;
  total: string;
}

export interface VaultEquity {
  vaultAddress: string;
  equity: string;
  withdrawable: string;
  totalDeposited: string;
  pnl: string;
}

export interface WithdrawableBalance {
  coin: string;
  total: string;
  withdrawable: string;
}

// Delegation Types
export interface Delegation {
  delegate: string;
  delegator: string;
  coin: string;
  amount: string;
  timestamp: number;
}

export interface DelegatorSummary {
  delegator: string;
  totalDelegated: string;
  activeDelegations: number;
  totalRewards: string;
}

// Price Data Types
export interface PriceData {
  coin: string;
  price: string;
  timestamp: number;
  confidence: number;
}

export interface MarkPrice extends PriceData {
  type: 'mark';
  fundingRate?: string;
  openInterest?: string;
}

export interface OraclePrice extends PriceData {
  type: 'oracle';
  source: string;
  deviation?: string;
}

export interface SpotPrice extends PriceData {
  type: 'spot';
  volume24h?: string;
  high24h?: string;
  low24h?: string;
}

// Asset Information Types
export interface PerpAssetInfo {
  coin: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated: boolean;
  minSize: string;
  impactNotional: string;
  markPx: string;
  midPx?: string;
  premium?: string;
  funding?: string;
  openInterest?: string;
  indexPx?: string;
}

export interface SpotAssetInfo {
  coin: string;
  name: string;
  szDecimals: number;
  weiDecimals: number;
  index: number;
  tokenId: string;
  circulatingSupply?: string;
  maxSupply?: string;
}

export interface TokenInfo {
  name: string;
  szDecimals: number;
  weiDecimals: number;
  index: number;
  tokenId: string;
  evmContract?: string;
  fullName?: string;
  circulating?: string;
  url?: string;
  description?: string;
}

// L1 Block Information
export interface L1BlockInfo {
  blockNumber: number;
  timestamp: number;
  hash: string;
  parentHash: string;
  stateRoot: string;
  transactionCount: number;
  gasUsed: string;
  gasLimit: string;
}

// Cross-Layer Action Types
export interface L1Action {
  type: string;
  user: string;
  data: any;
  timestamp: number;
  blockNumber: number;
  txHash?: string;
}

export interface SpotTransfer extends L1Action {
  type: 'spot_transfer';
  data: {
    token: string;
    amount: string;
    destination: 'l1' | 'perp';
  };
}

export interface PerpTransfer extends L1Action {
  type: 'perp_transfer';
  data: {
    amount: string;
    destination: 'spot' | 'withdraw';
  };
}

export interface WithdrawAction extends L1Action {
  type: 'withdraw';
  data: {
    token: string;
    amount: string;
    destination: string;
    nonce: number;
    fee?: string;
  };
}

export interface OrderAction extends L1Action {
  type: 'order';
  data: {
    asset: string;
    isBuy: boolean;
    limitPx: string;
    sz: string;
    reduceOnly: boolean;
    orderType: {
      limit?: {};
      trigger?: {
        triggerPx: string;
        isMarket: boolean;
        tpsl: 'tp' | 'sl';
      };
    };
    cloid?: string;
  };
}

export interface CancelAction extends L1Action {
  type: 'cancel';
  data: {
    asset: string;
    oid: number;
  } | {
    asset: string;
    cloid: string;
  };
}

export interface ModifyAction extends L1Action {
  type: 'modify';
  data: {
    oid: number;
    order: OrderAction['data'];
  };
}

// WebSocket Types for Cross-Layer Data
export interface L1Update {
  type: 'l1_update';
  data: {
    user: string;
    action: L1Action;
    result: {
      success: boolean;
      error?: string;
    };
  };
}

export interface PositionUpdate {
  type: 'position_update';
  data: {
    user: string;
    positions: PerpPosition[];
  };
}

export interface BalanceUpdate {
  type: 'balance_update';
  data: {
    user: string;
    balances: SpotBalance[];
  };
}

// Precompile Contract Interfaces
export interface PrecompileContract {
  address: string;
  name: string;
  functions: PrecompileFunction[];
}

export interface PrecompileFunction {
  name: string;
  inputs: PrecompileInput[];
  outputs: PrecompileOutput[];
  description: string;
}

export interface PrecompileInput {
  name: string;
  type: string;
  description: string;
}

export interface PrecompileOutput {
  name: string;
  type: string;
  description: string;
}

// Cross-Layer Integration Types
export interface CrossLayerQuery {
  user: string;
  queryType: 'position' | 'balance' | 'equity' | 'price' | 'asset_info';
  asset?: string;
  blockNumber?: number;
}

export interface CrossLayerResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  blockNumber: number;
  timestamp: number;
}

// L1 Account Management
export interface L1Account {
  address: string;
  exists: boolean;
  perpPositions: PerpPosition[];
  spotBalances: SpotBalance[];
  vaultEquities: VaultEquity[];
  withdrawableBalances: WithdrawableBalance[];
  totalAccountValue: string;
  marginUsed: string;
  marginAvailable: string;
  maintenanceMargin: string;
}

// Constants for HyperCore Integration
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

export const CORE_WRITER_ADDRESS = '0x3333333333333333333333333333333333333333' as const;
export const ERC20_TRANSFER_ADDRESS = '0x2222222222222222222222222222222222222222' as const;

// L1 Action Types
export const L1_ACTION_TYPES = {
  ORDER: 'order',
  CANCEL: 'cancel', 
  CANCEL_BY_CLOID: 'cancelByCloid',
  MODIFY: 'modify',
  BATCH_MODIFY: 'batchModify',
  UPDATE_LEVERAGE: 'updateLeverage',
  UPDATE_ISOLATED_MARGIN: 'updateIsolatedMargin',
  USD_TRANSFER: 'usdTransfer',
  SPOT_TRANSFER: 'spotTransfer',
  WITHDRAW: 'withdraw',
  SUB_ACCOUNT_TRANSFER: 'subAccountTransfer',
  VAULT_TRANSFER: 'vaultTransfer',
  SET_REFERRER: 'setReferrer'
} as const;

export type L1ActionType = typeof L1_ACTION_TYPES[keyof typeof L1_ACTION_TYPES];

// Asset Indices (commonly used tokens)
export const ASSET_INDICES = {
  USDC: 0,
  ETH: 1,
  BTC: 2,
  SOL: 3,
  DOGE: 4,
  HYPE: 5
} as const;

// Order Types
export type OrderType = {
  limit?: {};
  trigger?: {
    triggerPx: string;
    isMarket: boolean;
    tpsl: 'tp' | 'sl';
  };
};

// Leverage Types
export type LeverageType = {
  type: 'cross' | 'isolated';
  value: number;
  rawUsd: string;
};

// Utility Types
export type HypercoreAddress = keyof typeof HYPERCORE_PRECOMPILE_ADDRESSES;
export type AssetIndex = typeof ASSET_INDICES[keyof typeof ASSET_INDICES];

// Response Types from Precompiles
export interface PrecompileResponse<T = any> {
  success: boolean;
  data: T;
  gasUsed: number;
  blockNumber: number;
}

// Error Types for Cross-Layer Operations
export interface CrossLayerError {
  code: 'ACCOUNT_NOT_EXISTS' | 'INSUFFICIENT_BALANCE' | 'INVALID_ASSET' | 'PRECOMPILE_ERROR';
  message: string;
  details?: any;
}

// State Synchronization Types
export interface StateSyncRequest {
  user: string;
  components: ('positions' | 'balances' | 'orders')[];
  blockNumber?: number;
}

export interface StateSyncResponse {
  user: string;
  blockNumber: number;
  timestamp: number;
  positions?: PerpPosition[];
  balances?: SpotBalance[];
  orders?: any[];
  synced: boolean;
}