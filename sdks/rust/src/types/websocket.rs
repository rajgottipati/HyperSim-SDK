//! WebSocket client types and message structures

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::types::{Address, Hash, Network};

/// WebSocket connection state
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Reconnecting,
    Error,
}

impl ConnectionState {
    pub fn is_connected(&self) -> bool {
        matches!(self, ConnectionState::Connected)
    }

    pub fn is_connecting(&self) -> bool {
        matches!(self, ConnectionState::Connecting | ConnectionState::Reconnecting)
    }
}

/// WebSocket client configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketClientConfig {
    /// Target network
    pub network: Network,
    /// WebSocket endpoint URL
    pub ws_endpoint: Option<String>,
    /// Connection timeout in milliseconds
    pub connection_timeout: u64,
    /// Ping interval in seconds
    pub ping_interval: u64,
    /// Maximum reconnection attempts
    pub max_reconnect_attempts: u32,
    /// Reconnection backoff multiplier
    pub reconnect_backoff: f64,
    /// Enable automatic reconnection
    pub auto_reconnect: bool,
    /// Buffer size for incoming messages
    pub buffer_size: usize,
    /// Enable compression
    pub compression: bool,
    /// Additional headers for connection
    pub headers: HashMap<String, String>,
}

impl WebSocketClientConfig {
    pub fn new(network: Network) -> Self {
        Self {
            network,
            ws_endpoint: None,
            connection_timeout: 10000,
            ping_interval: 30,
            max_reconnect_attempts: 5,
            reconnect_backoff: 2.0,
            auto_reconnect: true,
            buffer_size: 1024 * 1024, // 1MB
            compression: true,
            headers: HashMap::new(),
        }
    }

    pub fn ws_endpoint(&self) -> &str {
        self.ws_endpoint
            .as_deref()
            .unwrap_or_else(|| self.network.default_ws_endpoint())
    }
}

/// WebSocket subscription configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WSSubscription {
    /// Unique subscription ID
    pub id: String,
    /// Subscription type
    pub subscription_type: SubscriptionType,
    /// Subscription parameters
    pub params: SubscriptionParams,
    /// Whether subscription is active
    pub active: bool,
    /// Creation timestamp
    pub created_at: u64,
}

/// Types of WebSocket subscriptions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SubscriptionType {
    NewHeads,
    NewTransactions,
    PendingTransactions,
    Logs,
    NewBlocks,
    SimulationResults,
    GasPrices,
    NetworkStatus,
}

/// Parameters for WebSocket subscriptions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionParams {
    /// Filter parameters (specific to subscription type)
    pub filter: Option<SubscriptionFilter>,
    /// Whether to include transaction details
    pub include_details: bool,
    /// Maximum number of items in response
    pub limit: Option<u32>,
}

/// Filter parameters for subscriptions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionFilter {
    /// Contract addresses to filter by
    pub addresses: Option<Vec<Address>>,
    /// Event topics to filter by
    pub topics: Option<Vec<Vec<String>>>,
    /// Block range to filter by
    pub block_range: Option<BlockRange>,
    /// Transaction types to include
    pub tx_types: Option<Vec<u8>>,
}

/// Block range filter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockRange {
    /// Starting block number
    pub from_block: Option<u64>,
    /// Ending block number
    pub to_block: Option<u64>,
}

/// WebSocket message structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WSMessage {
    /// Message ID
    pub id: Option<String>,
    /// JSON-RPC method
    pub method: String,
    /// Message parameters
    pub params: serde_json::Value,
    /// Result data (for responses)
    pub result: Option<serde_json::Value>,
    /// Error information (for error responses)
    pub error: Option<WSError>,
    /// Message timestamp
    pub timestamp: u64,
}

/// WebSocket error structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WSError {
    /// Error code
    pub code: i32,
    /// Error message
    pub message: String,
    /// Additional error data
    pub data: Option<serde_json::Value>,
}

/// New block header notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewBlockHeader {
    /// Block hash
    pub hash: Hash,
    /// Parent block hash
    pub parent_hash: Hash,
    /// Block number
    pub number: u64,
    /// Block timestamp
    pub timestamp: u64,
    /// Gas limit
    pub gas_limit: String,
    /// Gas used
    pub gas_used: String,
    /// Difficulty
    pub difficulty: String,
    /// Miner address
    pub miner: Address,
    /// Extra data
    pub extra_data: String,
    /// Transaction count
    pub transaction_count: u32,
}

/// New transaction notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewTransaction {
    /// Transaction hash
    pub hash: Hash,
    /// Sender address
    pub from: Address,
    /// Recipient address
    pub to: Option<Address>,
    /// Transaction value
    pub value: String,
    /// Gas price
    pub gas_price: String,
    /// Gas limit
    pub gas_limit: String,
    /// Transaction nonce
    pub nonce: u64,
    /// Transaction data
    pub input: String,
    /// Block hash (if mined)
    pub block_hash: Option<Hash>,
    /// Block number (if mined)
    pub block_number: Option<u64>,
    /// Transaction index (if mined)
    pub transaction_index: Option<u32>,
}

/// Log/event notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogNotification {
    /// Contract address
    pub address: Address,
    /// Event topics
    pub topics: Vec<String>,
    /// Event data
    pub data: String,
    /// Block hash
    pub block_hash: Hash,
    /// Block number
    pub block_number: u64,
    /// Transaction hash
    pub transaction_hash: Hash,
    /// Transaction index
    pub transaction_index: u32,
    /// Log index
    pub log_index: u32,
    /// Whether log was removed
    pub removed: bool,
}

/// Simulation result notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationNotification {
    /// Request ID that triggered the simulation
    pub request_id: String,
    /// Transaction that was simulated
    pub transaction: serde_json::Value,
    /// Simulation result
    pub result: crate::types::SimulationResult,
    /// Processing time in milliseconds
    pub processing_time: u64,
}

/// Gas price update notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasPriceNotification {
    /// Network identifier
    pub network: Network,
    /// Current gas prices
    pub gas_prices: crate::types::GasPrice,
    /// Timestamp of update
    pub timestamp: u64,
    /// Price trend (increase/decrease/stable)
    pub trend: PriceTrend,
}

/// Gas price trend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PriceTrend {
    Increase,
    Decrease,
    Stable,
}

/// Network status update notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkStatusNotification {
    /// Network identifier
    pub network: Network,
    /// Current network status
    pub status: crate::types::NetworkStatus,
    /// Health indicators
    pub health: crate::types::ConnectionHealth,
    /// Update timestamp
    pub timestamp: u64,
}

/// WebSocket event that can be emitted
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum WSEvent {
    Connected,
    Disconnected { reason: String },
    Error { error: WSError },
    Subscribed { subscription: WSSubscription },
    Unsubscribed { subscription_id: String },
    NewBlock { header: NewBlockHeader },
    NewTransaction { transaction: NewTransaction },
    Log { log: LogNotification },
    SimulationResult { notification: SimulationNotification },
    GasPriceUpdate { notification: GasPriceNotification },
    NetworkStatus { notification: NetworkStatusNotification },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_connection_state() {
        assert!(ConnectionState::Connected.is_connected());
        assert!(!ConnectionState::Disconnected.is_connected());
        assert!(ConnectionState::Connecting.is_connecting());
        assert!(ConnectionState::Reconnecting.is_connecting());
        assert!(!ConnectionState::Connected.is_connecting());
    }

    #[test]
    fn test_websocket_config() {
        let config = WebSocketClientConfig::new(Network::Mainnet);
        assert_eq!(config.network, Network::Mainnet);
        assert_eq!(config.ws_endpoint(), "wss://mainnet-ws.hyperevm.com");
        assert_eq!(config.ping_interval, 30);
        assert!(config.auto_reconnect);
    }

    #[test]
    fn test_subscription_type_serialization() {
        let sub_type = SubscriptionType::NewHeads;
        let serialized = serde_json::to_string(&sub_type).unwrap();
        assert_eq!(serialized, "\"new_heads\"");
    }

    #[test]
    fn test_price_trend_serialization() {
        let trend = PriceTrend::Increase;
        let serialized = serde_json::to_string(&trend).unwrap();
        assert_eq!(serialized, "\"increase\"");
    }
}
