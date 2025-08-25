//! Transaction simulation types and data structures

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::types::{Address, Hash, Wei, Network, BlockType};

/// Transaction request for simulation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionRequest {
    /// Sender address
    pub from: Address,
    /// Recipient address (optional for contract creation)
    pub to: Option<Address>,
    /// Transaction value in wei
    pub value: Option<Wei>,
    /// Transaction data (hex string)
    pub data: Option<String>,
    /// Gas limit
    pub gas_limit: Option<String>,
    /// Gas price (legacy)
    pub gas_price: Option<Wei>,
    /// Max fee per gas (EIP-1559)
    pub max_fee_per_gas: Option<Wei>,
    /// Max priority fee per gas (EIP-1559)
    pub max_priority_fee_per_gas: Option<Wei>,
    /// Transaction nonce
    pub nonce: Option<u64>,
    /// Transaction type (0=legacy, 1=EIP-2930, 2=EIP-1559)
    pub tx_type: Option<u8>,
    /// Chain ID
    pub chain_id: Option<u64>,
}

/// Builder pattern for TransactionRequest
pub struct TransactionRequestBuilder {
    request: TransactionRequest,
}

impl TransactionRequestBuilder {
    pub fn new() -> Self {
        Self {
            request: TransactionRequest {
                from: Address("0x0000000000000000000000000000000000000000".to_string()),
                to: None,
                value: None,
                data: None,
                gas_limit: None,
                gas_price: None,
                max_fee_per_gas: None,
                max_priority_fee_per_gas: None,
                nonce: None,
                tx_type: None,
                chain_id: None,
            },
        }
    }

    pub fn from(mut self, from: impl Into<String>) -> crate::error::Result<Self> {
        self.request.from = Address::new(from)?;
        Ok(self)
    }

    pub fn to(mut self, to: impl Into<String>) -> crate::error::Result<Self> {
        self.request.to = Some(Address::new(to)?);
        Ok(self)
    }

    pub fn value(mut self, value: impl Into<String>) -> Self {
        self.request.value = Some(Wei::new(value));
        self
    }

    pub fn data(mut self, data: impl Into<String>) -> Self {
        self.request.data = Some(data.into());
        self
    }

    pub fn gas_limit(mut self, limit: impl Into<String>) -> Self {
        self.request.gas_limit = Some(limit.into());
        self
    }

    pub fn gas_price(mut self, price: impl Into<String>) -> Self {
        self.request.gas_price = Some(Wei::new(price));
        self
    }

    pub fn max_fee_per_gas(mut self, fee: impl Into<String>) -> Self {
        self.request.max_fee_per_gas = Some(Wei::new(fee));
        self
    }

    pub fn max_priority_fee_per_gas(mut self, fee: impl Into<String>) -> Self {
        self.request.max_priority_fee_per_gas = Some(Wei::new(fee));
        self
    }

    pub fn nonce(mut self, nonce: u64) -> Self {
        self.request.nonce = Some(nonce);
        self
    }

    pub fn tx_type(mut self, tx_type: u8) -> Self {
        self.request.tx_type = Some(tx_type);
        self
    }

    pub fn chain_id(mut self, chain_id: u64) -> Self {
        self.request.chain_id = Some(chain_id);
        self
    }

    pub fn build(self) -> crate::error::Result<TransactionRequest> {
        // Basic validation
        if self.request.from.as_str() == "0x0000000000000000000000000000000000000000" {
            return Err(crate::error::HyperSimError::validation("from address is required"));
        }
        Ok(self.request)
    }
}

impl TransactionRequest {
    pub fn builder() -> TransactionRequestBuilder {
        TransactionRequestBuilder::new()
    }
}

/// Result of transaction simulation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationResult {
    /// Whether simulation was successful
    pub success: bool,
    /// Gas used by the transaction
    pub gas_used: String,
    /// Return data from transaction (hex string)
    pub return_data: Option<String>,
    /// Error message if simulation failed
    pub error: Option<String>,
    /// Revert reason if transaction reverted
    pub revert_reason: Option<String>,
    /// Block type this transaction would be included in
    pub block_type: BlockType,
    /// Estimated block number for inclusion
    pub estimated_block: u64,
    /// Execution trace (optional)
    pub trace: Option<ExecutionTrace>,
    /// Cross-layer HyperCore data
    pub hypercore_data: Option<HyperCoreData>,
    /// State changes caused by transaction
    pub state_changes: Vec<StateChange>,
    /// Events emitted during simulation
    pub events: Vec<SimulationEvent>,
    /// Transaction hash (if applicable)
    pub tx_hash: Option<Hash>,
}

/// Execution trace for debugging
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionTrace {
    /// Call stack trace
    pub calls: Vec<TraceCall>,
    /// Gas usage breakdown
    pub gas_breakdown: GasBreakdown,
    /// Storage accesses
    pub storage_accesses: Vec<StorageAccess>,
}

/// Individual call in execution trace
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraceCall {
    /// Call type (CALL, DELEGATECALL, etc.)
    pub call_type: String,
    /// Caller address
    pub from: Address,
    /// Called address
    pub to: Address,
    /// Call value
    pub value: Wei,
    /// Call data (hex string)
    pub input: String,
    /// Return data (hex string)
    pub output: Option<String>,
    /// Gas used for this call
    pub gas_used: String,
    /// Error if call failed
    pub error: Option<String>,
    /// Subcalls made during this call
    pub calls: Vec<TraceCall>,
}

/// Gas usage breakdown
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasBreakdown {
    /// Intrinsic gas cost
    pub intrinsic: String,
    /// Gas used by execution
    pub execution: String,
    /// Gas used for storage
    pub storage: String,
    /// Gas refunded
    pub refund: String,
    /// Total gas used
    pub total: String,
}

/// Storage access during execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageAccess {
    /// Contract address
    pub address: Address,
    /// Storage slot
    pub slot: String,
    /// Access type (read/write)
    pub access_type: StorageAccessType,
    /// Original value
    pub original_value: Option<String>,
    /// New value (for writes)
    pub new_value: Option<String>,
}

/// Storage access type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StorageAccessType {
    Read,
    Write,
}

/// State change caused by transaction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateChange {
    /// Address affected
    pub address: Address,
    /// Change type
    pub change_type: StateChangeType,
    /// Original state
    pub before: Option<HashMap<String, serde_json::Value>>,
    /// New state
    pub after: Option<HashMap<String, serde_json::Value>>,
}

/// Type of state change
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StateChangeType {
    BalanceChange,
    NonceChange,
    CodeChange,
    StorageChange,
    ContractCreation,
    ContractDestruction,
}

/// Event emitted during simulation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationEvent {
    /// Contract address that emitted the event
    pub address: Address,
    /// Event topics
    pub topics: Vec<String>,
    /// Event data (hex string)
    pub data: String,
    /// Block number
    pub block_number: Option<u64>,
    /// Transaction hash
    pub transaction_hash: Option<Hash>,
    /// Log index
    pub log_index: Option<u64>,
    /// Whether event was removed (due to reorg)
    pub removed: bool,
}

/// HyperCore cross-layer data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HyperCoreData {
    /// Cross-layer state root
    pub state_root: String,
    /// Cross-layer transaction data
    pub cross_layer_txs: Vec<CrossLayerTransaction>,
    /// Relevant state data
    pub state_data: HashMap<String, serde_json::Value>,
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
    /// Transaction data
    pub data: String,
    /// Block number
    pub block_number: u64,
}

/// Bundle optimization result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BundleOptimization {
    /// Original transaction order
    pub original_order: Vec<usize>,
    /// Optimized transaction order
    pub optimized_order: Vec<usize>,
    /// Gas savings achieved
    pub gas_savings: String,
    /// Estimated time savings in seconds
    pub time_savings: f64,
    /// Success probability (0.0 to 1.0)
    pub success_probability: f64,
    /// Individual transaction optimizations
    pub transaction_optimizations: Vec<TransactionOptimization>,
    /// Bundle-level recommendations
    pub recommendations: Vec<String>,
}

/// Optimization for individual transaction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionOptimization {
    /// Transaction index
    pub index: usize,
    /// Suggested gas limit
    pub suggested_gas_limit: Option<String>,
    /// Suggested gas price
    pub suggested_gas_price: Option<Wei>,
    /// Suggested max fee per gas
    pub suggested_max_fee_per_gas: Option<Wei>,
    /// Suggested max priority fee per gas
    pub suggested_max_priority_fee_per_gas: Option<Wei>,
    /// Specific recommendations for this transaction
    pub recommendations: Vec<String>,
    /// Potential issues identified
    pub warnings: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transaction_request_builder() {
        let tx = TransactionRequest::builder()
            .from("0x742d35Cc6563C7dE26d1e0d7Ad8e8c61c94c7De1")
            .unwrap()
            .to("0xA0b86a33E6427e8Fc8e0B3b1e5C6b6e4f7A8C1234")
            .unwrap()
            .value("1000000000000000000")
            .gas_limit("21000")
            .nonce(42)
            .build()
            .unwrap();

        assert_eq!(tx.from.as_str(), "0x742d35Cc6563C7dE26d1e0d7Ad8e8c61c94c7De1");
        assert_eq!(tx.to.unwrap().as_str(), "0xA0b86a33E6427e8Fc8e0B3b1e5C6b6e4f7A8C1234");
        assert_eq!(tx.value.unwrap().as_str(), "1000000000000000000");
        assert_eq!(tx.gas_limit.unwrap(), "21000");
        assert_eq!(tx.nonce.unwrap(), 42);
    }

    #[test]
    fn test_invalid_transaction_request() {
        let result = TransactionRequest::builder().build();
        assert!(result.is_err());
    }

    #[test]
    fn test_state_change_type_serialization() {
        let change_type = StateChangeType::BalanceChange;
        let serialized = serde_json::to_string(&change_type).unwrap();
        assert_eq!(serialized, "\"balance_change\"");
    }

    #[test]
    fn test_storage_access_type_serialization() {
        let access_type = StorageAccessType::Read;
        let serialized = serde_json::to_string(&access_type).unwrap();
        assert_eq!(serialized, "\"read\"");
    }
}
