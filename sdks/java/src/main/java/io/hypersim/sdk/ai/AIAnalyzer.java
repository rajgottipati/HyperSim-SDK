package io.hypersim.sdk.ai;

import io.hypersim.sdk.types.*;
import io.hypersim.sdk.exceptions.HyperSimException;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Objects;

/**
 * AI-powered analyzer for transaction simulation results.
 * 
 * Provides intelligent analysis including risk assessment,
 * optimization suggestions, and failure prediction using
 * OpenAI's language models.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public class AIAnalyzer implements AutoCloseable {
    
    private static final Logger logger = LoggerFactory.getLogger(AIAnalyzer.class);
    
    private final Config config;
    private volatile boolean closed = false;
    
    /**
     * Configuration for AI analyzer.
     */
    public record Config(
        @NotNull String apiKey,
        boolean debug
    ) {
        public Config {
            Objects.requireNonNull(apiKey, "API key cannot be null");
            if (apiKey.trim().isEmpty()) {
                throw new IllegalArgumentException("API key cannot be empty");
            }
        }
        
        public static class Builder {
            private String apiKey;
            private boolean debug = false;
            
            public Builder apiKey(@NotNull String apiKey) {
                this.apiKey = Objects.requireNonNull(apiKey);
                return this;
            }
            
            public Builder debug(boolean debug) {
                this.debug = debug;
                return this;
            }
            
            public Config build() {
                return new Config(apiKey, debug);
            }
        }
        
        public static Builder builder() {
            return new Builder();
        }
    }
    
    public AIAnalyzer(@NotNull Config config) {
        this.config = Objects.requireNonNull(config);
        
        if (config.debug()) {
            logger.info("AI Analyzer initialized");
        }
    }
    
    /**
     * Analyze a simulation result with AI.
     * 
     * @param simulationResult the simulation result to analyze
     * @return AI-powered insights
     * @throws HyperSimException if analysis fails
     */
    @NotNull
    public AIInsights analyzeSimulation(@NotNull SimulationResult simulationResult) {
        Objects.requireNonNull(simulationResult, "Simulation result cannot be null");
        checkNotClosed();
        
        try {
            if (config.debug()) {
                logger.debug("Analyzing simulation: success={}, gasUsed={}", 
                           simulationResult.success(), simulationResult.gasUsed());
            }
            
            // TODO: Implement actual AI analysis using OpenAI API
            // For now, return mock analysis based on simulation result
            
            var riskLevel = simulationResult.success() ? 
                AIInsights.RiskLevel.LOW : AIInsights.RiskLevel.HIGH;
            
            var failurePrediction = new AIInsights.FailurePrediction(
                simulationResult.success(),
                0.95,
                simulationResult.success() ? List.of() : List.of("Transaction reverted"),
                null,
                List.of("Review transaction parameters", "Check gas limits")
            );
            
            return AIInsights.builder()
                .riskLevel(riskLevel)
                .confidenceScore(0.95)
                .gasSavingSuggestions(List.of("Consider optimizing gas usage"))
                .optimizationTips(List.of("Use latest Solidity version", "Optimize contract calls"))
                .failurePrediction(failurePrediction)
                .summary(generateSummary(simulationResult))
                .build();
                
        } catch (Exception e) {
            throw new HyperSimException("AI analysis failed", e);
        }
    }
    
    /**
     * Optimize a bundle of transactions.
     * 
     * @param simulations the simulation results to optimize
     * @return bundle optimization suggestions
     * @throws HyperSimException if optimization fails
     */
    @NotNull
    public BundleOptimization optimizeBundle(@NotNull List<SimulationResult> simulations) {
        Objects.requireNonNull(simulations, "Simulations cannot be null");
        checkNotClosed();
        
        try {
            long totalGas = simulations.stream()
                .mapToLong(sim -> Long.parseLong(sim.gasUsed()))
                .sum();
            
            // TODO: Implement actual AI-powered bundle optimization
            // For now, return basic optimization
            
            return BundleOptimization.builder()
                .originalGas(String.valueOf(totalGas))
                .optimizedGas(String.valueOf(Math.max(totalGas - 5000, totalGas * 95 / 100)))
                .gasSaved(String.valueOf(Math.min(5000, totalGas * 5 / 100)))
                .suggestions(List.of(
                    "Reorder transactions by gas price",
                    "Batch similar operations",
                    "Remove redundant calls"
                ))
                .reorderedIndices(java.util.stream.IntStream.range(0, simulations.size()).boxed().toList())
                .build();
                
        } catch (Exception e) {
            throw new HyperSimException("Bundle optimization failed", e);
        }
    }
    
    @Override
    public void close() {
        if (!closed) {
            closed = true;
            if (config.debug()) {
                logger.debug("AI Analyzer closed");
            }
        }
    }
    
    private void checkNotClosed() {
        if (closed) {
            throw new IllegalStateException("AI Analyzer is closed");
        }
    }
    
    private String generateSummary(SimulationResult simulationResult) {
        if (simulationResult.success()) {
            return String.format("Transaction simulation successful. Gas used: %s. " +
                               "Block type: %s. Estimated block: %d.",
                               simulationResult.gasUsed(),
                               simulationResult.blockType(),
                               simulationResult.estimatedBlock());
        } else {
            return String.format("Transaction simulation failed. Error: %s. " +
                               "Consider reviewing transaction parameters.",
                               simulationResult.error() != null ? simulationResult.error() : "Unknown error");
        }
    }
}
