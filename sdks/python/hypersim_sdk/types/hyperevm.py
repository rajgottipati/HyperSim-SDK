"""
HyperEVM-specific type definitions for transaction handling,
RPC methods, and blockchain interactions.
"""

from typing import Dict, List, Optional, Union, Any, Literal
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum
from datetime import datetime


# Network Configuration
class HyperEVMNetwork(BaseModel):
    """HyperEVM network configuration."""
    chain_id: int = Field(..., description="Chain ID", alias='chainId')
    name: str = Field(..., description="Network name")
    rpc_url: str = Field(..., description="RPC URL", alias='rpcUrl')
    ws_url: Optional[str] = Field(default=None, description="WebSocket URL", alias='wsUrl')
    block_explorer: Optional[str] = Field(default=None, description="Block explorer URL", alias='blockExplorer')
    currency: 'NetworkCurrency' = Field(..., description="Native currency")


class NetworkCurrency(BaseModel):
    """Network native currency."""
    name: str = Field(..., description="Currency name")
    symbol: str = Field(..., description="Currency symbol")
    decimals: int = Field(..., description="Currency decimals")


# Transaction Types
class AccessListEntry(BaseModel):
    """Access list entry for EIP-2930 transactions."""
    address: str = Field(..., description="Contract address")
    storage_keys: List[str] = Field(..., description="Storage keys", alias='storageKeys')


class HyperEVMTransaction(BaseModel):
    """HyperEVM transaction."""
    from_address: str = Field(..., description="Sender address", alias='from')
    to: Optional[str] = Field(default=None, description="Recipient address")
    value: Optional[str] = Field(default=None, description="Transaction value")
    data: Optional[str] = Field(default=None, description="Transaction data")
    gas: Optional[str] = Field(default=None, description="Gas limit")
    gas_price: Optional[str] = Field(default=None, description="Gas price", alias='gasPrice')
    max_fee_per_gas: Optional[str] = Field(default=None, description="Max fee per gas", alias='maxFeePerGas')
    max_priority_fee_per_gas: Optional[str] = Field(
        default=None, description="Max priority fee per gas", alias='maxPriorityFeePerGas'
    )
    nonce: Optional[int] = Field(default=None, description="Transaction nonce")
    type: Optional[int] = Field(default=None, description="Transaction type")
    chain_id: Optional[int] = Field(default=None, description="Chain ID", alias='chainId')
    access_list: Optional[List[AccessListEntry]] = Field(
        default=None, description="Access list", alias='accessList'
    )


class Log(BaseModel):
    """Transaction log."""
    address: str = Field(..., description="Contract address")
    topics: List[str] = Field(..., description="Log topics")
    data: str = Field(..., description="Log data")
    block_number: int = Field(..., description="Block number", alias='blockNumber')
    transaction_hash: str = Field(..., description="Transaction hash", alias='transactionHash')
    transaction_index: int = Field(..., description="Transaction index", alias='transactionIndex')
    block_hash: str = Field(..., description="Block hash", alias='blockHash')
    log_index: int = Field(..., description="Log index", alias='logIndex')
    removed: bool = Field(..., description="Log removed")


class TransactionReceipt(BaseModel):
    """Transaction receipt."""
    transaction_hash: str = Field(..., description="Transaction hash", alias='transactionHash')
    transaction_index: int = Field(..., description="Transaction index", alias='transactionIndex')
    block_hash: str = Field(..., description="Block hash", alias='blockHash')
    block_number: int = Field(..., description="Block number", alias='blockNumber')
    from_address: str = Field(..., description="Sender address", alias='from')
    to: Optional[str] = Field(default=None, description="Recipient address")
    cumulative_gas_used: int = Field(..., description="Cumulative gas used", alias='cumulativeGasUsed')
    gas_used: int = Field(..., description="Gas used", alias='gasUsed')
    contract_address: Optional[str] = Field(default=None, description="Contract address", alias='contractAddress')
    logs: List[Log] = Field(..., description="Transaction logs")
    logs_bloom: str = Field(..., description="Logs bloom filter", alias='logsBloom')
    status: int = Field(..., description="Transaction status")
    type: int = Field(..., description="Transaction type")
    effective_gas_price: int = Field(..., description="Effective gas price", alias='effectiveGasPrice')


# Block Types for Dual-Block Architecture
class BlockType(str, Enum):
    """Block types in dual-block system."""
    SMALL = "small"
    LARGE = "large"


class Transaction(BaseModel):
    """Transaction in a block."""
    hash: str = Field(..., description="Transaction hash")
    nonce: int = Field(..., description="Transaction nonce")
    block_hash: str = Field(..., description="Block hash", alias='blockHash')
    block_number: int = Field(..., description="Block number", alias='blockNumber')
    transaction_index: int = Field(..., description="Transaction index", alias='transactionIndex')
    from_address: str = Field(..., description="Sender address", alias='from')
    to: Optional[str] = Field(default=None, description="Recipient address")
    value: str = Field(..., description="Transaction value")
    gas: int = Field(..., description="Gas limit")
    gas_price: str = Field(..., description="Gas price", alias='gasPrice')
    max_fee_per_gas: Optional[str] = Field(default=None, description="Max fee per gas", alias='maxFeePerGas')
    max_priority_fee_per_gas: Optional[str] = Field(
        default=None, description="Max priority fee per gas", alias='maxPriorityFeePerGas'
    )
    input: str = Field(..., description="Transaction input")
    v: str = Field(..., description="Signature v")
    r: str = Field(..., description="Signature r")
    s: str = Field(..., description="Signature s")
    type: int = Field(..., description="Transaction type")
    chain_id: int = Field(..., description="Chain ID", alias='chainId')
    access_list: Optional[List[AccessListEntry]] = Field(
        default=None, description="Access list", alias='accessList'
    )


class Block(BaseModel):
    """Blockchain block."""
    number: int = Field(..., description="Block number")
    hash: str = Field(..., description="Block hash")
    parent_hash: str = Field(..., description="Parent block hash", alias='parentHash')
    timestamp: int = Field(..., description="Block timestamp")
    nonce: str = Field(..., description="Block nonce")
    difficulty: str = Field(..., description="Block difficulty")
    total_difficulty: Optional[str] = Field(default=None, description="Total difficulty", alias='totalDifficulty')
    gas_limit: int = Field(..., description="Gas limit", alias='gasLimit')
    gas_used: int = Field(..., description="Gas used", alias='gasUsed')
    miner: str = Field(..., description="Block miner")
    extra_data: str = Field(..., description="Extra data", alias='extraData')
    transactions: List[Transaction] = Field(..., description="Block transactions")
    size: int = Field(..., description="Block size")
    uncles: List[str] = Field(..., description="Uncle blocks")
    base_fee_per_gas: Optional[int] = Field(default=None, description="Base fee per gas", alias='baseFeePerGas')


# Dual-Block System Types
class BlockConfiguration(BaseModel):
    """Block configuration."""
    type: BlockType = Field(..., description="Block type")
    frequency: int = Field(..., description="Block frequency in seconds")
    gas_limit: int = Field(..., description="Gas limit", alias='gasLimit')
    target_gas_usage: int = Field(..., description="Target gas usage", alias='targetGasUsage')


class MempoolStatus(BaseModel):
    """Mempool status."""
    pending_transactions: int = Field(..., description="Pending transactions", alias='pendingTransactions')
    queued_transactions: int = Field(..., description="Queued transactions", alias='queuedTransactions')
    address_nonces: Dict[str, int] = Field(..., description="Address nonces", alias='addressNonces')
    estimated_inclusion_time: Dict[str, int] = Field(
        ..., description="Estimated inclusion time", alias='estimatedInclusionTime'
    )


# RPC Method Types
class RPCRequest(BaseModel):
    """JSON-RPC request."""
    jsonrpc: Literal["2.0"] = Field(default="2.0", description="JSON-RPC version")
    id: Union[int, str] = Field(..., description="Request ID")
    method: str = Field(..., description="RPC method")
    params: Optional[List[Any]] = Field(default=None, description="Method parameters")


class RPCError(BaseModel):
    """JSON-RPC error."""
    code: int = Field(..., description="Error code")
    message: str = Field(..., description="Error message")
    data: Optional[Any] = Field(default=None, description="Additional error data")


class RPCResponse(BaseModel):
    """JSON-RPC response."""
    jsonrpc: Literal["2.0"] = Field(default="2.0", description="JSON-RPC version")
    id: Union[int, str] = Field(..., description="Request ID")
    result: Optional[Any] = Field(default=None, description="Method result")
    error: Optional[RPCError] = Field(default=None, description="Error information")


# Gas Estimation
class GasEstimation(BaseModel):
    """Gas estimation result."""
    gas_limit: int = Field(..., description="Gas limit", alias='gasLimit')
    gas_price: str = Field(..., description="Gas price", alias='gasPrice')
    max_fee_per_gas: Optional[str] = Field(default=None, description="Max fee per gas", alias='maxFeePerGas')
    max_priority_fee_per_gas: Optional[str] = Field(
        default=None, description="Max priority fee per gas", alias='maxPriorityFeePerGas'
    )
    estimated_cost: str = Field(..., description="Estimated cost", alias='estimatedCost')
    recommended_block_type: BlockType = Field(
        ..., description="Recommended block type", alias='recommendedBlockType'
    )
    estimated_confirmation_time: int = Field(
        ..., description="Estimated confirmation time", alias='estimatedConfirmationTime'
    )


# Call Options
class CallOptions(BaseModel):
    """Contract call options."""
    from_address: Optional[str] = Field(default=None, description="From address", alias='from')
    to: Optional[str] = Field(default=None, description="To address")
    gas: Optional[str] = Field(default=None, description="Gas limit")
    gas_price: Optional[str] = Field(default=None, description="Gas price", alias='gasPrice')
    value: Optional[str] = Field(default=None, description="Transaction value")
    data: Optional[str] = Field(default=None, description="Call data")
    block_number: Optional[Union[int, str]] = Field(default=None, description="Block number", alias='blockNumber')


# Filter Types
class FilterOptions(BaseModel):
    """Log filter options."""
    from_block: Optional[Union[int, str]] = Field(default=None, description="From block", alias='fromBlock')
    to_block: Optional[Union[int, str]] = Field(default=None, description="To block", alias='toBlock')
    address: Optional[Union[str, List[str]]] = Field(default=None, description="Contract address")
    topics: Optional[List[Optional[Union[str, List[str]]]]] = Field(default=None, description="Log topics")


class LogFilter(FilterOptions):
    """Log filter with ID."""
    id: str = Field(..., description="Filter ID")


# Contract Interaction
class ContractCall(BaseModel):
    """Contract call."""
    to: str = Field(..., description="Contract address")
    data: str = Field(..., description="Call data")
    from_address: Optional[str] = Field(default=None, description="From address", alias='from')
    gas: Optional[str] = Field(default=None, description="Gas limit")
    gas_price: Optional[str] = Field(default=None, description="Gas price", alias='gasPrice')
    value: Optional[str] = Field(default=None, description="Call value")


class ContractDeployment(BaseModel):
    """Contract deployment."""
    data: str = Field(..., description="Contract bytecode")
    from_address: str = Field(..., description="From address", alias='from')
    gas: Optional[str] = Field(default=None, description="Gas limit")
    gas_price: Optional[str] = Field(default=None, description="Gas price", alias='gasPrice')
    value: Optional[str] = Field(default=None, description="Deployment value")
    constructor_args: Optional[List[Any]] = Field(default=None, description="Constructor args", alias='constructorArgs')


# Precompile Contract Types
class PrecompileCall(BaseModel):
    """Precompile contract call."""
    address: str = Field(..., description="Precompile address")
    data: str = Field(..., description="Call data")
    from_address: Optional[str] = Field(default=None, description="From address", alias='from')


class PrecompileResult(BaseModel):
    """Precompile call result."""
    success: bool = Field(..., description="Call success")
    return_data: str = Field(..., description="Return data", alias='returnData')
    gas_used: int = Field(..., description="Gas used", alias='gasUsed')
    error: Optional[str] = Field(default=None, description="Error message")


# Connection Pool Types
class ConnectionPoolOptions(BaseModel):
    """Connection pool options."""
    max_connections: int = Field(..., description="Maximum connections", alias='maxConnections')
    idle_timeout: int = Field(..., description="Idle timeout", alias='idleTimeout')
    connection_timeout: int = Field(..., description="Connection timeout", alias='connectionTimeout')
    retry_attempts: int = Field(..., description="Retry attempts", alias='retryAttempts')
    retry_delay: int = Field(..., description="Retry delay", alias='retryDelay')


class PooledConnection(BaseModel):
    """Pooled connection."""
    id: str = Field(..., description="Connection ID")
    url: str = Field(..., description="Connection URL")
    is_active: bool = Field(..., description="Connection active", alias='isActive')
    last_used: int = Field(..., description="Last used timestamp", alias='lastUsed')
    request_count: int = Field(..., description="Request count", alias='requestCount')
    error_count: int = Field(..., description="Error count", alias='errorCount')


# Error Types
class EVMError(BaseModel):
    """EVM error."""
    code: int = Field(..., description="Error code")
    message: str = Field(..., description="Error message")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Error data")


class TransactionError(EVMError):
    """Transaction error."""
    transaction_hash: Optional[str] = Field(default=None, description="Transaction hash", alias='transactionHash')
    receipt: Optional[TransactionReceipt] = Field(default=None, description="Transaction receipt")


class RevertError(EVMError):
    """Contract revert error."""
    reason: Optional[str] = Field(default=None, description="Revert reason")
    signature: Optional[str] = Field(default=None, description="Error signature")
    args: Optional[List[Any]] = Field(default=None, description="Error arguments")


# Fee Estimation
class FeeData(BaseModel):
    """Fee data."""
    gas_price: Optional[str] = Field(default=None, description="Gas price", alias='gasPrice')
    max_fee_per_gas: Optional[str] = Field(default=None, description="Max fee per gas", alias='maxFeePerGas')
    max_priority_fee_per_gas: Optional[str] = Field(
        default=None, description="Max priority fee per gas", alias='maxPriorityFeePerGas'
    )
    base_fee_per_gas: Optional[str] = Field(default=None, description="Base fee per gas", alias='baseFeePerGas')


# Chain Configuration
class ConsensusType(str, Enum):
    """Consensus types."""
    POW = "pow"
    POS = "pos"
    HYPERBFT = "hyperbft"


class GenesisConfig(BaseModel):
    """Genesis block configuration."""
    difficulty: str = Field(..., description="Genesis difficulty")
    gas_limit: int = Field(..., description="Genesis gas limit", alias='gasLimit')
    timestamp: int = Field(..., description="Genesis timestamp")


class ChainConfig(BaseModel):
    """Chain configuration."""
    chain_id: int = Field(..., description="Chain ID", alias='chainId')
    name: str = Field(..., description="Chain name")
    network_id: int = Field(..., description="Network ID", alias='networkId')
    consensus: ConsensusType = Field(..., description="Consensus type")
    forks: Dict[str, int] = Field(..., description="Fork activation blocks")
    genesis: GenesisConfig = Field(..., description="Genesis configuration")


# State Query Types
class StateQuery(BaseModel):
    """State query."""
    address: str = Field(..., description="Contract address")
    storage_key: str = Field(..., description="Storage key", alias='storageKey')
    block_number: Optional[Union[int, str]] = Field(default=None, description="Block number", alias='blockNumber')


class StateResult(BaseModel):
    """State query result."""
    value: str = Field(..., description="Storage value")
    proof: Optional[List[str]] = Field(default=None, description="Merkle proof")


class AccountState(BaseModel):
    """Account state."""
    address: str = Field(..., description="Account address")
    balance: str = Field(..., description="Account balance")
    nonce: int = Field(..., description="Account nonce")
    code_hash: str = Field(..., description="Code hash", alias='codeHash')
    storage_hash: str = Field(..., description="Storage hash", alias='storageHash')
    code: Optional[str] = Field(default=None, description="Contract code")


# Subscription Types for WebSocket
class BlockSubscription(BaseModel):
    """Block subscription."""
    type: Literal["blocks"] = Field(default="blocks", description="Subscription type")
    include_transactions: Optional[bool] = Field(
        default=None, description="Include transactions", alias='includeTransactions'
    )


class TransactionSubscription(BaseModel):
    """Transaction subscription."""
    type: Literal["pendingTransactions"] = Field(default="pendingTransactions", description="Subscription type")
    from_address: Optional[str] = Field(default=None, description="From address", alias='fromAddress')
    to_address: Optional[str] = Field(default=None, description="To address", alias='toAddress')


class LogSubscription(BaseModel):
    """Log subscription."""
    type: Literal["logs"] = Field(default="logs", description="Subscription type")
    filter: FilterOptions = Field(..., description="Log filter")


EVMSubscription = Union[BlockSubscription, TransactionSubscription, LogSubscription]


# Constants
class HyperEVMConstants:
    """HyperEVM constants."""
    
    NETWORKS = {
        'mainnet': HyperEVMNetwork(
            chainId=999,
            name='HyperEVM Mainnet',
            rpcUrl='https://rpc.hyperliquid.xyz/evm',
            wsUrl='wss://api.hyperliquid.xyz/ws',
            blockExplorer='https://hypurrscan.io/',
            currency=NetworkCurrency(name='Hype', symbol='HYPE', decimals=18)
        ),
        'testnet': HyperEVMNetwork(
            chainId=998,
            name='HyperEVM Testnet',
            rpcUrl='https://rpc.hyperliquid-testnet.xyz/evm',
            wsUrl='wss://api.hyperliquid.xyz/ws',
            currency=NetworkCurrency(name='Test Hype', symbol='HYPE', decimals=18)
        )
    }
    
    BLOCK_CONFIGURATIONS = {
        BlockType.SMALL: BlockConfiguration(
            type=BlockType.SMALL,
            frequency=1,
            gasLimit=2000000,
            targetGasUsage=1500000
        ),
        BlockType.LARGE: BlockConfiguration(
            type=BlockType.LARGE,
            frequency=60,
            gasLimit=30000000,
            targetGasUsage=25000000
        )
    }
    
    EVM_CONSTANTS = {
        'ZERO_ADDRESS': '0x0000000000000000000000000000000000000000',
        'MAX_UINT256': '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        'NATIVE_TOKEN_ADDRESS': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        'CREATE2_FACTORY': '0x4e59b44847b379578588920ca78fbf26c0b4956c',
    }
    
    GAS_LIMITS = {
        'SIMPLE_TRANSFER': 21000,
        'ERC20_TRANSFER': 65000,
        'CONTRACT_DEPLOYMENT': 500000,
        'COMPLEX_CONTRACT_CALL': 200000,
        'PRECOMPILE_CALL': 50000
    }


# Update forward references
NetworkCurrency.model_rebuild()
HyperEVMNetwork.model_rebuild()
