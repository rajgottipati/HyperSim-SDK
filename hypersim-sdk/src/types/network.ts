/**
 * Network-related types and enums
 */

/**
 * Supported HyperEVM networks
 */
export enum Network {
  /** HyperEVM Mainnet (Chain ID: 999) */
  MAINNET = 'mainnet',
  /** HyperEVM Testnet (Chain ID: 998) */
  TESTNET = 'testnet'
}

/**
 * Network configuration details
 */
export interface NetworkConfig {
  /** Network identifier */
  network: Network;
  /** Chain ID */
  chainId: number;
  /** RPC endpoint URL */
  rpcUrl: string;
  /** Block explorer URL */
  explorerUrl: string;
  /** Native token symbol */
  nativeToken: string;
  /** Network name for display */
  displayName: string;
}

/**
 * Network status information
 */
export interface NetworkStatus {
  /** Current network */
  network: Network;
  /** Latest block number */
  latestBlock: number;
  /** Current gas price in wei */
  gasPrice: string;
  /** Network health status */
  isHealthy: boolean;
  /** Average block time in seconds */
  avgBlockTime: number;
  /** Network congestion level */
  congestionLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Block type in HyperEVM's dual-block system
 */
export enum BlockType {
  /** Small blocks: 2M gas limit, 1-second intervals */
  SMALL = 'small',
  /** Large blocks: 30M gas limit, 1-minute intervals */
  LARGE = 'large'
}

/**
 * Block information
 */
export interface BlockInfo {
  /** Block number */
  number: number;
  /** Block hash */
  hash: string;
  /** Block type (small or large) */
  type: BlockType;
  /** Block timestamp */
  timestamp: number;
  /** Gas limit for this block */
  gasLimit: string;
  /** Gas used in this block */
  gasUsed: string;
  /** Number of transactions */
  transactionCount: number;
}
