"""
Constant values used throughout the SDK.
"""

from typing import Dict, Any
from ..types.network import Network, NetworkConfig
from ..types.common import RetryConfig, ConnectionPoolConfig, CircuitBreakerConfig, RateLimiterConfig

# Version information
SDK_VERSION = "1.0.0"
SDK_NAME = "hypersim-sdk"
USER_AGENT = f"{SDK_NAME}/{SDK_VERSION} (Python)"

# Network configurations
NETWORK_CONFIGS: Dict[Network, NetworkConfig] = {
    Network.MAINNET: NetworkConfig(
        display_name="HyperEVM Mainnet",
        chain_id=998,  # HyperEVM mainnet chain ID
        rpc_url="https://rpc.hyperliquid.xyz",
        ws_url="wss://api.hyperliquid.xyz/ws",
        explorer_url="https://explorer.hyperliquid.xyz",
        hypercore_endpoint="https://api.hyperliquid.xyz/info",
        small_block_gas_limit=2_000_000,
        large_block_gas_limit=30_000_000,
        small_block_interval=1,
        large_block_interval=60
    ),
    Network.TESTNET: NetworkConfig(
        display_name="HyperEVM Testnet",
        chain_id=99800,  # HyperEVM testnet chain ID  
        rpc_url="https://testnet-rpc.hyperliquid.xyz",
        ws_url="wss://testnet-api.hyperliquid.xyz/ws",
        explorer_url="https://testnet-explorer.hyperliquid.xyz",
        hypercore_endpoint="https://testnet-api.hyperliquid.xyz/info",
        small_block_gas_limit=2_000_000,
        large_block_gas_limit=30_000_000,
        small_block_interval=1,
        large_block_interval=60
    )
}

# HyperCore API endpoints
HYPERCORE_ENDPOINTS = {
    Network.MAINNET: {
        "info": "https://api.hyperliquid.xyz/info",
        "exchange": "https://api.hyperliquid.xyz/exchange"
    },
    Network.TESTNET: {
        "info": "https://testnet-api.hyperliquid.xyz/info",
        "exchange": "https://testnet-api.hyperliquid.xyz/exchange"
    }
}

# Default configurations
DEFAULT_RETRY_CONFIG = RetryConfig(
    max_attempts=3,
    initial_delay=1.0,
    max_delay=30.0,
    backoff_multiplier=2.0,
    jitter=True
)

DEFAULT_CONNECTION_POOL_CONFIG = ConnectionPoolConfig(
    max_connections=100,
    connection_timeout=10.0,
    idle_timeout=300.0,
    enabled=True
)

DEFAULT_CIRCUIT_BREAKER_CONFIG = CircuitBreakerConfig(
    failure_threshold=5,
    timeout=60.0,
    monitoring_window=300.0,
    minimum_requests=10
)

DEFAULT_RATE_LIMITER_CONFIG = RateLimiterConfig(
    max_requests=100,
    window_seconds=60.0,
    queue_requests=True,
    max_queue_size=1000
)

# Gas constants
GAS_CONSTANTS = {
    "MIN_GAS_LIMIT": 21000,
    "SMALL_BLOCK_LIMIT": 2_000_000,
    "LARGE_BLOCK_LIMIT": 30_000_000,
    "DEFAULT_GAS_PRICE": "20000000000",  # 20 Gwei
    "MAX_PRIORITY_FEE": "2000000000",     # 2 Gwei
}

# Transaction constants
TRANSACTION_CONSTANTS = {
    "MAX_DATA_SIZE": 1024 * 1024,  # 1 MB
    "MAX_VALUE": "0x" + "f" * 64,   # Max uint256
    "ZERO_ADDRESS": "0x" + "0" * 40,
    "ZERO_HASH": "0x" + "0" * 64,
}

# WebSocket constants
WEBSOCKET_CONSTANTS = {
    "DEFAULT_TIMEOUT": 30.0,
    "MAX_RECONNECT_ATTEMPTS": 10,
    "HEARTBEAT_INTERVAL": 30.0,
    "MESSAGE_QUEUE_SIZE": 1000,
    "MAX_MESSAGE_SIZE": 1024 * 1024,  # 1 MB
    "SUBSCRIPTION_RATE_LIMIT": 1.0,
}

# AI constants
AI_CONSTANTS = {
    "DEFAULT_MODEL": "gpt-4-turbo-preview",
    "MAX_TOKENS": 2000,
    "TEMPERATURE": 0.1,
    "TIMEOUT": 30.0,
    "MAX_RETRIES": 3,
    "RATE_LIMIT_DELAY": 60,
}

# Cache constants
CACHE_CONSTANTS = {
    "DEFAULT_TTL": 300,  # 5 minutes
    "MAX_ENTRIES": 10000,
    "CLEANUP_INTERVAL": 60,  # 1 minute
}

# HTTP constants
HTTP_CONSTANTS = {
    "DEFAULT_TIMEOUT": 30.0,
    "MAX_RETRIES": 3,
    "RETRY_DELAY": 1.0,
    "MAX_RETRY_DELAY": 30.0,
    "BACKOFF_MULTIPLIER": 2.0,
}

# Logging constants
LOG_CONSTANTS = {
    "DEFAULT_LEVEL": "INFO",
    "MAX_LOG_SIZE": 10 * 1024 * 1024,  # 10 MB
    "MAX_LOG_FILES": 5,
    "DATE_FORMAT": "%Y-%m-%d %H:%M:%S",
}

# Plugin constants
PLUGIN_CONSTANTS = {
    "MAX_PLUGINS": 100,
    "HOOK_TIMEOUT": 10.0,
    "MAX_HOOK_EXECUTION_TIME": 30.0,
}

# Error codes
ERROR_CODES = {
    "VALIDATION_ERROR": 1001,
    "NETWORK_ERROR": 1002,
    "SIMULATION_ERROR": 1003,
    "AI_ANALYSIS_ERROR": 1004,
    "WEBSOCKET_ERROR": 1005,
    "PLUGIN_ERROR": 1006,
    "TIMEOUT_ERROR": 1007,
    "RATE_LIMIT_ERROR": 1008,
    "CONFIGURATION_ERROR": 1009,
}

# HTTP status codes for common errors
HTTP_STATUS_CODES = {
    "BAD_REQUEST": 400,
    "UNAUTHORIZED": 401,
    "FORBIDDEN": 403,
    "NOT_FOUND": 404,
    "TOO_MANY_REQUESTS": 429,
    "INTERNAL_SERVER_ERROR": 500,
    "BAD_GATEWAY": 502,
    "SERVICE_UNAVAILABLE": 503,
    "GATEWAY_TIMEOUT": 504,
}

# Precompile addresses (HyperEVM specific)
PRECOMPILE_ADDRESSES = {
    "HYPERCORE_INFO": "0x00000000000000000000000000000000000000fd",
    "HYPERCORE_EXCHANGE": "0x00000000000000000000000000000000000000fe",
    "HYPERCORE_BRIDGE": "0x00000000000000000000000000000000000000ff",
}

# Common contract interfaces (for ABI decoding)
COMMON_SELECTORS = {
    "transfer": "0xa9059cbb",
    "transferFrom": "0x23b872dd",
    "approve": "0x095ea7b3",
    "balanceOf": "0x70a08231",
    "totalSupply": "0x18160ddd",
    "decimals": "0x313ce567",
    "name": "0x06fdde03",
    "symbol": "0x95d89b41",
}
