"""
WebSocket streaming client with async context managers and automatic reconnection.
"""

import asyncio
import json
import logging
import time
from typing import Any, Dict, Optional, Callable, Set, AsyncGenerator, List
from contextlib import asynccontextmanager
import websockets
from websockets.exceptions import ConnectionClosed

from ..types.websocket import (
    WSConfig, WSMessage, WSSubscription, ConnectionState, WSMetrics,
    WSError, WSCloseInfo, SubscriptionType
)
from ..types.common import SubscriptionType as CommonSubscriptionType
from ..types.errors import NetworkError, TimeoutError, ValidationError, WebSocketError


logger = logging.getLogger(__name__)


class WebSocketClient:
    """Asynchronous WebSocket client with reconnection and subscription management."""
    
    def __init__(
        self,
        ws_url: str,
        config: Optional[WSConfig] = None,
        on_message: Optional[Callable[[WSMessage], None]] = None,
        on_connect: Optional[Callable[[], None]] = None,
        on_disconnect: Optional[Callable[[WSCloseInfo], None]] = None,
        on_error: Optional[Callable[[Exception], None]] = None
    ):
        """Initialize WebSocket client."""
        self.ws_url = ws_url
        self.config = config or WSConfig()
        
        # Event callbacks
        self.on_message = on_message
        self.on_connect = on_connect  
        self.on_disconnect = on_disconnect
        self.on_error = on_error
        
        # Connection state
        self._websocket: Optional[websockets.WebSocketServerProtocol] = None
        self._connection_state = ConnectionState.DISCONNECTED
        self._reconnect_count = 0
        self._running = False
        
        # Subscription management
        self._subscriptions: Dict[str, CommonSubscriptionType] = {}
        self._message_handlers: Dict[str, List[Callable[[Any], None]]] = {}
        
        # Tasks
        self._connection_task: Optional[asyncio.Task] = None
        
        # Metrics
        self._metrics = WSMetrics()
        self._start_time = time.time()
        
    @property
    def state(self) -> ConnectionState:
        """Get current connection state."""
        return self._connection_state
        
    @property
    def is_connected(self) -> bool:
        """Check if WebSocket is connected."""
        return (
            self._connection_state == ConnectionState.CONNECTED and
            self._websocket is not None and
            not self._websocket.closed
        )
        
    @property
    def metrics(self) -> WSMetrics:
        """Get connection metrics."""
        if self._connection_state == ConnectionState.CONNECTED:
            self._metrics.connection_uptime = time.time() - self._start_time
        return self._metrics
        
    async def connect(self) -> None:
        """Connect to WebSocket."""
        if self._running:
            logger.warning("WebSocket client is already running")
            return
            
        self._running = True
        self._connection_task = asyncio.create_task(self._connection_loop())
        
        # Wait for initial connection
        max_wait = self.config.connection_timeout
        start_time = time.time()
        
        while (
            self._connection_state != ConnectionState.CONNECTED and
            time.time() - start_time < max_wait
        ):
            await asyncio.sleep(0.1)
            
        if self._connection_state != ConnectionState.CONNECTED:
            raise TimeoutError(f"Failed to connect within {max_wait}s")
            
    async def disconnect(self) -> None:
        """Disconnect from WebSocket."""
        logger.info("Disconnecting WebSocket client")
        self._running = False
        
        if self._connection_task:
            self._connection_task.cancel()
            try:
                await self._connection_task
            except asyncio.CancelledError:
                pass
                
        if self._websocket:
            await self._websocket.close()
            
        self._connection_state = ConnectionState.DISCONNECTED
        self._websocket = None
        
    async def __aenter__(self) -> 'WebSocketClient':
        """Async context manager entry."""
        await self.connect()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.disconnect()
        
    async def _connection_loop(self) -> None:
        """Main connection loop with reconnection logic."""
        while self._running:
            try:
                self._connection_state = ConnectionState.CONNECTING
                logger.info(f"Connecting to {self.ws_url}")
                
                self._websocket = await asyncio.wait_for(
                    websockets.connect(
                        self.ws_url,
                        compression=None if not self.config.compression else "deflate",
                        max_size=self.config.max_message_size,
                    ),
                    timeout=self.config.connection_timeout
                )
                
                self._connection_state = ConnectionState.CONNECTED
                self._reconnect_count = 0
                
                logger.info("WebSocket connected successfully")
                
                if self.on_connect:
                    try:
                        self.on_connect()
                    except Exception as e:
                        logger.error(f"Error in connect callback: {e}")
                        
                # Resubscribe to all subscriptions
                await self._resubscribe_all()
                
                # Handle messages
                await self._handle_messages()
                
            except asyncio.TimeoutError:
                logger.error("WebSocket connection timeout")
                await self._handle_connection_error(TimeoutError("Connection timeout"))
                
            except ConnectionClosed as e:
                logger.warning(f"WebSocket connection closed: {e}")
                close_info = WSCloseInfo(code=e.code, reason=e.reason, was_clean=True)
                await self._handle_disconnect(close_info)
                
            except Exception as e:
                logger.error(f"WebSocket connection error: {e}")
                await self._handle_connection_error(e)
                
            # Reconnection logic
            if self._running and self.config.auto_reconnect:
                if self._reconnect_count < self.config.max_reconnect_attempts:
                    delay = min(
                        self.config.reconnect_interval * (2 ** self._reconnect_count),
                        60.0
                    )
                    logger.info(f"Reconnecting in {delay}s (attempt {self._reconnect_count + 1})")
                    
                    self._connection_state = ConnectionState.RECONNECTING
                    self._reconnect_count += 1
                    
                    await asyncio.sleep(delay)
                else:
                    logger.error("Max reconnection attempts reached")
                    self._running = False
                    
    async def _handle_messages(self) -> None:
        """Handle incoming WebSocket messages."""
        if not self._websocket:
            return
            
        try:
            async for message in self._websocket:
                try:
                    self._metrics.messages_received += 1
                    self._metrics.bytes_received += len(message)
                    self._metrics.last_activity = time.time()
                    
                    # Parse message
                    if isinstance(message, str):
                        data = json.loads(message)
                    else:
                        data = message
                        
                    # Create WSMessage
                    ws_message = WSMessage(
                        channel=data.get('channel', 'unknown'),
                        data=data.get('data', data),
                        message_type=data.get('type'),
                        sequence=data.get('sequence')
                    )
                    
                    if self.on_message:
                        try:
                            self.on_message(ws_message)
                        except Exception as e:
                            logger.error(f"Error in message callback: {e}")
                            
                    await self._dispatch_message(ws_message)
                    
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse message: {e}")
                    self._metrics.errors += 1
                except Exception as e:
                    logger.error(f"Error handling message: {e}")
                    self._metrics.errors += 1
                    
        except ConnectionClosed:
            logger.info("WebSocket message stream closed")
        except Exception as e:
            logger.error(f"Error in message handler: {e}")
            raise
            
    async def _dispatch_message(self, message: WSMessage) -> None:
        """Dispatch message to registered handlers."""
        handlers = self._message_handlers.get(message.channel, [])
        for handler in handlers:
            try:
                handler(message.data)
            except Exception as e:
                logger.error(f"Error in message handler for {message.channel}: {e}")
                
    async def _handle_connection_error(self, error: Exception) -> None:
        """Handle connection error."""
        self._connection_state = ConnectionState.ERROR
        self._metrics.errors += 1
        
        if self.on_error:
            try:
                self.on_error(error)
            except Exception as e:
                logger.error(f"Error in error callback: {e}")
                
    async def _handle_disconnect(self, close_info: WSCloseInfo) -> None:
        """Handle WebSocket disconnect."""
        self._connection_state = ConnectionState.DISCONNECTED
        
        if self.on_disconnect:
            try:
                self.on_disconnect(close_info)
            except Exception as e:
                logger.error(f"Error in disconnect callback: {e}")
                
    async def _resubscribe_all(self) -> None:
        """Resubscribe to all active subscriptions."""
        logger.info(f"Resubscribing to {len(self._subscriptions)} subscriptions")
        
        for sub_key, subscription in self._subscriptions.items():
            try:
                await self._send_subscription(subscription, subscribe=True)
            except Exception as e:
                logger.error(f"Failed to resubscribe to {sub_key}: {e}")
                
    async def _send_subscription(
        self,
        subscription: CommonSubscriptionType,
        subscribe: bool = True
    ) -> None:
        """Send subscription/unsubscription message."""
        if not self.is_connected:
            raise NetworkError("WebSocket not connected")
            
        message = {
            'method': 'subscribe' if subscribe else 'unsubscribe',
            'subscription': subscription.dict()
        }
        
        await self.send_message(message)
        
    async def send_message(self, message: Dict[str, Any]) -> None:
        """Send message to WebSocket."""
        if not self.is_connected or not self._websocket:
            raise NetworkError("WebSocket not connected")
            
        try:
            message_str = json.dumps(message)
            await self._websocket.send(message_str)
            
            self._metrics.messages_sent += 1
            self._metrics.bytes_sent += len(message_str)
            
        except ConnectionClosed:
            logger.error("WebSocket connection closed while sending message")
            raise NetworkError("Connection closed")
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            raise
            
    async def subscribe(
        self,
        subscription: CommonSubscriptionType,
        handler: Optional[Callable[[Any], None]] = None
    ) -> str:
        """Subscribe to data stream."""
        sub_key = self._generate_subscription_key(subscription)
        
        self._subscriptions[sub_key] = subscription
        
        if handler:
            if sub_key not in self._message_handlers:
                self._message_handlers[sub_key] = []
            self._message_handlers[sub_key].append(handler)
            
        if self.is_connected:
            await self._send_subscription(subscription, subscribe=True)
            
        self._metrics.active_subscriptions += 1
        logger.info(f"Subscribed to {sub_key}")
        
        return sub_key
        
    async def unsubscribe(self, subscription_key: str) -> None:
        """Unsubscribe from data stream."""
        if subscription_key not in self._subscriptions:
            logger.warning(f"Subscription {subscription_key} not found")
            return
            
        subscription = self._subscriptions[subscription_key]
        
        if self.is_connected:
            await self._send_subscription(subscription, subscribe=False)
            
        del self._subscriptions[subscription_key]
        if subscription_key in self._message_handlers:
            del self._message_handlers[subscription_key]
            
        self._metrics.active_subscriptions = max(0, self._metrics.active_subscriptions - 1)
        logger.info(f"Unsubscribed from {subscription_key}")
        
    def _generate_subscription_key(self, subscription: CommonSubscriptionType) -> str:
        """Generate unique subscription key."""
        parts = [subscription.type]
        
        if hasattr(subscription, 'coin') and subscription.coin:
            parts.append(subscription.coin)
        if hasattr(subscription, 'user') and subscription.user:
            parts.append(subscription.user)
        if hasattr(subscription, 'interval') and subscription.interval:
            parts.append(subscription.interval)
            
        return ':'.join(parts)
