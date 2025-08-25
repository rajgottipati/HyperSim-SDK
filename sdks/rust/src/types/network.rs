//! Network-related types and configurations

use serde::{Deserialize, Serialize};
use std::fmt;

/// Supported networks for HyperEVM
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Network {
    /// Mainnet network
    Mainnet,
    /// Testnet network
    Testnet,
    /// Local development network
    Local,
}

impl Network {
    /// Get the chain ID for this network
    pub fn chain_id(&self) -> u64 {
        match self {
            Network::Mainnet => 1,     // Ethereum mainnet
            Network::Testnet => 11155111, // Sepolia testnet
            Network::Local => 31337,   // Hardhat/Ganache local
        }
    }

    /// Get the default RPC endpoint for this network
    pub fn default_rpc_endpoint(&self) -> &'static str {
        match self {
            Network::Mainnet => "https://mainnet.hyperevm.com",
            Network::Testnet => "https://testnet.hyperevm.com",
            Network::Local => "http://localhost:8545",
        }
    }

    /// Get the default WebSocket endpoint for this network
    pub fn default_ws_endpoint(&self) -> &'static str {
        match self {
            Network::Mainnet => "wss://mainnet-ws.hyperevm.com",
            Network::Testnet => "wss://testnet-ws.hyperevm.com",
            Network::Local => "ws://localhost:8546",
        }
    }

    /// Get the HyperCore endpoint for cross-layer data
    pub fn hypercore_endpoint(&self) -> &'static str {
        match self {
            Network::Mainnet => "https://hypercore-mainnet.hyperevm.com",
            Network::Testnet => "https://hypercore-testnet.hyperevm.com",
            Network::Local => "http://localhost:8547",
        }
    }

    /// Check if this is a production network
    pub fn is_production(&self) -> bool {
        matches!(self, Network::Mainnet)
    }

    /// Get network name as string
    pub fn as_str(&self) -> &'static str {
        match self {
            Network::Mainnet => "mainnet",
            Network::Testnet => "testnet",
            Network::Local => "local",
        }
    }
}

impl fmt::Display for Network {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl std::str::FromStr for Network {
    type Err = crate::error::HyperSimError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "mainnet" | "main" => Ok(Network::Mainnet),
            "testnet" | "test" | "sepolia" => Ok(Network::Testnet),
            "local" | "localhost" | "dev" => Ok(Network::Local),
            _ => Err(crate::error::HyperSimError::validation(
                format!("Unknown network: {}", s)
            )),
        }
    }
}

/// Block type in dual-block system
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BlockType {
    /// Fast block for quick confirmations
    Fast,
    /// Secure block for final confirmations
    Secure,
}

impl BlockType {
    /// Get typical confirmation time in seconds
    pub fn confirmation_time_secs(&self) -> u64 {
        match self {
            BlockType::Fast => 2,   // ~2 seconds
            BlockType::Secure => 12, // ~12 seconds
        }
    }

    /// Get block type as string
    pub fn as_str(&self) -> &'static str {
        match self {
            BlockType::Fast => "fast",
            BlockType::Secure => "secure",
        }
    }
}

impl fmt::Display for BlockType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl std::str::FromStr for BlockType {
    type Err = crate::error::HyperSimError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "fast" | "f" => Ok(BlockType::Fast),
            "secure" | "s" | "final" => Ok(BlockType::Secure),
            _ => Err(crate::error::HyperSimError::validation(
                format!("Unknown block type: {}", s)
            )),
        }
    }
}

/// Network configuration for clients
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    /// Target network
    pub network: Network,
    /// Custom RPC endpoint (overrides default)
    pub rpc_endpoint: Option<String>,
    /// Custom WebSocket endpoint (overrides default)
    pub ws_endpoint: Option<String>,
    /// Custom HyperCore endpoint (overrides default)
    pub hypercore_endpoint: Option<String>,
    /// Request timeout in milliseconds
    pub timeout_ms: u64,
    /// Maximum concurrent connections
    pub max_connections: u32,
    /// Enable connection pooling
    pub connection_pooling: bool,
}

impl NetworkConfig {
    pub fn new(network: Network) -> Self {
        Self {
            network,
            rpc_endpoint: None,
            ws_endpoint: None,
            hypercore_endpoint: None,
            timeout_ms: 30000,
            max_connections: 10,
            connection_pooling: true,
        }
    }

    /// Get the effective RPC endpoint
    pub fn rpc_endpoint(&self) -> &str {
        self.rpc_endpoint
            .as_deref()
            .unwrap_or_else(|| self.network.default_rpc_endpoint())
    }

    /// Get the effective WebSocket endpoint
    pub fn ws_endpoint(&self) -> &str {
        self.ws_endpoint
            .as_deref()
            .unwrap_or_else(|| self.network.default_ws_endpoint())
    }

    /// Get the effective HyperCore endpoint
    pub fn hypercore_endpoint(&self) -> &str {
        self.hypercore_endpoint
            .as_deref()
            .unwrap_or_else(|| self.network.hypercore_endpoint())
    }
}

/// Gas price information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasPrice {
    /// Standard gas price in wei
    pub standard: String,
    /// Fast gas price in wei
    pub fast: String,
    /// Instant gas price in wei  
    pub instant: String,
    /// Base fee (EIP-1559)
    pub base_fee: Option<String>,
    /// Priority fee suggestions
    pub priority_fees: Option<PriorityFees>,
}

/// Priority fee recommendations for EIP-1559
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriorityFees {
    /// Low priority fee
    pub low: String,
    /// Standard priority fee
    pub standard: String,
    /// High priority fee
    pub high: String,
}

/// Network status information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkStatus {
    /// Current block number
    pub block_number: u64,
    /// Network hash rate
    pub hash_rate: Option<String>,
    /// Network difficulty
    pub difficulty: Option<String>,
    /// Gas price information
    pub gas_price: GasPrice,
    /// Whether network is syncing
    pub syncing: bool,
    /// Number of connected peers
    pub peer_count: u32,
}

/// Connection health information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionHealth {
    /// Connection status
    pub connected: bool,
    /// Latency in milliseconds
    pub latency_ms: Option<u64>,
    /// Block sync status
    pub block_sync_status: BlockSyncStatus,
    /// Last successful request timestamp
    pub last_success: Option<u64>,
    /// Connection uptime in milliseconds
    pub uptime_ms: u64,
}

/// Block synchronization status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockSyncStatus {
    /// Current local block
    pub current_block: u64,
    /// Highest known block
    pub highest_block: u64,
    /// Starting block for sync
    pub starting_block: u64,
    /// Whether currently syncing
    pub syncing: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_network_properties() {
        assert_eq!(Network::Mainnet.chain_id(), 1);
        assert_eq!(Network::Testnet.chain_id(), 11155111);
        assert_eq!(Network::Local.chain_id(), 31337);

        assert!(Network::Mainnet.is_production());
        assert!(!Network::Testnet.is_production());
        assert!(!Network::Local.is_production());
    }

    #[test]
    fn test_network_parsing() {
        assert_eq!("mainnet".parse::<Network>().unwrap(), Network::Mainnet);
        assert_eq!("testnet".parse::<Network>().unwrap(), Network::Testnet);
        assert_eq!("local".parse::<Network>().unwrap(), Network::Local);
        assert!("invalid".parse::<Network>().is_err());
    }

    #[test]
    fn test_block_type_properties() {
        assert_eq!(BlockType::Fast.confirmation_time_secs(), 2);
        assert_eq!(BlockType::Secure.confirmation_time_secs(), 12);
        assert_eq!(BlockType::Fast.as_str(), "fast");
        assert_eq!(BlockType::Secure.as_str(), "secure");
    }

    #[test]
    fn test_network_config() {
        let config = NetworkConfig::new(Network::Mainnet);
        assert_eq!(config.rpc_endpoint(), "https://mainnet.hyperevm.com");
        assert_eq!(config.ws_endpoint(), "wss://mainnet-ws.hyperevm.com");
        assert_eq!(config.hypercore_endpoint(), "https://hypercore-mainnet.hyperevm.com");
    }
}
