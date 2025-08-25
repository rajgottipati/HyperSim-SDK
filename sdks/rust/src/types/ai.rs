//! AI analysis types and data structures

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::types::{Address, Wei};

/// Risk level assessment
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

impl RiskLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            RiskLevel::Low => "low",
            RiskLevel::Medium => "medium", 
            RiskLevel::High => "high",
            RiskLevel::Critical => "critical",
        }
    }

    pub fn as_score(&self) -> f64 {
        match self {
            RiskLevel::Low => 0.25,
            RiskLevel::Medium => 0.5,
            RiskLevel::High => 0.75,
            RiskLevel::Critical => 1.0,
        }
    }
}

impl std::fmt::Display for RiskLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// AI-powered insights for simulation results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIInsights {
    /// Overall risk assessment
    pub risk_level: RiskLevel,
    /// Risk score (0.0 to 1.0)
    pub risk_score: f64,
    /// Success probability (0.0 to 1.0)
    pub success_probability: f64,
    /// Gas optimization suggestions
    pub gas_optimization: GasOptimization,
    /// Security analysis
    pub security_analysis: SecurityAnalysis,
    /// Performance insights
    pub performance_insights: PerformanceInsights,
    /// Market conditions analysis
    pub market_analysis: MarketAnalysis,
    /// General recommendations
    pub recommendations: Vec<Recommendation>,
    /// Detected patterns
    pub patterns: Vec<Pattern>,
    /// Confidence score for analysis (0.0 to 1.0)
    pub confidence_score: f64,
}

/// Gas optimization suggestions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasOptimization {
    /// Current estimated gas usage
    pub current_gas_estimate: String,
    /// Optimized gas estimate
    pub optimized_gas_estimate: String,
    /// Potential gas savings
    pub gas_savings: String,
    /// Cost savings in wei
    pub cost_savings: Wei,
    /// Suggested gas price
    pub suggested_gas_price: Option<Wei>,
    /// Suggested max fee per gas
    pub suggested_max_fee_per_gas: Option<Wei>,
    /// Suggested max priority fee per gas
    pub suggested_max_priority_fee_per_gas: Option<Wei>,
    /// Gas optimization techniques identified
    pub optimization_techniques: Vec<String>,
}

/// Security analysis results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityAnalysis {
    /// Overall security score (0.0 to 1.0)
    pub security_score: f64,
    /// Identified vulnerabilities
    pub vulnerabilities: Vec<Vulnerability>,
    /// Contract analysis results
    pub contract_analysis: Vec<ContractAnalysis>,
    /// Transaction pattern analysis
    pub transaction_patterns: Vec<TransactionPattern>,
    /// Anomaly detection results
    pub anomalies: Vec<Anomaly>,
}

/// Identified vulnerability
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vulnerability {
    /// Vulnerability type
    pub vulnerability_type: VulnerabilityType,
    /// Severity level
    pub severity: RiskLevel,
    /// Description
    pub description: String,
    /// Affected components
    pub affected_components: Vec<String>,
    /// Mitigation suggestions
    pub mitigation: Vec<String>,
    /// Confidence in detection (0.0 to 1.0)
    pub confidence: f64,
}

/// Types of vulnerabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VulnerabilityType {
    Reentrancy,
    IntegerOverflow,
    UnauthorizedAccess,
    FrontRunning,
    FlashLoanAttack,
    OracleManipulation,
    RugPull,
    Other(String),
}

/// Contract analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractAnalysis {
    /// Contract address
    pub address: Address,
    /// Contract type (e.g., "ERC20", "DEX", "Lending")
    pub contract_type: Option<String>,
    /// Trust score (0.0 to 1.0)
    pub trust_score: f64,
    /// Verification status
    pub verified: bool,
    /// Code complexity score
    pub complexity_score: f64,
    /// Known issues
    pub known_issues: Vec<String>,
    /// Audit information
    pub audit_info: Option<AuditInfo>,
}

/// Audit information for contracts
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditInfo {
    /// Audit firm
    pub firm: String,
    /// Audit date
    pub date: String,
    /// Audit report URL
    pub report_url: Option<String>,
    /// Overall rating
    pub rating: String,
}

/// Transaction pattern analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionPattern {
    /// Pattern type
    pub pattern_type: PatternType,
    /// Pattern description
    pub description: String,
    /// Relevance score (0.0 to 1.0)
    pub relevance: f64,
    /// Historical occurrences
    pub occurrences: u64,
    /// Success rate for this pattern
    pub success_rate: f64,
}

/// Types of transaction patterns
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PatternType {
    ArbitrageOpportunity,
    LiquidityProvision,
    YieldFarming,
    FlashLoan,
    MultiExchange,
    CrossChain,
    Other(String),
}

/// Detected anomaly
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Anomaly {
    /// Anomaly type
    pub anomaly_type: AnomalyType,
    /// Description
    pub description: String,
    /// Severity
    pub severity: RiskLevel,
    /// Confidence in detection (0.0 to 1.0)
    pub confidence: f64,
    /// Suggested actions
    pub suggested_actions: Vec<String>,
}

/// Types of anomalies
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AnomalyType {
    UnusualGasUsage,
    SuspiciousTransferPattern,
    PriceManipulation,
    VolumeSpike,
    NewContract,
    Other(String),
}

/// Performance insights
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceInsights {
    /// Expected execution time in milliseconds
    pub expected_execution_time: f64,
    /// Network congestion factor (1.0 = normal)
    pub congestion_factor: f64,
    /// Optimal execution time window
    pub optimal_timing: Vec<TimeWindow>,
    /// Performance bottlenecks identified
    pub bottlenecks: Vec<String>,
    /// Scalability concerns
    pub scalability_concerns: Vec<String>,
}

/// Optimal execution time window
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeWindow {
    /// Start time (Unix timestamp)
    pub start: u64,
    /// End time (Unix timestamp)
    pub end: u64,
    /// Expected performance improvement factor
    pub improvement_factor: f64,
    /// Reason for optimization
    pub reason: String,
}

/// Market conditions analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketAnalysis {
    /// Current market volatility (0.0 to 1.0)
    pub volatility: f64,
    /// Liquidity assessment
    pub liquidity_assessment: LiquidityAssessment,
    /// Price impact estimation
    pub price_impact: PriceImpact,
    /// Market sentiment score (-1.0 to 1.0)
    pub sentiment_score: f64,
    /// Relevant market events
    pub market_events: Vec<MarketEvent>,
}

/// Liquidity assessment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidityAssessment {
    /// Overall liquidity score (0.0 to 1.0)
    pub liquidity_score: f64,
    /// Available liquidity in wei
    pub available_liquidity: Wei,
    /// Depth analysis by price levels
    pub depth_analysis: HashMap<String, String>,
    /// Liquidity sources
    pub sources: Vec<String>,
}

/// Price impact estimation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceImpact {
    /// Estimated price impact percentage
    pub impact_percentage: f64,
    /// Before price
    pub before_price: String,
    /// After price
    pub after_price: String,
    /// Slippage estimation
    pub slippage: f64,
}

/// Market event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketEvent {
    /// Event type
    pub event_type: String,
    /// Event description
    pub description: String,
    /// Event timestamp
    pub timestamp: u64,
    /// Impact severity
    pub impact: RiskLevel,
    /// Relevance to current transaction
    pub relevance: f64,
}

/// AI recommendation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendation {
    /// Recommendation type
    pub recommendation_type: RecommendationType,
    /// Description
    pub description: String,
    /// Priority level
    pub priority: Priority,
    /// Expected impact if followed
    pub expected_impact: String,
    /// Implementation difficulty
    pub difficulty: Difficulty,
    /// Confidence in recommendation (0.0 to 1.0)
    pub confidence: f64,
}

/// Types of recommendations
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RecommendationType {
    GasOptimization,
    SecurityImprovement,
    TimingOptimization,
    ParameterAdjustment,
    AlternativeApproach,
    RiskMitigation,
    Other(String),
}

/// Priority levels
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Priority {
    Low,
    Medium,
    High,
    Critical,
}

/// Implementation difficulty
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Difficulty {
    Easy,
    Medium,
    Hard,
}

/// Detected pattern
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pattern {
    /// Pattern identifier
    pub id: String,
    /// Pattern name
    pub name: String,
    /// Pattern description
    pub description: String,
    /// Pattern category
    pub category: String,
    /// Match confidence (0.0 to 1.0)
    pub confidence: f64,
    /// Historical success rate for this pattern
    pub success_rate: f64,
    /// Pattern-specific insights
    pub insights: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_risk_level_properties() {
        assert_eq!(RiskLevel::Low.as_score(), 0.25);
        assert_eq!(RiskLevel::Medium.as_score(), 0.5);
        assert_eq!(RiskLevel::High.as_score(), 0.75);
        assert_eq!(RiskLevel::Critical.as_score(), 1.0);
        
        assert_eq!(RiskLevel::Low.as_str(), "low");
        assert_eq!(RiskLevel::Critical.as_str(), "critical");
    }

    #[test]
    fn test_vulnerability_type_serialization() {
        let vuln_type = VulnerabilityType::Reentrancy;
        let serialized = serde_json::to_string(&vuln_type).unwrap();
        assert_eq!(serialized, "\"reentrancy\"");

        let custom_type = VulnerabilityType::Other("custom_vulnerability".to_string());
        let serialized_custom = serde_json::to_string(&custom_type).unwrap();
        assert!(serialized_custom.contains("custom_vulnerability"));
    }

    #[test]
    fn test_recommendation_priority() {
        let priority = Priority::High;
        let serialized = serde_json::to_string(&priority).unwrap();
        assert_eq!(serialized, "\"high\"");
    }
}
