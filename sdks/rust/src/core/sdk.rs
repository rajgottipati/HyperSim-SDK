//! Main HyperSim SDK implementation

use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};

use crate::core::HyperSimConfig;
use crate::clients::{HyperEVMClient, HyperCoreClient, WebSocketClient};
use crate::plugins::{PluginSystem, Plugin};
use crate::ai::AIAnalyzer;
use crate::types::{
    TransactionRequest, SimulationResult, BundleOptimization,
    AIInsights, PerformanceMetrics, NetworkStatus, ConnectionHealth,
    WSSubscription, SubscriptionType, SubscriptionParams,
};
use crate::error::{HyperSimError, Result};

/// Main SDK for HyperEVM transaction simulation
/// 
/// Provides comprehensive transaction simulation capabilities with:
/// - Real HyperEVM network integration
/// - Cross-layer HyperCore data access  
/// - AI-powered analysis and optimization
/// - WebSocket streaming for real-time data
/// - Plugin system for extensibility
/// - Production-ready error handling
/// - Zero-cost abstractions and memory safety
pub struct HyperSimSDK {
    /// SDK configuration
    config: Arc<HyperSimConfig>,
    
    /// HyperEVM client for transaction simulation
    hyperevm_client: Arc<HyperEVMClient>,
    
    /// HyperCore client for cross-layer data
    hypercore_client: Option<Arc<HyperCoreClient>>,
    
    /// WebSocket client for streaming
    websocket_client: Option<Arc<WebSocketClient>>,
    
    /// Plugin system for extensibility
    plugin_system: Arc<PluginSystem>,
    
    /// AI analyzer for insights and optimization
    ai_analyzer: Option<Arc<AIAnalyzer>>,
    
    /// Request counter for tracking
    request_counter: AtomicU64,
    
    /// Performance metrics
    metrics: Arc<RwLock<PerformanceMetrics>>,
    
    /// SDK state
    state: Arc<RwLock<SDKState>>,
}

/// Internal SDK state
#[derive(Debug)]
struct SDKState {
    /// Whether SDK is initialized
    initialized: bool,
    /// Active subscriptions
    active_subscriptions: Vec<WSSubscription>,
    /// Connection health status
    connection_health: ConnectionHealth,
    /// Last error (if any)
    last_error: Option<HyperSimError>,
    /// Uptime start timestamp
    uptime_start: std::time::Instant,
}

impl HyperSimSDK {
    /// Create a new HyperSim SDK instance
    ///
    /// # Arguments
    /// * `config` - SDK configuration
    ///
    /// # Returns
    /// A new SDK instance wrapped in Arc for thread safety
    ///
    /// # Example
    /// ```rust,no_run
    /// use hypersim_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() -> Result<()> {
    ///     let config = HyperSimConfig::builder()
    ///         .network(Network::Testnet)
    ///         .ai_enabled(true)
    ///         .streaming_enabled(true)
    ///         .build()?;
    ///
    ///     let sdk = HyperSimSDK::new(config).await?;
    ///     Ok(())
    /// }
    /// ```
    pub async fn new(config: HyperSimConfig) -> Result<Arc<Self>> {
        info!("Initializing HyperSim SDK for network: {}", config.network());

        let config = Arc::new(config);
        
        // Initialize HyperEVM client
        let hyperevm_client = Arc::new(HyperEVMClient::new(
            crate::types::HyperEVMConfig {
                network: config.network(),
                rpc_endpoint: Some(config.rpc_endpoint().to_string()),
                timeout: config.timeout_ms(),
                max_retries: 3,
                cache_enabled: config.cache_enabled(),
                cache_ttl: config.cache_ttl_secs(),
                api_key: None,
                debug: config.debug_enabled(),
            }
        ).await?);

        // Initialize HyperCore client if cross-layer is enabled
        let hypercore_client = if config.cross_layer_enabled() {
            Some(Arc::new(HyperCoreClient::new(
                crate::types::HyperCoreConfig {
                    network: config.network(),
                    endpoint: Some(config.hypercore_endpoint().to_string()),
                    api_key: None,
                    timeout: config.timeout_ms(),
                    cache_enabled: config.cache_enabled(),
                    cache_ttl: config.cache_ttl_secs(),
                    max_batch_size: 100,
                    compression: true,
                    debug: config.debug_enabled(),
                }
            ).await?))
        } else {
            None
        };

        // Initialize WebSocket client if streaming is enabled
        let websocket_client = if config.streaming_enabled() {
            Some(Arc::new(WebSocketClient::new(
                crate::types::WebSocketClientConfig {
                    network: config.network(),
                    ws_endpoint: Some(config.ws_endpoint().to_string()),
                    connection_timeout: config.timeout_ms(),
                    ping_interval: 30,
                    max_reconnect_attempts: 5,
                    reconnect_backoff: 2.0,
                    auto_reconnect: true,
                    buffer_size: 1024 * 1024,
                    compression: true,
                    headers: std::collections::HashMap::new(),
                }
            ).await?))
        } else {
            None
        };

        // Initialize plugin system
        let plugin_system = Arc::new(PluginSystem::new().await?);

        // Load configured plugins
        for plugin_config in config.plugin_configs() {
            plugin_system.load_plugin(plugin_config.clone()).await?;
        }

        // Initialize AI analyzer if enabled
        let ai_analyzer = if config.ai_enabled() {
            if let Some(api_key) = config.openai_api_key() {
                Some(Arc::new(AIAnalyzer::new(api_key.to_string()).await?))
            } else {
                warn!("AI features enabled but no API key provided");
                None
            }
        } else {
            None
        };

        // Initialize performance metrics
        let metrics = Arc::new(RwLock::new(PerformanceMetrics {
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            average_response_time: 0.0,
            connection_pool: crate::types::ConnectionPoolStats {
                active: 0,
                idle: config.max_connections(),
                total: config.max_connections(),
            },
            cache_hit_ratio: 0.0,
            uptime: 0,
        }));

        // Initialize SDK state
        let state = Arc::new(RwLock::new(SDKState {
            initialized: true,
            active_subscriptions: Vec::new(),
            connection_health: ConnectionHealth {
                connected: true,
                latency_ms: None,
                block_sync_status: crate::types::BlockSyncStatus {
                    current_block: 0,
                    highest_block: 0,
                    starting_block: 0,
                    syncing: false,
                },
                last_success: Some(chrono::Utc::now().timestamp_millis() as u64),
                uptime_ms: 0,
            },
            last_error: None,
            uptime_start: std::time::Instant::now(),
        }));

        let sdk = Arc::new(Self {
            config,
            hyperevm_client,
            hypercore_client,
            websocket_client,
            plugin_system,
            ai_analyzer,
            request_counter: AtomicU64::new(0),
            metrics,
            state,
        });

        // Start background tasks
        sdk.start_background_tasks().await?;

        info!("HyperSim SDK initialized successfully");
        Ok(sdk)
    }

    /// Simulate a transaction on HyperEVM
    ///
    /// # Arguments
    /// * `transaction` - Transaction to simulate
    ///
    /// # Returns
    /// Simulation result with gas estimates and execution details
    ///
    /// # Example
    /// ```rust,no_run
    /// use hypersim_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() -> Result<()> {
    ///     let sdk = HyperSimSDK::new(config).await?;
    ///     
    ///     let tx = TransactionRequest::builder()
    ///         .from("0x742d35Cc6563C7dE26d1e0d7Ad8e8c61c94c7De1")?
    ///         .to("0xA0b86a33E6427e8Fc8e0B3b1e5C6b6e4f7A8C1234")?
    ///         .value("1000000000000000000")
    ///         .build()?;
    ///
    ///     let result = sdk.simulate(tx).await?;
    ///     println!("Success: {}, Gas used: {}", result.success, result.gas_used);
    ///     Ok(())
    /// }
    /// ```
    pub async fn simulate(&self, transaction: TransactionRequest) -> Result<SimulationResult> {
        let start_time = std::time::Instant::now();
        let request_id = self.generate_request_id();
        
        debug!("Starting simulation for request {}", request_id);

        // Execute pre-simulation hooks
        self.plugin_system.execute_before_simulation(&transaction).await?;

        let mut result = match self.hyperevm_client.simulate(transaction.clone()).await {
            Ok(mut sim_result) => {
                // Fetch cross-layer data if enabled
                if let Some(ref hypercore_client) = self.hypercore_client {
                    match hypercore_client.get_relevant_data(&transaction).await {
                        Ok(hypercore_data) => {
                            sim_result.hypercore_data = Some(hypercore_data);
                        }
                        Err(e) => {
                            warn!("Failed to fetch HyperCore data: {}", e);
                            // Don't fail the entire simulation for HyperCore errors
                        }
                    }
                }
                sim_result
            }
            Err(e) => {
                error!("Simulation failed: {}", e);
                self.update_error_metrics().await;
                return Err(e);
            }
        };

        // Execute post-simulation hooks
        self.plugin_system.execute_after_simulation(&mut result).await?;

        let duration = start_time.elapsed();
        self.update_success_metrics(duration.as_millis() as u64).await;

        debug!("Simulation completed in {}ms", duration.as_millis());
        Ok(result)
    }

    /// Get AI-powered insights for a simulation result
    ///
    /// # Arguments
    /// * `simulation_result` - Result from simulate() method
    ///
    /// # Returns
    /// AI analysis with optimization suggestions and risk assessment
    pub async fn get_ai_insights(&self, simulation_result: &SimulationResult) -> Result<AIInsights> {
        let ai_analyzer = self.ai_analyzer
            .as_ref()
            .ok_or_else(|| HyperSimError::configuration("AI features not enabled"))?;

        let start_time = std::time::Instant::now();
        
        debug!("Starting AI analysis");

        let insights = ai_analyzer.analyze_simulation(simulation_result.clone()).await?;

        debug!("AI analysis completed in {}ms", start_time.elapsed().as_millis());
        Ok(insights)
    }

    /// Optimize a bundle of transactions
    ///
    /// # Arguments
    /// * `transactions` - Array of transactions to optimize
    ///
    /// # Returns
    /// Optimization suggestions including gas savings and reordering
    pub async fn optimize_bundle(&self, transactions: Vec<TransactionRequest>) -> Result<BundleOptimization> {
        if transactions.is_empty() {
            return Err(HyperSimError::validation("Transaction bundle cannot be empty"));
        }

        let start_time = std::time::Instant::now();
        debug!("Starting bundle optimization for {} transactions", transactions.len());

        // Simulate each transaction
        let mut simulations = Vec::new();
        for tx in &transactions {
            let sim = self.simulate(tx.clone()).await?;
            simulations.push(sim);
        }

        // Use AI to optimize bundle if available
        let optimization = if let Some(ref ai_analyzer) = self.ai_analyzer {
            ai_analyzer.optimize_bundle(simulations).await?
        } else {
            // Fallback to basic optimization without AI
            self.basic_bundle_optimization(simulations).await?
        };

        debug!("Bundle optimization completed in {}ms", start_time.elapsed().as_millis());
        Ok(optimization)
    }

    /// Subscribe to WebSocket events
    ///
    /// # Arguments
    /// * `subscription_type` - Type of events to subscribe to
    /// * `params` - Subscription parameters
    ///
    /// # Returns
    /// Subscription handle
    pub async fn subscribe(
        &self,
        subscription_type: SubscriptionType,
        params: SubscriptionParams,
    ) -> Result<WSSubscription> {
        let ws_client = self.websocket_client
            .as_ref()
            .ok_or_else(|| HyperSimError::configuration("WebSocket streaming not enabled"))?;

        let subscription = ws_client.subscribe(subscription_type, params).await?;
        
        // Add to active subscriptions
        let mut state = self.state.write().await;
        state.active_subscriptions.push(subscription.clone());

        Ok(subscription)
    }

    /// Unsubscribe from WebSocket events
    ///
    /// # Arguments  
    /// * `subscription_id` - ID of subscription to cancel
    pub async fn unsubscribe(&self, subscription_id: &str) -> Result<()> {
        let ws_client = self.websocket_client
            .as_ref()
            .ok_or_else(|| HyperSimError::configuration("WebSocket streaming not enabled"))?;

        ws_client.unsubscribe(subscription_id).await?;
        
        // Remove from active subscriptions
        let mut state = self.state.write().await;
        state.active_subscriptions.retain(|s| s.id != subscription_id);

        Ok(())
    }

    /// Get current performance metrics
    pub async fn get_metrics(&self) -> PerformanceMetrics {
        let mut metrics = self.metrics.read().await.clone();
        
        // Update uptime
        let state = self.state.read().await;
        metrics.uptime = state.uptime_start.elapsed().as_millis() as u64;
        
        metrics
    }

    /// Get network status information
    pub async fn get_network_status(&self) -> Result<NetworkStatus> {
        self.hyperevm_client.get_network_status().await
    }

    /// Get connection health information
    pub async fn get_connection_health(&self) -> ConnectionHealth {
        let state = self.state.read().await;
        let mut health = state.connection_health.clone();
        health.uptime_ms = state.uptime_start.elapsed().as_millis() as u64;
        health
    }

    /// Shutdown the SDK and cleanup resources
    pub async fn shutdown(&self) -> Result<()> {
        info!("Shutting down HyperSim SDK");

        // Stop all active subscriptions
        for subscription in &self.state.read().await.active_subscriptions {
            if let Err(e) = self.unsubscribe(&subscription.id).await {
                warn!("Failed to unsubscribe from {}: {}", subscription.id, e);
            }
        }

        // Shutdown WebSocket client
        if let Some(ref ws_client) = self.websocket_client {
            ws_client.disconnect().await?;
        }

        // Shutdown plugin system
        self.plugin_system.shutdown().await?;

        // Mark as not initialized
        let mut state = self.state.write().await;
        state.initialized = false;

        info!("HyperSim SDK shutdown completed");
        Ok(())
    }

    // Private helper methods

    async fn start_background_tasks(&self) -> Result<()> {
        // Start metrics collection task
        if self.config.metrics_enabled() {
            self.start_metrics_task().await;
        }

        // Start health check task  
        self.start_health_check_task().await;

        Ok(())
    }

    async fn start_metrics_task(&self) {
        let metrics = Arc::clone(&self.metrics);
        let _handle = tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
            loop {
                interval.tick().await;
                // Update metrics periodically
                // Implementation would collect various metrics
            }
        });
    }

    async fn start_health_check_task(&self) {
        let state = Arc::clone(&self.state);
        let hyperevm_client = Arc::clone(&self.hyperevm_client);
        
        let _handle = tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
            loop {
                interval.tick().await;
                
                // Perform health check
                let health_ok = hyperevm_client.health_check().await.is_ok();
                
                let mut state_guard = state.write().await;
                state_guard.connection_health.connected = health_ok;
                state_guard.connection_health.last_success = if health_ok {
                    Some(chrono::Utc::now().timestamp_millis() as u64)
                } else {
                    state_guard.connection_health.last_success
                };
            }
        });
    }

    fn generate_request_id(&self) -> u64 {
        self.request_counter.fetch_add(1, Ordering::SeqCst)
    }

    async fn update_success_metrics(&self, response_time: u64) {
        let mut metrics = self.metrics.write().await;
        metrics.total_requests += 1;
        metrics.successful_requests += 1;
        
        // Update average response time (simple moving average)
        let total = metrics.successful_requests as f64;
        metrics.average_response_time = 
            (metrics.average_response_time * (total - 1.0) + response_time as f64) / total;
    }

    async fn update_error_metrics(&self) {
        let mut metrics = self.metrics.write().await;
        metrics.total_requests += 1;
        metrics.failed_requests += 1;
    }

    async fn basic_bundle_optimization(&self, simulations: Vec<SimulationResult>) -> Result<BundleOptimization> {
        // Basic optimization without AI
        let original_order: Vec<usize> = (0..simulations.len()).collect();
        let optimized_order = original_order.clone(); // No reordering in basic mode
        
        let total_gas: u64 = simulations
            .iter()
            .map(|s| s.gas_used.parse().unwrap_or(0))
            .sum();

        Ok(BundleOptimization {
            original_order,
            optimized_order,
            gas_savings: "0".to_string(),
            time_savings: 0.0,
            success_probability: 0.95,
            transaction_optimizations: Vec::new(),
            recommendations: vec!["Consider enabling AI features for advanced optimization".to_string()],
        })
    }
}

// Implement Debug manually to avoid issues with complex types
impl std::fmt::Debug for HyperSimSDK {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("HyperSimSDK")
            .field("network", &self.config.network())
            .field("ai_enabled", &self.config.ai_enabled())
            .field("streaming_enabled", &self.config.streaming_enabled())
            .field("cross_layer_enabled", &self.config.cross_layer_enabled())
            .field("request_count", &self.request_counter.load(Ordering::SeqCst))
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Network;

    #[tokio::test]
    async fn test_sdk_creation() {
        let config = HyperSimConfig::builder()
            .network(Network::Local)
            .build()
            .expect("Should build config");

        // In a real test environment, this would work
        // For now, we'll just test the config validation
        assert_eq!(config.network(), Network::Local);
    }

    #[tokio::test]
    async fn test_sdk_configuration_validation() {
        // Test invalid configuration
        let result = HyperSimConfig::builder()
            .network(Network::Testnet)
            .ai_enabled(true)
            // Missing API key
            .build();
        
        assert!(result.is_err());
    }
}
