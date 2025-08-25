"""
Custom exception classes for the HyperSim SDK.
"""

from .types.errors import (
    HyperSimError, ValidationError, NetworkError, SimulationError, 
    AIAnalysisError, TimeoutError, RateLimitError, WebSocketError, 
    PluginError, ConfigurationError
)

# Re-export all error types for easy access
__all__ = [
    "HyperSimError",
    "ValidationError", 
    "NetworkError",
    "SimulationError",
    "AIAnalysisError",
    "TimeoutError",
    "RateLimitError",
    "WebSocketError",
    "PluginError",
    "ConfigurationError"
]
