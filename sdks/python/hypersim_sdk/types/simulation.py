"""
Simulation-related types and models.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator
from enum import Enum
from .network import BlockType


class TransactionType(int, Enum):
    """Transaction types."""
    LEGACY = 0
    EIP2930 = 1  # Access list
    EIP1559 = 2  # Fee market


class TransactionRequest(BaseModel):
    """Transaction request for simulation."""
    
    from_address: str = Field(..., alias="from", description="Sender address")
    to: Optional[str] = Field(default=None, description="Recipient address")
    value: Optional[str] = Field(default="0", description="Transaction value in wei")
    data: Optional[str] = Field(default="0x", description="Transaction data")
    gas_limit: Optional[str] = Field(default=None, description="Gas limit")
    gas_price: Optional[str] = Field(default=None, description="Gas price (legacy)")
    max_fee_per_gas: Optional[str] = Field(default=None, description="Max fee per gas (EIP-1559)")
    max_priority_fee_per_gas: Optional[str] = Field(default=None, description="Max priority fee per gas (EIP-1559)")
    nonce: Optional[int] = Field(default=None, description="Transaction nonce")
    transaction_type: Optional[TransactionType] = Field(default=None, description="Transaction type")
    access_list: Optional[List[Dict[str, Any]]] = Field(default=None, description="Access list (EIP-2930/1559)")
    
    model_config = ConfigDict(populate_by_name=True)
    
    @field_validator('from_address', 'to')
    @classmethod
    def validate_address(cls, v):
        """Validate Ethereum addresses."""
        if v is None:
            return v
        if not v.startswith('0x') or len(v) != 42:
            raise ValueError('Invalid Ethereum address format')
        return v.lower()
    
    @field_validator('data')
    @classmethod
    def validate_data(cls, v):
        """Validate transaction data."""
        if v and not v.startswith('0x'):
            return f'0x{v}'
        return v or '0x'


class TraceCall(BaseModel):
    """Individual call in execution trace."""
    
    type: str = Field(..., description="Call type")
    from_address: str = Field(..., alias="from", description="Caller address")
    to: str = Field(..., description="Called address")
    value: str = Field(..., description="Call value")
    input_data: str = Field(..., alias="input", description="Call input data")
    output: Optional[str] = Field(default=None, description="Return data")
    gas_used: str = Field(..., description="Gas used")
    error: Optional[str] = Field(default=None, description="Error if call failed")
    calls: Optional[List['TraceCall']] = Field(default=None, description="Subcalls")
    
    model_config = ConfigDict(populate_by_name=True)


TraceCall.model_rebuild()  # Rebuild to handle forward reference


class GasBreakdown(BaseModel):
    """Gas usage breakdown."""
    
    base_gas: str = Field(..., description="Base transaction gas")
    execution_gas: str = Field(..., description="Execution gas")
    storage_gas: str = Field(..., description="Storage gas")
    memory_gas: str = Field(..., description="Memory expansion gas")
    log_gas: str = Field(..., description="Log gas")


class StorageAccess(BaseModel):
    """Storage access information."""
    
    address: str = Field(..., description="Contract address")
    slot: str = Field(..., description="Storage slot")
    value: str = Field(..., description="Value read/written")
    access_type: str = Field(..., description="Access type", pattern="^(READ|WRITE)$")


class ExecutionTrace(BaseModel):
    """Execution trace for debugging."""
    
    calls: List[TraceCall] = Field(default_factory=list, description="Call stack trace")
    gas_breakdown: GasBreakdown = Field(..., description="Gas usage breakdown")
    storage_accesses: List[StorageAccess] = Field(default_factory=list, description="Storage accesses")


class StateChange(BaseModel):
    """State change information."""
    
    address: str = Field(..., description="Address whose state changed")
    change_type: str = Field(..., description="Type of change", pattern="^(BALANCE|NONCE|CODE|STORAGE)$")
    slot: Optional[str] = Field(default=None, description="Storage slot (for STORAGE type)")
    before: str = Field(..., description="Previous value")
    after: str = Field(..., description="New value")


class SimulationEvent(BaseModel):
    """Event emitted during simulation."""
    
    address: str = Field(..., description="Contract address that emitted the event")
    topics: List[str] = Field(..., description="Event signature hash and indexed parameters")
    data: str = Field(..., description="Event data")
    name: Optional[str] = Field(default=None, description="Event name (if known)")
    args: Optional[Dict[str, Any]] = Field(default=None, description="Decoded event parameters")


class Position(BaseModel):
    """Position information from HyperCore."""
    
    asset: str = Field(..., description="Asset identifier")
    size: str = Field(..., description="Position size")
    entry_price: str = Field(..., description="Entry price")
    unrealized_pnl: str = Field(..., description="Unrealized PnL")
    side: str = Field(..., description="Position side", pattern="^(LONG|SHORT)$")


class MarketDepth(BaseModel):
    """Market depth information."""
    
    bid: str = Field(..., description="Best bid price")
    ask: str = Field(..., description="Best ask price")
    bid_size: str = Field(..., description="Bid size")
    ask_size: str = Field(..., description="Ask size")


class MarketData(BaseModel):
    """Market data from HyperCore."""
    
    prices: Dict[str, str] = Field(default_factory=dict, description="Asset prices")
    depths: Dict[str, MarketDepth] = Field(default_factory=dict, description="Market depths")
    funding_rates: Dict[str, str] = Field(default_factory=dict, description="Funding rates")


class CoreInteraction(BaseModel):
    """Core interaction (cross-layer operation)."""
    
    interaction_type: str = Field(..., description="Interaction type", pattern="^(READ|write)$")
    precompile: str = Field(..., description="Target precompile address")
    data: str = Field(..., description="Interaction data")
    result: Optional[str] = Field(default=None, description="Expected result")


class HyperCoreData(BaseModel):
    """Cross-layer HyperCore data."""
    
    core_state: Dict[str, Any] = Field(default_factory=dict, description="HyperCore state")
    positions: Optional[List[Position]] = Field(default=None, description="Relevant positions")
    market_data: Optional[MarketData] = Field(default=None, description="Market data")
    interactions: Optional[List[CoreInteraction]] = Field(default=None, description="Cross-layer interactions")


class SimulationResult(BaseModel):
    """Result of transaction simulation."""
    
    success: bool = Field(..., description="Whether simulation was successful")
    gas_used: str = Field(..., description="Gas used by the transaction")
    return_data: Optional[str] = Field(default=None, description="Return data from transaction")
    error: Optional[str] = Field(default=None, description="Error message if simulation failed")
    revert_reason: Optional[str] = Field(default=None, description="Revert reason if transaction reverted")
    block_type: BlockType = Field(..., description="Block type for inclusion")
    estimated_block: int = Field(..., description="Estimated block number for inclusion")
    trace: Optional[ExecutionTrace] = Field(default=None, description="Execution trace")
    hypercore_data: Optional[HyperCoreData] = Field(default=None, description="Cross-layer HyperCore data")
    state_changes: List[StateChange] = Field(default_factory=list, description="State changes")
    events: List[SimulationEvent] = Field(default_factory=list, description="Events emitted")
    timestamp: Optional[int] = Field(default=None, description="Simulation timestamp")


class BundleOptimization(BaseModel):
    """Bundle optimization result."""
    
    original_gas: str = Field(..., description="Original total gas cost")
    optimized_gas: str = Field(..., description="Optimized total gas cost")
    gas_saved: str = Field(..., description="Gas saved through optimization")
    suggestions: List[str] = Field(default_factory=list, description="Optimization suggestions")
    reordered_indices: List[int] = Field(default_factory=list, description="Recommended transaction order")
    warnings: Optional[List[str]] = Field(default=None, description="Potential issues identified")
    confidence: Optional[float] = Field(default=None, ge=0, le=1, description="Optimization confidence")
