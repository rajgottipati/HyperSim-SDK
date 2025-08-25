//! WebSocket client implementation for real-time streaming

use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::{RwLock, mpsc};
use tracing::{debug, error, info, warn};

use crate::types::{
    WebSocketClientConfig, ConnectionState, WSSubscription, WSMessage,
    SubscriptionType, SubscriptionParams, WSEvent, WSError,
};
use crate::error::{HyperSimError, Result};

/// High-performance WebSocket client for real-time data streaming
pub struct WebSocketClient {
    config: WebSocketClientConfig,
    state: Arc<RwLock<ClientState>>,
    subscriptions: Arc<RwLock<HashMap<String, WSSubscription>>>,
    event_sender: Option<mpsc::UnboundedSender<WSEvent>>,
}

#[derive(Debug)]
struct ClientState {
    connection_state: ConnectionState,
    last_ping: Option<std::time::Instant>,
    reconnect_attempts: u32,
    message_id_counter: u64,
}

impl WebSocketClient {
    /// Create a new WebSocket client
    pub async fn new(config: WebSocketClientConfig) -> Result<Self> {
        let state = Arc::new(RwLock::new(ClientState {
            connection_state: ConnectionState::Disconnected,
            last_ping: None,
            reconnect_attempts: 0,
            message_id_counter: 0,
        }));

        Ok(Self {
            config,
            state,
            subscriptions: Arc::new(RwLock::new(HashMap::new())),
            event_sender: None,
        })
    }

    /// Connect to the WebSocket endpoint
    pub async fn connect(&mut self) -> Result<()> {
        info!("Connecting to WebSocket endpoint: {}", self.config.ws_endpoint());
        
        {
            let mut state = self.state.write().await;
            state.connection_state = ConnectionState::Connecting;
        }

        // In a real implementation, this would establish actual WebSocket connection
        // For now, simulate successful connection
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;

        {
            let mut state = self.state.write().await;
            state.connection_state = ConnectionState::Connected;
            state.reconnect_attempts = 0;
            state.last_ping = Some(std::time::Instant::now());
        }

        info!("WebSocket connected successfully");
        
        // Start background tasks
        self.start_background_tasks().await?;

        Ok(())
    }

    /// Disconnect from WebSocket
    pub async fn disconnect(&self) -> Result<()> {
        info!("Disconnecting from WebSocket");
        
        let mut state = self.state.write().await;
        state.connection_state = ConnectionState::Disconnected;
        
        // Clear all subscriptions
        let mut subscriptions = self.subscriptions.write().await;
        subscriptions.clear();
        
        Ok(())
    }

    /// Subscribe to WebSocket events
    pub async fn subscribe(
        &self,
        subscription_type: SubscriptionType,
        params: SubscriptionParams,
    ) -> Result<WSSubscription> {
        let connection_state = self.state.read().await.connection_state;
        if !connection_state.is_connected() {
            return Err(HyperSimError::websocket("Not connected to WebSocket"));
        }

        let subscription_id = self.generate_subscription_id().await;
        
        let subscription = WSSubscription {
            id: subscription_id.clone(),
            subscription_type,
            params,
            active: true,
            created_at: chrono::Utc::now().timestamp_millis() as u64,
        };

        // Send subscription message
        let subscribe_msg = WSMessage {
            id: Some(subscription_id.clone()),
            method: "eth_subscribe".to_string(),
            params: serde_json::json!([
                self.subscription_type_to_string(&subscription.subscription_type),
                subscription.params
            ]),
            result: None,
            error: None,
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
        };

        // In a real implementation, this would send over WebSocket
        self.send_message(subscribe_msg).await?;

        // Store subscription
        let mut subscriptions = self.subscriptions.write().await;
        subscriptions.insert(subscription_id.clone(), subscription.clone());

        debug!("Subscribed to {:?} with ID: {}", subscription.subscription_type, subscription_id);
        
        Ok(subscription)
    }

    /// Unsubscribe from WebSocket events
    pub async fn unsubscribe(&self, subscription_id: &str) -> Result<()> {
        let mut subscriptions = self.subscriptions.write().await;
        
        if let Some(mut subscription) = subscriptions.get_mut(subscription_id) {
            subscription.active = false;
            
            // Send unsubscribe message
            let unsubscribe_msg = WSMessage {
                id: Some(subscription_id.to_string()),
                method: "eth_unsubscribe".to_string(),
                params: serde_json::json!([subscription_id]),
                result: None,
                error: None,
                timestamp: chrono::Utc::now().timestamp_millis() as u64,
            };

            self.send_message(unsubscribe_msg).await?;
            subscriptions.remove(subscription_id);
            
            debug!("Unsubscribed from subscription: {}", subscription_id);
            Ok(())
        } else {
            Err(HyperSimError::websocket(format!("Subscription not found: {}", subscription_id)))
        }
    }

    /// Get current connection state
    pub async fn get_connection_state(&self) -> ConnectionState {
        self.state.read().await.connection_state
    }

    /// Get active subscriptions
    pub async fn get_subscriptions(&self) -> Vec<WSSubscription> {
        self.subscriptions.read().await.values().cloned().collect()
    }

    /// Set event handler for incoming events
    pub async fn set_event_handler(&mut self, sender: mpsc::UnboundedSender<WSEvent>) {
        self.event_sender = Some(sender);
    }

    // Private implementation methods

    async fn send_message(&self, message: WSMessage) -> Result<()> {
        // In a real implementation, this would send over actual WebSocket connection
        debug!("Sending WebSocket message: {}", message.method);
        
        // Simulate network delay
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;
        
        Ok(())
    }

    async fn start_background_tasks(&self) -> Result<()> {
        // Start ping task
        let state_clone = Arc::clone(&self.state);
        let ping_interval = self.config.ping_interval;
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(ping_interval));
            
            loop {
                interval.tick().await;
                
                let mut state = state_clone.write().await;
                if state.connection_state == ConnectionState::Connected {
                    state.last_ping = Some(std::time::Instant::now());
                    // In real implementation, send ping frame
                    debug!("Sending WebSocket ping");
                }
            }
        });

        // Start message handling task (mock)
        self.start_message_handler().await;

        Ok(())
    }

    async fn start_message_handler(&self) {
        let event_sender = self.event_sender.clone();
        
        tokio::spawn(async move {
            // Mock incoming messages
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(5));
            
            loop {
                interval.tick().await;
                
                if let Some(ref sender) = event_sender {
                    // Send mock new block event
                    let mock_event = WSEvent::NewBlock {
                        header: crate::types::NewBlockHeader {
                            hash: crate::types::Hash("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string()),
                            parent_hash: crate::types::Hash("0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890".to_string()),
                            number: rand::random::<u64>() % 1000000 + 18000000,
                            timestamp: chrono::Utc::now().timestamp() as u64,
                            gas_limit: "30000000".to_string(),
                            gas_used: "15000000".to_string(),
                            difficulty: "58750003716598352816469".to_string(),
                            miner: crate::types::Address("0x0000000000000000000000000000000000000000".to_string()),
                            extra_data: "0x".to_string(),
                            transaction_count: rand::random::<u32>() % 200,
                        },
                    };
                    
                    if sender.send(mock_event).is_err() {
                        warn!("Failed to send WebSocket event");
                    }
                }
            }
        });
    }

    async fn generate_subscription_id(&self) -> String {
        let mut state = self.state.write().await;
        state.message_id_counter += 1;
        format!("sub_{:08x}", state.message_id_counter)
    }

    fn subscription_type_to_string(&self, sub_type: &SubscriptionType) -> &'static str {
        match sub_type {
            SubscriptionType::NewHeads => "newHeads",
            SubscriptionType::NewTransactions => "newPendingTransactions",
            SubscriptionType::PendingTransactions => "pendingTransactions",
            SubscriptionType::Logs => "logs",
            SubscriptionType::NewBlocks => "newHeads",
            SubscriptionType::SimulationResults => "simulationResults",
            SubscriptionType::GasPrices => "gasPrices",
            SubscriptionType::NetworkStatus => "networkStatus",
        }
    }

    async fn handle_reconnection(&self) -> Result<()> {
        let mut state = self.state.write().await;
        
        if state.reconnect_attempts >= self.config.max_reconnect_attempts {
            return Err(HyperSimError::websocket("Max reconnection attempts exceeded"));
        }

        state.connection_state = ConnectionState::Reconnecting;
        state.reconnect_attempts += 1;
        
        let delay = (self.config.reconnect_backoff.powi(state.reconnect_attempts as i32) * 1000.0) as u64;
        
        info!("Attempting reconnection in {}ms (attempt {})", 
            delay, state.reconnect_attempts);
        
        drop(state); // Release lock before sleep
        
        tokio::time::sleep(std::time::Duration::from_millis(delay)).await;
        
        // Attempt reconnection
        self.attempt_connect().await
    }

    async fn attempt_connect(&self) -> Result<()> {
        // In real implementation, establish WebSocket connection
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        
        let mut state = self.state.write().await;
        state.connection_state = ConnectionState::Connected;
        state.last_ping = Some(std::time::Instant::now());
        
        info!("WebSocket reconnected successfully");
        Ok(())
    }
}

impl std::fmt::Debug for WebSocketClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("WebSocketClient")
            .field("endpoint", &self.config.ws_endpoint())
            .field("auto_reconnect", &self.config.auto_reconnect)
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Network;

    #[tokio::test]
    async fn test_websocket_client_creation() {
        let config = WebSocketClientConfig::new(Network::Local);
        let client = WebSocketClient::new(config).await;
        assert!(client.is_ok());
    }

    #[tokio::test]
    async fn test_subscription_id_generation() {
        let config = WebSocketClientConfig::new(Network::Local);
        let client = WebSocketClient::new(config).await.unwrap();
        
        let id1 = client.generate_subscription_id().await;
        let id2 = client.generate_subscription_id().await;
        
        assert!(id1.starts_with("sub_"));
        assert!(id2.starts_with("sub_"));
        assert_ne!(id1, id2);
    }

    #[tokio::test] 
    async fn test_subscription_type_conversion() {
        let config = WebSocketClientConfig::new(Network::Local);
        let client = WebSocketClient::new(config).await.unwrap();
        
        assert_eq!(client.subscription_type_to_string(&SubscriptionType::NewHeads), "newHeads");
        assert_eq!(client.subscription_type_to_string(&SubscriptionType::Logs), "logs");
        assert_eq!(client.subscription_type_to_string(&SubscriptionType::PendingTransactions), "pendingTransactions");
    }
}
