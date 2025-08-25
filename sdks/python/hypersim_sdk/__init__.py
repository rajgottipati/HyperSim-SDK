"""
HyperSim SDK - Python SDK for HyperEVM Transaction Simulation

The first SDK that makes HyperEVM transaction simulation developer-friendly
with AI-powered analysis and cross-layer HyperCore integration.

Features:
- Transaction simulation with failure prediction
- Cross-layer HyperCore integration
- AI-powered transaction analysis and optimization
- WebSocket streaming for real-time data
- Plugin system for extensibility
- Dual-block system support
- Production-ready error handling

Example:
    >>> import asyncio
    >>> from hypersim_sdk import HyperSimSDK, Network, TransactionRequest
    >>>
    >>> async def main():
    ...     sdk = HyperSimSDK(
    ...         network=Network.MAINNET,
    ...         ai_enabled=True,
    ...         openai_api_key="your-key"
    ...     )
    ...     
    ...     transaction = TransactionRequest(
    ...         from_address="0x...",
    ...         to="0x...",
    ...         value="1000000000000000000"
    ...     )
    ...     
    ...     result = await sdk.simulate(transaction)
    ...     print(f"Success: {result.success}")
    ...     
    ...     await sdk.shutdown()
    >>>
    >>> asyncio.run(main())

Author: MiniMax Agent
Version: 1.0.0
"""

from hypersim_sdk.core.hypersim_sdk import HyperSimSDK, HyperSimConfig
from hypersim_sdk.types.network import Network, BlockType, NetworkConfig
from hypersim_sdk.types.simulation import (
    TransactionRequest,
    SimulationResult,
    BundleOptimization,
    ExecutionTrace,
    StateChange,
    SimulationEvent,
    HyperCoreData,
    Position,
    MarketData
)
from hypersim_sdk.types.ai import (
    AIInsights,
    RiskLevel,
    GasOptimization,
    OptimizationTechnique
)
from hypersim_sdk.types.websocket import (
    WSSubscription,
    WSMessage,
    SubscriptionType,
    ConnectionState
)
from hypersim_sdk.types.errors import (
    HyperSimError,
    ValidationError,
    SimulationError,
    NetworkError,
    AIAnalysisError,
    TimeoutError,
    RateLimitError,
    ConfigurationError
)
from hypersim_sdk.clients.hyperevm_client import HyperEVMClient
from hypersim_sdk.clients.hypercore_client import HyperCoreClient
from hypersim_sdk.clients.websocket_client import WebSocketClient
from hypersim_sdk.ai.ai_analyzer import AIAnalyzer
from hypersim_sdk.plugins import Plugin, PluginConfig, hook

# Version information
__version__ = "1.0.0"
__author__ = "MiniMax Agent"
__email__ = "agent@minimax.com"
__license__ = "MIT"

# All exported symbols
__all__ = [
    # Core SDK
    "HyperSimSDK",
    "HyperSimConfig",
    
    # Network types
    "Network",
    "BlockType",
    "NetworkConfig",
    
    # Simulation types
    "TransactionRequest",
    "SimulationResult",
    "BundleOptimization",
    "ExecutionTrace",
    "StateChange",
    "SimulationEvent",
    "HyperCoreData",
    "Position",
    "MarketData",
    
    # AI types
    "AIInsights",
    "RiskLevel",
    "GasOptimization",
    "OptimizationTechnique",
    
    # WebSocket types
    "WSSubscription",
    "WSMessage",
    "SubscriptionType",
    "ConnectionState",
    
    # Error types
    "HyperSimError",
    "ValidationError",
    "SimulationError",
    "NetworkError",
    "AIAnalysisError",
    "TimeoutError",
    "RateLimitError",
    "ConfigurationError",
    
    # Clients
    "HyperEVMClient",
    "HyperCoreClient",
    "WebSocketClient",
    
    # AI
    "AIAnalyzer",
    
    # Plugins
    "Plugin",
    "PluginConfig",
    "hook",
    
    # Version info
    "__version__",
    "__author__",
    "__license__"
]
