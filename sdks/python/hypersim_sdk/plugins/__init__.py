"""
Plugin system package initialization.
"""

from .plugin_system import (
    Plugin,
    PluginConfig,
    PluginSystem,
    HookType,
    HookContext,
    HookRegistration,
    hook,
    middleware
)
from .builtin_plugins import (
    LoggingPlugin,
    MetricsPlugin,
    RetryPlugin,
    CachingPlugin
)

__all__ = [
    # Core plugin system
    "Plugin",
    "PluginConfig", 
    "PluginSystem",
    "HookType",
    "HookContext",
    "HookRegistration",
    "hook",
    "middleware",
    
    # Built-in plugins
    "LoggingPlugin",
    "MetricsPlugin",
    "RetryPlugin",
    "CachingPlugin"
]
