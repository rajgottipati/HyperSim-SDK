//! HyperEVM specific types and configurations

use serde::{Deserialize, Serialize};
use crate::types::{Address, Hash, Wei, Network, BlockType};

/// HyperEVM client configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HyperEVMConfig {
    /// Target network
    pub network: Network,
    /// Custom RPC endpoint
    pub rpc_endpoint: Option<String>,
    /// Request timeout in milliseconds
    pub timeout: u64,
    /// Maximum retry attempts
    pub max_retries: u32,
    /// Enable request caching
    pub cache_enabled: bool,
    /// Cache TTL in seconds
    pub cache_ttl: u64,
    /// API key for authenticated requests
    pub api_key: Option<String>,
    /// Enable debug logging
    pub debug: bool,
}

impl HyperEVMConfig {
    pub fn new(network: Network) -> Self {
        Self {
            network,
            rpc_endpoint: None,
            timeout: 30000,
            max_retries: 3,
            cache_enabled: true,
            cache_ttl: 300,
            api_key: None,
            debug: false,
        }
    }

    pub fn rpc_endpoint(&self) -> &str {
        self.rpc_endpoint
            .as_deref()
            .unwrap_or_else(|| self.network.default_rpc_endpoint())
    }
}

/// HyperEVM transaction simulation request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HyperEVMSimulationRequest {
    /// Transaction to simulate
    pub transaction: crate::types::TransactionRequest,
    /// Block number to simulate at (optional)
    pub block_number: Option<u64>,
    /// State overrides for simulation
    pub state_overrides: Option<StateOverrides>,
    /// Include execution trace
    pub trace: bool,
    /// Include state changes
    pub state_changes: bool,
    /// Target block type
    pub target_block_type: Option<BlockType>,
}

/// State overrides for simulation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateOverrides {
    /// Account state overrides
    pub accounts: std::collections::HashMap<Address, AccountOverride>,
}

/// Account state override
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountOverride {
    /// Override balance
    pub balance: Option<Wei>,
    /// Override nonce
    pub nonce: Option<u64>,
    /// Override code
    pub code: Option<String>,
    /// Override storage
    pub storage: Option<std::collections::HashMap<String, String>>,
}

/// HyperEVM block information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HyperEVMBlock {
    /// Block hash
    pub hash: Hash,
    /// Parent block hash
    pub parent_hash: Hash,
    /// Block number
    pub number: u64,
    /// Block timestamp
    pub timestamp: u64,
    /// Block type (fast or secure)
    pub block_type: BlockType,
    /// Gas limit
    pub gas_limit: String,
    /// Gas used
    pub gas_used: String,
    /// Difficulty
    pub difficulty: String,
    /// Miner/validator address
    pub miner: Address,
    /// Extra data
    pub extra_data: String,
    /// State root
    pub state_root: Hash,
    /// Transactions root
    pub transactions_root: Hash,
    /// Receipts root
    pub receipts_root: Hash,
    /// Bloom filter
    pub logs_bloom: String,
    /// Transaction hashes
    pub transaction_hashes: Vec<Hash>,
    /// Uncle blocks (for compatibility)
    pub uncles: Vec<Hash>,
}

/// HyperEVM transaction receipt
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HyperEVMTransactionReceipt {
    /// Transaction hash
    pub transaction_hash: Hash,
    /// Transaction index in block
    pub transaction_index: u32,
    /// Block hash
    pub block_hash: Hash,
    /// Block number
    pub block_number: u64,
    /// Block type
    pub block_type: BlockType,
    /// Sender address
    pub from: Address,
    /// Recipient address
    pub to: Option<Address>,
    /// Cumulative gas used
    pub cumulative_gas_used: String,
    /// Gas used by this transaction
    pub gas_used: String,
    /// Contract address (if contract creation)
    pub contract_address: Option<Address>,
    /// Transaction logs
    pub logs: Vec<HyperEVMLog>,
    /// Transaction status (1 = success, 0 = failure)
    pub status: u8,
    /// Effective gas price
    pub effective_gas_price: Wei,
    /// Transaction type
    pub tx_type: u8,
}

/// HyperEVM log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HyperEVMLog {
    /// Contract address that emitted the log
    pub address: Address,
    /// Log topics
    pub topics: Vec<String>,
    /// Log data
    pub data: String,
    /// Block number
    pub block_number: u64,
    /// Transaction hash
    pub transaction_hash: Hash,
    /// Transaction index
    pub transaction_index: u32,
    /// Log index in block
    pub log_index: u32,
    /// Whether log was removed (due to reorg)
    pub removed: bool,
}

/// HyperEVM account information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HyperEVMAccount {
    /// Account address
    pub address: Address,
    /// Account balance
    pub balance: Wei,
    /// Account nonce
    pub nonce: u64,
    /// Contract code hash
    pub code_hash: Option<Hash>,
    /// Contract code (if available)
    pub code: Option<String>,
    /// Storage root hash
    pub storage_root: Option<Hash>,
}

/// HyperEVM gas estimation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HyperEVMGasEstimate {
    /// Estimated gas limit
    pub gas_limit: String,
    /// Estimated gas price
    pub gas_price: Wei,
    /// Total estimated cost
    pub total_cost: Wei,
    /// Confidence level (0.0 to 1.0)
    pub confidence: f64,
    /// Estimation factors considered
    pub factors: Vec<String>,
}

/// HyperEVM network statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HyperEVMNetworkStats {
    /// Current block number
    pub latest_block: u64,
    /// Latest fast block number
    pub latest_fast_block: u64,
    /// Latest secure block number
    pub latest_secure_block: u64,
    /// Network hash rate
    pub hash_rate: String,
    /// Network difficulty
    pub difficulty: String,
    /// Total supply
    pub total_supply: Wei,
    /// Active validator count
    pub validator_count: u32,
    /// Transaction pool size
    pub tx_pool_size: u32,
    /// Average block time (fast)
    pub avg_fast_block_time: f64,
    /// Average block time (secure)
    pub avg_secure_block_time: f64,
}

/// HyperEVM dual-block system information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DualBlockInfo {
    /// Fast block details
    pub fast_block: BlockInfo,
    /// Secure block details
    pub secure_block: BlockInfo,
    /// Confirmation status
    pub confirmation_status: ConfirmationStatus,
}

/// Block information summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockInfo {
    /// Block number
    pub number: u64,
    /// Block hash
    pub hash: Hash,
    /// Block timestamp
    pub timestamp: u64,
    /// Number of transactions
    pub transaction_count: u32,
    /// Gas utilization percentage
    pub gas_utilization: f64,
}

/// Transaction confirmation status in dual-block system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfirmationStatus {
    /// Fast block confirmations
    pub fast_confirmations: u32,
    /// Secure block confirmations
    pub secure_confirmations: u32,
    /// Overall confidence level
    pub confidence_level: f64,
    /// Finality status
    pub finality: FinalityStatus,
}

/// Transaction finality status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FinalityStatus {
    Pending,
    FastConfirmed,
    SecureConfirmed,
    Finalized,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hyperevm_config() {
        let config = HyperEVMConfig::new(Network::Testnet);
        assert_eq!(config.network, Network::Testnet);
        assert_eq!(config.rpc_endpoint(), "https://testnet.hyperevm.com");
        assert_eq!(config.timeout, 30000);
        assert_eq!(config.max_retries, 3);
        assert!(config.cache_enabled);
    }

    #[test]
    fn test_finality_status_serialization() {
        let status = FinalityStatus::FastConfirmed;
        let serialized = serde_json::to_string(&status).unwrap();
        assert_eq!(serialized, "\"fast_confirmed\"");
    }

    #[test]
    fn test_account_override() {
        let override_data = AccountOverride {
            balance: Some(Wei::new("1000000000000000000")),
            nonce: Some(42),
            code: None,
            storage: None,
        };
        
        assert_eq!(override_data.balance.unwrap().as_str(), "1000000000000000000");
        assert_eq!(override_data.nonce.unwrap(), 42);
    }
}
