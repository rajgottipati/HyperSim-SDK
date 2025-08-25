# Compatibility wrapper - redirects to main SDK
from .core.hypersim_sdk import HyperSimSDK as _HyperSimSDK, HyperSimConfig as _HyperSimConfig

# For backward compatibility
HyperSimSDK = _HyperSimSDK
HyperSimConfig = _HyperSimConfig

__all__ = ["HyperSimSDK", "HyperSimConfig"]
