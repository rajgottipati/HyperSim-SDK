"""
Comprehensive usage examples for HyperSim SDK.
"""

import asyncio
import os
from hypersim_sdk import (
    HyperSimSDK, HyperSimConfig, Network, TransactionRequest,
    WSSubscription, SubscriptionType
)
from hypersim_sdk.plugins import LoggingPlugin, MetricsPlugin, CachingPlugin
from hypersim_sdk.plugins.plugin_system import PluginConfig


async def basic_simulation_example():
    """Basic transaction simulation example."""
    print("\n=== Basic Simulation Example ===")
    
    # Initialize SDK with basic configuration
    config = HyperSimConfig(
        network=Network.TESTNET,
        ai_enabled=False,  # Disable AI for this example
        debug=True
    )
    
    async with HyperSimSDK(config) as sdk:
        # Create a simple transaction
        transaction = TransactionRequest(
            from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
            to="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e502",
            value="1000000000000000000",  # 1 ETH in wei
            gas_limit="21000"
        )
        
        # Simulate the transaction
        result = await sdk.simulate(transaction)
        
        print(f"Simulation Result:")
        print(f"- Success: {result.success}")
        print(f"- Gas Used: {result.gas_used}")
        print(f"- Block Type: {result.block_type}")
        print(f"- Estimated Block: {result.estimated_block}")
        
        if result.error:
            print(f"- Error: {result.error}")
        if result.revert_reason:
            print(f"- Revert Reason: {result.revert_reason}")


async def ai_analysis_example():
    """AI-powered analysis example."""
    print("\n=== AI Analysis Example ===")
    
    # Get OpenAI API key from environment
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        print("Skipping AI example - OPENAI_API_KEY not set")
        return
    
    # Initialize SDK with AI enabled
    config = HyperSimConfig(
        network=Network.TESTNET,
        ai_enabled=True,
        openai_api_key=openai_key,
        debug=True
    )
    
    async with HyperSimSDK(config) as sdk:
        # Create a more complex transaction
        transaction = TransactionRequest(
            from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
            to="0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",  # UNI token
            value="0",
            data="0xa9059cbb000000000000000000000000742d35cc6486c35f86c3507e4c8eb8e3b6d7e502000000000000000000000000000000000000000000000000de0b6b3a7640000",  # transfer
            gas_limit="100000"
        )
        
        # Simulate transaction
        result = await sdk.simulate(transaction)
        print(f"Simulation Success: {result.success}")
        
        if result.success:
            # Get AI insights
            insights = await sdk.get_ai_insights(result)
            
            print(f"\nAI Analysis:")
            print(f"- Risk Level: {insights.risk_level}")
            print(f"- Confidence: {insights.confidence:.2%}")
            print(f"- Gas Savings Potential: {insights.gas_optimization.potential_savings}")
            
            if insights.security_warnings:
                print(f"- Security Warnings: {', '.join(insights.security_warnings)}")
            
            if insights.recommendations:
                print(f"- Recommendations:")
                for rec in insights.recommendations:
                    print(f"  • {rec}")
            
            print(f"- Explanation: {insights.explanation}")


async def bundle_optimization_example():
    """Transaction bundle optimization example."""
    print("\n=== Bundle Optimization Example ===")
    
    config = HyperSimConfig(
        network=Network.TESTNET,
        ai_enabled=False,  # Works without AI too
        debug=True
    )
    
    async with HyperSimSDK(config) as sdk:
        # Create multiple transactions
        transactions = [
            TransactionRequest(
                from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
                to="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e502",
                value="1000000000000000000",
                gas_limit="21000"
            ),
            TransactionRequest(
                from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
                to="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e503",
                value="2000000000000000000",
                gas_limit="21000"
            ),
            TransactionRequest(
                from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
                to="0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
                value="0",
                data="0xa9059cbb000000000000000000000000742d35cc6486c35f86c3507e4c8eb8e3b6d7e502000000000000000000000000000000000000000000000000de0b6b3a7640000",
                gas_limit="100000"
            )
        ]
        
        # Optimize bundle
        optimization = await sdk.optimize_bundle(transactions)
        
        print(f"Bundle Optimization Results:")
        print(f"- Original Gas: {optimization.original_gas}")
        print(f"- Optimized Gas: {optimization.optimized_gas}")
        print(f"- Gas Saved: {optimization.gas_saved}")
        print(f"- Reordered Indices: {optimization.reordered_indices}")
        
        if optimization.suggestions:
            print(f"- Suggestions:")
            for suggestion in optimization.suggestions:
                print(f"  • {suggestion}")
        
        if optimization.warnings:
            print(f"- Warnings:")
            for warning in optimization.warnings:
                print(f"  • {warning}")


async def streaming_example():
    """WebSocket streaming example."""
    print("\n=== Streaming Example ===")
    
    config = HyperSimConfig(
        network=Network.TESTNET,
        streaming_enabled=True,
        debug=True
    )
    
    async with HyperSimSDK(config) as sdk:
        # Message handler
        message_count = 0
        
        async def handle_message(message):
            nonlocal message_count
            message_count += 1
            print(f"Received message #{message_count} on {message.channel}: {type(message.data).__name__}")
        
        # Register message handler
        sdk.on_message(handle_message)
        
        # Use streaming context manager
        async with sdk.streaming_context() as ws_client:
            # Subscribe to trades
            trade_subscription = WSSubscription(
                type=SubscriptionType.TRADES,
                coin="ETH"
            )
            await sdk.subscribe(trade_subscription)
            
            # Subscribe to order book
            book_subscription = WSSubscription(
                type=SubscriptionType.BOOK,
                coin="BTC"
            )
            await sdk.subscribe(book_subscription)
            
            print(f"Connected to WebSocket: {sdk.is_websocket_connected}")
            print(f"Active subscriptions: {ws_client.get_subscriptions()}")
            
            # Listen for messages for a short time
            print("Listening for messages for 10 seconds...")
            await asyncio.sleep(10)
            
            print(f"Received {message_count} messages")
            print(f"Metrics: {ws_client.metrics}")


async def plugin_system_example():
    """Plugin system example."""
    print("\n=== Plugin System Example ===")
    
    # Create plugins
    logging_plugin = LoggingPlugin(log_level="DEBUG", include_data=True)
    metrics_plugin = MetricsPlugin()
    caching_plugin = CachingPlugin(ttl_seconds=60, max_entries=100)
    
    # Configure SDK with plugins
    config = HyperSimConfig(
        network=Network.TESTNET,
        plugins=[
            PluginConfig(plugin=logging_plugin, priority=1),
            PluginConfig(plugin=metrics_plugin, priority=5),
            PluginConfig(plugin=caching_plugin, priority=1)
        ],
        debug=True
    )
    
    async with HyperSimSDK(config) as sdk:
        print(f"Registered plugins: {len(sdk.get_plugins())}")
        for plugin_info in sdk.get_plugins():
            print(f"- {plugin_info['name']} v{plugin_info['version']} (enabled: {plugin_info['enabled']})")
        
        # Create test transaction
        transaction = TransactionRequest(
            from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
            to="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e502",
            value="1000000000000000000",
            gas_limit="21000"
        )
        
        # First simulation (cache miss)
        print("\n--- First Simulation (Cache Miss) ---")
        result1 = await sdk.simulate(transaction)
        
        # Second simulation (cache hit)
        print("\n--- Second Simulation (Cache Hit) ---")
        result2 = await sdk.simulate(transaction)
        
        # Get metrics
        print("\n--- Plugin Metrics ---")
        print(f"Metrics: {metrics_plugin.get_metrics()}")
        print(f"Cache Stats: {caching_plugin.get_cache_stats()}")
        
        # Demonstrate plugin management
        print("\n--- Plugin Management ---")
        await sdk.disable_plugin("caching")
        print("Disabled caching plugin")
        
        # Third simulation (no cache)
        print("\n--- Third Simulation (No Cache) ---")
        result3 = await sdk.simulate(transaction)
        
        print(f"Final cache stats: {caching_plugin.get_cache_stats()}")


async def cross_layer_integration_example():
    """Cross-layer HyperCore integration example."""
    print("\n=== Cross-Layer Integration Example ===")
    
    config = HyperSimConfig(
        network=Network.TESTNET,
        cross_layer_enabled=True,
        debug=True
    )
    
    async with HyperSimSDK(config) as sdk:
        # Create transaction that might interact with HyperCore
        transaction = TransactionRequest(
            from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
            to="0x00000000000000000000000000000000000000fd",  # HyperCore precompile
            value="0",
            data="0x12345678",  # Some interaction data
            gas_limit="100000"
        )
        
        # Simulate with cross-layer data
        result = await sdk.simulate(transaction)
        
        print(f"Simulation Success: {result.success}")
        print(f"Cross-layer enabled: {sdk.is_cross_layer_enabled}")
        
        if result.hypercore_data:
            print(f"HyperCore Data Available:")
            print(f"- Core State Keys: {list(result.hypercore_data.core_state.keys())}")
            print(f"- Positions: {len(result.hypercore_data.positions or [])}")
            print(f"- Market Data: {bool(result.hypercore_data.market_data)}")
            print(f"- Interactions: {len(result.hypercore_data.interactions or [])}")
        else:
            print("No HyperCore data available")


async def error_handling_example():
    """Error handling example."""
    print("\n=== Error Handling Example ===")
    
    config = HyperSimConfig(
        network=Network.TESTNET,
        debug=True
    )
    
    async with HyperSimSDK(config) as sdk:
        # Error handler
        async def handle_error(error):
            print(f"Caught error: {type(error).__name__}: {error}")
        
        sdk.on_error(handle_error)
        
        # Test various error conditions
        test_cases = [
            {
                "name": "Invalid 'from' address",
                "transaction": TransactionRequest(
                    from_address="invalid_address",
                    to="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e502",
                    value="1000000000000000000"
                )
            },
            {
                "name": "Invalid 'to' address",
                "transaction": TransactionRequest(
                    from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
                    to="invalid_to_address",
                    value="1000000000000000000"
                )
            },
            {
                "name": "Negative value",
                "transaction": TransactionRequest(
                    from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
                    to="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e502",
                    value="-1000000000000000000"
                )
            }
        ]
        
        for test_case in test_cases:
            print(f"\n--- Testing: {test_case['name']} ---")
            try:
                result = await sdk.simulate(test_case["transaction"])
                print(f"Unexpected success: {result.success}")
            except Exception as error:
                print(f"Expected error caught: {type(error).__name__}: {error}")


async def main():
    """Run all examples."""
    print("HyperSim SDK - Comprehensive Usage Examples")
    print("=" * 50)
    
    examples = [
        basic_simulation_example,
        ai_analysis_example,
        bundle_optimization_example,
        streaming_example,
        plugin_system_example,
        cross_layer_integration_example,
        error_handling_example
    ]
    
    for example_func in examples:
        try:
            await example_func()
        except Exception as error:
            print(f"Example {example_func.__name__} failed: {error}")
        
        print("\n" + "-" * 30 + "\n")
        await asyncio.sleep(1)  # Brief pause between examples
    
    print("All examples completed!")


if __name__ == "__main__":
    # Run examples
    asyncio.run(main())
