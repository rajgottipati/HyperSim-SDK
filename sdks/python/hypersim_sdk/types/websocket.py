"""
WebSocket streaming types and models.
"""

from typing import Optional, Dict, Any, Union, List
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum
from datetime import datetime


class SubscriptionType(str, Enum):
    """WebSocket subscription types."""
    TRADES = "trades"
    BOOK = "book"
    BBO = "bbo"  # Best bid/offer
    USER_FILLS = "userFills"
    USER_ORDERS = "userOrders"
    USER_EVENTS = "userEvents"
    CANDLE = "candle"
    L2_BOOK = "l2Book"
    NOTIFICATION = "notification"


class ConnectionState(str, Enum):
    """WebSocket connection states."""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    ERROR = "error"


class WSSubscription(BaseModel):
    """WebSocket subscription request."""
    
    type: SubscriptionType = Field(..., description="Subscription type")
    coin: Optional[str] = Field(default=None, description="Asset symbol")
    user: Optional[str] = Field(default=None, description="User address")
    interval: Optional[str] = Field(default=None, description="Time interval (for candles)")
    
    def get_subscription_key(self) -> str:
        """Generate unique subscription key."""
        parts = [self.type.value]
        if self.coin:
            parts.append(self.coin)
        if self.user:
            parts.append(self.user)
        if self.interval:
            parts.append(self.interval)
        return ":".join(parts)


class WSMessage(BaseModel):
    """WebSocket message structure."""
    
    channel: str = Field(..., description="Message channel")
    data: Any = Field(..., description="Message data")
    timestamp: Optional[datetime] = Field(default_factory=datetime.now, description="Message timestamp")
    message_type: Optional[str] = Field(default=None, description="Message type")
    sequence: Optional[int] = Field(default=None, description="Message sequence number")


class WSConfig(BaseModel):
    """WebSocket client configuration."""
    
    ws_endpoint: Optional[str] = Field(default=None, description="WebSocket endpoint URL")
    connection_timeout: float = Field(default=10.0, gt=0, description="Connection timeout in seconds")
    reconnect_interval: float = Field(default=5.0, gt=0, description="Reconnection interval in seconds")
    max_reconnect_attempts: int = Field(default=10, ge=0, description="Maximum reconnection attempts")
    heartbeat_interval: float = Field(default=30.0, gt=0, description="Heartbeat interval in seconds")
    compression: bool = Field(default=True, description="Enable compression")
    debug: bool = Field(default=False, description="Enable debug logging")
    
    # Message handling
    max_message_size: int = Field(default=1024*1024, gt=0, description="Maximum message size in bytes")
    message_queue_size: int = Field(default=1000, gt=0, description="Message queue size")
    auto_reconnect: bool = Field(default=True, description="Enable automatic reconnection")
    
    # Rate limiting
    max_subscriptions: int = Field(default=100, gt=0, description="Maximum concurrent subscriptions")
    subscription_rate_limit: float = Field(default=1.0, gt=0, description="Subscription rate limit per second")


class WSCloseInfo(BaseModel):
    """WebSocket close information."""
    
    code: int = Field(..., description="Close code")
    reason: str = Field(..., description="Close reason")
    was_clean: bool = Field(..., description="Whether close was clean")


class WSMetrics(BaseModel):
    """WebSocket connection metrics."""
    
    messages_received: int = Field(default=0, description="Messages received count")
    messages_sent: int = Field(default=0, description="Messages sent count")
    reconnections: int = Field(default=0, description="Reconnection count")
    errors: int = Field(default=0, description="Error count")
    last_activity: Optional[datetime] = Field(default=None, description="Last activity timestamp")
    connection_uptime: float = Field(default=0.0, description="Connection uptime in seconds")
    average_latency: float = Field(default=0.0, description="Average message latency in milliseconds")
    
    # Subscription metrics
    active_subscriptions: int = Field(default=0, description="Active subscriptions count")
    subscription_errors: int = Field(default=0, description="Subscription error count")
    
    # Data metrics
    bytes_received: int = Field(default=0, description="Total bytes received")
    bytes_sent: int = Field(default=0, description="Total bytes sent")


class WSError(BaseModel):
    """WebSocket error information."""
    
    error_type: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    timestamp: datetime = Field(default_factory=datetime.now, description="Error timestamp")
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional error details")


# Common WebSocket message types
class TradeMessage(BaseModel):
    """Trade message data."""
    
    coin: str = Field(..., description="Asset symbol")
    side: str = Field(..., description="Trade side (buy/sell)")
    sz: str = Field(..., description="Trade size")
    px: str = Field(..., description="Trade price")
    time: int = Field(..., description="Trade timestamp")
    tid: Optional[int] = Field(default=None, description="Trade ID")


class BookMessage(BaseModel):
    """Order book message data."""
    
    coin: str = Field(..., description="Asset symbol")
    levels: List[List[Union[str, float]]] = Field(..., description="Price levels [price, size]")
    time: int = Field(..., description="Update timestamp")


class CandleMessage(BaseModel):
    """Candle message data."""
    
    coin: str = Field(..., description="Asset symbol")
    interval: str = Field(..., description="Time interval")
    t: int = Field(..., description="Open time")
    o: str = Field(..., description="Open price")
    h: str = Field(..., description="High price")
    l: str = Field(..., description="Low price")
    c: str = Field(..., description="Close price")
    v: str = Field(..., description="Volume")
