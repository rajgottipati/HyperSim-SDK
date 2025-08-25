//! HyperCore cross-layer integration types

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::types::{Address, Hash, Network};

/// HyperCore client configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HyperCoreConfig {
    /// Target network
    pub network: Network,
    /// HyperCore endpoint URL
    pub endpoint: Option<String>,
    /// API key for authenticated requests
    pub api_key: Option<String>,
    /// Request timeout in milliseconds
    pub timeout: u64,
    /// Enable cross-layer data caching
    pub cache_enabled: bool,
    /// Cache TTL in seconds
    pub cache_ttl: u64,
    /// Maximum batch size for requests
    pub max_batch_size: u32,
    /// Enable compression for requests
    pub compression: bool,
    /// Debug mode
    pub debug: bool,
}

impl HyperCoreConfig {
    pub fn new(network: Network) -> Self {
        Self {
            network,
            endpoint: None,
            api_key: None,
            timeout: 15000,
            cache_enabled: true,
            cache_ttl: 60,
            max_batch_size: 100,
            compression: true,
            debug: false,
        }
    }

    pub fn endpoint(&self) -> &str {
        self.endpoint
            .as_deref()
            .unwrap_or_else(|| self.network.hypercore_endpoint())
    }
}

/// Cross-layer data query request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossLayerQuery {
    /// Query type
    pub query_type: QueryType,
    /// Target addresses
    pub addresses: Vec<Address>,
    /// Block number or range
    pub block_range: BlockRange,
    /// Additional filters
    pub filters: QueryFilters,
    /// Include historical data
    pub include_history: bool,
}

/// Types of cross-layer queries
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QueryType {
    AccountState,
    ContractStorage,
    TransactionHistory,
    EventLogs,
    CrossLayerTransactions,
    StateProofs,
    BridgeOperations,
}

/// Block range for queries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockRange {
    /// Starting block number
    pub from_block: Option<u64>,
    /// Ending block number
    pub to_block: Option<u64>,
    /// Include pending transactions
    pub include_pending: bool,
}

/// Query filters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryFilters {
    /// Event topics to filter by
    pub topics: Option<Vec<String>>,
    /// Minimum transaction value
    pub min_value: Option<String>,
    /// Transaction types to include
    pub tx_types: Option<Vec<u8>>,
    /// Include internal transactions
    pub include_internal: bool,
}

/// Cross-layer data response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossLayerData {
    /// Query that generated this data
    pub query: CrossLayerQuery,
    /// Cross-layer state information
    pub state_data: StateData,
    /// Cross-layer transactions
    pub transactions: Vec<CrossLayerTransaction>,
    /// Bridge operations
    pub bridge_operations: Vec<BridgeOperation>,
    /// State proofs (if requested)
    pub state_proofs: Option<Vec<StateProof>>,
    /// Metadata
    pub metadata: CrossLayerMetadata,
}

/// Cross-layer state data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateData {
    /// Account states across layers
    pub account_states: HashMap<Address, LayerAccountState>,
    /// Contract storage states
    pub storage_states: HashMap<Address, HashMap<String, String>>,
    /// Cross-layer mappings
    pub layer_mappings: Vec<LayerMapping>,
    /// State synchronization info
    pub sync_info: StateSyncInfo,
}

/// Account state across different layers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayerAccountState {
    /// Account address
    pub address: Address,
    /// States in different layers
    pub layer_states: HashMap<String, AccountLayerState>,
    /// Cross-layer balance total
    pub total_balance: String,
    /// Last synchronization timestamp
    pub last_sync: u64,
}

/// Account state in a specific layer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountLayerState {
    /// Layer identifier
    pub layer_id: String,
    /// Balance in this layer
    pub balance: String,
    /// Nonce in this layer
    pub nonce: u64,
    /// Locked/staked amounts
    pub locked_balance: Option<String>,
    /// Layer-specific metadata
    pub metadata: HashMap<String, serde_json::Value>,
}

/// Cross-layer transaction information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossLayerTransaction {
    /// Transaction hash
    pub hash: Hash,
    /// Source layer
    pub source_layer: String,
    /// Target layer
    pub target_layer: String,
    /// Transaction type
    pub tx_type: CrossLayerTxType,
    /// Source address
    pub from: Address,
    /// Target address
    pub to: Address,
    /// Amount transferred
    pub amount: String,
    /// Transaction data
    pub data: String,
    /// Gas information
    pub gas_info: CrossLayerGasInfo,
    /// Status
    pub status: CrossLayerTxStatus,
    /// Timestamps
    pub timestamps: TransactionTimestamps,
    /// Related transaction hashes
    pub related_hashes: Vec<Hash>,
}

/// Types of cross-layer transactions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CrossLayerTxType {
    Bridge,
    Stake,
    Unstake,
    Delegate,
    Undelegate,
    Governance,
    DataSync,
    StateProof,
}

/// Gas information for cross-layer transactions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossLayerGasInfo {
    /// Gas used in source layer
    pub source_gas_used: String,
    /// Gas used in target layer
    pub target_gas_used: Option<String>,
    /// Total gas cost
    pub total_gas_cost: String,
    /// Gas price in source layer
    pub source_gas_price: String,
    /// Gas price in target layer
    pub target_gas_price: Option<String>,
}

/// Cross-layer transaction status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CrossLayerTxStatus {
    Pending,
    Confirmed,
    Failed,
    Bridging,
    Completed,
}

/// Transaction timestamps
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionTimestamps {
    /// Initiated timestamp
    pub initiated: u64,
    /// Confirmed in source layer
    pub source_confirmed: Option<u64>,
    /// Confirmed in target layer
    pub target_confirmed: Option<u64>,
    /// Completed timestamp
    pub completed: Option<u64>,
}

/// Bridge operation information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BridgeOperation {
    /// Operation ID
    pub operation_id: String,
    /// Bridge type
    pub bridge_type: BridgeType,
    /// Source chain/layer
    pub source: String,
    /// Target chain/layer
    pub target: String,
    /// Asset being bridged
    pub asset: BridgedAsset,
    /// Operation status
    pub status: BridgeStatus,
    /// Security parameters
    pub security: BridgeSecurityInfo,
    /// Fee information
    pub fees: BridgeFeeInfo,
}

/// Types of bridges
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BridgeType {
    TokenBridge,
    MessageBridge,
    StateBridge,
    LiquidityBridge,
}

/// Bridged asset information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BridgedAsset {
    /// Asset type (native token, ERC20, NFT, etc.)
    pub asset_type: String,
    /// Asset identifier (address or ID)
    pub asset_id: String,
    /// Amount being bridged
    pub amount: String,
    /// Asset metadata
    pub metadata: HashMap<String, serde_json::Value>,
}

/// Bridge operation status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BridgeStatus {
    Initiated,
    Locked,
    Validated,
    Minted,
    Released,
    Completed,
    Failed,
    Disputed,
}

/// Bridge security information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BridgeSecurityInfo {
    /// Number of validators required
    pub required_validators: u32,
    /// Current validator confirmations
    pub confirmations: u32,
    /// Security threshold
    pub security_threshold: f64,
    /// Fraud proof period (seconds)
    pub fraud_proof_period: u64,
}

/// Bridge fee information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BridgeFeeInfo {
    /// Base bridge fee
    pub base_fee: String,
    /// Gas fees for source transaction
    pub source_gas_fee: String,
    /// Gas fees for target transaction
    pub target_gas_fee: Option<String>,
    /// Total fees
    pub total_fee: String,
    /// Fee token
    pub fee_token: String,
}

/// Layer mapping information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayerMapping {
    /// Source layer
    pub source_layer: String,
    /// Target layer
    pub target_layer: String,
    /// Address mapping
    pub address_mapping: HashMap<Address, Address>,
    /// Asset mapping
    pub asset_mapping: HashMap<String, String>,
    /// Conversion rates
    pub conversion_rates: HashMap<String, f64>,
}

/// State synchronization information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateSyncInfo {
    /// Last synchronization block
    pub last_sync_block: u64,
    /// Synchronization status
    pub sync_status: SyncStatus,
    /// Pending synchronizations
    pub pending_syncs: u32,
    /// Synchronization lag (blocks)
    pub sync_lag: u64,
    /// Health score (0.0 to 1.0)
    pub health_score: f64,
}

/// Synchronization status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncStatus {
    Syncing,
    Synced,
    Behind,
    Disconnected,
}

/// State proof for cross-layer verification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateProof {
    /// Account address
    pub address: Address,
    /// Proof type
    pub proof_type: ProofType,
    /// Merkle proof data
    pub proof: Vec<String>,
    /// Root hash
    pub root: Hash,
    /// Block number for proof
    pub block_number: u64,
    /// Layer identifier
    pub layer: String,
}

/// Types of state proofs
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProofType {
    AccountProof,
    StorageProof,
    TransactionProof,
    ReceiptProof,
}

/// Cross-layer metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossLayerMetadata {
    /// Query execution time
    pub execution_time_ms: u64,
    /// Data sources used
    pub data_sources: Vec<String>,
    /// Cache hit ratio
    pub cache_hit_ratio: f64,
    /// Data freshness (seconds)
    pub data_age_seconds: u64,
    /// API version used
    pub api_version: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hypercore_config() {
        let config = HyperCoreConfig::new(Network::Mainnet);
        assert_eq!(config.network, Network::Mainnet);
        assert_eq!(config.endpoint(), "https://hypercore-mainnet.hyperevm.com");
        assert_eq!(config.timeout, 15000);
        assert!(config.cache_enabled);
    }

    #[test]
    fn test_query_type_serialization() {
        let query_type = QueryType::AccountState;
        let serialized = serde_json::to_string(&query_type).unwrap();
        assert_eq!(serialized, "\"account_state\"");
    }

    #[test]
    fn test_cross_layer_tx_status() {
        let status = CrossLayerTxStatus::Bridging;
        let serialized = serde_json::to_string(&status).unwrap();
        assert_eq!(serialized, "\"bridging\"");
    }

    #[test]
    fn test_sync_status() {
        let status = SyncStatus::Synced;
        let serialized = serde_json::to_string(&status).unwrap();
        assert_eq!(serialized, "\"synced\"");
    }
}
