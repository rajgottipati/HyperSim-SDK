"""
Plugin system foundation for extensibility using Python decorators and hooks.
"""

import asyncio
import inspect
from typing import (
    Dict, List, Any, Optional, Callable, Union, TypeVar, Generic, 
    get_type_hints, Awaitable
)
from abc import ABC, abstractmethod
from functools import wraps
from enum import Enum
from dataclasses import dataclass, field
from ..types.errors import PluginError, ValidationError
from ..types.common import RequestContext, ResponseContext

# Type definitions
T = TypeVar('T')
HookFunction = Union[
    Callable[..., Any],
    Callable[..., Awaitable[Any]]
]


class HookType(str, Enum):
    """Plugin hook types."""
    BEFORE_REQUEST = "before_request"
    AFTER_RESPONSE = "after_response"
    BEFORE_SIMULATION = "before_simulation"
    AFTER_SIMULATION = "after_simulation"
    BEFORE_AI_ANALYSIS = "before_ai_analysis"
    AFTER_AI_ANALYSIS = "after_ai_analysis"
    ON_ERROR = "on_error"
    ON_CONNECT = "on_connect"
    ON_DISCONNECT = "on_disconnect"
    ON_STARTUP = "on_startup"
    ON_SHUTDOWN = "on_shutdown"


@dataclass
class HookContext:
    """Hook execution context."""
    request_id: str
    timestamp: float
    data: Any = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    halt: bool = False
    modified_data: Any = None
    
    def should_halt(self) -> bool:
        """Check if execution should be halted."""
        return self.halt
    
    def set_halt(self, halt: bool = True) -> None:
        """Set halt flag."""
        self.halt = halt


class Plugin(ABC):
    """Abstract base class for plugins."""
    
    def __init__(self) -> None:
        self._hooks: Dict[HookType, List[HookFunction]] = {}
        self._middleware: List[Callable] = []
        self._initialized = False
        self._enabled = True
        self._register_hooks()
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Plugin name."""
        pass
    
    @property
    @abstractmethod
    def version(self) -> str:
        """Plugin version."""
        pass
    
    @property
    def description(self) -> Optional[str]:
        """Plugin description."""
        return None
    
    @property
    def enabled(self) -> bool:
        """Check if plugin is enabled."""
        return self._enabled
    
    def enable(self) -> None:
        """Enable the plugin."""
        self._enabled = True
    
    def disable(self) -> None:
        """Disable the plugin."""
        self._enabled = False
    
    async def initialize(self, plugin_system: 'PluginSystem') -> None:
        """Initialize the plugin."""
        self._initialized = True
    
    async def cleanup(self) -> None:
        """Cleanup resources."""
        self._initialized = False
    
    def _register_hooks(self) -> None:
        """Register hooks by scanning for decorated methods."""
        for attr_name in dir(self):
            attr = getattr(self, attr_name)
            if hasattr(attr, '_hook_types'):
                for hook_type in attr._hook_types:
                    if hook_type not in self._hooks:
                        self._hooks[hook_type] = []
                    self._hooks[hook_type].append(attr)
    
    def get_hooks(self, hook_type: HookType) -> List[HookFunction]:
        """Get hooks for a specific type."""
        return self._hooks.get(hook_type, [])
    
    def has_hook(self, hook_type: HookType) -> bool:
        """Check if plugin has hooks for a specific type."""
        return hook_type in self._hooks and len(self._hooks[hook_type]) > 0


def hook(*hook_types: HookType, priority: int = 10) -> Callable:
    """Decorator to register plugin hook methods.
    
    Args:
        *hook_types: Hook types to register for
        priority: Hook priority (lower = higher priority)
    
    Returns:
        Decorated function
    """
    def decorator(func: Callable) -> Callable:
        func._hook_types = hook_types
        func._hook_priority = priority
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            else:
                return func(*args, **kwargs)
        
        wrapper._hook_types = hook_types
        wrapper._hook_priority = priority
        
        return wrapper
    
    return decorator


def middleware(priority: int = 10) -> Callable:
    """Decorator to register middleware functions.
    
    Args:
        priority: Middleware priority (lower = higher priority)
    
    Returns:
        Decorated function
    """
    def decorator(func: Callable) -> Callable:
        func._is_middleware = True
        func._middleware_priority = priority
        return func
    
    return decorator


@dataclass
class PluginConfig:
    """Plugin configuration."""
    plugin: Plugin
    config: Dict[str, Any] = field(default_factory=dict)
    priority: int = 10
    enabled: bool = True
    auto_initialize: bool = True


@dataclass
class HookRegistration:
    """Hook registration information."""
    plugin_name: str
    function: HookFunction
    priority: int
    hook_type: HookType


class PluginSystem:
    """Plugin system for managing plugins and executing hooks."""
    
    def __init__(self, debug: bool = False) -> None:
        self.debug = debug
        self._plugins: Dict[str, PluginConfig] = {}
        self._hooks: Dict[HookType, List[HookRegistration]] = {
            hook_type: [] for hook_type in HookType
        }
        self._middleware: List[Callable] = []
        self._initialized = False
        self._lock = asyncio.Lock()
    
    async def register_plugin(self, plugin_config: PluginConfig) -> None:
        """Register a plugin.
        
        Args:
            plugin_config: Plugin configuration
            
        Raises:
            PluginError: If plugin registration fails
        """
        async with self._lock:
            plugin = plugin_config.plugin
            
            if plugin.name in self._plugins:
                raise PluginError(f"Plugin '{plugin.name}' is already registered")
            
            # Validate plugin
            if not plugin.name or not plugin.version:
                raise PluginError("Plugin must have name and version")
            
            # Store plugin
            self._plugins[plugin.name] = plugin_config
            
            # Register hooks
            if plugin_config.enabled:
                self._register_plugin_hooks(plugin)
            
            # Initialize if system is already initialized
            if self._initialized and plugin_config.auto_initialize:
                await plugin.initialize(self)
            
            if self.debug:
                print(f"[Plugin System] Registered plugin: {plugin.name} v{plugin.version}")
    
    async def unregister_plugin(self, plugin_name: str) -> None:
        """Unregister a plugin.
        
        Args:
            plugin_name: Name of plugin to unregister
            
        Raises:
            PluginError: If plugin is not found
        """
        async with self._lock:
            if plugin_name not in self._plugins:
                raise PluginError(f"Plugin '{plugin_name}' is not registered")
            
            plugin_config = self._plugins[plugin_name]
            plugin = plugin_config.plugin
            
            # Cleanup plugin
            await plugin.cleanup()
            
            # Remove hooks
            self._unregister_plugin_hooks(plugin_name)
            
            # Remove plugin
            del self._plugins[plugin_name]
            
            if self.debug:
                print(f"[Plugin System] Unregistered plugin: {plugin_name}")
    
    async def enable_plugin(self, plugin_name: str) -> None:
        """Enable a plugin.
        
        Args:
            plugin_name: Name of plugin to enable
        """
        async with self._lock:
            if plugin_name not in self._plugins:
                raise PluginError(f"Plugin '{plugin_name}' is not registered")
            
            plugin_config = self._plugins[plugin_name]
            
            if plugin_config.enabled:
                return  # Already enabled
            
            plugin_config.enabled = True
            plugin_config.plugin.enable()
            
            # Register hooks
            self._register_plugin_hooks(plugin_config.plugin)
            
            # Initialize if system is initialized
            if self._initialized:
                await plugin_config.plugin.initialize(self)
            
            if self.debug:
                print(f"[Plugin System] Enabled plugin: {plugin_name}")
    
    async def disable_plugin(self, plugin_name: str) -> None:
        """Disable a plugin.
        
        Args:
            plugin_name: Name of plugin to disable
        """
        async with self._lock:
            if plugin_name not in self._plugins:
                raise PluginError(f"Plugin '{plugin_name}' is not registered")
            
            plugin_config = self._plugins[plugin_name]
            
            if not plugin_config.enabled:
                return  # Already disabled
            
            plugin_config.enabled = False
            plugin_config.plugin.disable()
            
            # Cleanup plugin
            await plugin_config.plugin.cleanup()
            
            # Remove hooks
            self._unregister_plugin_hooks(plugin_name)
            
            if self.debug:
                print(f"[Plugin System] Disabled plugin: {plugin_name}")
    
    async def execute_hooks(
        self,
        hook_type: HookType,
        context: HookContext,
        *args: Any,
        **kwargs: Any
    ) -> HookContext:
        """Execute all hooks for a specific type.
        
        Args:
            hook_type: Type of hook to execute
            context: Hook execution context
            *args: Additional arguments to pass to hooks
            **kwargs: Additional keyword arguments to pass to hooks
            
        Returns:
            HookContext: Updated context after hook execution
        """
        hooks = self._hooks.get(hook_type, [])
        
        if not hooks:
            return context
        
        # Sort hooks by priority
        sorted_hooks = sorted(hooks, key=lambda h: h.priority)
        
        for hook_reg in sorted_hooks:
            if context.should_halt():
                if self.debug:
                    print(f"[Plugin System] Hook execution halted by plugin: {hook_reg.plugin_name}")
                break
            
            try:
                # Execute hook
                if asyncio.iscoroutinefunction(hook_reg.function):
                    result = await hook_reg.function(context, *args, **kwargs)
                else:
                    result = hook_reg.function(context, *args, **kwargs)
                
                # Update context if result is returned
                if isinstance(result, HookContext):
                    context = result
                
            except Exception as error:
                if self.debug:
                    print(f"[Plugin System] Hook error in plugin '{hook_reg.plugin_name}': {error}")
                
                # Continue execution unless it's a critical error
                if isinstance(error, (KeyboardInterrupt, SystemExit)):
                    raise
        
        return context
    
    async def initialize(self) -> None:
        """Initialize the plugin system."""
        if self._initialized:
            return
        
        self._initialized = True
        
        # Initialize all enabled plugins
        for plugin_config in self._plugins.values():
            if plugin_config.enabled and plugin_config.auto_initialize:
                try:
                    await plugin_config.plugin.initialize(self)
                except Exception as error:
                    if self.debug:
                        print(f"[Plugin System] Failed to initialize plugin '{plugin_config.plugin.name}': {error}")
        
        # Execute startup hooks
        startup_context = HookContext(
            request_id="startup",
            timestamp=asyncio.get_event_loop().time()
        )
        await self.execute_hooks(HookType.ON_STARTUP, startup_context)
        
        if self.debug:
            print(f"[Plugin System] Initialized with {len(self._plugins)} plugins")
    
    async def shutdown(self) -> None:
        """Shutdown the plugin system."""
        if not self._initialized:
            return
        
        # Execute shutdown hooks
        shutdown_context = HookContext(
            request_id="shutdown",
            timestamp=asyncio.get_event_loop().time()
        )
        await self.execute_hooks(HookType.ON_SHUTDOWN, shutdown_context)
        
        # Cleanup all plugins
        for plugin_config in self._plugins.values():
            try:
                await plugin_config.plugin.cleanup()
            except Exception as error:
                if self.debug:
                    print(f"[Plugin System] Failed to cleanup plugin '{plugin_config.plugin.name}': {error}")
        
        self._plugins.clear()
        self._hooks = {hook_type: [] for hook_type in HookType}
        self._middleware.clear()
        self._initialized = False
        
        if self.debug:
            print("[Plugin System] Shutdown complete")
    
    def _register_plugin_hooks(self, plugin: Plugin) -> None:
        """Register hooks for a plugin."""
        for hook_type in HookType:
            hooks = plugin.get_hooks(hook_type)
            for hook_func in hooks:
                priority = getattr(hook_func, '_hook_priority', 10)
                registration = HookRegistration(
                    plugin_name=plugin.name,
                    function=hook_func,
                    priority=priority,
                    hook_type=hook_type
                )
                self._hooks[hook_type].append(registration)
    
    def _unregister_plugin_hooks(self, plugin_name: str) -> None:
        """Unregister all hooks for a plugin."""
        for hook_type in HookType:
            self._hooks[hook_type] = [
                reg for reg in self._hooks[hook_type] 
                if reg.plugin_name != plugin_name
            ]
    
    def get_plugins(self) -> List[Dict[str, Any]]:
        """Get information about registered plugins."""
        return [
            {
                "name": config.plugin.name,
                "version": config.plugin.version,
                "description": config.plugin.description,
                "enabled": config.enabled,
                "priority": config.priority
            }
            for config in self._plugins.values()
        ]
    
    def has_plugin(self, plugin_name: str) -> bool:
        """Check if a plugin is registered."""
        return plugin_name in self._plugins
    
    def is_plugin_enabled(self, plugin_name: str) -> bool:
        """Check if a plugin is enabled."""
        config = self._plugins.get(plugin_name)
        return config.enabled if config else False
    
    def get_plugin_config(self, plugin_name: str) -> Optional[PluginConfig]:
        """Get plugin configuration."""
        return self._plugins.get(plugin_name)
