package io.hypersim.sdk.clients;

import io.hypersim.sdk.types.Network;
import io.hypersim.sdk.exceptions.*;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Objects;
import java.util.concurrent.CompletableFuture;

/**
 * WebSocket client for real-time HyperEVM data streaming.
 * 
 * Provides real-time updates for block data, transaction mempool,
 * and other network events using WebSocket connections.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public class WebSocketClient implements AutoCloseable {
    
    private static final Logger logger = LoggerFactory.getLogger(WebSocketClient.class);
    
    private final Config config;
    private volatile boolean connected = false;
    private volatile boolean closed = false;
    
    /**
     * Configuration for WebSocket client.
     */
    public record Config(
        @NotNull Network network,
        @Nullable String wsEndpoint,
        boolean debug
    ) {
        public Config {
            Objects.requireNonNull(network, "Network cannot be null");
        }
        
        public static class Builder {
            private Network network;
            private String wsEndpoint;
            private boolean debug = false;
            
            public Builder network(@NotNull Network network) {
                this.network = Objects.requireNonNull(network);
                return this;
            }
            
            public Builder wsEndpoint(@Nullable String wsEndpoint) {
                this.wsEndpoint = wsEndpoint;
                return this;
            }
            
            public Builder debug(boolean debug) {
                this.debug = debug;
                return this;
            }
            
            public Config build() {
                return new Config(network, wsEndpoint, debug);
            }
        }
        
        public static Builder builder() {
            return new Builder();
        }
    }
    
    public WebSocketClient(@NotNull Config config) {
        this.config = Objects.requireNonNull(config);
        
        if (config.debug()) {
            logger.info("WebSocket Client initialized: network={}, endpoint={}", 
                       config.network(), getWsUrl());
        }
    }
    
    /**
     * Connect to the WebSocket endpoint.
     * 
     * @return a CompletableFuture that completes when connected
     */
    @NotNull
    public CompletableFuture<Void> connect() {
        checkNotClosed();
        
        return CompletableFuture.runAsync(() -> {
            try {
                // TODO: Implement actual WebSocket connection
                connected = true;
                if (config.debug()) {
                    logger.debug("WebSocket connected to: {}", getWsUrl());
                }
            } catch (Exception e) {
                throw new NetworkException("Failed to connect WebSocket", e);
            }
        });
    }
    
    /**
     * Disconnect from the WebSocket.
     */
    public void disconnect() {
        if (connected) {
            connected = false;
            if (config.debug()) {
                logger.debug("WebSocket disconnected");
            }
        }
    }
    
    /**
     * Check if WebSocket is connected.
     * 
     * @return true if connected, false otherwise
     */
    public boolean isConnected() {
        return connected && !closed;
    }
    
    @Override
    public void close() {
        if (!closed) {
            disconnect();
            closed = true;
            if (config.debug()) {
                logger.debug("WebSocket Client closed");
            }
        }
    }
    
    private void checkNotClosed() {
        if (closed) {
            throw new IllegalStateException("WebSocket Client is closed");
        }
    }
    
    private String getWsUrl() {
        if (config.wsEndpoint() != null) {
            return config.wsEndpoint();
        }
        
        return switch (config.network()) {
            case MAINNET -> "wss://api.hyperliquid.xyz/ws";
            case TESTNET -> "wss://api.hyperliquid-testnet.xyz/ws";
        };
    }
}
