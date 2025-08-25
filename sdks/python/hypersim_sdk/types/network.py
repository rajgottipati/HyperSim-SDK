"""
Network-related types and configurations.
"""

from enum import Enum
from typing import Dict, Optional
from pydantic import BaseModel, Field, ConfigDict


class Network(str, Enum):
    """Supported networks."""
    MAINNET = "mainnet"
    TESTNET = "testnet"


class BlockType(str, Enum):
    """HyperEVM block types."""
    SMALL = "small"  # Up to 2M gas, 1 second intervals
    LARGE = "large"  # Up to 30M gas, 1 minute intervals


class NetworkConfig(BaseModel):
    """Network configuration."""
    model_config = ConfigDict(frozen=True)
    
    display_name: str = Field(..., description="Human-readable network name")
    chain_id: int = Field(..., description="Chain ID")
    rpc_url: str = Field(..., description="RPC endpoint URL")
    ws_url: str = Field(..., description="WebSocket endpoint URL")
    explorer_url: str = Field(..., description="Block explorer URL")
    hypercore_endpoint: str = Field(..., description="HyperCore API endpoint")
    small_block_gas_limit: int = Field(default=2_000_000, description="Small block gas limit")
    large_block_gas_limit: int = Field(default=30_000_000, description="Large block gas limit")
    small_block_interval: int = Field(default=1, description="Small block interval in seconds")
    large_block_interval: int = Field(default=60, description="Large block interval in seconds")


class NetworkStatus(BaseModel):
    """Current network status."""
    
    network: Network = Field(..., description="Network identifier")
    latest_block: int = Field(..., description="Latest block number")
    gas_price: str = Field(..., description="Current gas price in wei")
    is_healthy: bool = Field(..., description="Network health status")
    avg_block_time: float = Field(..., description="Average block time in seconds")
    congestion_level: str = Field(..., description="Network congestion level", pattern="^(LOW|MEDIUM|HIGH)$")


class BlockInfo(BaseModel):
    """Block information."""
    
    number: int = Field(..., description="Block number")
    hash: str = Field(..., description="Block hash")
    type: BlockType = Field(..., description="Block type")
    timestamp: int = Field(..., description="Block timestamp")
    gas_limit: str = Field(..., description="Gas limit")
    gas_used: str = Field(..., description="Gas used")
    transaction_count: int = Field(..., description="Number of transactions")


# Network configurations
NETWORK_CONFIGS: Dict[Network, NetworkConfig] = {
    Network.MAINNET: NetworkConfig(
        display_name="HyperEVM Mainnet",
        chain_id=1,  # Assuming mainnet chain ID
        rpc_url="https://rpc.hyperliquid.xyz",
        ws_url="wss://api.hyperliquid.xyz/ws",
        explorer_url="https://explorer.hyperliquid.xyz",
        hypercore_endpoint="https://api.hyperliquid.xyz/info"
    ),
    Network.TESTNET: NetworkConfig(
        display_name="HyperEVM Testnet",
        chain_id=421614,  # Assuming testnet chain ID
        rpc_url="https://testnet-rpc.hyperliquid.xyz",
        ws_url="wss://testnet-api.hyperliquid.xyz/ws",
        explorer_url="https://testnet-explorer.hyperliquid.xyz",
        hypercore_endpoint="https://testnet-api.hyperliquid.xyz/info"
    )
}


def get_network_config(network: Network) -> NetworkConfig:
    """Get network configuration.
    
    Args:
        network: Network to get configuration for
        
    Returns:
        NetworkConfig: Network configuration
        
    Raises:
        ValueError: If network is not supported
    """
    if network not in NETWORK_CONFIGS:
        raise ValueError(f"Unsupported network: {network}")
    return NETWORK_CONFIGS[network]
