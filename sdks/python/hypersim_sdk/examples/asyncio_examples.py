"""
Advanced AsyncIO usage examples for HyperSim SDK.

Demonstrates concurrent operations, streaming, plugin usage,
error handling, and best practices for production use.
"""

import asyncio
import os
import signal
from contextlib import asynccontextmanager
from typing import List, Dict, Any

from hypersim_sdk import (
    HyperSimSDK, HyperSimConfig, Network, TransactionRequest,
    WSSubscription, SubscriptionType, AIInsights
)
from hypersim_sdk.plugins import (
    LoggingPlugin, MetricsPlugin, CachingPlugin, RetryPlugin
)
from hypersim_sdk.plugins.plugin_system import PluginConfig
from hypersim_sdk.types.errors import HyperSimError, SimulationError
from hypersim_sdk.types.websocket import ConnectionState


async def basic_async_simulation():
    """Basic AsyncIO simulation example."""
    print("\n=== Basic Async Simulation ===")
    
    config = HyperSimConfig(
        network=Network.TESTNET,
        ai_enabled=False,
        debug=True,
        timeout=30.0
    )
    
    # Using async context manager
    async with HyperSimSDK(config) as sdk:
        transaction = TransactionRequest(
            from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
            to="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e502",
            value="1000000000000000000",  # 1 ETH
            gas_limit="21000"
        )
        
        result = await sdk.simulate(transaction)
        print(f"✅ Simulation successful: {result.success}")
        print(f"⛽ Gas used: {result.gas_used}")


async def concurrent_simulations():
    """Demonstrate concurrent transaction simulations."""
    print("\n=== Concurrent Simulations ===")
    
    config = HyperSimConfig(
        network=Network.TESTNET,
        ai_enabled=False,
        debug=True
    )
    
    async with HyperSimSDK(config) as sdk:
        # Create multiple transactions
        transactions = [
            TransactionRequest(
                from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
                to="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e502",
                value=f"{i * 1000000000000000000}",  # i ETH
                gas_limit="21000"
            ) for i in range(1, 6)
        ]
        
        # Simulate all transactions concurrently
        print(f"🚀 Starting {len(transactions)} concurrent simulations...")
        
        results = await asyncio.gather(
            *[sdk.simulate(tx) for tx in transactions],
            return_exceptions=True
        )
        
        # Process results
        success_count = 0
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"❌ Transaction {i+1}: {result}")
            else:
                success_count += 1
                print(f"✅ Transaction {i+1}: Gas {result.gas_used}, Success {result.success}")
        
        print(f"📊 Success rate: {success_count}/{len(transactions)}")


async def streaming_example():
    """Demonstrate WebSocket streaming with async generators."""
    print("\n=== Streaming Example ===")
    
    config = HyperSimConfig(
        network=Network.TESTNET,
        streaming_enabled=True,
        debug=True
    )
    
    async with HyperSimSDK(config) as sdk:
        if not sdk._websocket_client:
            print("❌ WebSocket streaming not available")
            return
        
        print("🔗 Connecting to WebSocket stream...")
        
        # Connection event handler
        async def on_connection_state(state: ConnectionState):
            print(f"📡 Connection state: {state}")
        
        # Message handler
        message_count = 0
        async def on_message(message):
            nonlocal message_count
            message_count += 1
            print(f"📨 Message #{message_count}: {message.channel}")
            
            # Stop after 5 messages for demo
            if message_count >= 5:
                await sdk.disconnect_websocket()
        
        # Set up handlers
        sdk.on_connection_change(on_connection_state)
        sdk.on_message(on_message)
        
        # Start streaming
        subscription = WSSubscription(
            type=SubscriptionType.TRADES,
            coin="ETH"
        )
        
        await sdk.subscribe(subscription)
        
        # Wait for messages (with timeout)
        try:
            await asyncio.wait_for(
                sdk._websocket_client.wait_for_disconnect(),
                timeout=30.0
            )
        except asyncio.TimeoutError:
            print("⏰ Streaming timeout reached")


async def ai_powered_analysis():
    """Demonstrate AI-powered transaction analysis."""
    print("\n=== AI-Powered Analysis ===")
    
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        print("❌ Skipping AI example - OPENAI_API_KEY not set")
        return
    
    config = HyperSimConfig(
        network=Network.TESTNET,
        ai_enabled=True,
        openai_api_key=openai_key,
        debug=True
    )
    
    async with HyperSimSDK(config) as sdk:
        # Complex DeFi transaction for AI analysis
        transaction = TransactionRequest(
            from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
            to="0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",  # UNI token
            value="0",
            data="0xa9059cbb000000000000000000000000742d35cc6486c35f86c3507e4c8eb8e3b6d7e502000000000000000000000000000000000000000000000000de0b6b3a7640000",
            gas_limit="100000"
        )
        
        print("🤖 Simulating with AI analysis...")
        result = await sdk.simulate(transaction)
        
        if result.success:
            print("✅ Simulation successful")
            
            # Get AI insights
            insights = await sdk.get_ai_insights(result)
            print(f"🧠 AI Risk Level: {insights.risk_level}")
            print(f"🎯 Confidence: {insights.confidence:.2%}")
            print(f"💡 Optimization suggestions: {len(insights.optimizations)}")
            
            for opt in insights.optimizations[:3]:  # Show first 3
                print(f"   - {opt.description} (saves {opt.savings} gas)")


async def plugin_system_example():
    """Demonstrate plugin system with built-in plugins."""
    print("\n=== Plugin System Example ===")
    
    config = HyperSimConfig(
        network=Network.TESTNET,
        ai_enabled=False,
        debug=True,
        plugins=[
            PluginConfig(name="logging", enabled=True),
            PluginConfig(name="metrics", enabled=True),
            PluginConfig(name="caching", enabled=True),
            PluginConfig(name="retry", enabled=True)
        ]
    )
    
    async with HyperSimSDK(config) as sdk:
        # Add custom plugins
        sdk.add_plugin(LoggingPlugin(log_level="DEBUG", include_data=True))
        sdk.add_plugin(MetricsPlugin())
        sdk.add_plugin(CachingPlugin(ttl_seconds=300, max_entries=100))
        sdk.add_plugin(RetryPlugin(max_attempts=3))
        
        print("🔌 Plugins loaded:")
        for plugin in sdk.get_plugins():
            status = "✅" if plugin.enabled else "❌"
            print(f"   {status} {plugin.name} v{plugin.version}: {plugin.description}")
        
        # Run simulation with plugins
        transaction = TransactionRequest(
            from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
            to="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e502",
            value="1000000000000000000",
            gas_limit="21000"
        )
        
        # First simulation (cache miss)
        print("\n📊 First simulation (cache miss):")
        result1 = await sdk.simulate(transaction)
        
        # Second simulation (cache hit)
        print("\n📊 Second simulation (cache hit):")
        result2 = await sdk.simulate(transaction)
        
        # Get plugin metrics
        metrics = sdk.get_plugin("metrics")
        if metrics:
            stats = metrics.get_metrics()
            print(f"\n📈 Metrics: {stats.successful_requests} successful, {stats.average_response_time:.3f}s avg")
        
        cache = sdk.get_plugin("caching")
        if cache:
            cache_stats = cache.get_cache_stats()
            print(f"🗄️  Cache: {cache_stats['hits']} hits, {cache_stats['hit_ratio']:.1%} hit rate")


async def error_handling_example():
    """Demonstrate comprehensive error handling."""
    print("\n=== Error Handling Example ===")
    
    config = HyperSimConfig(
        network=Network.TESTNET,
        ai_enabled=False,
        debug=True,
        timeout=5.0  # Short timeout to trigger errors
    )
    
    async with HyperSimSDK(config) as sdk:
        # Invalid transaction
        invalid_tx = TransactionRequest(
            from_address="invalid_address",  # Invalid format
            to="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e502",
            value="1000000000000000000"
        )
        
        try:
            await sdk.simulate(invalid_tx)
        except HyperSimError as e:
            print(f"❌ Caught HyperSimError: {e}")
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
        
        # Timeout example
        print("⏰ Testing timeout handling...")
        try:
            # This might timeout with short timeout setting
            result = await asyncio.wait_for(
                sdk.simulate(TransactionRequest(
                    from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
                    to="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e502",
                    value="1000000000000000000"
                )),
                timeout=1.0
            )
            print("✅ Transaction completed within timeout")
        except asyncio.TimeoutError:
            print("⏰ Transaction timed out")


async def production_pattern_example():
    """Demonstrate production-ready patterns."""
    print("\n=== Production Patterns ===")
    
    # Configuration with production settings
    config = HyperSimConfig(
        network=Network.MAINNET,  # Production network
        ai_enabled=True,
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        cross_layer_enabled=True,
        streaming_enabled=False,  # Disabled for batch processing
        timeout=60.0,  # Longer timeout for production
        debug=False  # Disable debug logs in production
    )
    
    @asynccontextmanager
    async def sdk_context():
        """Context manager with proper cleanup and error handling."""
        sdk = None
        try:
            sdk = HyperSimSDK(config)
            await sdk.initialize()
            
            # Add production plugins
            sdk.add_plugin(MetricsPlugin())
            sdk.add_plugin(CachingPlugin(ttl_seconds=600, max_entries=10000))
            sdk.add_plugin(RetryPlugin(max_attempts=5, initial_delay=1.0))
            
            yield sdk
            
        except Exception as e:
            print(f"❌ SDK initialization failed: {e}")
            raise
        finally:
            if sdk:
                await sdk.shutdown()
    
    # Batch processing pattern
    async def process_transaction_batch(transactions: List[TransactionRequest]):
        """Process multiple transactions with rate limiting."""
        semaphore = asyncio.Semaphore(10)  # Limit concurrent operations
        
        async def process_single(tx: TransactionRequest):
            async with semaphore:
                try:
                    async with sdk_context() as sdk:
                        return await sdk.simulate(tx)
                except Exception as e:
                    print(f"❌ Transaction failed: {e}")
                    return None
        
        results = await asyncio.gather(
            *[process_single(tx) for tx in transactions],
            return_exceptions=True
        )
        
        return [r for r in results if r is not None]
    
    # Example batch
    transactions = [
        TransactionRequest(
            from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
            to="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e502",
            value=f"{i * 1000000000000000000}"
        ) for i in range(1, 6)
    ]
    
    if config.openai_api_key:  # Only run if API key is available
        print(f"🏭 Processing batch of {len(transactions)} transactions...")
        results = await process_transaction_batch(transactions)
        print(f"✅ Processed {len(results)} transactions successfully")
    else:
        print("❌ Skipping production example - OPENAI_API_KEY not set")


async def graceful_shutdown_example():
    """Demonstrate graceful shutdown with signal handling."""
    print("\n=== Graceful Shutdown Example ===")
    
    config = HyperSimConfig(
        network=Network.TESTNET,
        ai_enabled=False,
        debug=True
    )
    
    # Global SDK instance for signal handler
    sdk = None
    shutdown_event = asyncio.Event()
    
    def signal_handler(signum, frame):
        """Handle shutdown signals."""
        print(f"\n🛑 Received signal {signum}, initiating graceful shutdown...")
        shutdown_event.set()
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        sdk = HyperSimSDK(config)
        await sdk.initialize()
        
        print("🚀 SDK started. Press Ctrl+C for graceful shutdown...")
        
        # Simulate long-running operations
        async def worker():
            """Simulate background work."""
            counter = 0
            while not shutdown_event.is_set():
                try:
                    counter += 1
                    print(f"🔄 Worker iteration #{counter}")
                    await asyncio.sleep(2)
                    
                    # Example simulation
                    if counter % 3 == 0:
                        tx = TransactionRequest(
                            from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
                            to="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e502",
                            value="1000000000000000000"
                        )
                        result = await sdk.simulate(tx)
                        print(f"✅ Background simulation: {result.success}")
                        
                except Exception as e:
                    print(f"❌ Worker error: {e}")
                    break
        
        # Start worker
        worker_task = asyncio.create_task(worker())
        
        # Wait for shutdown signal
        await shutdown_event.wait()
        
        print("⏰ Waiting for worker to complete...")
        worker_task.cancel()
        
        try:
            await worker_task
        except asyncio.CancelledError:
            print("✅ Worker cancelled successfully")
        
    finally:
        if sdk:
            print("🧹 Cleaning up SDK resources...")
            await sdk.shutdown()
        
        print("✅ Graceful shutdown complete")


async def main():
    """Run all examples."""
    examples = [
        ("Basic AsyncIO", basic_async_simulation),
        ("Concurrent Operations", concurrent_simulations),
        ("WebSocket Streaming", streaming_example),
        ("AI Analysis", ai_powered_analysis),
        ("Plugin System", plugin_system_example),
        ("Error Handling", error_handling_example),
        ("Production Patterns", production_pattern_example),
        ("Graceful Shutdown", graceful_shutdown_example),
    ]
    
    print("🌟 HyperSim SDK - AsyncIO Examples")
    print("=" * 50)
    
    for name, example_func in examples:
        try:
            print(f"\n🎯 Running: {name}")
            await example_func()
        except KeyboardInterrupt:
            print("\n⏹️  Examples interrupted by user")
            break
        except Exception as e:
            print(f"❌ Example '{name}' failed: {e}")
            # Continue with other examples
        
        # Small delay between examples
        await asyncio.sleep(1)
    
    print("\n🎉 Examples completed!")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
