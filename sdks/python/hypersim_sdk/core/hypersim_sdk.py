"""
Main HyperSim SDK class with AsyncIO patterns and comprehensive functionality.
"""

import asyncio
import uuid
from typing import Optional, List, Dict, Any, Callable, Union
from contextlib import asynccontextmanager
from dataclasses import dataclass, field

from ..types.network import Network, get_network_config
from ..types.simulation import (
    TransactionRequest, SimulationResult, BundleOptimization
)
from ..types.ai import AIInsights, RiskLevel, AIConfig
from ..types.websocket import (
    WSSubscription, WSMessage, ConnectionState, WSCloseInfo
)
from ..types.errors import (
    ValidationError, SimulationError, NetworkError, AIAnalysisError,
    ConfigurationError
)
from ..clients.hyperevm_client import HyperEVMClient
from ..clients.hypercore_client import HyperCoreClient
from ..clients.websocket_client import WebSocketClient
from ..ai.ai_analyzer import AIAnalyzer
from ..plugins.plugin_system import PluginSystem, HookType, HookContext, PluginConfig
from ..utils.validators import (
    validate_network, validate_transaction_request, validate_openai_api_key
)
from ..utils.constants import SDK_VERSION
from ..security.security_manager import SecurityManager
from ..security.types import SecurityConfig


@dataclass
class HyperSimConfig:
    """Configuration for HyperSim SDK."""
    
    # Core configuration
    network: Network
    
    # AI configuration
    ai_enabled: bool = True
    openai_api_key: Optional[str] = None
    
    # Network configuration
    rpc_endpoint: Optional[str] = None
    timeout: float = 30.0
    
    # Cross-layer integration
    cross_layer_enabled: bool = True
    
    # WebSocket streaming
    streaming_enabled: bool = False
    ws_endpoint: Optional[str] = None
    
    # Plugin configuration
    plugins: List[PluginConfig] = field(default_factory=list)
    
    # Security configuration
    security_enabled: bool = True
    security_config: Optional[SecurityConfig] = None
    
    # Debug and logging
    debug: bool = False
    
    def __post_init__(self):
        """Validate configuration after initialization."""
        self.network = validate_network(self.network)
        
        if self.ai_enabled and not self.openai_api_key:
            raise ConfigurationError(
                "OpenAI API key required when AI features are enabled"
            )
        
        if self.openai_api_key:
            validate_openai_api_key(self.openai_api_key)
        
        if self.timeout <= 0:
            raise ConfigurationError("Timeout must be positive")


class HyperSimSDK:
    """Main SDK class for HyperEVM transaction simulation with AsyncIO.
    
    Provides comprehensive transaction simulation capabilities with:
    - Real HyperEVM network integration
    - Cross-layer HyperCore data access  
    - AI-powered analysis and optimization
    - WebSocket streaming for real-time data
    - Plugin system for extensibility
    - Production-ready error handling
    """
    
    def __init__(self, config: Union[HyperSimConfig, Dict[str, Any]]) -> None:
        """Initialize HyperSim SDK.
        
        Args:
            config: SDK configuration
            
        Raises:
            ConfigurationError: If configuration is invalid
        """
        # Handle dict config
        if isinstance(config, dict):
            config = HyperSimConfig(**config)
        
        self.config = config
        self.network_config = get_network_config(config.network)
        self._request_counter = 0
        self._initialized = False
        
        # Initialize clients
        self._hyperevm_client = HyperEVMClient(
            network=config.network,
            rpc_endpoint=config.rpc_endpoint,
            timeout=config.timeout,
            debug=config.debug
        )
        
        self._hypercore_client = HyperCoreClient(
            network=config.network,
            timeout=config.timeout,
            enabled=config.cross_layer_enabled,
            debug=config.debug
        )
        
        # Initialize WebSocket client if streaming is enabled
        self._websocket_client: Optional[WebSocketClient] = None
        if config.streaming_enabled:
            self._websocket_client = WebSocketClient(
                network=config.network,
                ws_endpoint=config.ws_endpoint,
                debug=config.debug
            )
            self._setup_websocket_handlers()
        
        # Initialize AI analyzer if enabled
        self._ai_analyzer: Optional[AIAnalyzer] = None
        if config.ai_enabled and config.openai_api_key:
            ai_config = AIConfig(
                api_key=config.openai_api_key,
                debug=config.debug
            )
            self._ai_analyzer = AIAnalyzer(ai_config)
        
        # Initialize plugin system
        self._plugin_system = PluginSystem(debug=config.debug)
        
        # Initialize security manager if enabled
        self._security_manager: Optional[SecurityManager] = None
        if config.security_enabled:
            security_config = config.security_config or SecurityConfig()
            self._security_manager = SecurityManager(security_config)
        
        # Event callbacks
        self._message_callbacks: List[Callable[[WSMessage], Any]] = []
        self._connection_callbacks: List[Callable[[ConnectionState], Any]] = []
        self._error_callbacks: List[Callable[[Exception], Any]] = []
        
        if config.debug:
            print(f"[HyperSim SDK] Initialized v{SDK_VERSION} for {config.network}")
            print(f"[HyperSim SDK] Features: AI={config.ai_enabled}, "
                  f"Streaming={config.streaming_enabled}, "
                  f"CrossLayer={config.cross_layer_enabled}")
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.shutdown()
    
    async def initialize(self) -> None:
        """Initialize the SDK and all components.
        
        Raises:
            ConfigurationError: If initialization fails
        """
        if self._initialized:
            return
        
        try:
            # Initialize plugin system
            await self._initialize_plugins()
            
            # Initialize plugin system
            await self._plugin_system.initialize()
            
            # Initialize security manager
            if self._security_manager:
                await self._security_manager.initialize()
            
            self._initialized = True
            
            if self.config.debug:
                print("[HyperSim SDK] Initialization complete")
        
        except Exception as error:
            raise ConfigurationError(f"SDK initialization failed: {error}")
    
    async def shutdown(self) -> None:
        """Shutdown the SDK and cleanup resources."""
        if not self._initialized:
            return
        
        try:
            # Disconnect WebSocket
            if self._websocket_client:
                await self._websocket_client.disconnect()
            
            # Close AI analyzer
            if self._ai_analyzer:
                await self._ai_analyzer.close()
            
            # Shutdown plugin system
            await self._plugin_system.shutdown()
            
            # Shutdown security manager
            if self._security_manager:
                await self._security_manager.shutdown()
            
            # Close clients
            await self._hyperevm_client.close()
            await self._hypercore_client.close()
            
            self._initialized = False
            
            if self.config.debug:
                print("[HyperSim SDK] Shutdown complete")
        
        except Exception as error:
            if self.config.debug:
                print(f"[HyperSim SDK] Shutdown error: {error}")
    
    async def simulate(self, transaction: TransactionRequest) -> SimulationResult:
        """Simulate a transaction on HyperEVM.
        
        Args:
            transaction: Transaction to simulate
            
        Returns:
            SimulationResult: Simulation result with success/failure prediction
            
        Raises:
            ValidationError: If transaction is invalid
            SimulationError: If simulation fails
        """
        if not self._initialized:
            await self.initialize()
        
        request_id = self._generate_request_id()
        
        try:
            validate_transaction_request(transaction)
            
            # Execute before-simulation hooks
            context = HookContext(
                request_id=request_id,
                timestamp=asyncio.get_event_loop().time(),
                data=transaction
            )
            
            context = await self._plugin_system.execute_hooks(
                HookType.BEFORE_SIMULATION, context, transaction
            )
            
            if context.should_halt():
                # Return cached result if available
                if hasattr(context, 'cached_result'):
                    return context.cached_result
            
            if self.config.debug:
                print(f"[HyperSim SDK] Starting simulation {request_id}")
            
            # Perform simulation
            simulation_result = await self._hyperevm_client.simulate(transaction)
            
            # Fetch cross-layer data if enabled
            if (self.config.cross_layer_enabled and 
                simulation_result.success and 
                self._hypercore_client.is_enabled()):
                
                hypercore_data = await self._hypercore_client.get_relevant_data(transaction)
                if hypercore_data:
                    simulation_result.hypercore_data = hypercore_data
            
            # Execute after-simulation hooks
            context = HookContext(
                request_id=request_id,
                timestamp=asyncio.get_event_loop().time(),
                data=simulation_result
            )
            
            await self._plugin_system.execute_hooks(
                HookType.AFTER_SIMULATION, context, simulation_result
            )
            
            if self.config.debug:
                print(f"[HyperSim SDK] Simulation {request_id} completed: {simulation_result.success}")
            
            return simulation_result
        
        except Exception as error:
            # Execute error hooks
            error_context = HookContext(
                request_id=request_id,
                timestamp=asyncio.get_event_loop().time(),
                data=error
            )
            
            await self._plugin_system.execute_hooks(
                HookType.ON_ERROR, error_context, error
            )
            
            # Notify error callbacks
            await self._notify_error_callbacks(error)
            
            if isinstance(error, ValidationError):
                raise error
            
            raise SimulationError(f"Simulation failed: {error}")
    
    async def get_ai_insights(self, simulation_result: SimulationResult) -> AIInsights:
        """Get AI-powered insights for a simulation result.
        
        Args:
            simulation_result: Result from simulate() method
            
        Returns:
            AIInsights: AI analysis with optimization suggestions and risk assessment
            
        Raises:
            ConfigurationError: If AI features not enabled
            AIAnalysisError: If analysis fails
        """
        if not self._ai_analyzer:
            raise ConfigurationError(
                "AI features not enabled. Initialize with ai_enabled=True and provide openai_api_key"
            )
        
        request_id = self._generate_request_id()
        
        try:
            # Execute before-ai-analysis hooks
            context = HookContext(
                request_id=request_id,
                timestamp=asyncio.get_event_loop().time(),
                data=simulation_result
            )
            
            await self._plugin_system.execute_hooks(
                HookType.BEFORE_AI_ANALYSIS, context, simulation_result
            )
            
            # Perform AI analysis
            insights = await self._ai_analyzer.analyze_simulation(simulation_result)
            
            # Execute after-ai-analysis hooks
            context = HookContext(
                request_id=request_id,
                timestamp=asyncio.get_event_loop().time(),
                data=insights
            )
            
            await self._plugin_system.execute_hooks(
                HookType.AFTER_AI_ANALYSIS, context, insights
            )
            
            return insights
        
        except Exception as error:
            # Execute error hooks
            error_context = HookContext(
                request_id=request_id,
                timestamp=asyncio.get_event_loop().time(),
                data=error
            )
            
            await self._plugin_system.execute_hooks(
                HookType.ON_ERROR, error_context, error
            )
            
            raise AIAnalysisError(f"AI analysis failed: {error}")
    
    async def optimize_bundle(self, transactions: List[TransactionRequest]) -> BundleOptimization:
        """Optimize a bundle of transactions.
        
        Args:
            transactions: List of transactions to optimize
            
        Returns:
            BundleOptimization: Optimization suggestions including gas savings
            
        Raises:
            ValidationError: If transaction bundle is invalid
            SimulationError: If optimization fails
        """
        if not transactions:
            raise ValidationError("Transaction bundle cannot be empty")
        
        try:
            # Simulate each transaction
            simulations = []
            for transaction in transactions:
                result = await self.simulate(transaction)
                simulations.append(result)
            
            # Optimize bundle with AI if available
            if self._ai_analyzer:
                return await self._ai_analyzer.optimize_bundle(simulations)
            else:
                # Basic optimization without AI
                return self._basic_bundle_optimization(simulations)
        
        except Exception as error:
            raise SimulationError(f"Bundle optimization failed: {error}")
    
    async def assess_risk(self, transaction: TransactionRequest) -> Dict[str, Any]:
        """Assess risk level for a transaction.
        
        Args:
            transaction: Transaction to assess
            
        Returns:
            Dict containing risk level and factors
        """
        simulation = await self.simulate(transaction)
        
        if self._ai_analyzer:
            insights = await self._ai_analyzer.analyze_simulation(simulation)
            return {
                "risk_level": insights.risk_level,
                "factors": insights.security_warnings,
                "confidence": insights.confidence,
                "recommendations": insights.recommendations
            }
        else:
            # Basic risk assessment without AI
            return self._basic_risk_assessment(simulation)
    
    async def get_network_status(self) -> Dict[str, Any]:
        """Get network status and health metrics.
        
        Returns:
            Dict containing network status information
        """
        if not self._initialized:
            await self.initialize()
        
        return await self._hyperevm_client.get_network_status()
    
    # WebSocket streaming methods
    
    async def connect_websocket(self) -> None:
        """Connect to WebSocket for real-time data.
        
        Raises:
            ConfigurationError: If WebSocket streaming not enabled
        """
        if not self._websocket_client:
            raise ConfigurationError(
                "WebSocket streaming not enabled. Initialize with streaming_enabled=True"
            )
        
        await self._websocket_client.connect()
    
    async def disconnect_websocket(self) -> None:
        """Disconnect WebSocket."""
        if self._websocket_client:
            await self._websocket_client.disconnect()
    
    async def subscribe(self, subscription: WSSubscription) -> None:
        """Subscribe to real-time data stream.
        
        Args:
            subscription: Subscription details
            
        Raises:
            ConfigurationError: If WebSocket streaming not enabled
        """
        if not self._websocket_client:
            raise ConfigurationError("WebSocket streaming not enabled")
        
        await self._websocket_client.subscribe(subscription)
    
    async def unsubscribe(self, subscription: WSSubscription) -> None:
        """Unsubscribe from data stream.
        
        Args:
            subscription: Subscription to remove
        """
        if self._websocket_client:
            await self._websocket_client.unsubscribe(subscription)
    
    @property
    def is_websocket_connected(self) -> bool:
        """Check WebSocket connection status.
        
        Returns:
            bool: True if connected, False otherwise
        """
        return self._websocket_client.is_connected if self._websocket_client else False
    
    # Event handlers
    
    def on_message(self, callback: Callable[[WSMessage], Any]) -> None:
        """Register WebSocket message callback.
        
        Args:
            callback: Message handler function
        """
        self._message_callbacks.append(callback)
        if self._websocket_client:
            self._websocket_client.on_message(callback)
    
    def on_connection_state_change(self, callback: Callable[[ConnectionState], Any]) -> None:
        """Register connection state change callback.
        
        Args:
            callback: State change handler function
        """
        self._connection_callbacks.append(callback)
    
    def on_error(self, callback: Callable[[Exception], Any]) -> None:
        """Register error callback.
        
        Args:
            callback: Error handler function
        """
        self._error_callbacks.append(callback)
    
    # Plugin system methods
    
    async def add_plugin(self, plugin_config: PluginConfig) -> None:
        """Add a plugin at runtime.
        
        Args:
            plugin_config: Plugin configuration
        """
        await self._plugin_system.register_plugin(plugin_config)
    
    async def remove_plugin(self, plugin_name: str) -> None:
        """Remove a plugin.
        
        Args:
            plugin_name: Name of plugin to remove
        """
        await self._plugin_system.unregister_plugin(plugin_name)
    
    def get_plugins(self) -> List[Dict[str, Any]]:
        """Get list of registered plugins.
        
        Returns:
            List of plugin information dictionaries
        """
        return self._plugin_system.get_plugins()
    
    async def enable_plugin(self, plugin_name: str) -> None:
        """Enable a plugin.
        
        Args:
            plugin_name: Name of plugin to enable
        """
        await self._plugin_system.enable_plugin(plugin_name)
    
    async def disable_plugin(self, plugin_name: str) -> None:
        """Disable a plugin.
        
        Args:
            plugin_name: Name of plugin to disable
        """
        await self._plugin_system.disable_plugin(plugin_name)
    
    # Context manager for streaming
    
    @asynccontextmanager
    async def streaming_context(self):
        """Context manager for WebSocket streaming.
        
        Usage:
            async with sdk.streaming_context():
                await sdk.subscribe(subscription)
                # Handle messages
        """
        if not self._websocket_client:
            raise ConfigurationError("WebSocket streaming not enabled")
        
        await self._websocket_client.connect()
        try:
            yield self._websocket_client
        finally:
            await self._websocket_client.disconnect()
    
    # Private methods
    
    def _generate_request_id(self) -> str:
        """Generate unique request ID."""
        self._request_counter += 1
        return f"req_{int(asyncio.get_event_loop().time())}_{self._request_counter}"
    
    async def _initialize_plugins(self) -> None:
        """Initialize configured plugins."""
        for plugin_config in self.config.plugins:
            try:
                await self._plugin_system.register_plugin(plugin_config)
            except Exception as error:
                if self.config.debug:
                    print(f"[HyperSim SDK] Failed to register plugin '{plugin_config.plugin.name}': {error}")
    
    def _setup_websocket_handlers(self) -> None:
        """Setup WebSocket event handlers."""
        if not self._websocket_client:
            return
        
        async def on_state_change(state: ConnectionState) -> None:
            await self._notify_connection_callbacks(state)
            
            if state == ConnectionState.CONNECTED:
                context = HookContext(
                    request_id="ws_connect",
                    timestamp=asyncio.get_event_loop().time()
                )
                await self._plugin_system.execute_hooks(HookType.ON_CONNECT, context)
            
            elif state == ConnectionState.DISCONNECTED:
                context = HookContext(
                    request_id="ws_disconnect",
                    timestamp=asyncio.get_event_loop().time()
                )
                await self._plugin_system.execute_hooks(HookType.ON_DISCONNECT, context)
        
        async def on_ws_error(error) -> None:
            await self._notify_error_callbacks(Exception(f"WebSocket error: {error}"))
        
        # Note: WebSocket client handlers would be set up here
        # This is simplified for the example
    
    def _basic_bundle_optimization(self, simulations: List[SimulationResult]) -> BundleOptimization:
        """Basic bundle optimization without AI."""
        total_gas = sum(int(sim.gas_used) for sim in simulations)
        
        return BundleOptimization(
            original_gas=str(total_gas),
            optimized_gas=str(total_gas),  # No optimization without AI
            gas_saved="0",
            suggestions=["Enable AI features for advanced bundle optimization"],
            reordered_indices=list(range(len(simulations)))  # No reordering
        )
    
    def _basic_risk_assessment(self, simulation: SimulationResult) -> Dict[str, Any]:
        """Basic risk assessment without AI."""
        factors = []
        risk_level = RiskLevel.LOW
        
        if not simulation.success:
            factors.append("Transaction simulation failed")
            risk_level = RiskLevel.HIGH
        
        if int(simulation.gas_used) > 1_000_000:
            factors.append("High gas usage detected")
            if risk_level == RiskLevel.LOW:
                risk_level = RiskLevel.MEDIUM
        
        return {
            "risk_level": risk_level,
            "factors": factors,
            "confidence": 0.6,  # Lower confidence without AI
            "recommendations": ["Enable AI features for detailed risk analysis"]
        }
    
    async def _notify_connection_callbacks(self, state: ConnectionState) -> None:
        """Notify connection state change callbacks."""
        for callback in self._connection_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(state)
                else:
                    callback(state)
            except Exception as error:
                if self.config.debug:
                    print(f"[HyperSim SDK] Connection callback error: {error}")
    
    async def _notify_error_callbacks(self, error: Exception) -> None:
        """Notify error callbacks."""
        for callback in self._error_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(error)
                else:
                    callback(error)
            except Exception as cb_error:
                if self.config.debug:
                    print(f"[HyperSim SDK] Error callback error: {cb_error}")
    
    # Properties
    
    @property
    def version(self) -> str:
        """Get SDK version."""
        return SDK_VERSION
    
    @property
    def network(self) -> Network:
        """Get target network."""
        return self.config.network
    
    @property
    def is_ai_enabled(self) -> bool:
        """Check if AI features are enabled."""
        return self._ai_analyzer is not None
    
    @property
    def is_streaming_enabled(self) -> bool:
        """Check if WebSocket streaming is enabled."""
        return self._websocket_client is not None
    
    @property
    def is_security_enabled(self) -> bool:
        """Check if security features are enabled."""
        return self._security_manager is not None
    
    @property
    def security(self) -> Optional[SecurityManager]:
        """Get security manager instance."""
        return self._security_manager
    
    async def secure_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Process and secure an outgoing request."""
        if not self._security_manager:
            raise ConfigurationError("Security manager not enabled")
        return await self._security_manager.secure_request(request)
    
    async def get_security_metrics(self) -> Dict[str, Any]:
        """Get security metrics."""
        if not self._security_manager:
            return {}
        return self._security_manager.get_metrics().__dict__
    
    async def rotate_api_keys(self) -> None:
        """Manually rotate API keys."""
        if self._security_manager:
            await self._security_manager.get_api_key_manager().force_rotation()
    
    @property
    def is_cross_layer_enabled(self) -> bool:
        """Check if cross-layer integration is enabled."""
        return self._hypercore_client.is_enabled()
