//! Constants used throughout the SDK

/// Gas constants
pub mod gas {
    /// Standard gas limit for simple transfers
    pub const SIMPLE_TRANSFER_GAS_LIMIT: u64 = 21_000;
    
    /// Maximum gas limit for a transaction
    pub const MAX_GAS_LIMIT: u64 = 30_000_000;
    
    /// Gas limit for contract deployment
    pub const CONTRACT_DEPLOYMENT_GAS_LIMIT: u64 = 5_000_000;
    
    /// Minimum gas price in gwei
    pub const MIN_GAS_PRICE_GWEI: u64 = 1;
    
    /// Maximum gas price in gwei (for safety)
    pub const MAX_GAS_PRICE_GWEI: u64 = 1_000;
}

/// Network constants
pub mod network {
    /// Ethereum mainnet chain ID
    pub const MAINNET_CHAIN_ID: u64 = 1;
    
    /// Sepolia testnet chain ID
    pub const SEPOLIA_CHAIN_ID: u64 = 11155111;
    
    /// Local development chain ID (Hardhat/Ganache)
    pub const LOCAL_CHAIN_ID: u64 = 31337;
    
    /// Block confirmation requirements
    pub const FAST_BLOCK_CONFIRMATIONS: u32 = 1;
    pub const SECURE_BLOCK_CONFIRMATIONS: u32 = 6;
    
    /// Average block times (in seconds)
    pub const FAST_BLOCK_TIME_SECS: u64 = 2;
    pub const SECURE_BLOCK_TIME_SECS: u64 = 12;
}

/// Address constants
pub mod addresses {
    /// Zero address
    pub const ZERO_ADDRESS: &str = "0x0000000000000000000000000000000000000000";
    
    /// Common contract addresses (placeholder for well-known contracts)
    pub const WETH_MAINNET: &str = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    pub const USDC_MAINNET: &str = "0xA0b86a33E6427e8e5c4F27eAD9083C756Cc2";
    pub const USDT_MAINNET: &str = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
}

/// Time constants
pub mod time {
    /// Default request timeout in milliseconds
    pub const DEFAULT_TIMEOUT_MS: u64 = 30_000;
    
    /// WebSocket ping interval in seconds
    pub const WS_PING_INTERVAL_SECS: u64 = 30;
    
    /// Cache TTL in seconds
    pub const DEFAULT_CACHE_TTL_SECS: u64 = 300; // 5 minutes
    
    /// Health check interval in seconds
    pub const HEALTH_CHECK_INTERVAL_SECS: u64 = 30;
    
    /// Metrics collection interval in seconds
    pub const METRICS_INTERVAL_SECS: u64 = 60;
}

/// Size limits
pub mod limits {
    /// Maximum transaction size in bytes
    pub const MAX_TRANSACTION_SIZE: usize = 32 * 1024; // 32KB
    
    /// Maximum batch size for bulk operations
    pub const MAX_BATCH_SIZE: usize = 100;
    
    /// Maximum number of subscriptions per client
    pub const MAX_SUBSCRIPTIONS: usize = 1000;
    
    /// Maximum cache entries
    pub const MAX_CACHE_ENTRIES: usize = 10_000;
    
    /// WebSocket message buffer size
    pub const WS_BUFFER_SIZE: usize = 1024 * 1024; // 1MB
}

/// API endpoints (configurable via environment or config)
pub mod endpoints {
    /// Default mainnet RPC endpoint
    pub const DEFAULT_MAINNET_RPC: &str = "https://mainnet.hyperevm.com";
    
    /// Default testnet RPC endpoint
    pub const DEFAULT_TESTNET_RPC: &str = "https://testnet.hyperevm.com";
    
    /// Default local RPC endpoint
    pub const DEFAULT_LOCAL_RPC: &str = "http://localhost:8545";
    
    /// Default mainnet WebSocket endpoint
    pub const DEFAULT_MAINNET_WS: &str = "wss://mainnet-ws.hyperevm.com";
    
    /// Default testnet WebSocket endpoint
    pub const DEFAULT_TESTNET_WS: &str = "wss://testnet-ws.hyperevm.com";
    
    /// Default local WebSocket endpoint
    pub const DEFAULT_LOCAL_WS: &str = "ws://localhost:8546";
    
    /// Default mainnet HyperCore endpoint
    pub const DEFAULT_MAINNET_HYPERCORE: &str = "https://hypercore-mainnet.hyperevm.com";
    
    /// Default testnet HyperCore endpoint
    pub const DEFAULT_TESTNET_HYPERCORE: &str = "https://hypercore-testnet.hyperevm.com";
    
    /// Default local HyperCore endpoint
    pub const DEFAULT_LOCAL_HYPERCORE: &str = "http://localhost:8547";
}

/// Error codes
pub mod errors {
    /// Generic error codes
    pub const GENERIC_ERROR: i32 = -1;
    pub const INVALID_REQUEST: i32 = -32600;
    pub const METHOD_NOT_FOUND: i32 = -32601;
    pub const INVALID_PARAMS: i32 = -32602;
    pub const INTERNAL_ERROR: i32 = -32603;
    
    /// Custom error codes
    pub const SIMULATION_FAILED: i32 = -40000;
    pub const INSUFFICIENT_FUNDS: i32 = -40001;
    pub const GAS_LIMIT_EXCEEDED: i32 = -40002;
    pub const NONCE_TOO_LOW: i32 = -40003;
    pub const NONCE_TOO_HIGH: i32 = -40004;
    pub const REPLACEMENT_UNDERPRICED: i32 = -40005;
}

/// Version information
pub mod version {
    /// SDK version
    pub const SDK_VERSION: &str = env!("CARGO_PKG_VERSION");
    
    /// SDK name
    pub const SDK_NAME: &str = env!("CARGO_PKG_NAME");
    
    /// Minimum supported Rust version
    pub const MIN_RUST_VERSION: &str = "1.70.0";
    
    /// API version
    pub const API_VERSION: &str = "v1";
    
    /// User agent string
    pub const USER_AGENT: &str = concat!(
        env!("CARGO_PKG_NAME"), 
        "/", 
        env!("CARGO_PKG_VERSION")
    );
}

/// Feature flags
pub mod features {
    /// AI features enabled
    pub const AI_ENABLED: bool = cfg!(feature = "ai");
    
    /// Streaming features enabled
    pub const STREAMING_ENABLED: bool = cfg!(feature = "streaming");
    
    /// Plugin system enabled
    pub const PLUGINS_ENABLED: bool = cfg!(feature = "plugins");
    
    /// Cross-layer integration enabled
    pub const CROSS_LAYER_ENABLED: bool = cfg!(feature = "cross-layer");
}

/// Utility functions for constants
impl super::constants {
    /// Get chain ID for network name
    pub fn get_chain_id(network_name: &str) -> Option<u64> {
        match network_name.to_lowercase().as_str() {
            "mainnet" | "main" => Some(network::MAINNET_CHAIN_ID),
            "testnet" | "sepolia" => Some(network::SEPOLIA_CHAIN_ID),
            "local" | "localhost" | "dev" => Some(network::LOCAL_CHAIN_ID),
            _ => None,
        }
    }
    
    /// Get default RPC endpoint for network
    pub fn get_rpc_endpoint(network_name: &str) -> Option<&'static str> {
        match network_name.to_lowercase().as_str() {
            "mainnet" | "main" => Some(endpoints::DEFAULT_MAINNET_RPC),
            "testnet" | "sepolia" => Some(endpoints::DEFAULT_TESTNET_RPC),
            "local" | "localhost" | "dev" => Some(endpoints::DEFAULT_LOCAL_RPC),
            _ => None,
        }
    }
    
    /// Check if address is zero address
    pub fn is_zero_address(address: &str) -> bool {
        address.eq_ignore_ascii_case(addresses::ZERO_ADDRESS)
    }
    
    /// Get user agent string
    pub fn user_agent() -> &'static str {
        version::USER_AGENT
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chain_id_lookup() {
        assert_eq!(super::constants::get_chain_id("mainnet"), Some(1));
        assert_eq!(super::constants::get_chain_id("sepolia"), Some(11155111));
        assert_eq!(super::constants::get_chain_id("local"), Some(31337));
        assert_eq!(super::constants::get_chain_id("unknown"), None);
    }

    #[test]
    fn test_rpc_endpoint_lookup() {
        assert_eq!(
            super::constants::get_rpc_endpoint("mainnet"), 
            Some("https://mainnet.hyperevm.com")
        );
        assert_eq!(
            super::constants::get_rpc_endpoint("unknown"), 
            None
        );
    }

    #[test]
    fn test_zero_address_check() {
        assert!(super::constants::is_zero_address("0x0000000000000000000000000000000000000000"));
        assert!(super::constants::is_zero_address("0X0000000000000000000000000000000000000000"));
        assert!(!super::constants::is_zero_address("0x1234567890123456789012345678901234567890"));
    }

    #[test]
    fn test_gas_constants() {
        assert_eq!(gas::SIMPLE_TRANSFER_GAS_LIMIT, 21_000);
        assert!(gas::MAX_GAS_LIMIT > gas::SIMPLE_TRANSFER_GAS_LIMIT);
        assert!(gas::MIN_GAS_PRICE_GWEI < gas::MAX_GAS_PRICE_GWEI);
    }

    #[test]
    fn test_version_constants() {
        assert!(!version::SDK_VERSION.is_empty());
        assert!(!version::SDK_NAME.is_empty());
        assert!(!version::USER_AGENT.is_empty());
    }
}
