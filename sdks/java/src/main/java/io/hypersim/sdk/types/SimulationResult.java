package io.hypersim.sdk.types;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Result of transaction simulation.
 * 
 * Contains comprehensive information about the simulation result,
 * including success status, gas usage, traces, and cross-layer data.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public record SimulationResult(
    @JsonProperty("success") boolean success,
    @JsonProperty("gasUsed") @NotNull String gasUsed,
    @JsonProperty("returnData") @Nullable String returnData,
    @JsonProperty("error") @Nullable String error,
    @JsonProperty("revertReason") @Nullable String revertReason,
    @JsonProperty("blockType") @NotNull BlockType blockType,
    @JsonProperty("estimatedBlock") long estimatedBlock,
    @JsonProperty("trace") @Nullable ExecutionTrace trace,
    @JsonProperty("hyperCoreData") @Nullable HyperCoreData hyperCoreData,
    @JsonProperty("stateChanges") @Nullable List<StateChange> stateChanges,
    @JsonProperty("events") @Nullable List<SimulationEvent> events,
    @JsonProperty("timestamp") @NotNull Instant timestamp
) {
    
    /**
     * Creates a SimulationResult with validation.
     */
    public SimulationResult {
        Objects.requireNonNull(gasUsed, "Gas used cannot be null");
        Objects.requireNonNull(blockType, "Block type cannot be null");
        Objects.requireNonNull(timestamp, "Timestamp cannot be null");
        
        if (estimatedBlock < 0) {
            throw new IllegalArgumentException("Estimated block must be non-negative");
        }
    }
    
    /**
     * Execution trace for debugging.
     * 
     * @param calls call stack trace
     * @param gasBreakdown gas usage breakdown
     * @param storageAccesses storage accesses during execution
     */
    public record ExecutionTrace(
        @JsonProperty("calls") @NotNull List<TraceCall> calls,
        @JsonProperty("gasBreakdown") @NotNull GasBreakdown gasBreakdown,
        @JsonProperty("storageAccesses") @NotNull List<StorageAccess> storageAccesses
    ) {
        public ExecutionTrace {
            Objects.requireNonNull(calls, "Calls cannot be null");
            Objects.requireNonNull(gasBreakdown, "Gas breakdown cannot be null");
            Objects.requireNonNull(storageAccesses, "Storage accesses cannot be null");
        }
    }
    
    /**
     * Individual call in execution trace.
     */
    public record TraceCall(
        @JsonProperty("type") @NotNull String type,
        @JsonProperty("from") @NotNull String from,
        @JsonProperty("to") @NotNull String to,
        @JsonProperty("value") @NotNull String value,
        @JsonProperty("input") @NotNull String input,
        @JsonProperty("output") @Nullable String output,
        @JsonProperty("gasUsed") @NotNull String gasUsed,
        @JsonProperty("error") @Nullable String error,
        @JsonProperty("calls") @Nullable List<TraceCall> calls
    ) {
        public TraceCall {
            Objects.requireNonNull(type, "Type cannot be null");
            Objects.requireNonNull(from, "From cannot be null");
            Objects.requireNonNull(to, "To cannot be null");
            Objects.requireNonNull(value, "Value cannot be null");
            Objects.requireNonNull(input, "Input cannot be null");
            Objects.requireNonNull(gasUsed, "Gas used cannot be null");
        }
    }
    
    /**\n     * Gas usage breakdown.\n     */\n    public record GasBreakdown(\n        @JsonProperty(\"baseGas\") @NotNull String baseGas,\n        @JsonProperty(\"executionGas\") @NotNull String executionGas,\n        @JsonProperty(\"storageGas\") @NotNull String storageGas,\n        @JsonProperty(\"memoryGas\") @NotNull String memoryGas,\n        @JsonProperty(\"logGas\") @NotNull String logGas\n    ) {\n        public GasBreakdown {\n            Objects.requireNonNull(baseGas, \"Base gas cannot be null\");\n            Objects.requireNonNull(executionGas, \"Execution gas cannot be null\");\n            Objects.requireNonNull(storageGas, \"Storage gas cannot be null\");\n            Objects.requireNonNull(memoryGas, \"Memory gas cannot be null\");\n            Objects.requireNonNull(logGas, \"Log gas cannot be null\");\n        }\n    }\n    \n    /**\n     * Storage access information.\n     */\n    public record StorageAccess(\n        @JsonProperty(\"address\") @NotNull String address,\n        @JsonProperty(\"slot\") @NotNull String slot,\n        @JsonProperty(\"value\") @NotNull String value,\n        @JsonProperty(\"type\") @NotNull AccessType type\n    ) {\n        public StorageAccess {\n            Objects.requireNonNull(address, \"Address cannot be null\");\n            Objects.requireNonNull(slot, \"Slot cannot be null\");\n            Objects.requireNonNull(value, \"Value cannot be null\");\n            Objects.requireNonNull(type, \"Type cannot be null\");\n        }\n        \n        public enum AccessType {\n            READ, WRITE\n        }\n    }\n    \n    /**\n     * State change information.\n     */\n    public record StateChange(\n        @JsonProperty(\"address\") @NotNull String address,\n        @JsonProperty(\"type\") @NotNull StateChangeType type,\n        @JsonProperty(\"slot\") @Nullable String slot,\n        @JsonProperty(\"before\") @NotNull String before,\n        @JsonProperty(\"after\") @NotNull String after\n    ) {\n        public StateChange {\n            Objects.requireNonNull(address, \"Address cannot be null\");\n            Objects.requireNonNull(type, \"Type cannot be null\");\n            Objects.requireNonNull(before, \"Before value cannot be null\");\n            Objects.requireNonNull(after, \"After value cannot be null\");\n            \n            if (type == StateChangeType.STORAGE && slot == null) {\n                throw new IllegalArgumentException(\"Slot is required for storage state changes\");\n            }\n        }\n        \n        public enum StateChangeType {\n            BALANCE, NONCE, CODE, STORAGE\n        }\n    }\n    \n    /**\n     * Event emitted during simulation.\n     */\n    public record SimulationEvent(\n        @JsonProperty(\"address\") @NotNull String address,\n        @JsonProperty(\"topics\") @NotNull List<String> topics,\n        @JsonProperty(\"data\") @NotNull String data,\n        @JsonProperty(\"name\") @Nullable String name,\n        @JsonProperty(\"args\") @Nullable Map<String, Object> args\n    ) {\n        public SimulationEvent {\n            Objects.requireNonNull(address, \"Address cannot be null\");\n            Objects.requireNonNull(topics, \"Topics cannot be null\");\n            Objects.requireNonNull(data, \"Data cannot be null\");\n        }\n    }\n    \n    /**\n     * Cross-layer HyperCore data.\n     */\n    public record HyperCoreData(\n        @JsonProperty(\"coreState\") @NotNull Map<String, Object> coreState,\n        @JsonProperty(\"positions\") @Nullable List<Position> positions,\n        @JsonProperty(\"marketData\") @Nullable MarketData marketData,\n        @JsonProperty(\"interactions\") @Nullable List<CoreInteraction> interactions\n    ) {\n        public HyperCoreData {\n            Objects.requireNonNull(coreState, \"Core state cannot be null\");\n        }\n    }\n    \n    /**\n     * Position information from HyperCore.\n     */\n    public record Position(\n        @JsonProperty(\"asset\") @NotNull String asset,\n        @JsonProperty(\"size\") @NotNull String size,\n        @JsonProperty(\"entryPrice\") @NotNull String entryPrice,\n        @JsonProperty(\"unrealizedPnl\") @NotNull String unrealizedPnl,\n        @JsonProperty(\"side\") @NotNull PositionSide side\n    ) {\n        public Position {\n            Objects.requireNonNull(asset, \"Asset cannot be null\");\n            Objects.requireNonNull(size, \"Size cannot be null\");\n            Objects.requireNonNull(entryPrice, \"Entry price cannot be null\");\n            Objects.requireNonNull(unrealizedPnl, \"Unrealized PnL cannot be null\");\n            Objects.requireNonNull(side, \"Side cannot be null\");\n        }\n        \n        public enum PositionSide {\n            LONG, SHORT\n        }\n    }\n    \n    /**\n     * Market data from HyperCore.\n     */\n    public record MarketData(\n        @JsonProperty(\"prices\") @NotNull Map<String, String> prices,\n        @JsonProperty(\"depths\") @NotNull Map<String, MarketDepth> depths,\n        @JsonProperty(\"fundingRates\") @NotNull Map<String, String> fundingRates\n    ) {\n        public MarketData {\n            Objects.requireNonNull(prices, \"Prices cannot be null\");\n            Objects.requireNonNull(depths, \"Depths cannot be null\");\n            Objects.requireNonNull(fundingRates, \"Funding rates cannot be null\");\n        }\n    }\n    \n    /**\n     * Market depth information.\n     */\n    public record MarketDepth(\n        @JsonProperty(\"bid\") @NotNull String bid,\n        @JsonProperty(\"ask\") @NotNull String ask,\n        @JsonProperty(\"bidSize\") @NotNull String bidSize,\n        @JsonProperty(\"askSize\") @NotNull String askSize\n    ) {\n        public MarketDepth {\n            Objects.requireNonNull(bid, \"Bid cannot be null\");\n            Objects.requireNonNull(ask, \"Ask cannot be null\");\n            Objects.requireNonNull(bidSize, \"Bid size cannot be null\");\n            Objects.requireNonNull(askSize, \"Ask size cannot be null\");\n        }\n    }\n    \n    /**\n     * Core interaction (cross-layer operation).\n     */\n    public record CoreInteraction(\n        @JsonProperty(\"type\") @NotNull InteractionType type,\n        @JsonProperty(\"precompile\") @NotNull String precompile,\n        @JsonProperty(\"data\") @NotNull String data,\n        @JsonProperty(\"result\") @Nullable String result\n    ) {\n        public CoreInteraction {\n            Objects.requireNonNull(type, \"Type cannot be null\");\n            Objects.requireNonNull(precompile, \"Precompile cannot be null\");\n            Objects.requireNonNull(data, \"Data cannot be null\");\n        }\n        \n        public enum InteractionType {\n            READ, WRITE\n        }\n    }\n    \n    /**\n     * Builder for SimulationResult.\n     */\n    public static class Builder {\n        private boolean success;\n        private String gasUsed;\n        private String returnData;\n        private String error;\n        private String revertReason;\n        private BlockType blockType;\n        private long estimatedBlock;\n        private ExecutionTrace trace;\n        private HyperCoreData hyperCoreData;\n        private List<StateChange> stateChanges;\n        private List<SimulationEvent> events;\n        private Instant timestamp = Instant.now();\n        \n        public Builder success(boolean success) {\n            this.success = success;\n            return this;\n        }\n        \n        public Builder gasUsed(@NotNull String gasUsed) {\n            this.gasUsed = Objects.requireNonNull(gasUsed);\n            return this;\n        }\n        \n        public Builder returnData(@Nullable String returnData) {\n            this.returnData = returnData;\n            return this;\n        }\n        \n        public Builder error(@Nullable String error) {\n            this.error = error;\n            return this;\n        }\n        \n        public Builder revertReason(@Nullable String revertReason) {\n            this.revertReason = revertReason;\n            return this;\n        }\n        \n        public Builder blockType(@NotNull BlockType blockType) {\n            this.blockType = Objects.requireNonNull(blockType);\n            return this;\n        }\n        \n        public Builder estimatedBlock(long estimatedBlock) {\n            this.estimatedBlock = estimatedBlock;\n            return this;\n        }\n        \n        public Builder trace(@Nullable ExecutionTrace trace) {\n            this.trace = trace;\n            return this;\n        }\n        \n        public Builder hyperCoreData(@Nullable HyperCoreData hyperCoreData) {\n            this.hyperCoreData = hyperCoreData;\n            return this;\n        }\n        \n        public Builder stateChanges(@Nullable List<StateChange> stateChanges) {\n            this.stateChanges = stateChanges;\n            return this;\n        }\n        \n        public Builder events(@Nullable List<SimulationEvent> events) {\n            this.events = events;\n            return this;\n        }\n        \n        public Builder timestamp(@NotNull Instant timestamp) {\n            this.timestamp = Objects.requireNonNull(timestamp);\n            return this;\n        }\n        \n        public SimulationResult build() {\n            return new SimulationResult(success, gasUsed, returnData, error, revertReason,\n                                      blockType, estimatedBlock, trace, hyperCoreData,\n                                      stateChanges, events, timestamp);\n        }\n    }\n    \n    /**\n     * Creates a new builder.\n     * \n     * @return a new Builder instance\n     */\n    public static Builder builder() {\n        return new Builder();\n    }\n}\n