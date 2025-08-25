# HyperSim Python SDK 🚀

[![PyPI version](https://badge.fury.io/py/hypersim-sdk.svg)](https://badge.fury.io/py/hypersim-sdk)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AsyncIO](https://img.shields.io/badge/async-await-green.svg)](https://docs.python.org/3/library/asyncio.html)
[![Pydantic v2](https://img.shields.io/badge/pydantic-v2-purple.svg)](https://docs.pydantic.dev/latest/)

The first Python SDK for **HyperEVM transaction simulation** with AI-powered analysis and cross-layer **HyperCore integration**. Built from the ground up with modern AsyncIO patterns, type safety, and production-ready performance.

## ✨ Features

- 🚀 **AsyncIO Native**: Built with async/await for high-performance concurrent operations
- 📊 **Transaction Simulation**: Comprehensive HyperEVM simulation with failure prediction and gas estimation
- 🧠 **AI-Powered Analysis**: OpenAI GPT-4 integration for transaction optimization and risk assessment
- 🔗 **Cross-Layer Integration**: Real-time HyperCore data access and precompile interactions
- 📡 **WebSocket Streaming**: Real-time data streaming with async context managers and automatic reconnection
- 🔌 **Plugin System**: Extensible architecture with Python decorators, hooks, and dependency injection
- ⚡ **Type Safety**: Full Pydantic v2 models with comprehensive validation and IDE support
- 📈 **Bundle Optimization**: AI-powered transaction bundle analysis and MEV protection
- 🛡️ **Production Ready**: Robust error handling, retry logic, circuit breakers, and comprehensive logging
- 📚 **Developer Experience**: Complete type hints, extensive documentation, and rich examples

## 🚀 Installation

```bash
pip install hypersim-sdk
```

### Requirements

- Python 3.10+
- asyncio support
- OpenAI API key (optional, for AI features)

## ⚡ Quick Start

### Basic AsyncIO Usage

```python
import asyncio
from hypersim_sdk import HyperSimSDK, HyperSimConfig, Network, TransactionRequest

async def main():
    # Initialize SDK with configuration
    config = HyperSimConfig(
        network=Network.MAINNET,
        ai_enabled=True,
        openai_api_key="your-openai-api-key",
        streaming_enabled=True,
        cross_layer_enabled=True,
        debug=True
    )
    
    # Using async context manager (recommended)
    async with HyperSimSDK(config) as sdk:
        # Create a transaction
        transaction = TransactionRequest(
            from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
            to="0xA0b86a33E6417A9cDdA68C73E2c96b4DA3AEFc43", 
            value="1000000000000000000",  # 1 ETH in wei
            gas_limit="21000"
        )
        
        # Simulate transaction
        result = await sdk.simulate(transaction)
        
        print(f"✅ Success: {result.success}")
        print(f"⛽ Gas Used: {result.gas_used}")
        print(f"🧱 Block Type: {result.block_type}")
        
        # Get AI insights if enabled
        if result.success and config.ai_enabled:
            insights = await sdk.get_ai_insights(result)
            print(f"🧠 Risk Level: {insights.risk_level}")
            print(f"🎯 Confidence: {insights.confidence:.1%}")

# Run the async function
asyncio.run(main())
```

### Concurrent Simulations

```python
async def concurrent_example():
    config = HyperSimConfig(network=Network.TESTNET)
    
    async with HyperSimSDK(config) as sdk:
        # Create multiple transactions
        transactions = [
            TransactionRequest(
                from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
                to="0xA0b86a33E6417A9cDdA68C73E2c96b4DA3AEFc43",
                value=f"{i * 1000000000000000000}",
                gas_limit="21000"
            ) for i in range(1, 11)  # 10 transactions
        ]
        
        # Simulate all concurrently
        results = await asyncio.gather(
            *[sdk.simulate(tx) for tx in transactions],
            return_exceptions=True
        )
        
        # Process results
        successful = [r for r in results if not isinstance(r, Exception) and r.success]
        print(f"🎉 {len(successful)}/{len(transactions)} simulations successful")

asyncio.run(concurrent_example())
```

## 🔌 Plugin System

The SDK includes a powerful plugin system for extending functionality:

### Built-in Plugins

```python
from hypersim_sdk.plugins import LoggingPlugin, MetricsPlugin, CachingPlugin, RetryPlugin

async def plugin_example():
    config = HyperSimConfig(network=Network.TESTNET)
    
    async with HyperSimSDK(config) as sdk:
        # Add plugins
        sdk.add_plugin(LoggingPlugin(log_level="DEBUG"))
        sdk.add_plugin(MetricsPlugin())
        sdk.add_plugin(CachingPlugin(ttl_seconds=300, max_entries=1000))
        sdk.add_plugin(RetryPlugin(max_attempts=3, backoff_multiplier=2.0))
        
        # Plugins automatically enhance all operations
        result = await sdk.simulate(transaction)
        
        # Access plugin metrics
        metrics_plugin = sdk.get_plugin("metrics")
        stats = metrics_plugin.get_metrics()
        print(f"📊 Average response time: {stats.average_response_time:.3f}s")
```

### Custom Plugin Development

```python
from hypersim_sdk.plugins.plugin_system import Plugin, hook, HookType, HookContext

class CustomPlugin(Plugin):
    @property
    def name(self) -> str:
        return "custom"
    
    @property 
    def version(self) -> str:
        return "1.0.0"
    
    @hook(HookType.BEFORE_SIMULATION)
    async def before_simulation(self, context: HookContext, transaction) -> HookContext:
        print(f"🔍 Analyzing transaction to {transaction.to}")
        context.metadata["start_time"] = time.time()
        return context
    
    @hook(HookType.AFTER_SIMULATION) 
    async def after_simulation(self, context: HookContext, result) -> HookContext:
        duration = time.time() - context.metadata.get("start_time", 0)
        print(f"⏱️  Simulation completed in {duration:.3f}s")
        return context

# Use custom plugin
sdk.add_plugin(CustomPlugin())
```

## 📡 WebSocket Streaming

Real-time data streaming with automatic reconnection:

```python
from hypersim_sdk.types.websocket import WSSubscription, SubscriptionType

async def streaming_example():
    config = HyperSimConfig(
        network=Network.MAINNET,
        streaming_enabled=True
    )
    
    async with HyperSimSDK(config) as sdk:
        # Connection event handler
        async def on_connection_change(state):
            print(f"📡 Connection: {state}")
        
        # Message handler
        async def on_message(message):
            print(f"📨 Trade: {message.data}")
        
        # Set up handlers
        sdk.on_connection_change(on_connection_change)
        sdk.on_message(on_message)
        
        # Subscribe to trades
        subscription = WSSubscription(
            type=SubscriptionType.TRADES,
            coin="ETH"
        )
        await sdk.subscribe(subscription)
        
        # Keep streaming
        await sdk.wait_for_disconnect()

asyncio.run(streaming_example())
```

## 🧠 AI-Powered Analysis

Leverage OpenAI GPT-4 for intelligent transaction analysis:

```python
async def ai_analysis_example():
    config = HyperSimConfig(
        network=Network.MAINNET,
        ai_enabled=True,
        openai_api_key="your-openai-api-key"
    )
    
    async with HyperSimSDK(config) as sdk:
        # Complex DeFi transaction
        transaction = TransactionRequest(
            from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
            to="0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",  # UNI token
            data="0xa9059cbb...",  # Token transfer calldata
            gas_limit="100000"
        )
        
        result = await sdk.simulate(transaction)
        
        if result.success:
            # Get AI insights
            insights = await sdk.get_ai_insights(result)
            
            print(f"🧠 Risk Assessment: {insights.risk_level}")
            print(f"🎯 Confidence: {insights.confidence:.1%}")
            
            # Gas optimizations
            for opt in insights.optimizations:
                print(f"⚡ {opt.description}")
                print(f"  💰 Saves {opt.savings} gas ({opt.savings_percentage:.1f}%)")
            
            # Security analysis
            if insights.security_analysis.vulnerabilities:
                print("🚨 Security concerns found:")
                for vuln in insights.security_analysis.vulnerabilities:
                    print(f"  - {vuln.description} (Severity: {vuln.severity})")

asyncio.run(ai_analysis_example())
```

## 🔗 HyperCore Integration

Access cross-layer HyperCore data seamlessly:

```python
async def hypercore_integration():
    config = HyperSimConfig(
        network=Network.MAINNET,
        cross_layer_enabled=True
    )
    
    async with HyperSimSDK(config) as sdk:
        # Simulate transaction with HyperCore data
        result = await sdk.simulate(transaction)
        
        if result.hypercore_data:
            hypercore = result.hypercore_data
            print(f"💰 Account Value: ${hypercore.account_value}")
            print(f"📊 Positions: {len(hypercore.positions)}")
            
            for position in hypercore.positions:
                print(f"  - {position.asset}: {position.size} @ ${position.entry_price}")
            
            # Market data
            if hypercore.market_data:
                market = hypercore.market_data
                print(f"📈 ETH Price: ${market.eth_price}")
                print(f"📊 Market Depth: {len(market.depth)} levels")

asyncio.run(hypercore_integration())
```

## 🛡️ Error Handling & Resilience

Production-ready error handling with custom exceptions:

```python
from hypersim_sdk.types.errors import (
    HyperSimError, ValidationError, SimulationError, 
    NetworkError, AIAnalysisError, TimeoutError
)

async def error_handling_example():
    config = HyperSimConfig(network=Network.TESTNET, timeout=30.0)
    
    try:
        async with HyperSimSDK(config) as sdk:
            # Add retry plugin for resilience
            sdk.add_plugin(RetryPlugin(max_attempts=5))
            
            result = await sdk.simulate(transaction)
            
    except ValidationError as e:
        print(f"❌ Validation failed: {e}")
    except SimulationError as e:
        print(f"❌ Simulation failed: {e}")
    except NetworkError as e:
        print(f"🌐 Network error: {e}")
    except AIAnalysisError as e:
        print(f"🧠 AI analysis failed: {e}")
    except TimeoutError as e:
        print(f"⏰ Operation timed out: {e}")
    except HyperSimError as e:
        print(f"🚨 SDK error: {e}")

asyncio.run(error_handling_example())
```

## 📊 Production Patterns

### Batch Processing with Rate Limiting

```python
import asyncio
from typing import List

async def batch_processing_example():
    """Process transactions in batches with rate limiting."""
    
    config = HyperSimConfig(
        network=Network.MAINNET,
        ai_enabled=True,
        openai_api_key="your-key"
    )
    
    # Rate limiting with semaphore
    semaphore = asyncio.Semaphore(10)  # Max 10 concurrent operations
    
    async def process_transaction(sdk: HyperSimSDK, tx: TransactionRequest):
        async with semaphore:
            try:
                return await sdk.simulate(tx)
            except Exception as e:
                print(f"❌ Transaction failed: {e}")
                return None
    
    async with HyperSimSDK(config) as sdk:
        # Add production plugins
        sdk.add_plugin(MetricsPlugin())
        sdk.add_plugin(CachingPlugin(ttl_seconds=600, max_entries=10000))
        sdk.add_plugin(RetryPlugin(max_attempts=5))
        
        # Process batch
        transactions: List[TransactionRequest] = [...]  # Your transactions
        
        results = await asyncio.gather(
            *[process_transaction(sdk, tx) for tx in transactions],
            return_exceptions=True
        )
        
        successful_results = [r for r in results if r is not None and not isinstance(r, Exception)]
        print(f"✅ Processed {len(successful_results)}/{len(transactions)} transactions")

asyncio.run(batch_processing_example())
```

### Graceful Shutdown

```python
import signal
import asyncio

class GracefulSDKManager:
    def __init__(self, config: HyperSimConfig):
        self.config = config
        self.sdk = None
        self.shutdown_event = asyncio.Event()
        
    async def start(self):
        """Start SDK with signal handlers."""
        # Setup signal handlers
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, lambda: self.shutdown_event.set())
        
        try:
            self.sdk = HyperSimSDK(self.config)
            await self.sdk.initialize()
            
            # Your application logic here
            await self.run_application()
            
        finally:
            if self.sdk:
                await self.sdk.shutdown()
    
    async def run_application(self):
        """Main application loop."""
        while not self.shutdown_event.is_set():
            try:
                # Your processing logic
                await asyncio.sleep(1)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"❌ Application error: {e}")

# Usage
manager = GracefulSDKManager(config)
asyncio.run(manager.start())
```

## 📚 API Reference

### Core Classes

- **`HyperSimSDK`**: Main SDK class with async context manager support
- **`HyperSimConfig`**: Configuration class with Pydantic validation
- **`TransactionRequest`**: Transaction request model with field validation
- **`SimulationResult`**: Simulation result with comprehensive data
- **`AIInsights`**: AI analysis results with risk assessment and optimizations

### Type System

All types are built with Pydantic v2 for maximum type safety:

```python
from hypersim_sdk.types import (
    # Core types
    Network, BlockType, TransactionRequest, SimulationResult,
    # AI types  
    AIInsights, RiskLevel, GasOptimization,
    # WebSocket types
    WSSubscription, WSMessage, SubscriptionType,
    # Error types
    HyperSimError, ValidationError, SimulationError
)
```

### Network Support

- **Mainnet**: Full production HyperEVM support
- **Testnet**: Development and testing environment
- **Custom**: Configurable RPC endpoints

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Install dev dependencies
pip install hypersim-sdk[dev]

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=hypersim_sdk --cov-report=html

# Run async tests
pytest tests/ -v --asyncio-mode=auto
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

### Development Setup

```bash
# Clone repository
git clone https://github.com/hypersim/hypersim-sdk-python.git
cd hypersim-sdk-python

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install in development mode
pip install -e ".[dev]"

# Install pre-commit hooks
pre-commit install

# Run tests
pytest
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- 📖 **Documentation**: [https://docs.hypersim.dev/python](https://docs.hypersim.dev/python)
- 🐛 **Issues**: [GitHub Issues](https://github.com/hypersim/hypersim-sdk-python/issues)
- 💬 **Discord**: [Join our community](https://discord.gg/hypersim)
- 🐦 **Twitter**: [@HyperSimDev](https://twitter.com/HyperSimDev)

## 🚀 What's Next?

- 📊 **Advanced Analytics**: Enhanced metrics and observability
- 🔐 **Security Audits**: Formal security analysis integration  
- 📱 **Mobile Support**: React Native compatibility
- 🌐 **Multi-Chain**: Expanded blockchain support
- 🤖 **Custom AI Models**: Support for fine-tuned models

---

**Built with ❤️ by the HyperSim team** | **Powered by AsyncIO & Pydantic v2**
