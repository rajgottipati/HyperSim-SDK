//! HyperEVM client implementation

use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::RwLock;
use tracing::{debug, error, info};

use crate::types::{
    HyperEVMConfig, TransactionRequest, SimulationResult, NetworkStatus,
    BlockType, HyperEVMBlock, Address, Hash, Wei,
};
use crate::error::{HyperSimError, Result};

/// High-performance HyperEVM client for transaction simulation
pub struct HyperEVMClient {
    config: HyperEVMConfig,
    http_client: reqwest::Client,
    cache: Arc<RwLock<HashMap<String, CacheEntry>>>,
    metrics: Arc<RwLock<ClientMetrics>>,
}

#[derive(Debug, Clone)]
struct CacheEntry {
    data: serde_json::Value,
    expires_at: std::time::Instant,
}

#[derive(Debug, Default)]
struct ClientMetrics {
    total_requests: u64,
    cache_hits: u64,
    errors: u64,
}

impl HyperEVMClient {
    /// Create a new HyperEVM client
    pub async fn new(config: HyperEVMConfig) -> Result<Self> {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert("Content-Type", "application/json".parse().unwrap());
        headers.insert("User-Agent", format!("HyperSim-SDK-Rust/{}", crate::SDK_VERSION).parse().unwrap());

        if let Some(ref api_key) = config.api_key {
            headers.insert("Authorization", format!("Bearer {}", api_key).parse().unwrap());
        }

        let http_client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(config.timeout))
            .default_headers(headers)
            .build()
            .map_err(|e| HyperSimError::network(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self {
            config,
            http_client,
            cache: Arc::new(RwLock::new(HashMap::new())),
            metrics: Arc::new(RwLock::new(ClientMetrics::default())),
        })
    }

    /// Simulate a transaction on HyperEVM
    pub async fn simulate(&self, transaction: TransactionRequest) -> Result<SimulationResult> {
        let start_time = std::time::Instant::now();
        
        debug!("Simulating transaction from {}", transaction.from);

        // Check cache first
        let cache_key = self.generate_cache_key(&transaction);
        if let Some(cached_result) = self.get_cached_result(&cache_key).await {
            debug!("Cache hit for transaction simulation");
            let mut metrics = self.metrics.write().await;
            metrics.cache_hits += 1;
            return Ok(cached_result);
        }

        // Prepare simulation request
        let simulation_request = self.build_simulation_request(transaction)?;
        
        // Send RPC request
        let response = self.send_rpc_request("hyperevm_simulate", simulation_request).await?;
        
        // Parse response
        let simulation_result = self.parse_simulation_response(response)?;
        
        // Cache the result
        if self.config.cache_enabled {
            self.cache_result(&cache_key, &simulation_result).await;
        }
        
        // Update metrics
        let mut metrics = self.metrics.write().await;
        metrics.total_requests += 1;
        
        debug!("Simulation completed in {}ms", start_time.elapsed().as_millis());
        
        Ok(simulation_result)
    }

    /// Get network status
    pub async fn get_network_status(&self) -> Result<NetworkStatus> {
        let response = self.send_rpc_request("eth_getNetworkStatus", serde_json::Value::Null).await?;
        
        // Mock network status for demo
        Ok(NetworkStatus {
            block_number: 18000000,
            hash_rate: Some("450000000000000".to_string()),
            difficulty: Some("58750003716598352816469".to_string()),
            gas_price: crate::types::GasPrice {
                standard: "20000000000".to_string(),
                fast: "25000000000".to_string(),
                instant: "30000000000".to_string(),
                base_fee: Some("18000000000".to_string()),
                priority_fees: Some(crate::types::PriorityFees {
                    low: "1000000000".to_string(),
                    standard: "2000000000".to_string(),
                    high: "3000000000".to_string(),
                }),
            },
            syncing: false,
            peer_count: 25,
        })
    }

    /// Get latest block information
    pub async fn get_latest_block(&self) -> Result<HyperEVMBlock> {
        let response = self.send_rpc_request("eth_getBlockByNumber", 
            serde_json::json!(["latest", false])
        ).await?;
        
        self.parse_block_response(response)
    }

    /// Health check
    pub async fn health_check(&self) -> Result<()> {
        let response = self.send_rpc_request("eth_blockNumber", serde_json::Value::Null).await?;
        
        if response.get("result").is_some() {
            Ok(())
        } else {
            Err(HyperSimError::network("Health check failed"))
        }
    }

    // Private implementation methods

    async fn send_rpc_request(&self, method: &str, params: serde_json::Value) -> Result<serde_json::Value> {
        let request_body = serde_json::json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": 1
        });

        let response = self.http_client
            .post(self.config.rpc_endpoint())
            .json(&request_body)
            .send()
            .await
            .map_err(|e| HyperSimError::network(format!("HTTP request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(HyperSimError::network(format!(
                "HTTP error: {}", response.status()
            )));
        }

        let response_json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| HyperSimError::serialization(format!("Invalid JSON response: {}", e)))?;

        if let Some(error) = response_json.get("error") {
            return Err(HyperSimError::simulation(format!(
                "RPC error: {}", error
            )));
        }

        Ok(response_json)
    }

    fn build_simulation_request(&self, transaction: TransactionRequest) -> Result<serde_json::Value> {
        let mut tx_data = serde_json::Map::new();
        
        tx_data.insert("from".to_string(), serde_json::Value::String(transaction.from.to_string()));
        
        if let Some(to) = transaction.to {
            tx_data.insert("to".to_string(), serde_json::Value::String(to.to_string()));
        }
        
        if let Some(value) = transaction.value {
            tx_data.insert("value".to_string(), serde_json::Value::String(value.to_string()));
        }
        
        if let Some(data) = transaction.data {
            tx_data.insert("data".to_string(), serde_json::Value::String(data));
        }
        
        if let Some(gas_limit) = transaction.gas_limit {
            tx_data.insert("gas".to_string(), serde_json::Value::String(format!("0x{:x}", 
                gas_limit.parse::<u64>().unwrap_or(21000))));
        }
        
        if let Some(gas_price) = transaction.gas_price {
            tx_data.insert("gasPrice".to_string(), serde_json::Value::String(gas_price.to_string()));
        }
        
        Ok(serde_json::Value::Object(tx_data))
    }

    fn parse_simulation_response(&self, response: serde_json::Value) -> Result<SimulationResult> {
        let result = response.get("result")
            .ok_or_else(|| HyperSimError::simulation("No result in response"))?;
        
        let success = result.get("success")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        
        let gas_used = result.get("gasUsed")
            .and_then(|v| v.as_str())
            .unwrap_or("0")
            .to_string();
        
        let return_data = result.get("returnData")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        
        let error = if !success {
            result.get("error")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        } else {
            None
        };
        
        Ok(SimulationResult {
            success,
            gas_used,
            return_data,
            error,
            revert_reason: None,
            block_type: BlockType::Fast, // Default to fast block
            estimated_block: 18000001,
            trace: None,
            hypercore_data: None,
            state_changes: Vec::new(),
            events: Vec::new(),
            tx_hash: None,
        })
    }

    fn parse_block_response(&self, response: serde_json::Value) -> Result<HyperEVMBlock> {
        let result = response.get("result")
            .ok_or_else(|| HyperSimError::serialization("No result in block response"))?;
        
        // Mock block parsing for demo
        Ok(HyperEVMBlock {
            hash: Hash("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string()),
            parent_hash: Hash("0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890".to_string()),
            number: 18000000,
            timestamp: chrono::Utc::now().timestamp() as u64,
            block_type: BlockType::Fast,
            gas_limit: "30000000".to_string(),
            gas_used: "15000000".to_string(),
            difficulty: "58750003716598352816469".to_string(),
            miner: Address("0x0000000000000000000000000000000000000000".to_string()),
            extra_data: "0x".to_string(),
            state_root: Hash("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string()),
            transactions_root: Hash("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string()),
            receipts_root: Hash("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string()),
            logs_bloom: "0x0".repeat(512),
            transaction_hashes: Vec::new(),
            uncles: Vec::new(),
        })
    }

    fn generate_cache_key(&self, transaction: &TransactionRequest) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        transaction.from.as_str().hash(&mut hasher);
        if let Some(ref to) = transaction.to {
            to.as_str().hash(&mut hasher);
        }
        if let Some(ref value) = transaction.value {
            value.as_str().hash(&mut hasher);
        }
        if let Some(ref data) = transaction.data {
            data.hash(&mut hasher);
        }
        
        format!("tx_{:x}", hasher.finish())
    }

    async fn get_cached_result(&self, cache_key: &str) -> Option<SimulationResult> {
        let cache = self.cache.read().await;
        
        if let Some(entry) = cache.get(cache_key) {
            if entry.expires_at > std::time::Instant::now() {
                // Try to deserialize cached data
                if let Ok(result) = serde_json::from_value(entry.data.clone()) {
                    return Some(result);
                }
            }
        }
        
        None
    }

    async fn cache_result(&self, cache_key: &str, result: &SimulationResult) {
        if let Ok(serialized) = serde_json::to_value(result) {
            let entry = CacheEntry {
                data: serialized,
                expires_at: std::time::Instant::now() + 
                    std::time::Duration::from_secs(self.config.cache_ttl),
            };
            
            let mut cache = self.cache.write().await;
            cache.insert(cache_key.to_string(), entry);
            
            // Simple cache cleanup
            if cache.len() > 1000 {
                let now = std::time::Instant::now();
                cache.retain(|_, v| v.expires_at > now);
            }
        }
    }
}

impl std::fmt::Debug for HyperEVMClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("HyperEVMClient")
            .field("network", &self.config.network)
            .field("endpoint", &self.config.rpc_endpoint())
            .field("cache_enabled", &self.config.cache_enabled)
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Network;

    #[tokio::test]
    async fn test_client_creation() {
        let config = HyperEVMConfig::new(Network::Local);
        let client = HyperEVMClient::new(config).await;
        assert!(client.is_ok());
    }

    #[test]
    fn test_cache_key_generation() {
        let config = HyperEVMConfig::new(Network::Local);
        let client = tokio_test::block_on(HyperEVMClient::new(config)).unwrap();
        
        let tx = TransactionRequest::builder()
            .from("0x742d35Cc6563C7dE26d1e0d7Ad8e8c61c94c7De1").unwrap()
            .build().unwrap();
            
        let key = client.generate_cache_key(&tx);
        assert!(key.starts_with("tx_"));
        assert!(key.len() > 10);
    }
}
