"""
Basic simulation example.
"""

import asyncio
from hypersim_sdk import HyperSimSDK, HyperSimConfig, Network, TransactionRequest


async def main():
    """Basic simulation example."""
    # Initialize SDK
    config = HyperSimConfig(
        network=Network.TESTNET,
        ai_enabled=False,  # Disable AI for simplicity
        debug=True
    )
    
    # Use async context manager for automatic cleanup
    async with HyperSimSDK(config) as sdk:
        # Create transaction
        transaction = TransactionRequest(
            from_address="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e501",
            to="0x742d35Cc6486C35f86C3507E4c8Eb8e3B6d7e502",
            value="1000000000000000000",  # 1 ETH in wei
            gas_limit="21000"
        )
        
        # Simulate transaction
        result = await sdk.simulate(transaction)
        
        # Print results
        print(f"Simulation Result:")
        print(f"- Success: {result.success}")
        print(f"- Gas Used: {result.gas_used}")
        print(f"- Block Type: {result.block_type}")
        print(f"- Estimated Block: {result.estimated_block}")
        
        if not result.success:
            print(f"- Error: {result.error}")
            if result.revert_reason:
                print(f"- Revert Reason: {result.revert_reason}")


if __name__ == "__main__":
    asyncio.run(main())
