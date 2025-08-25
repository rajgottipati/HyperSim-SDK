"""
Utils package initialization.
"""

from .validators import *
from .formatters import *
from .constants import *

__all__ = [
    # Validators
    "validate_ethereum_address",
    "validate_hex_string",
    "validate_numeric_string",
    "validate_positive_integer",
    "validate_network",
    "validate_transaction_request",
    "validate_gas_limit",
    "validate_openai_api_key",
    "validate_config_dict",
    "sanitize_address",
    "normalize_hex_string",
    
    # Formatters
    "format_wei_to_ether",
    "format_ether_to_wei",
    "format_gas_price_gwei",
    "format_transaction_for_display",
    "format_simulation_result_summary",
    "format_block_type_info",
    "format_address_short",
    "format_timestamp",
    "format_json_compact",
    "format_json_pretty",
    "format_bytes_size",
    "format_percentage",
    "format_duration",
    "format_number_compact",
    
    # Constants
    "SDK_VERSION",
    "SDK_NAME",
    "USER_AGENT",
    "NETWORK_CONFIGS",
    "HYPERCORE_ENDPOINTS",
    "DEFAULT_RETRY_CONFIG",
    "DEFAULT_CONNECTION_POOL_CONFIG",
    "DEFAULT_CIRCUIT_BREAKER_CONFIG",
    "DEFAULT_RATE_LIMITER_CONFIG",
    "GAS_CONSTANTS",
    "TRANSACTION_CONSTANTS",
    "WEBSOCKET_CONSTANTS",
    "AI_CONSTANTS",
    "CACHE_CONSTANTS",
    "HTTP_CONSTANTS",
    "LOG_CONSTANTS",
    "PLUGIN_CONSTANTS",
    "ERROR_CODES",
    "HTTP_STATUS_CODES",
    "PRECOMPILE_ADDRESSES",
    "COMMON_SELECTORS"
]
