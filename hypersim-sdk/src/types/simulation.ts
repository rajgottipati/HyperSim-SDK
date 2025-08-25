/**
 * Transaction simulation types and interfaces
 */

import { Network, BlockType } from './network';

/**
 * Transaction request for simulation
 */
export interface TransactionRequest {
  /** Sender address */
  from: string;
  /** Recipient address (optional for contract creation) */
  to?: string;
  /** Transaction value in wei */
  value?: string;
  /** Transaction data */
  data?: string;
  /** Gas limit */
  gasLimit?: string;
  /** Gas price */
  gasPrice?: string;
  /** Max fee per gas (EIP-1559) */
  maxFeePerGas?: string;
  /** Max priority fee per gas (EIP-1559) */
  maxPriorityFeePerGas?: string;
  /** Transaction nonce */
  nonce?: number;
  /** Transaction type (0, 1, 2) */
  type?: number;
}

/**
 * Result of transaction simulation
 */
export interface SimulationResult {
  /** Whether simulation was successful */
  success: boolean;
  /** Gas used by the transaction */
  gasUsed: string;
  /** Return data from transaction */
  returnData?: string;
  /** Error message if simulation failed */
  error?: string;
  /** Revert reason if transaction reverted */
  revertReason?: string;
  /** Block type this transaction would be included in */
  blockType: BlockType;
  /** Estimated block number for inclusion */
  estimatedBlock: number;
  /** Execution trace (optional) */
  trace?: ExecutionTrace;
  /** Cross-layer HyperCore data */
  hyperCoreData?: HyperCoreData;
  /** State changes caused by transaction */
  stateChanges?: StateChange[];
  /** Events emitted during simulation */
  events?: SimulationEvent[];
}

/**
 * Execution trace for debugging
 */
export interface ExecutionTrace {
  /** Call stack trace */
  calls: TraceCall[];
  /** Gas usage breakdown */
  gasBreakdown: GasBreakdown;
  /** Storage accesses */
  storageAccesses: StorageAccess[];
}

/**
 * Individual call in execution trace
 */
export interface TraceCall {
  /** Call type (CALL, DELEGATECALL, etc.) */
  type: string;
  /** Caller address */
  from: string;
  /** Called address */
  to: string;
  /** Call value */
  value: string;
  /** Call data */
  input: string;
  /** Return data */
  output?: string;
  /** Gas used for this call */
  gasUsed: string;
  /** Error if call failed */
  error?: string;
  /** Subcalls made during this call */
  calls?: TraceCall[];
}

/**
 * Gas usage breakdown
 */
export interface GasBreakdown {
  /** Base transaction gas */
  baseGas: string;
  /** Execution gas */
  executionGas: string;
  /** Storage gas */
  storageGas: string;
  /** Memory expansion gas */
  memoryGas: string;
  /** Log gas */
  logGas: string;
}

/**
 * Storage access information
 */
export interface StorageAccess {
  /** Contract address */
  address: string;
  /** Storage slot */
  slot: string;
  /** Value read/written */
  value: string;
  /** Access type (READ, WRITE) */
  type: 'READ' | 'WRITE';
}

/**
 * State change information
 */
export interface StateChange {
  /** Address whose state changed */
  address: string;
  /** Type of change */
  type: 'BALANCE' | 'NONCE' | 'CODE' | 'STORAGE';
  /** Storage slot (for STORAGE type) */
  slot?: string;
  /** Previous value */
  before: string;
  /** New value */
  after: string;
}

/**
 * Event emitted during simulation
 */
export interface SimulationEvent {
  /** Contract address that emitted the event */
  address: string;
  /** Event signature hash */
  topics: string[];
  /** Event data */
  data: string;
  /** Event name (if known) */
  name?: string;
  /** Decoded event parameters */
  args?: Record<string, any>;
}

/**
 * Cross-layer HyperCore data
 */
export interface HyperCoreData {
  /** HyperCore state at simulation time */
  coreState: Record<string, any>;
  /** Relevant positions and balances */
  positions?: Position[];
  /** Market data */
  marketData?: MarketData;
  /** Cross-layer interactions */
  interactions?: CoreInteraction[];
}

/**
 * Position information from HyperCore
 */
export interface Position {
  /** Asset identifier */
  asset: string;
  /** Position size */
  size: string;
  /** Entry price */
  entryPrice: string;
  /** Unrealized PnL */
  unrealizedPnl: string;
  /** Position side */
  side: 'LONG' | 'SHORT';
}

/**
 * Market data from HyperCore
 */
export interface MarketData {
  /** Asset prices */
  prices: Record<string, string>;
  /** Market depths */
  depths: Record<string, MarketDepth>;
  /** Funding rates */
  fundingRates: Record<string, string>;
}

/**
 * Market depth information
 */
export interface MarketDepth {
  /** Best bid price */
  bid: string;
  /** Best ask price */
  ask: string;
  /** Bid size */
  bidSize: string;
  /** Ask size */
  askSize: string;
}

/**
 * Core interaction (cross-layer operation)
 */
export interface CoreInteraction {
  /** Interaction type */
  type: 'READ' | 'write';
  /** Target precompile address */
  precompile: string;
  /** Interaction data */
  data: string;
  /** Expected result */
  result?: string;
}

/**
 * Bundle optimization result
 */
export interface BundleOptimization {
  /** Original total gas cost */
  originalGas: string;
  /** Optimized total gas cost */
  optimizedGas: string;
  /** Gas saved through optimization */
  gasSaved: string;
  /** Optimization suggestions */
  suggestions: string[];
  /** Recommended transaction order (indices) */
  reorderedIndices: number[];
  /** Potential issues identified */
  warnings?: string[];
}
