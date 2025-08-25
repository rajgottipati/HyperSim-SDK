"""
Built-in plugins for common functionality.
"""

import time
import asyncio
from typing import Dict, Any, Optional
from ..plugins.plugin_system import Plugin, hook, HookType, HookContext
from ..types.errors import PluginError
from ..types.common import PerformanceMetrics


class LoggingPlugin(Plugin):
    """Plugin for logging requests and responses."""
    
    @property
    def name(self) -> str:
        return "logging"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    @property
    def description(self) -> str:
        return "Logs SDK operations for debugging and monitoring"
    
    def __init__(self, log_level: str = "INFO", include_data: bool = True):
        self.log_level = log_level.upper()
        self.include_data = include_data
        self.request_count = 0
        super().__init__()
    
    @hook(HookType.BEFORE_SIMULATION, priority=1)
    async def log_before_simulation(self, context: HookContext, transaction) -> HookContext:
        """Log before simulation."""
        self.request_count += 1
        
        if self.log_level in ["DEBUG", "INFO"]:
            print(f"[{self.name}] Starting simulation #{self.request_count}")
            if self.include_data and self.log_level == "DEBUG":
                print(f"[{self.name}] Transaction: {transaction.from_address} -> {transaction.to}")
        
        context.metadata["start_time"] = time.time()
        context.metadata["request_count"] = self.request_count
        
        return context
    
    @hook(HookType.AFTER_SIMULATION, priority=1)
    async def log_after_simulation(self, context: HookContext, result) -> HookContext:
        """Log after simulation."""
        if "start_time" in context.metadata:
            duration = time.time() - context.metadata["start_time"]
            context.metadata["duration"] = duration
        
        if self.log_level in ["DEBUG", "INFO"]:
            status = "SUCCESS" if result.success else "FAILED"
            duration_str = f" ({context.metadata.get('duration', 0):.3f}s)" if "duration" in context.metadata else ""
            print(f"[{self.name}] Simulation #{context.metadata.get('request_count', 0)} {status}{duration_str}")
            
            if self.include_data and self.log_level == "DEBUG":
                print(f"[{self.name}] Gas used: {result.gas_used}, Block type: {result.block_type}")
        
        return context
    
    @hook(HookType.ON_ERROR, priority=1)
    async def log_error(self, context: HookContext, error) -> HookContext:
        """Log errors."""
        print(f"[{self.name}] ERROR: {error}")
        return context


class MetricsPlugin(Plugin):
    """Plugin for collecting performance metrics."""
    
    @property
    def name(self) -> str:
        return "metrics"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    @property
    def description(self) -> str:
        return "Collects performance metrics and statistics"
    
    def __init__(self):
        self.metrics = PerformanceMetrics()
        self.start_time = time.time()
        super().__init__()
    
    @hook(HookType.BEFORE_SIMULATION, priority=5)
    async def before_simulation(self, context: HookContext, transaction) -> HookContext:
        """Track simulation start."""
        context.metadata["metrics_start_time"] = time.time()
        self.metrics.total_requests += 1
        return context
    
    @hook(HookType.AFTER_SIMULATION, priority=5)
    async def after_simulation(self, context: HookContext, result) -> HookContext:
        """Track simulation completion."""
        if "metrics_start_time" in context.metadata:
            duration = time.time() - context.metadata["metrics_start_time"]
            
            # Update metrics
            if result.success:
                self.metrics.successful_requests += 1
            else:
                self.metrics.failed_requests += 1
            
            # Update average response time
            total_completed = self.metrics.successful_requests + self.metrics.failed_requests
            if total_completed > 0:
                self.metrics.average_response_time = (
                    (self.metrics.average_response_time * (total_completed - 1) + duration) / 
                    total_completed
                )
        
        # Update uptime
        self.metrics.uptime = time.time() - self.start_time
        
        return context
    
    def get_metrics(self) -> PerformanceMetrics:
        """Get current metrics."""
        return self.metrics
    
    def reset_metrics(self) -> None:
        """Reset all metrics."""
        self.metrics = PerformanceMetrics()
        self.start_time = time.time()


class RetryPlugin(Plugin):
    """Plugin for automatic retry on failures."""
    
    @property
    def name(self) -> str:
        return "retry"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    @property
    def description(self) -> str:
        return "Provides automatic retry functionality for failed operations"
    
    def __init__(
        self,
        max_attempts: int = 3,
        initial_delay: float = 1.0,
        backoff_multiplier: float = 2.0,
        max_delay: float = 30.0
    ):
        self.max_attempts = max_attempts
        self.initial_delay = initial_delay
        self.backoff_multiplier = backoff_multiplier
        self.max_delay = max_delay
        super().__init__()
    
    @hook(HookType.ON_ERROR, priority=5)
    async def handle_error(self, context: HookContext, error) -> HookContext:
        """Handle errors with retry logic."""
        attempt = context.metadata.get("retry_attempt", 0)
        
        if attempt < self.max_attempts:
            # Calculate delay
            delay = min(
                self.initial_delay * (self.backoff_multiplier ** attempt),
                self.max_delay
            )
            
            context.metadata["retry_attempt"] = attempt + 1
            context.metadata["retry_delay"] = delay
            
            print(f"[{self.name}] Retrying in {delay:.1f}s (attempt {attempt + 1}/{self.max_attempts})")
            
            # Don't halt execution - allow retry
            return context
        else:
            print(f"[{self.name}] Max retry attempts ({self.max_attempts}) exceeded")
            return context


class CachingPlugin(Plugin):
    """Plugin for caching simulation results."""
    
    @property
    def name(self) -> str:
        return "caching"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    @property
    def description(self) -> str:
        return "Caches simulation results to improve performance"
    
    def __init__(self, ttl_seconds: int = 300, max_entries: int = 1000):
        self.ttl_seconds = ttl_seconds
        self.max_entries = max_entries
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.hit_count = 0
        self.miss_count = 0
        super().__init__()
    
    def _generate_cache_key(self, transaction) -> str:
        """Generate cache key for transaction."""
        # Simple cache key based on transaction hash
        key_data = f"{transaction.from_address}:{transaction.to}:{transaction.value}:{transaction.data}"
        return str(hash(key_data))
    
    def _is_cache_valid(self, entry: Dict[str, Any]) -> bool:
        """Check if cache entry is still valid."""
        return time.time() - entry["timestamp"] < self.ttl_seconds
    
    def _cleanup_cache(self) -> None:
        """Remove expired entries and enforce size limit."""
        now = time.time()
        
        # Remove expired entries
        expired_keys = [
            key for key, entry in self.cache.items()
            if now - entry["timestamp"] >= self.ttl_seconds
        ]
        
        for key in expired_keys:
            del self.cache[key]
        
        # Enforce size limit (remove oldest entries)
        if len(self.cache) > self.max_entries:
            sorted_entries = sorted(
                self.cache.items(),
                key=lambda x: x[1]["timestamp"]
            )
            
            entries_to_remove = len(self.cache) - self.max_entries
            for key, _ in sorted_entries[:entries_to_remove]:
                del self.cache[key]
    
    @hook(HookType.BEFORE_SIMULATION, priority=1)
    async def check_cache(self, context: HookContext, transaction) -> HookContext:
        """Check cache before simulation."""
        cache_key = self._generate_cache_key(transaction)
        
        if cache_key in self.cache:
            entry = self.cache[cache_key]
            
            if self._is_cache_valid(entry):
                # Cache hit
                self.hit_count += 1
                context.metadata["cache_hit"] = True
                context.metadata["cached_result"] = entry["result"]
                context.set_halt(True)  # Skip actual simulation
                return context
        
        # Cache miss
        self.miss_count += 1
        context.metadata["cache_key"] = cache_key
        context.metadata["cache_hit"] = False
        
        return context
    
    @hook(HookType.AFTER_SIMULATION, priority=10)
    async def update_cache(self, context: HookContext, result) -> HookContext:
        """Update cache after simulation."""
        if not context.metadata.get("cache_hit", False):
            cache_key = context.metadata.get("cache_key")
            
            if cache_key and result.success:  # Only cache successful results
                self.cache[cache_key] = {
                    "result": result,
                    "timestamp": time.time()
                }
                
                # Periodic cleanup
                if len(self.cache) % 100 == 0:
                    self._cleanup_cache()
        
        return context
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total_requests = self.hit_count + self.miss_count
        hit_ratio = self.hit_count / total_requests if total_requests > 0 else 0.0
        
        return {
            "entries": len(self.cache),
            "hits": self.hit_count,
            "misses": self.miss_count,
            "hit_ratio": hit_ratio,
            "ttl_seconds": self.ttl_seconds,
            "max_entries": self.max_entries
        }
    
    def clear_cache(self) -> None:
        """Clear all cache entries."""
        self.cache.clear()
        self.hit_count = 0
        self.miss_count = 0
