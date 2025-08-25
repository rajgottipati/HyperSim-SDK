package io.hypersim.sdk.types;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.math.BigInteger;
import java.util.Objects;

/**
 * Transaction request for simulation.
 * 
 * Represents a transaction to be simulated on HyperEVM,
 * with support for both legacy and EIP-1559 transactions.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public record TransactionRequest(
    @JsonProperty("from") @NotNull String from,
    @JsonProperty("to") @Nullable String to,
    @JsonProperty("value") @Nullable String value,
    @JsonProperty("data") @Nullable String data,
    @JsonProperty("gasLimit") @Nullable String gasLimit,
    @JsonProperty("gasPrice") @Nullable String gasPrice,
    @JsonProperty("maxFeePerGas") @Nullable String maxFeePerGas,
    @JsonProperty("maxPriorityFeePerGas") @Nullable String maxPriorityFeePerGas,
    @JsonProperty("nonce") @Nullable Long nonce,
    @JsonProperty("type") @Nullable Integer type
) {
    
    /**
     * Creates a TransactionRequest with validation.
     */
    public TransactionRequest {
        Objects.requireNonNull(from, "From address cannot be null");
        
        // Validate addresses
        if (!isValidAddress(from)) {
            throw new IllegalArgumentException("Invalid from address: " + from);
        }
        
        if (to != null && !isValidAddress(to)) {
            throw new IllegalArgumentException("Invalid to address: " + to);
        }
        
        // Validate transaction type
        if (type != null && (type < 0 || type > 2)) {
            throw new IllegalArgumentException("Transaction type must be 0, 1, or 2");
        }
        
        // Validate EIP-1559 fields
        if (type != null && type == 2) {
            if (gasPrice != null) {
                throw new IllegalArgumentException("gasPrice not allowed for EIP-1559 transactions");
            }
        } else {
            if (maxFeePerGas != null || maxPriorityFeePerGas != null) {
                throw new IllegalArgumentException("EIP-1559 fields not allowed for legacy transactions");
            }
        }
    }
    
    /**
     * Validates if a string is a valid Ethereum address.
     * 
     * @param address the address to validate
     * @return true if valid, false otherwise
     */
    private static boolean isValidAddress(String address) {
        if (address == null) {
            return false;
        }
        
        // Check if it starts with 0x and has 40 hex characters
        return address.matches("^0x[0-9a-fA-F]{40}$");
    }
    
    /**
     * Builder for TransactionRequest.
     */
    public static class Builder {
        private String from;
        private String to;
        private String value;
        private String data;
        private String gasLimit;
        private String gasPrice;
        private String maxFeePerGas;
        private String maxPriorityFeePerGas;
        private Long nonce;
        private Integer type;
        
        public Builder from(@NotNull String from) {
            this.from = Objects.requireNonNull(from);
            return this;
        }
        
        public Builder to(@Nullable String to) {
            this.to = to;
            return this;
        }
        
        public Builder value(@Nullable String value) {
            this.value = value;
            return this;
        }
        
        public Builder value(@Nullable BigInteger value) {
            this.value = value != null ? value.toString() : null;
            return this;
        }
        
        public Builder data(@Nullable String data) {
            this.data = data;
            return this;
        }
        
        public Builder gasLimit(@Nullable String gasLimit) {
            this.gasLimit = gasLimit;
            return this;
        }
        
        public Builder gasLimit(@Nullable BigInteger gasLimit) {
            this.gasLimit = gasLimit != null ? gasLimit.toString() : null;
            return this;
        }
        
        public Builder gasPrice(@Nullable String gasPrice) {
            this.gasPrice = gasPrice;
            return this;
        }
        
        public Builder gasPrice(@Nullable BigInteger gasPrice) {
            this.gasPrice = gasPrice != null ? gasPrice.toString() : null;
            return this;
        }
        
        public Builder maxFeePerGas(@Nullable String maxFeePerGas) {
            this.maxFeePerGas = maxFeePerGas;
            return this;
        }
        
        public Builder maxFeePerGas(@Nullable BigInteger maxFeePerGas) {
            this.maxFeePerGas = maxFeePerGas != null ? maxFeePerGas.toString() : null;
            return this;
        }
        
        public Builder maxPriorityFeePerGas(@Nullable String maxPriorityFeePerGas) {
            this.maxPriorityFeePerGas = maxPriorityFeePerGas;
            return this;
        }
        
        public Builder maxPriorityFeePerGas(@Nullable BigInteger maxPriorityFeePerGas) {
            this.maxPriorityFeePerGas = maxPriorityFeePerGas != null ? maxPriorityFeePerGas.toString() : null;
            return this;
        }
        
        public Builder nonce(@Nullable Long nonce) {
            this.nonce = nonce;
            return this;
        }
        
        public Builder type(@Nullable Integer type) {
            this.type = type;
            return this;
        }
        
        public TransactionRequest build() {
            return new TransactionRequest(from, to, value, data, gasLimit, gasPrice, 
                                        maxFeePerGas, maxPriorityFeePerGas, nonce, type);
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
    
    /**
     * Creates a simple transfer transaction.
     * 
     * @param from the sender address
     * @param to the recipient address
     * @param value the value to transfer in wei
     * @return a TransactionRequest for the transfer
     */
    public static TransactionRequest createTransfer(@NotNull String from, @NotNull String to, @NotNull String value) {
        return builder()
            .from(from)
            .to(to)
            .value(value)
            .build();
    }
    
    /**
     * Creates a contract call transaction.
     * 
     * @param from the sender address
     * @param to the contract address
     * @param data the call data
     * @return a TransactionRequest for the contract call
     */
    public static TransactionRequest createContractCall(@NotNull String from, @NotNull String to, @NotNull String data) {
        return builder()
            .from(from)
            .to(to)
            .data(data)
            .build();
    }
    
    /**
     * Creates a contract deployment transaction.
     * 
     * @param from the sender address
     * @param data the contract bytecode
     * @return a TransactionRequest for the contract deployment
     */
    public static TransactionRequest createContractDeployment(@NotNull String from, @NotNull String data) {
        return builder()
            .from(from)
            .data(data)
            .build();
    }
}
