//! HyperCore client implementation

use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::RwLock;
use tracing::{debug, info};

use crate::types::{
    HyperCoreConfig, TransactionRequest, CrossLayerData, CrossLayerQuery, 
    QueryType, BlockRange, QueryFilters, StateData, CrossLayerTransaction,
};
use crate::error::{HyperSimError, Result};

/// HyperCore client for cross-layer data access
pub struct HyperCoreClient {
    config: HyperCoreConfig,
    http_client: reqwest::Client,
    cache: Arc<RwLock<HashMap<String, CachedData>>>,
}

#[derive(Debug, Clone)]
struct CachedData {
    data: CrossLayerData,
    expires_at: std::time::Instant,
}

impl HyperCoreClient {
    /// Create a new HyperCore client
    pub async fn new(config: HyperCoreConfig) -> Result<Self> {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert("Content-Type", "application/json".parse().unwrap());
        
        if let Some(ref api_key) = config.api_key {
            headers.insert("X-API-Key", api_key.parse().unwrap());
        }

        let http_client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(config.timeout))
            .default_headers(headers)
            .build()
            .map_err(|e| HyperSimError::network(format!("Failed to create HyperCore client: {}", e)))?;

        Ok(Self {
            config,
            http_client,
            cache: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    /// Get relevant cross-layer data for a transaction
    pub async fn get_relevant_data(&self, transaction: &TransactionRequest) -> Result<CrossLayerData> {
        debug!("Fetching HyperCore data for transaction");

        // Build query based on transaction
        let query = CrossLayerQuery {
            query_type: QueryType::AccountState,
            addresses: vec![transaction.from.clone()],
            block_range: BlockRange {
                from_block: None,
                to_block: None,
                include_pending: true,
            },
            filters: QueryFilters {
                topics: None,
                min_value: None,
                tx_types: None,
                include_internal: false,
            },
            include_history: false,
        };

        self.query_cross_layer_data(query).await
    }

    /// Query cross-layer data with custom parameters
    pub async fn query_cross_layer_data(&self, query: CrossLayerQuery) -> Result<CrossLayerData> {
        let cache_key = self.generate_cache_key(&query);
        
        // Check cache first
        if let Some(cached) = self.get_cached_data(&cache_key).await {
            debug!("Cache hit for HyperCore query");
            return Ok(cached.data);
        }

        // For demo purposes, return mock cross-layer data
        let cross_layer_data = CrossLayerData {
            query: query.clone(),
            state_data: StateData {
                account_states: HashMap::new(),
                storage_states: HashMap::new(),
                layer_mappings: Vec::new(),
                sync_info: crate::types::StateSyncInfo {
                    last_sync_block: 18000000,
                    sync_status: crate::types::SyncStatus::Synced,
                    pending_syncs: 0,
                    sync_lag: 0,
                    health_score: 1.0,
                },
            },
            transactions: Vec::new(),
            bridge_operations: Vec::new(),
            state_proofs: None,
            metadata: crate::types::CrossLayerMetadata {
                execution_time_ms: 150,
                data_sources: vec!["HyperCore".to_string()],
                cache_hit_ratio: 0.75,
                data_age_seconds: 5,
                api_version: "v1".to_string(),
            },
        };

        // Cache the result
        self.cache_data(&cache_key, &cross_layer_data).await;

        Ok(cross_layer_data)
    }

    /// Get bridge operations for addresses
    pub async fn get_bridge_operations(&self, addresses: &[crate::types::Address]) -> Result<Vec<crate::types::BridgeOperation>> {
        info!("Fetching bridge operations for {} addresses", addresses.len());
        
        // Mock bridge operations for demo
        Ok(Vec::new())
    }

    /// Health check
    pub async fn health_check(&self) -> Result<()> {
        let response = self.http_client
            .get(&format!("{}/health", self.config.endpoint()))
            .send()
            .await
            .map_err(|e| HyperSimError::network(format!("Health check failed: {}", e)))?;

        if response.status().is_success() {
            Ok(())
        } else {
            Err(HyperSimError::network("HyperCore health check failed"))
        }
    }

    // Private helper methods

    fn generate_cache_key(&self, query: &CrossLayerQuery) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        format!("{:?}", query.query_type).hash(&mut hasher);
        for addr in &query.addresses {
            addr.as_str().hash(&mut hasher);
        }
        
        format!("hypercore_{:x}", hasher.finish())
    }

    async fn get_cached_data(&self, cache_key: &str) -> Option<CachedData> {
        let cache = self.cache.read().await;
        
        if let Some(entry) = cache.get(cache_key) {
            if entry.expires_at > std::time::Instant::now() {
                return Some(entry.clone());
            }
        }
        
        None
    }

    async fn cache_data(&self, cache_key: &str, data: &CrossLayerData) {
        if self.config.cache_enabled {
            let entry = CachedData {
                data: data.clone(),
                expires_at: std::time::Instant::now() + 
                    std::time::Duration::from_secs(self.config.cache_ttl),
            };
            
            let mut cache = self.cache.write().await;
            cache.insert(cache_key.to_string(), entry);
            
            // Simple cache cleanup
            if cache.len() > 500 {
                let now = std::time::Instant::now();
                cache.retain(|_, v| v.expires_at > now);
            }
        }
    }
}

impl std::fmt::Debug for HyperCoreClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("HyperCoreClient")
            .field("network", &self.config.network)
            .field("endpoint", &self.config.endpoint())
            .field("cache_enabled", &self.config.cache_enabled)
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Network, Address};

    #[tokio::test]
    async fn test_hypercore_client_creation() {
        let config = HyperCoreConfig::new(Network::Local);
        let client = HyperCoreClient::new(config).await;
        assert!(client.is_ok());
    }

    #[test]
    fn test_cache_key_generation() {
        let config = HyperCoreConfig::new(Network::Local);
        let client = tokio_test::block_on(HyperCoreClient::new(config)).unwrap();
        
        let query = CrossLayerQuery {
            query_type: QueryType::AccountState,
            addresses: vec![Address("0x742d35Cc6563C7dE26d1e0d7Ad8e8c61c94c7De1".to_string())],
            block_range: BlockRange {
                from_block: None,
                to_block: None,
                include_pending: true,
            },
            filters: QueryFilters {
                topics: None,
                min_value: None,
                tx_types: None,
                include_internal: false,
            },
            include_history: false,
        };
        
        let key = client.generate_cache_key(&query);
        assert!(key.starts_with("hypercore_"));
    }
}
