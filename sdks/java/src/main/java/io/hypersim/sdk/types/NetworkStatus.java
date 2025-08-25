package io.hypersim.sdk.types;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.time.Instant;
import java.util.Objects;

/**
 * Network status information.
 * 
 * Contains real-time information about the network state,
 * including latest block, gas prices, and health status.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public record NetworkStatus(
    @JsonProperty("network") @NotNull Network network,
    @JsonProperty("latestBlock") long latestBlock,
    @JsonProperty("gasPrice") @NotNull String gasPrice,
    @JsonProperty("isHealthy") boolean isHealthy,
    @JsonProperty("avgBlockTime") double avgBlockTime,
    @JsonProperty("congestionLevel") @NotNull CongestionLevel congestionLevel,
    @JsonProperty("timestamp") @NotNull Instant timestamp
) {
    
    /**
     * Network congestion levels.
     */
    public enum CongestionLevel {
        LOW, MEDIUM, HIGH
    }
    
    /**
     * Creates a NetworkStatus with validation.
     */
    public NetworkStatus {
        Objects.requireNonNull(network, "Network cannot be null");
        Objects.requireNonNull(gasPrice, "Gas price cannot be null");
        Objects.requireNonNull(congestionLevel, "Congestion level cannot be null");
        Objects.requireNonNull(timestamp, "Timestamp cannot be null");
        
        if (latestBlock < 0) {
            throw new IllegalArgumentException("Latest block must be non-negative");
        }
        
        if (avgBlockTime < 0) {
            throw new IllegalArgumentException("Average block time must be non-negative");
        }
    }
    
    /**
     * Builder for NetworkStatus.
     */
    public static class Builder {
        private Network network;
        private long latestBlock;
        private String gasPrice;
        private boolean isHealthy = true;
        private double avgBlockTime;
        private CongestionLevel congestionLevel = CongestionLevel.LOW;
        private Instant timestamp = Instant.now();
        
        public Builder network(@NotNull Network network) {
            this.network = Objects.requireNonNull(network);
            return this;
        }
        
        public Builder latestBlock(long latestBlock) {
            this.latestBlock = latestBlock;
            return this;
        }
        
        public Builder gasPrice(@NotNull String gasPrice) {
            this.gasPrice = Objects.requireNonNull(gasPrice);
            return this;
        }
        
        public Builder isHealthy(boolean isHealthy) {
            this.isHealthy = isHealthy;
            return this;
        }
        
        public Builder avgBlockTime(double avgBlockTime) {
            this.avgBlockTime = avgBlockTime;
            return this;
        }
        
        public Builder congestionLevel(@NotNull CongestionLevel congestionLevel) {
            this.congestionLevel = Objects.requireNonNull(congestionLevel);
            return this;
        }
        
        public Builder timestamp(@NotNull Instant timestamp) {
            this.timestamp = Objects.requireNonNull(timestamp);
            return this;
        }
        
        public NetworkStatus build() {
            return new NetworkStatus(network, latestBlock, gasPrice, isHealthy, 
                                   avgBlockTime, congestionLevel, timestamp);
        }
    }
    
    /**
     * Creates a new builder.
     * 
     * @return a new Builder instance
     */
    public static Builder builder() {
        return new Builder();
    }
}
