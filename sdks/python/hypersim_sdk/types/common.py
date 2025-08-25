"""
Common types and interfaces shared across the HyperSim SDK.
"""

from typing import Dict, Any, Optional, Generic, TypeVar, Union, List, Literal
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from enum import Enum

T = TypeVar('T')


# Network Configuration
class HyperSimNetwork(str, Enum):
    """Supported HyperSim networks."""
    MAINNET = "mainnet"
    TESTNET = "testnet"


class NetworkConfig(BaseModel):
    """Network configuration."""
    chain_id: int = Field(..., description="Chain ID", alias='chainId')
    rpc_url: str = Field(..., description="RPC URL", alias='rpcUrl')
    ws_url: Optional[str] = Field(default=None, description="WebSocket URL", alias='wsUrl')
    name: str = Field(..., description="Network name")


# SDK Configuration
class SDKOptions(BaseModel):
    """SDK configuration options."""
    network: Optional[HyperSimNetwork] = Field(default=None, description="Network")
    rpc_url: Optional[str] = Field(default=None, description="RPC URL", alias='rpcUrl')
    ws_url: Optional[str] = Field(default=None, description="WebSocket URL", alias='wsUrl')
    api_key: Optional[str] = Field(default=None, description="API key", alias='apiKey')
    timeout: Optional[int] = Field(default=None, description="Request timeout")
    retries: Optional[int] = Field(default=None, description="Retry attempts")
    retry_delay: Optional[int] = Field(default=None, description="Retry delay", alias='retryDelay')
    enable_ai: Optional[bool] = Field(default=None, description="Enable AI", alias='enableAI')
    cross_layer: Optional[bool] = Field(default=None, description="Cross-layer support", alias='crossLayer')
    plugins: Optional[List['Plugin']] = Field(default=None, description="Plugins")
    debug: Optional[bool] = Field(default=None, description="Debug mode")


# Simulation Types
class TransactionData(BaseModel):
    """Transaction data for simulation."""
    from_address: str = Field(..., description="From address", alias='from')
    to: Optional[str] = Field(default=None, description="To address")
    value: Optional[str] = Field(default=None, description="Transaction value")
    data: Optional[str] = Field(default=None, description="Transaction data")
    gas: Optional[str] = Field(default=None, description="Gas limit")
    gas_price: Optional[str] = Field(default=None, description="Gas price", alias='gasPrice')
    nonce: Optional[int] = Field(default=None, description="Transaction nonce")


class SimulateOptions(BaseModel):
    """Simulation options."""
    transaction: TransactionData = Field(..., description="Transaction to simulate")
    hypercore_data: Optional[bool] = Field(default=None, description="Include HyperCore data", alias='hypercoreData')
    ai_analysis: Optional[bool] = Field(default=None, description="Include AI analysis", alias='aiAnalysis')
    dual_blocks: Optional[bool] = Field(default=None, description="Dual blocks", alias='dualBlocks')
    block_number: Optional[Union[int, str]] = Field(default=None, description="Block number", alias='blockNumber')


class StateChange(BaseModel):
    """State change from simulation."""
    address: str = Field(..., description="Contract address")
    key: str = Field(..., description="Storage key")
    before: str = Field(..., description="Value before")
    after: str = Field(..., description="Value after")


class AIAnalysisResult(BaseModel):
    """AI analysis result."""
    optimization: Optional[str] = Field(default=None, description="Optimization suggestion")
    risk_assessment: Optional['RiskAssessment'] = Field(default=None, description="Risk assessment", alias='riskAssessment')
    gas_optimization: Optional['GasOptimization'] = Field(default=None, description="Gas optimization", alias='gasOptimization')
    recommendations: Optional[List[str]] = Field(default=None, description="Recommendations")


class RiskAssessment(BaseModel):
    """Risk assessment result."""
    level: Literal['low', 'medium', 'high'] = Field(..., description="Risk level")
    factors: List[str] = Field(..., description="Risk factors")


class GasOptimization(BaseModel):
    """Gas optimization suggestions."""
    current_gas: int = Field(..., description="Current gas usage", alias='currentGas')
    optimized_gas: Optional[int] = Field(default=None, description="Optimized gas usage", alias='optimizedGas')
    suggestions: List[str] = Field(..., description="Optimization suggestions")


class SimulateResult(BaseModel):
    """Simulation result."""
    success: bool = Field(..., description="Simulation success")
    gas_used: int = Field(..., description="Gas used", alias='gasUsed')
    gas_price: str = Field(..., description="Gas price", alias='gasPrice')
    result: Optional[str] = Field(default=None, description="Simulation result")
    error: Optional[str] = Field(default=None, description="Error message")
    state_changes: Optional[List[StateChange]] = Field(default=None, description="State changes", alias='stateChanges')
    hypercore_data: Optional[Any] = Field(default=None, description="HyperCore data", alias='hypercoreData')
    ai_analysis: Optional[AIAnalysisResult] = Field(default=None, description="AI analysis", alias='aiAnalysis')
    estimated_cost: str = Field(..., description="Estimated cost", alias='estimatedCost')
    timestamp: int = Field(..., description="Simulation timestamp")


# Plugin System Types
class Plugin(BaseModel):
    """Plugin interface."""
    name: str = Field(..., description="Plugin name")
    version: Optional[str] = Field(default=None, description="Plugin version")


class PluginHook(BaseModel):
    """Plugin hook configuration."""
    name: str = Field(..., description="Hook name")
    phase: Literal['before-request', 'after-response', 'on-error'] = Field(..., description="Hook phase")
    priority: Optional[int] = Field(default=None, description="Hook priority")


# WebSocket Types
class WebSocketOptions(BaseModel):
    """WebSocket configuration options."""
    reconnect: Optional[bool] = Field(default=None, description="Auto reconnect")
    max_reconnect_attempts: Optional[int] = Field(default=None, description="Max reconnect attempts", alias='maxReconnectAttempts')
    reconnect_delay: Optional[int] = Field(default=None, description="Reconnect delay", alias='reconnectDelay')
    ping_interval: Optional[int] = Field(default=None, description="Ping interval", alias='pingInterval')
    connection_timeout: Optional[int] = Field(default=None, description="Connection timeout", alias='connectionTimeout')


class WebSocketMessage(BaseModel):
    """WebSocket message."""
    method: str = Field(..., description="Message method")
    subscription: Optional['SubscriptionType'] = Field(default=None, description="Subscription type")
    id: Optional[Union[str, int]] = Field(default=None, description="Message ID")


class ConnectionState(str, Enum):
    """Connection state."""
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    RECONNECTING = "reconnecting"


# Subscription Types
class TradeSubscription(BaseModel):
    """Trade subscription."""
    type: Literal["trades"] = Field(default="trades", description="Subscription type")
    coin: str = Field(..., description="Asset symbol")


class OrderBookSubscription(BaseModel):
    """Order book subscription."""
    type: Literal["l2Book"] = Field(default="l2Book", description="Subscription type")
    coin: str = Field(..., description="Asset symbol")
    n_sig_figs: Optional[int] = Field(default=None, description="Significant figures", alias='nSigFigs')
    maintain_book: Optional[bool] = Field(default=None, description="Maintain book", alias='maintainBook')


class CandleSubscription(BaseModel):
    """Candle subscription."""
    type: Literal["candle"] = Field(default="candle", description="Subscription type")
    coin: str = Field(..., description="Asset symbol")
    interval: Literal['1m', '15m', '1h', '4h', '1d'] = Field(..., description="Candle interval")


class UserEventsSubscription(BaseModel):
    """User events subscription."""
    type: Literal["userEvents"] = Field(default="userEvents", description="Subscription type")
    user: str = Field(..., description="User address")


class UserFillsSubscription(BaseModel):
    """User fills subscription."""
    type: Literal["userFills"] = Field(default="userFills", description="Subscription type")
    user: str = Field(..., description="User address")


class UserPositionsSubscription(BaseModel):
    """User positions subscription."""
    type: Literal["userPositions"] = Field(default="userPositions", description="Subscription type")
    user: str = Field(..., description="User address")


SubscriptionType = Union[
    TradeSubscription,
    OrderBookSubscription,
    CandleSubscription,
    UserEventsSubscription,
    UserFillsSubscription,
    UserPositionsSubscription
]


# WebSocket Data Types
class TradeData(BaseModel):
    """Trade data."""
    coin: str = Field(..., description="Asset symbol")
    side: Literal['A', 'B'] = Field(..., description="Trade side")
    px: str = Field(..., description="Trade price")
    sz: str = Field(..., description="Trade size")
    hash: str = Field(..., description="Trade hash")
    time: int = Field(..., description="Trade time")
    tid: int = Field(..., description="Trade ID")


class BookLevel(BaseModel):
    """Order book level."""
    px: str = Field(..., description="Price")
    sz: str = Field(..., description="Size")
    n: int = Field(..., description="Number of orders")


class OrderBookData(BaseModel):
    """Order book data."""
    coin: str = Field(..., description="Asset symbol")
    levels: List[List[BookLevel]] = Field(..., description="[bids, asks]")
    time: int = Field(..., description="Update time")


class CandleData(BaseModel):
    """Candle data."""
    coin: str = Field(..., description="Asset symbol")
    interval: str = Field(..., description="Time interval")
    t: int = Field(..., description="Start timestamp")
    T: int = Field(..., description="Close timestamp")
    s: str = Field(..., description="Start price")
    c: str = Field(..., description="Close price")
    h: str = Field(..., description="High price")
    l: str = Field(..., description="Low price")
    v: str = Field(..., description="Volume")
    n: int = Field(..., description="Number of trades")


class UserFillData(BaseModel):
    """User fill data."""
    coin: str = Field(..., description="Asset symbol")
    px: str = Field(..., description="Fill price")
    sz: str = Field(..., description="Fill size")
    side: Literal['A', 'B'] = Field(..., description="Fill side")
    time: int = Field(..., description="Fill time")
    start_position: str = Field(..., description="Start position", alias='startPosition')
    dir: str = Field(..., description="Direction")
    closed_pnl: str = Field(..., description="Closed P&L", alias='closedPnl')
    hash: str = Field(..., description="Fill hash")
    oid: int = Field(..., description="Order ID")
    crossed: bool = Field(..., description="Crossed")
    fee: str = Field(..., description="Fee")
    liquidation: Optional[bool] = Field(default=None, description="Liquidation")


# HTTP Client Types
class RequestOptions(BaseModel):
    """HTTP request options."""
    method: Optional[Literal['GET', 'POST', 'PUT', 'DELETE']] = Field(default=None, description="HTTP method")
    headers: Optional[Dict[str, str]] = Field(default=None, description="Request headers")
    body: Optional[Any] = Field(default=None, description="Request body")
    timeout: Optional[int] = Field(default=None, description="Request timeout")
    retries: Optional[int] = Field(default=None, description="Retry attempts")


class Response(BaseModel, Generic[T]):
    """HTTP response."""
    data: T = Field(..., description="Response data")
    status: int = Field(..., description="Status code")
    headers: Dict[str, str] = Field(..., description="Response headers")
    success: bool = Field(..., description="Request success")


# Error Types
class ErrorContext(BaseModel):
    """Error context."""
    operation: str = Field(..., description="Operation name")
    timestamp: int = Field(..., description="Error timestamp")
    network: Optional[HyperSimNetwork] = Field(default=None, description="Network")
    retry_attempt: Optional[int] = Field(default=None, description="Retry attempt", alias='retryAttempt')
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Error metadata")


# Retry Configuration
class RetryConfig(BaseModel):
    """Retry configuration."""
    max_attempts: int = Field(..., description="Max attempts", alias='maxAttempts')
    base_delay: int = Field(..., description="Base delay", alias='baseDelay')
    max_delay: int = Field(..., description="Max delay", alias='maxDelay')
    backoff_multiplier: float = Field(..., description="Backoff multiplier", alias='backoffMultiplier')
    jitter: bool = Field(..., description="Add jitter")


# Rate Limiting
class RateLimitConfig(BaseModel):
    """Rate limit configuration."""
    requests_per_second: int = Field(..., description="Requests per second", alias='requestsPerSecond')
    burst_size: int = Field(..., description="Burst size", alias='burstSize')
    window_ms: int = Field(..., description="Window in milliseconds", alias='windowMs')


# Performance Monitoring
class PerformanceMetrics(BaseModel):
    """Performance metrics."""
    request_count: int = Field(..., description="Request count", alias='requestCount')
    error_count: int = Field(..., description="Error count", alias='errorCount')
    average_response_time: float = Field(..., description="Average response time", alias='averageResponseTime')
    p95_response_time: float = Field(..., description="P95 response time", alias='p95ResponseTime')
    connection_uptime: float = Field(..., description="Connection uptime", alias='connectionUptime')
    last_error: Optional[datetime] = Field(default=None, description="Last error", alias='lastError')


# Event Types
class SDKEvent(BaseModel):
    """SDK event."""
    type: str = Field(..., description="Event type")
    timestamp: int = Field(..., description="Event timestamp")
    data: Optional[Any] = Field(default=None, description="Event data")


class ConnectionEvent(SDKEvent):
    """Connection event."""
    type: Literal['connected', 'disconnected', 'reconnecting'] = Field(..., description="Event type")
    data: 'ConnectionEventData' = Field(..., description="Event data")


class ConnectionEventData(BaseModel):
    """Connection event data."""
    url: str = Field(..., description="Connection URL")
    attempt: Optional[int] = Field(default=None, description="Attempt number")


class ErrorEvent(SDKEvent):
    """Error event."""
    type: Literal["error"] = Field(default="error", description="Event type")
    data: 'ErrorEventData' = Field(..., description="Event data")


class ErrorEventData(BaseModel):
    """Error event data."""
    error: str = Field(..., description="Error message")
    context: Optional[ErrorContext] = Field(default=None, description="Error context")


class DataEvent(SDKEvent):
    """Data event."""
    type: Literal["data"] = Field(default="data", description="Event type")
    data: 'DataEventData' = Field(..., description="Event data")


class DataEventData(BaseModel):
    """Data event data."""
    channel: str = Field(..., description="Data channel")
    payload: Any = Field(..., description="Data payload")


# Constants
DEFAULT_TIMEOUT = 30000
DEFAULT_RETRIES = 3
DEFAULT_RETRY_DELAY = 1000
MAX_RETRY_DELAY = 30000


# Utility Types
def is_trade_subscription(sub: SubscriptionType) -> bool:
    """Check if subscription is trade subscription."""
    return isinstance(sub, TradeSubscription)


def is_order_book_subscription(sub: SubscriptionType) -> bool:
    """Check if subscription is order book subscription."""
    return isinstance(sub, OrderBookSubscription)


def is_candle_subscription(sub: SubscriptionType) -> bool:
    """Check if subscription is candle subscription."""
    return isinstance(sub, CandleSubscription)


def is_user_subscription(sub: SubscriptionType) -> bool:
    """Check if subscription is user subscription."""
    return isinstance(sub, (UserEventsSubscription, UserFillsSubscription, UserPositionsSubscription))


# Update forward references
SDKOptions.model_rebuild()
WebSocketMessage.model_rebuild()
ConnectionEvent.model_rebuild()
ErrorEvent.model_rebuild()
DataEvent.model_rebuild()
AIAnalysisResult.model_rebuild()
SimulateResult.model_rebuild()


# Additional Configuration Types for SDK components
class RetryConfig(BaseModel):
    """Retry configuration."""
    max_attempts: int = Field(default=3, description="Maximum retry attempts", alias='maxAttempts')
    initial_delay: float = Field(default=1.0, description="Initial delay in seconds", alias='initialDelay')
    backoff_multiplier: float = Field(default=2.0, description="Backoff multiplier", alias='backoffMultiplier')
    max_delay: float = Field(default=30.0, description="Maximum delay in seconds", alias='maxDelay')


class ConnectionPoolConfig(BaseModel):
    """Connection pool configuration."""
    max_connections: int = Field(default=100, description="Maximum connections", alias='maxConnections')
    max_connections_per_host: int = Field(default=30, description="Max connections per host", alias='maxConnectionsPerHost')
    keepalive_timeout: float = Field(default=30.0, description="Keepalive timeout", alias='keepaliveTimeout')
    connection_timeout: float = Field(default=10.0, description="Connection timeout", alias='connectionTimeout')


class CircuitBreakerState(str, Enum):
    """Circuit breaker states."""
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreakerConfig(BaseModel):
    """Circuit breaker configuration."""
    failure_threshold: int = Field(default=5, description="Failure threshold", alias='failureThreshold')
    recovery_timeout: float = Field(default=60.0, description="Recovery timeout", alias='recoveryTimeout')
    expected_exception: str = Field(default="Exception", description="Expected exception", alias='expectedException')
    state: CircuitBreakerState = Field(default=CircuitBreakerState.CLOSED, description="Initial state")


class RateLimiterConfig(BaseModel):
    """Rate limiter configuration."""
    requests_per_second: float = Field(default=10.0, description="Requests per second", alias='requestsPerSecond')
    burst_size: int = Field(default=20, description="Burst size", alias='burstSize')
    time_window: float = Field(default=60.0, description="Time window in seconds", alias='timeWindow')


class PerformanceMetrics(BaseModel):
    """Performance metrics."""
    total_requests: int = Field(default=0, description="Total requests", alias='totalRequests')
    successful_requests: int = Field(default=0, description="Successful requests", alias='successfulRequests')
    failed_requests: int = Field(default=0, description="Failed requests", alias='failedRequests')
    average_response_time: float = Field(default=0.0, description="Average response time", alias='averageResponseTime')
    uptime: float = Field(default=0.0, description="Uptime in seconds")


class CacheEntry(BaseModel):
    """Cache entry."""
    key: str = Field(..., description="Cache key")
    value: Any = Field(..., description="Cached value")
    timestamp: datetime = Field(default_factory=datetime.now, description="Cache timestamp")
    ttl: int = Field(..., description="Time to live in seconds")
    hits: int = Field(default=0, description="Cache hits")


class RequestContext(BaseModel):
    """Request context."""
    request_id: str = Field(..., description="Request ID", alias='requestId')
    timestamp: datetime = Field(default_factory=datetime.now, description="Request timestamp")
    user_agent: Optional[str] = Field(default=None, description="User agent", alias='userAgent')
    ip_address: Optional[str] = Field(default=None, description="IP address", alias='ipAddress')
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Request metadata")


class ResponseContext(BaseModel):
    """Response context."""
    request_id: str = Field(..., description="Request ID", alias='requestId')
    status_code: int = Field(..., description="Status code", alias='statusCode')
    response_time: float = Field(..., description="Response time in seconds", alias='responseTime')
    cached: bool = Field(default=False, description="From cache")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Response metadata")


class HealthCheckResult(BaseModel):
    """Health check result."""
    status: Literal['healthy', 'unhealthy', 'degraded'] = Field(..., description="Health status")
    checks: Dict[str, bool] = Field(default_factory=dict, description="Individual checks")
    response_time: float = Field(..., description="Response time", alias='responseTime')
    timestamp: datetime = Field(default_factory=datetime.now, description="Check timestamp")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Health check details")
