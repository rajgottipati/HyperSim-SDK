//! AI analyzer implementation for transaction insights and optimization

use std::collections::HashMap;
use tracing::{debug, error, info};

use crate::types::{
    SimulationResult, BundleOptimization, AIInsights, RiskLevel,
    GasOptimization, SecurityAnalysis, PerformanceInsights, MarketAnalysis,
    Recommendation, Pattern, Wei, TransactionOptimization,
};
use crate::error::{HyperSimError, Result};

/// AI analyzer for providing insights and optimization suggestions
pub struct AIAnalyzer {
    /// OpenAI API key
    api_key: String,
    /// HTTP client for API requests
    client: reqwest::Client,
    /// Analysis cache
    cache: std::sync::Arc<tokio::sync::RwLock<HashMap<String, CachedAnalysis>>>,
}

/// Cached analysis result
#[derive(Debug, Clone)]
struct CachedAnalysis {
    insights: AIInsights,
    timestamp: std::time::Instant,
    ttl: std::time::Duration,
}

impl CachedAnalysis {
    fn is_expired(&self) -> bool {
        self.timestamp.elapsed() > self.ttl
    }
}

impl AIAnalyzer {
    /// Create a new AI analyzer
    pub async fn new(api_key: String) -> Result<Self> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| HyperSimError::ai_analysis(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self {
            api_key,
            client,
            cache: std::sync::Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        })
    }

    /// Analyze a simulation result and provide AI insights
    pub async fn analyze_simulation(&self, simulation_result: SimulationResult) -> Result<AIInsights> {
        let start_time = std::time::Instant::now();
        
        // Check cache first
        let cache_key = self.generate_cache_key(&simulation_result);
        if let Some(cached) = self.get_cached_analysis(&cache_key).await {
            debug!("Returning cached AI analysis");
            return Ok(cached.insights);
        }

        info!("Performing AI analysis for simulation result");

        // Perform analysis
        let insights = self.perform_analysis(&simulation_result).await?;

        // Cache the result
        self.cache_analysis(&cache_key, insights.clone()).await;

        debug!("AI analysis completed in {}ms", start_time.elapsed().as_millis());
        Ok(insights)
    }

    /// Optimize a bundle of transactions
    pub async fn optimize_bundle(&self, simulations: Vec<SimulationResult>) -> Result<BundleOptimization> {
        let start_time = std::time::Instant::now();
        
        info!("Performing AI-powered bundle optimization for {} transactions", simulations.len());

        // Analyze each transaction in the bundle
        let mut transaction_analyses = Vec::new();
        for (i, sim) in simulations.iter().enumerate() {
            let analysis = self.analyze_simulation(sim.clone()).await?;
            transaction_analyses.push((i, analysis));
        }

        // Perform bundle optimization
        let optimization = self.optimize_bundle_internal(&simulations, &transaction_analyses).await?;

        debug!("Bundle optimization completed in {}ms", start_time.elapsed().as_millis());
        Ok(optimization)
    }

    /// Get AI-powered market analysis
    pub async fn get_market_analysis(&self) -> Result<MarketAnalysis> {
        info!("Fetching AI-powered market analysis");
        
        // In a real implementation, this would call external APIs or ML models
        // For now, return a mock analysis
        Ok(MarketAnalysis {
            volatility: 0.25,
            liquidity_assessment: crate::types::LiquidityAssessment {
                liquidity_score: 0.85,
                available_liquidity: Wei::new("50000000000000000000000"),
                depth_analysis: HashMap::new(),
                sources: vec!["Uniswap V3".to_string(), "Balancer".to_string()],
            },
            price_impact: crate::types::PriceImpact {
                impact_percentage: 0.02,
                before_price: "1000.00".to_string(),
                after_price: "1000.20".to_string(),
                slippage: 0.001,
            },
            sentiment_score: 0.15,
            market_events: Vec::new(),
        })
    }

    // Private implementation methods

    async fn perform_analysis(&self, simulation_result: &SimulationResult) -> Result<AIInsights> {
        // In a real implementation, this would call OpenAI API or use local ML models
        // For now, provide a comprehensive mock analysis
        
        let risk_level = if simulation_result.success {
            if simulation_result.gas_used.parse::<u64>().unwrap_or(0) > 500000 {
                RiskLevel::Medium
            } else {
                RiskLevel::Low
            }
        } else {
            RiskLevel::High
        };

        let gas_used = simulation_result.gas_used.parse::<u64>().unwrap_or(0);
        let optimized_gas = gas_used.saturating_sub(gas_used / 10); // 10% reduction
        
        Ok(AIInsights {
            risk_level,
            risk_score: risk_level.as_score(),
            success_probability: if simulation_result.success { 0.95 } else { 0.15 },
            gas_optimization: GasOptimization {
                current_gas_estimate: simulation_result.gas_used.clone(),
                optimized_gas_estimate: optimized_gas.to_string(),
                gas_savings: (gas_used - optimized_gas).to_string(),
                cost_savings: Wei::new("1000000000000000"),
                suggested_gas_price: Some(Wei::new("20000000000")),
                suggested_max_fee_per_gas: Some(Wei::new("25000000000")),
                suggested_max_priority_fee_per_gas: Some(Wei::new("2000000000")),
                optimization_techniques: vec![
                    "Use more efficient opcodes".to_string(),
                    "Optimize storage operations".to_string(),
                ],
            },
            security_analysis: SecurityAnalysis {
                security_score: 0.85,
                vulnerabilities: Vec::new(),
                contract_analysis: Vec::new(),
                transaction_patterns: Vec::new(),
                anomalies: Vec::new(),
            },
            performance_insights: PerformanceInsights {
                expected_execution_time: 200.0,
                congestion_factor: 1.2,
                optimal_timing: Vec::new(),
                bottlenecks: Vec::new(),
                scalability_concerns: Vec::new(),
            },
            market_analysis: MarketAnalysis {
                volatility: 0.25,
                liquidity_assessment: crate::types::LiquidityAssessment {
                    liquidity_score: 0.85,
                    available_liquidity: Wei::new("1000000000000000000000"),
                    depth_analysis: HashMap::new(),
                    sources: vec!["Uniswap".to_string()],
                },
                price_impact: crate::types::PriceImpact {
                    impact_percentage: 0.01,
                    before_price: "100.00".to_string(),
                    after_price: "100.01".to_string(),
                    slippage: 0.0001,
                },
                sentiment_score: 0.1,
                market_events: Vec::new(),
            },
            recommendations: vec![
                Recommendation {
                    recommendation_type: crate::types::RecommendationType::GasOptimization,
                    description: "Consider reducing gas limit by 10%".to_string(),
                    priority: crate::types::Priority::Medium,
                    expected_impact: "Reduce transaction cost by ~10%".to_string(),
                    difficulty: crate::types::Difficulty::Easy,
                    confidence: 0.8,
                },
            ],
            patterns: vec![
                Pattern {
                    id: "standard_transfer".to_string(),
                    name: "Standard Token Transfer".to_string(),
                    description: "Basic ERC-20 token transfer pattern".to_string(),
                    category: "Token Operations".to_string(),
                    confidence: 0.95,
                    success_rate: 0.99,
                    insights: vec![
                        "Low risk operation".to_string(),
                        "Predictable gas usage".to_string(),
                    ],
                },
            ],
            confidence_score: 0.85,
        })
    }

    async fn optimize_bundle_internal(
        &self,
        simulations: &[SimulationResult],
        _analyses: &[(usize, AIInsights)],
    ) -> Result<BundleOptimization> {
        let original_order: Vec<usize> = (0..simulations.len()).collect();
        
        // In a real implementation, this would use AI to optimize the order
        // For now, use a simple heuristic: successful transactions first
        let mut optimized_order = original_order.clone();
        optimized_order.sort_by(|&a, &b| {
            let success_a = simulations[a].success;
            let success_b = simulations[b].success;
            success_b.cmp(&success_a) // successful transactions first
        });

        let total_gas_original: u64 = simulations
            .iter()
            .map(|s| s.gas_used.parse().unwrap_or(0))
            .sum();

        let gas_savings = total_gas_original / 20; // Mock 5% savings

        let mut transaction_optimizations = Vec::new();
        for (i, simulation) in simulations.iter().enumerate() {
            let current_gas = simulation.gas_used.parse::<u64>().unwrap_or(0);
            let optimized_gas = current_gas.saturating_sub(current_gas / 10);
            
            transaction_optimizations.push(TransactionOptimization {
                index: i,
                suggested_gas_limit: Some(optimized_gas.to_string()),
                suggested_gas_price: Some(Wei::new("20000000000")),
                suggested_max_fee_per_gas: Some(Wei::new("25000000000")),
                suggested_max_priority_fee_per_gas: Some(Wei::new("2000000000")),
                recommendations: vec![
                    "Optimize gas limit".to_string(),
                    "Consider timing optimization".to_string(),
                ],
                warnings: if simulation.success {
                    Vec::new()
                } else {
                    vec!["Transaction may fail".to_string()]
                },
            });
        }

        Ok(BundleOptimization {
            original_order,
            optimized_order,
            gas_savings: gas_savings.to_string(),
            time_savings: 2.5,
            success_probability: 0.92,
            transaction_optimizations,
            recommendations: vec![
                "Execute successful transactions first".to_string(),
                "Consider adjusting gas prices based on network congestion".to_string(),
                "Monitor for MEV opportunities".to_string(),
            ],
        })
    }

    fn generate_cache_key(&self, simulation_result: &SimulationResult) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        simulation_result.success.hash(&mut hasher);
        simulation_result.gas_used.hash(&mut hasher);
        if let Some(ref error) = simulation_result.error {
            error.hash(&mut hasher);
        }
        
        format!("sim_{:x}", hasher.finish())
    }

    async fn get_cached_analysis(&self, cache_key: &str) -> Option<CachedAnalysis> {
        let cache = self.cache.read().await;
        cache.get(cache_key)
            .filter(|cached| !cached.is_expired())
            .cloned()
    }

    async fn cache_analysis(&self, cache_key: &str, insights: AIInsights) {
        let cached = CachedAnalysis {
            insights,
            timestamp: std::time::Instant::now(),
            ttl: std::time::Duration::from_secs(300), // 5 minutes
        };
        
        let mut cache = self.cache.write().await;
        cache.insert(cache_key.to_string(), cached);
        
        // Simple cache cleanup: remove expired entries if cache is too large
        if cache.len() > 1000 {
            cache.retain(|_, v| !v.is_expired());
        }
    }
}

impl std::fmt::Debug for AIAnalyzer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AIAnalyzer")
            .field("api_key", &"<redacted>")
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{BlockType, Address};

    #[tokio::test]
    async fn test_ai_analyzer_creation() {
        let analyzer = AIAnalyzer::new("test-api-key".to_string()).await.unwrap();
        assert!(!analyzer.api_key.is_empty());
    }

    #[tokio::test]
    async fn test_simulation_analysis() {
        let analyzer = AIAnalyzer::new("test-api-key".to_string()).await.unwrap();
        
        let simulation_result = SimulationResult {
            success: true,
            gas_used: "21000".to_string(),
            return_data: None,
            error: None,
            revert_reason: None,
            block_type: BlockType::Fast,
            estimated_block: 12345,
            trace: None,
            hypercore_data: None,
            state_changes: Vec::new(),
            events: Vec::new(),
            tx_hash: None,
        };

        let insights = analyzer.analyze_simulation(simulation_result).await.unwrap();
        assert_eq!(insights.risk_level, RiskLevel::Low);
        assert!(insights.success_probability > 0.9);
        assert!(!insights.recommendations.is_empty());
    }

    #[tokio::test]
    async fn test_bundle_optimization() {
        let analyzer = AIAnalyzer::new("test-api-key".to_string()).await.unwrap();
        
        let simulations = vec![
            SimulationResult {
                success: true,
                gas_used: "21000".to_string(),
                return_data: None,
                error: None,
                revert_reason: None,
                block_type: BlockType::Fast,
                estimated_block: 12345,
                trace: None,
                hypercore_data: None,
                state_changes: Vec::new(),
                events: Vec::new(),
                tx_hash: None,
            },
            SimulationResult {
                success: false,
                gas_used: "50000".to_string(),
                return_data: None,
                error: Some("Execution reverted".to_string()),
                revert_reason: Some("Insufficient balance".to_string()),
                block_type: BlockType::Fast,
                estimated_block: 12345,
                trace: None,
                hypercore_data: None,
                state_changes: Vec::new(),
                events: Vec::new(),
                tx_hash: None,
            },
        ];

        let optimization = analyzer.optimize_bundle(simulations).await.unwrap();
        assert_eq!(optimization.original_order, vec![0, 1]);
        // Successful transaction should be first in optimized order
        assert_eq!(optimization.optimized_order[0], 0);
        assert!(optimization.success_probability > 0.8);
    }
}
