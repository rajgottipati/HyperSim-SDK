"""
AI analysis types and configurations.
"""

from typing import Dict, List, Optional, Any, Literal, Union
from pydantic import BaseModel, Field, ConfigDict, field_validator
from enum import Enum
from datetime import datetime


# AI Analysis Configuration
class AIModelType(str, Enum):
    """AI model types."""
    GPT_4 = "gpt-4"
    GPT_4_TURBO = "gpt-4-turbo"
    GPT_3_5_TURBO = "gpt-3.5-turbo"


class AIConfig(BaseModel):
    """AI configuration."""
    model: AIModelType = Field(default=AIModelType.GPT_4_TURBO, description="AI model to use")
    api_key: Optional[str] = Field(default=None, description="OpenAI API key", alias='apiKey')
    temperature: float = Field(default=0.1, ge=0, le=2, description="Model temperature")
    max_tokens: Optional[int] = Field(default=None, description="Max tokens", alias='maxTokens')
    timeout: float = Field(default=30.0, description="Request timeout")
    cache_enabled: bool = Field(default=True, description="Enable caching", alias='cacheEnabled')
    cache_ttl: int = Field(default=300, description="Cache TTL in seconds", alias='cacheTtl')


# Risk Assessment Types
class RiskLevel(str, Enum):
    """Risk assessment levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskFactor(BaseModel):
    """Risk factor."""
    category: str = Field(..., description="Risk category")
    severity: RiskLevel = Field(..., description="Risk severity")
    description: str = Field(..., description="Risk description")
    recommendation: Optional[str] = Field(default=None, description="Recommendation")


class RiskAssessment(BaseModel):
    """Risk assessment result."""
    overall_risk: RiskLevel = Field(..., description="Overall risk level", alias='overallRisk')
    score: float = Field(..., ge=0, le=1, description="Risk score (0-1)")
    factors: List[RiskFactor] = Field(..., description="Risk factors")
    summary: str = Field(..., description="Risk summary")
    recommendations: List[str] = Field(default_factory=list, description="Risk mitigation recommendations")


# Gas Optimization Types
class GasOptimizationType(str, Enum):
    """Gas optimization types."""
    CALL_DATA = "call_data"
    STORAGE = "storage"
    LOOPS = "loops"
    OPCODES = "opcodes"
    CONTRACT_SIZE = "contract_size"


class GasOptimization(BaseModel):
    """Gas optimization suggestion."""
    type: GasOptimizationType = Field(..., description="Optimization type")
    current_gas: int = Field(..., description="Current gas usage", alias='currentGas')
    optimized_gas: int = Field(..., description="Optimized gas usage", alias='optimizedGas')
    savings: int = Field(..., description="Gas savings")
    savings_percentage: float = Field(..., description="Savings percentage", alias='savingsPercentage')
    description: str = Field(..., description="Optimization description")
    implementation: str = Field(..., description="Implementation details")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score")


class GasAnalysis(BaseModel):
    """Gas analysis result."""
    total_gas: int = Field(..., description="Total gas used", alias='totalGas')
    optimizations: List[GasOptimization] = Field(..., description="Gas optimizations")
    potential_savings: int = Field(..., description="Total potential savings", alias='potentialSavings')
    optimized_total: int = Field(..., description="Optimized total gas", alias='optimizedTotal')
    efficiency_score: float = Field(..., ge=0, le=1, description="Efficiency score", alias='efficiencyScore')


# Security Analysis Types  
class Vulnerability(BaseModel):
    """Security vulnerability."""
    severity: RiskLevel = Field(..., description="Vulnerability severity")
    category: str = Field(..., description="Vulnerability category")
    description: str = Field(..., description="Vulnerability description")
    recommendation: str = Field(..., description="Mitigation recommendation")
    references: List[str] = Field(default_factory=list, description="External references")


class SecurityAnalysis(BaseModel):
    """Security analysis result."""
    overall_score: float = Field(..., ge=0, le=1, description="Overall security score", alias='overallScore')
    vulnerabilities: List[Vulnerability] = Field(default_factory=list, description="Detected vulnerabilities")
    audit_score: float = Field(..., ge=0, le=1, description="Audit score", alias='auditScore')
    summary: str = Field(..., description="Security analysis summary")
    recommendations: List[str] = Field(default_factory=list, description="Security recommendations")


# Performance Analysis Types
class PerformanceAnalysis(BaseModel):
    """Performance analysis result."""
    gas_efficiency: float = Field(..., ge=0, le=1, description="Gas efficiency score", alias='gasEfficiency')
    execution_complexity: str = Field(..., description="Execution complexity", alias='executionComplexity')
    optimization_potential: float = Field(..., ge=0, le=1, description="Optimization potential", alias='optimizationPotential')
    bottlenecks: List[str] = Field(default_factory=list, description="Performance bottlenecks")
    recommendations: List[str] = Field(default_factory=list, description="Performance recommendations")


# Gas Analysis Types
class GasAnalysis(BaseModel):
    """Gas usage analysis."""
    estimated_gas: int = Field(..., description="Estimated gas usage", alias='estimatedGas')
    optimization_potential: int = Field(..., description="Gas savings potential", alias='optimizationPotential')
    efficiency_score: float = Field(..., ge=0, le=1, description="Gas efficiency score", alias='efficiencyScore')
    breakdown: Dict[str, int] = Field(default_factory=dict, description="Gas breakdown by operation")
    recommendations: List[GasOptimization] = Field(default_factory=list, description="Gas optimization recommendations")


# Contract Analysis Types
class ContractIssueType(str, Enum):
    """Contract issue types."""
    SECURITY = "security"
    PERFORMANCE = "performance"
    BEST_PRACTICE = "best_practice"
    COMPATIBILITY = "compatibility"


class ContractIssue(BaseModel):
    """Contract issue."""
    type: ContractIssueType = Field(..., description="Issue type")
    severity: RiskLevel = Field(..., description="Issue severity")
    title: str = Field(..., description="Issue title")
    description: str = Field(..., description="Issue description")
    location: Optional[str] = Field(default=None, description="Code location")
    recommendation: str = Field(..., description="Recommendation")
    references: List[str] = Field(default_factory=list, description="References")


class ContractAnalysis(BaseModel):
    """Contract analysis result."""
    contract_address: str = Field(..., description="Contract address", alias='contractAddress')
    analysis_type: str = Field(..., description="Analysis type", alias='analysisType')
    issues: List[ContractIssue] = Field(..., description="Detected issues")
    overall_score: float = Field(..., ge=0, le=1, description="Overall score", alias='overallScore')
    complexity_score: float = Field(..., ge=0, le=1, description="Complexity score", alias='complexityScore')
    security_score: float = Field(..., ge=0, le=1, description="Security score", alias='securityScore')
    summary: str = Field(..., description="Analysis summary")


# Transaction Analysis Types
class TransactionPattern(str, Enum):
    """Transaction patterns."""
    NORMAL = "normal"
    MEV = "mev"
    ARBITRAGE = "arbitrage"
    SANDWICH = "sandwich"
    FRONTRUN = "frontrun"
    LIQUIDATION = "liquidation"
    FLASH_LOAN = "flash_loan"


class TransactionInsight(BaseModel):
    """Transaction insight."""
    pattern: TransactionPattern = Field(..., description="Detected pattern")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score")
    description: str = Field(..., description="Pattern description")
    impact: str = Field(..., description="Potential impact")
    recommendation: Optional[str] = Field(default=None, description="Recommendation")


class TransactionAnalysis(BaseModel):
    """Transaction analysis result."""
    transaction_hash: str = Field(..., description="Transaction hash", alias='transactionHash')
    insights: List[TransactionInsight] = Field(..., description="Transaction insights")
    risk_score: float = Field(..., ge=0, le=1, description="Risk score", alias='riskScore')
    mev_potential: float = Field(..., ge=0, le=1, description="MEV potential", alias='mevPotential')
    complexity: str = Field(..., description="Transaction complexity")
    summary: str = Field(..., description="Analysis summary")


# Market Analysis Types
class MarketCondition(str, Enum):
    """Market conditions."""
    BULLISH = "bullish"
    BEARISH = "bearish"
    SIDEWAYS = "sideways"
    VOLATILE = "volatile"


class MarketIndicator(BaseModel):
    """Market indicator."""
    name: str = Field(..., description="Indicator name")
    value: float = Field(..., description="Indicator value")
    signal: Literal['buy', 'sell', 'hold'] = Field(..., description="Signal type")
    strength: float = Field(..., ge=0, le=1, description="Signal strength")
    description: str = Field(..., description="Indicator description")


class MarketAnalysis(BaseModel):
    """Market analysis result."""
    asset: str = Field(..., description="Asset symbol")
    condition: MarketCondition = Field(..., description="Market condition")
    sentiment: float = Field(..., ge=-1, le=1, description="Market sentiment (-1 to 1)")
    volatility: float = Field(..., ge=0, description="Volatility measure")
    indicators: List[MarketIndicator] = Field(..., description="Market indicators")
    price_targets: Dict[str, float] = Field(..., description="Price targets", alias='priceTargets')
    recommendations: List[str] = Field(..., description="Trading recommendations")


# Comprehensive AI Analysis Result
class AIInsights(BaseModel):
    """Comprehensive AI analysis insights."""
    risk_level: RiskLevel = Field(..., description="Overall risk level", alias='riskLevel')
    confidence: float = Field(..., ge=0, le=1, description="Analysis confidence score")
    
    # Risk analysis
    risk_assessment: RiskAssessment = Field(..., description="Risk assessment", alias='riskAssessment')
    
    # Gas analysis
    optimizations: List[GasOptimization] = Field(default_factory=list, description="Gas optimizations")
    
    # Security analysis
    security_analysis: SecurityAnalysis = Field(..., description="Security analysis", alias='securityAnalysis')
    
    # Performance analysis
    performance_analysis: PerformanceAnalysis = Field(..., description="Performance analysis", alias='performanceAnalysis')
    
    # Summary and recommendations
    summary: str = Field(..., description="Analysis summary")
    recommendations: List[str] = Field(default_factory=list, description="Overall recommendations")
    
    # Metadata
    analysis_id: str = Field(..., description="Analysis ID", alias='analysisId')
    timestamp: datetime = Field(default_factory=datetime.now, description="Analysis timestamp")
    model_version: str = Field(default="gpt-4-turbo", description="AI model version", alias='modelVersion')


# AI Analysis Request Types
class AnalysisRequest(BaseModel):
    """Base analysis request."""
    id: str = Field(..., description="Analysis ID")
    timestamp: datetime = Field(default_factory=datetime.now, description="Request timestamp")
    context: Dict[str, Any] = Field(default_factory=dict, description="Analysis context")


class TransactionAnalysisRequest(AnalysisRequest):
    """Transaction analysis request."""
    transaction_hash: str = Field(..., description="Transaction hash", alias='transactionHash')
    include_risk: bool = Field(default=True, description="Include risk analysis", alias='includeRisk')
    include_gas: bool = Field(default=True, description="Include gas analysis", alias='includeGas')
    include_patterns: bool = Field(default=True, description="Include pattern analysis", alias='includePatterns')


class ContractAnalysisRequest(AnalysisRequest):
    """Contract analysis request."""
    contract_address: str = Field(..., description="Contract address", alias='contractAddress')
    bytecode: Optional[str] = Field(default=None, description="Contract bytecode")
    source_code: Optional[str] = Field(default=None, description="Contract source code", alias='sourceCode')
    include_security: bool = Field(default=True, description="Include security analysis", alias='includeSecurity')
    include_gas: bool = Field(default=True, description="Include gas analysis", alias='includeGas')


class MarketAnalysisRequest(AnalysisRequest):
    """Market analysis request."""
    asset: str = Field(..., description="Asset symbol")
    timeframe: str = Field(default="1d", description="Analysis timeframe")
    include_sentiment: bool = Field(default=True, description="Include sentiment", alias='includeSentiment')
    include_technical: bool = Field(default=True, description="Include technical analysis", alias='includeTechnical')


# AI Analysis Response Types
class AnalysisResponse(BaseModel):
    """Base analysis response."""
    id: str = Field(..., description="Analysis ID")
    status: Literal['pending', 'completed', 'failed'] = Field(..., description="Analysis status")
    timestamp: datetime = Field(..., description="Response timestamp")
    processing_time: float = Field(..., description="Processing time in seconds", alias='processingTime')
    tokens_used: Optional[int] = Field(default=None, description="Tokens used", alias='tokensUsed')
    cached: bool = Field(default=False, description="Result from cache")


class TransactionAnalysisResponse(AnalysisResponse):
    """Transaction analysis response."""
    analysis: Optional[TransactionAnalysis] = Field(default=None, description="Analysis result")
    gas_analysis: Optional[GasAnalysis] = Field(default=None, description="Gas analysis", alias='gasAnalysis')
    risk_assessment: Optional[RiskAssessment] = Field(default=None, description="Risk assessment", alias='riskAssessment')


class ContractAnalysisResponse(AnalysisResponse):
    """Contract analysis response."""
    analysis: Optional[ContractAnalysis] = Field(default=None, description="Analysis result")
    gas_analysis: Optional[GasAnalysis] = Field(default=None, description="Gas analysis", alias='gasAnalysis')
    risk_assessment: Optional[RiskAssessment] = Field(default=None, description="Risk assessment", alias='riskAssessment')


class MarketAnalysisResponse(AnalysisResponse):
    """Market analysis response."""
    analysis: Optional[MarketAnalysis] = Field(default=None, description="Analysis result")


# AI Service Configuration
class RetryConfig(BaseModel):
    """Retry configuration."""
    max_attempts: int = Field(default=3, description="Max retry attempts", alias='maxAttempts')
    base_delay: float = Field(default=1.0, description="Base delay in seconds", alias='baseDelay')
    max_delay: float = Field(default=60.0, description="Max delay in seconds", alias='maxDelay')
    backoff_factor: float = Field(default=2.0, description="Backoff factor", alias='backoffFactor')


class CacheConfig(BaseModel):
    """Cache configuration."""
    enabled: bool = Field(default=True, description="Enable caching")
    ttl: int = Field(default=300, description="Cache TTL in seconds")
    max_size: int = Field(default=1000, description="Max cache size", alias='maxSize')
    key_prefix: str = Field(default="ai_", description="Cache key prefix", alias='keyPrefix')


class AIServiceConfig(BaseModel):
    """AI service configuration."""
    openai_config: AIConfig = Field(..., description="OpenAI configuration", alias='openaiConfig')
    rate_limit: int = Field(default=10, description="Requests per minute", alias='rateLimit')
    concurrent_requests: int = Field(default=5, description="Max concurrent requests", alias='concurrentRequests')
    retry_config: RetryConfig = Field(..., description="Retry configuration", alias='retryConfig')
    cache_config: CacheConfig = Field(..., description="Cache configuration", alias='cacheConfig')


# AI Metrics
class AIMetrics(BaseModel):
    """AI service metrics."""
    total_requests: int = Field(default=0, description="Total requests", alias='totalRequests')
    successful_requests: int = Field(default=0, description="Successful requests", alias='successfulRequests')
    failed_requests: int = Field(default=0, description="Failed requests", alias='failedRequests')
    cached_requests: int = Field(default=0, description="Cached requests", alias='cachedRequests')
    average_response_time: float = Field(default=0.0, description="Average response time", alias='averageResponseTime')
    total_tokens_used: int = Field(default=0, description="Total tokens used", alias='totalTokensUsed')
    cost_estimate: float = Field(default=0.0, description="Cost estimate", alias='costEstimate')
