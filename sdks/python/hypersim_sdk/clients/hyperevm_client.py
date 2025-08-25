"""
HyperEVM client for blockchain interactions with AsyncIO.
"""

import asyncio
from typing import Optional, Dict, Any, Union
import aiohttp
from web3 import AsyncWeb3
# Remove the problematic middleware import for now
from eth_account import Account
from ..types.network import Network, NetworkConfig, NetworkStatus, BlockInfo, BlockType, get_network_config
from ..types.simulation import TransactionRequest, SimulationResult, ExecutionTrace, StateChange, SimulationEvent
from ..types.errors import NetworkError, SimulationError, TimeoutError, ValidationError
from ..utils.validators import validate_transaction_request, validate_network
from ..utils.formatters import format_wei_to_ether
from ..utils.constants import GAS_CONSTANTS, TRANSACTION_CONSTANTS


class HyperEVMClient:
    """Async client for interacting with HyperEVM network."""
    
    def __init__(
        self,
        network: Network,
        rpc_endpoint: Optional[str] = None,
        timeout: float = 30.0,
        debug: bool = False
    ) -> None:
        """Initialize HyperEVM client.
        
        Args:
            network: Target network
            rpc_endpoint: Custom RPC endpoint (optional)
            timeout: Request timeout in seconds
            debug: Enable debug logging
        """
        self.network = validate_network(network)
        self.config = get_network_config(self.network)
        self.timeout = timeout
        self.debug = debug
        
        # Use custom RPC endpoint if provided
        rpc_url = rpc_endpoint or self.config.rpc_url
        
        # Initialize Web3 with async provider
        self.w3 = AsyncWeb3(
            AsyncWeb3.AsyncHTTPProvider(
                rpc_url,
                request_kwargs={"timeout": timeout}
            )
        )
        
        # Add PoA middleware if needed
        self.w3.middleware_onion.inject(async_geth_poa_middleware, layer=0)
        
        # HTTP session for direct RPC calls
        self._session: Optional[aiohttp.ClientSession] = None
        
        if self.debug:
            print(f"[HyperEVM Client] Initialized for {self.network} at {rpc_url}")
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self._ensure_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def _ensure_session(self) -> None:
        """Ensure HTTP session is created."""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            self._session = aiohttp.ClientSession(timeout=timeout)
    
    async def close(self) -> None:
        """Close the client and cleanup resources."""
        if self._session and not self._session.closed:
            await self._session.close()
        
        if self.debug:
            print("[HyperEVM Client] Closed")
    
    async def simulate(self, transaction: TransactionRequest) -> SimulationResult:
        """Simulate a transaction on HyperEVM.
        
        Args:
            transaction: Transaction to simulate
            
        Returns:
            SimulationResult: Simulation result
            
        Raises:
            ValidationError: If transaction is invalid
            SimulationError: If simulation fails
            NetworkError: If network request fails
        """
        validate_transaction_request(transaction)
        
        try:
            if self.debug:
                print(f"[HyperEVM Client] Simulating transaction: {transaction.from_address} -> {transaction.to}")
            
            # Format transaction for Web3
            tx_params = self._format_transaction(transaction)
            
            # Simulate using eth_call
            call_result = await self.w3.eth.call(tx_params)
            
            # Estimate gas usage
            gas_estimate = await self.w3.eth.estimate_gas(tx_params)
            
            # Get current block info
            current_block = await self.w3.eth.get_block('latest')
            if current_block is None:
                raise NetworkError("Unable to fetch current block")
            
            # Determine block type and estimated inclusion
            block_type = self._determine_block_type(gas_estimate)
            estimated_block = current_block.number + (1 if block_type == BlockType.SMALL else 1)
            
            # Create simulation result
            result = SimulationResult(
                success=True,
                gas_used=str(gas_estimate),
                return_data=call_result.hex() if call_result else None,
                block_type=block_type,
                estimated_block=estimated_block,
                state_changes=[],
                events=[],
                timestamp=int(current_block.timestamp) if current_block.timestamp else None
            )
            
            if self.debug:
                print(f"[HyperEVM Client] Simulation successful: {result.gas_used} gas, {result.block_type}")
            
            return result
        
        except Exception as error:
            if self.debug:
                print(f"[HyperEVM Client] Simulation failed: {error}")
            
            # Handle specific Web3 errors
            error_msg = str(error)
            
            if "revert" in error_msg.lower() or "execution reverted" in error_msg.lower():
                # Extract revert reason if available
                revert_reason = self._extract_revert_reason(error_msg)
                
                return SimulationResult(
                    success=False,
                    gas_used="0",
                    error="Transaction would revert",
                    revert_reason=revert_reason,
                    block_type=BlockType.SMALL,
                    estimated_block=0,
                    state_changes=[],
                    events=[]
                )
            
            if "timeout" in error_msg.lower():
                raise TimeoutError("Transaction simulation timed out", self.timeout)
            
            raise SimulationError(f"HyperEVM simulation failed: {error_msg}")
    
    async def get_network_status(self) -> NetworkStatus:
        """Get network status and health information.
        
        Returns:
            NetworkStatus: Network status information
            
        Raises:
            NetworkError: If unable to fetch network status
        """
        try:
            # Fetch network information
            latest_block_number = await self.w3.eth.block_number
            fee_data = await self.w3.eth.fee_history(1, 'latest', [50])
            
            # Calculate average block time
            avg_block_time = await self._get_average_block_time()
            
            # Assess congestion level
            gas_price = fee_data['baseFeePerGas'][-1] if fee_data['baseFeePerGas'] else 0
            congestion_level = self._assess_congestion_level(gas_price)
            
            return NetworkStatus(
                network=self.network,
                latest_block=latest_block_number,
                gas_price=str(gas_price),
                is_healthy=True,
                avg_block_time=avg_block_time,
                congestion_level=congestion_level
            )
        
        except Exception as error:
            if self.debug:
                print(f"[HyperEVM Client] Failed to get network status: {error}")
            raise NetworkError(f"Failed to get network status: {error}")
    
    async def get_block_info(self, block_number: Optional[Union[int, str]] = None) -> BlockInfo:
        """Get block information.
        
        Args:
            block_number: Block number or 'latest'
            
        Returns:
            BlockInfo: Block information
            
        Raises:
            NetworkError: If block not found or fetch fails
        """
        try:
            block = await self.w3.eth.get_block(block_number or 'latest', full_transactions=False)
            
            if block is None:
                raise NetworkError(f"Block {block_number or 'latest'} not found")
            
            block_type = self._determine_block_type_from_gas_limit(block.gasLimit)
            
            return BlockInfo(
                number=block.number,
                hash=block.hash.hex(),
                type=block_type,
                timestamp=block.timestamp,
                gas_limit=str(block.gasLimit),
                gas_used=str(block.gasUsed),
                transaction_count=len(block.transactions)
            )
        
        except Exception as error:
            raise NetworkError(f"Failed to get block info: {error}")
    
    async def get_balance(self, address: str, block_number: Optional[Union[int, str]] = None) -> str:
        """Get account balance.
        
        Args:
            address: Account address
            block_number: Block number or tag
            
        Returns:
            str: Balance in wei
            
        Raises:
            NetworkError: If unable to fetch balance
        """
        try:
            balance = await self.w3.eth.get_balance(address, block_number or 'latest')
            return str(balance)
        except Exception as error:
            raise NetworkError(f"Failed to get balance: {error}")
    
    async def get_nonce(self, address: str, block_number: Optional[Union[int, str]] = None) -> int:
        """Get account nonce.
        
        Args:
            address: Account address
            block_number: Block number or tag
            
        Returns:
            int: Account nonce
            
        Raises:
            NetworkError: If unable to fetch nonce
        """
        try:
            nonce = await self.w3.eth.get_transaction_count(address, block_number or 'latest')
            return nonce
        except Exception as error:
            raise NetworkError(f"Failed to get nonce: {error}")
    
    async def get_gas_price(self) -> str:
        """Get current gas price.
        
        Returns:
            str: Gas price in wei
        """
        try:
            gas_price = await self.w3.eth.gas_price
            return str(gas_price)
        except Exception as error:
            raise NetworkError(f"Failed to get gas price: {error}")
    
    def _format_transaction(self, transaction: TransactionRequest) -> Dict[str, Any]:
        """Format transaction for Web3."""
        tx_params = {
            'from': transaction.from_address,
            'value': int(transaction.value or '0'),
            'data': transaction.data or '0x'
        }
        
        if transaction.to:
            tx_params['to'] = transaction.to
        
        if transaction.gas_limit:
            tx_params['gas'] = int(transaction.gas_limit)
        
        # Handle gas pricing
        if transaction.max_fee_per_gas and transaction.max_priority_fee_per_gas:
            # EIP-1559
            tx_params['maxFeePerGas'] = int(transaction.max_fee_per_gas)
            tx_params['maxPriorityFeePerGas'] = int(transaction.max_priority_fee_per_gas)
        elif transaction.gas_price:
            # Legacy
            tx_params['gasPrice'] = int(transaction.gas_price)
        
        return tx_params
    
    def _determine_block_type(self, gas_estimate: int) -> BlockType:
        """Determine block type based on gas usage."""
        return BlockType.SMALL if gas_estimate <= GAS_CONSTANTS["SMALL_BLOCK_LIMIT"] else BlockType.LARGE
    
    def _determine_block_type_from_gas_limit(self, gas_limit: int) -> BlockType:
        """Determine block type from gas limit."""
        return BlockType.SMALL if gas_limit <= 2_500_000 else BlockType.LARGE
    
    def _assess_congestion_level(self, gas_price: int) -> str:
        """Assess network congestion level."""
        # Convert to Gwei for comparison
        gas_price_gwei = gas_price / 1_000_000_000
        
        if gas_price_gwei < 10:
            return "LOW"
        elif gas_price_gwei < 50:
            return "MEDIUM"
        else:
            return "HIGH"
    
    def _extract_revert_reason(self, error_msg: str) -> Optional[str]:
        """Extract revert reason from error message."""
        # Try to extract revert reason from common error formats
        if "revert" in error_msg:
            parts = error_msg.split("revert")
            if len(parts) > 1:
                reason = parts[1].strip()
                return reason if reason else None
        return None
    
    async def _get_average_block_time(self) -> float:
        """Get average block time over last 10 blocks."""
        try:
            current_block = await self.w3.eth.get_block('latest')
            if not current_block:
                return 1.0  # Default for small blocks
            
            past_block = await self.w3.eth.get_block(current_block.number - 10)
            if not past_block:
                return 1.0
            
            time_diff = current_block.timestamp - past_block.timestamp
            block_diff = current_block.number - past_block.number
            
            return time_diff / block_diff if block_diff > 0 else 1.0
        
        except Exception:
            return 1.0  # Default fallback
    
    def get_config(self) -> NetworkConfig:
        """Get network configuration."""
        return self.config
