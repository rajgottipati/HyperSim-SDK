"""
Core error types and exception hierarchy for HyperSim SDK.
"""

from typing import Optional, Dict, Any


class HyperSimError(Exception):
    """Base exception class for all HyperSim SDK errors."""
    
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}
        self.cause = cause
    
    def __str__(self) -> str:
        return self.message
    
    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(message='{self.message}', details={self.details})"


class ValidationError(HyperSimError):
    """Raised when input validation fails."""
    pass


class ConfigurationError(HyperSimError):
    """Raised when there's an issue with SDK configuration."""
    pass


class NetworkError(HyperSimError):
    """Raised when network operations fail."""
    
    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        response_data: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> None:
        super().__init__(message, **kwargs)
        self.status_code = status_code
        self.response_data = response_data or {}


class TimeoutError(NetworkError):
    """Raised when operations timeout."""
    
    def __init__(
        self,
        message: str,
        timeout_seconds: Optional[float] = None,
        **kwargs
    ) -> None:
        super().__init__(message, **kwargs)
        self.timeout_seconds = timeout_seconds


class RateLimitError(NetworkError):
    """Raised when API rate limits are exceeded."""
    
    def __init__(
        self,
        message: str,
        retry_after: Optional[int] = None,
        **kwargs
    ) -> None:
        super().__init__(message, **kwargs)
        self.retry_after = retry_after


class SimulationError(HyperSimError):
    """Raised when transaction simulation fails."""
    
    def __init__(
        self,
        message: str,
        revert_reason: Optional[str] = None,
        **kwargs
    ) -> None:
        super().__init__(message, **kwargs)
        self.revert_reason = revert_reason


class AIAnalysisError(HyperSimError):
    """Raised when AI analysis operations fail."""
    pass


class WebSocketError(HyperSimError):
    """Raised when WebSocket operations fail."""
    
    def __init__(
        self,
        message: str,
        close_code: Optional[int] = None,
        close_reason: Optional[str] = None,
        **kwargs
    ) -> None:
        super().__init__(message, **kwargs)
        self.close_code = close_code
        self.close_reason = close_reason


class PluginError(HyperSimError):
    """Raised when plugin operations fail."""
    
    def __init__(
        self,
        message: str,
        plugin_name: Optional[str] = None,
        **kwargs
    ) -> None:
        super().__init__(message, **kwargs)
        self.plugin_name = plugin_name
