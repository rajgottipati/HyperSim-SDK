package io.hypersim.sdk.clients;

import io.hypersim.sdk.types.*;
import io.hypersim.sdk.exceptions.*;
import org.jetbrains.annotations.NotNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.Objects;

/**
 * Client for interacting with HyperCore cross-layer functionality.
 * 
 * Provides access to HyperCore state, positions, and market data
 * for enhanced transaction simulation context.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public class HyperCoreClient implements AutoCloseable {
    
    private static final Logger logger = LoggerFactory.getLogger(HyperCoreClient.class);
    
    private final Config config;
    private volatile boolean closed = false;
    
    /**
     * Configuration for HyperCore client.
     */
    public record Config(
        @NotNull Network network,
        boolean debug
    ) {
        public Config {
            Objects.requireNonNull(network, "Network cannot be null");
        }
        
        public static class Builder {
            private Network network;
            private boolean debug = false;
            
            public Builder network(@NotNull Network network) {
                this.network = Objects.requireNonNull(network);
                return this;
            }
            
            public Builder debug(boolean debug) {
                this.debug = debug;
                return this;
            }
            
            public Config build() {
                return new Config(network, debug);
            }
        }
        
        public static Builder builder() {
            return new Builder();
        }
    }
    
    public HyperCoreClient(@NotNull Config config) {
        this.config = Objects.requireNonNull(config);
        
        if (config.debug()) {
            logger.info("HyperCore Client initialized: network={}", config.network());
        }
    }
    
    /**
     * Get relevant HyperCore data for a transaction.
     * 
     * @param transaction the transaction to get data for
     * @return relevant HyperCore data
     */
    @NotNull
    public SimulationResult.HyperCoreData getRelevantData(@NotNull TransactionRequest transaction) {
        Objects.requireNonNull(transaction, "Transaction cannot be null");
        checkNotClosed();
        
        if (config.debug()) {
            logger.debug("Fetching HyperCore data for transaction: {}", transaction.from());
        }
        
        try {
            // TODO: Implement actual HyperCore data fetching
            // For now, return empty data
            return new SimulationResult.HyperCoreData(
                Map.of("state", "active"),
                null,
                null,
                null
            );
            
        } catch (Exception e) {
            throw new NetworkException("Failed to fetch HyperCore data", e);
        }
    }
    
    @Override
    public void close() {
        if (!closed) {
            closed = true;
            if (config.debug()) {
                logger.debug("HyperCore Client closed");
            }
        }
    }
    
    private void checkNotClosed() {
        if (closed) {
            throw new IllegalStateException("HyperCore Client is closed");
        }
    }
}
