"""
HyperCore-specific type definitions for cross-layer integration,
precompile contracts, and L1 state management.
"""

from typing import Dict, List, Optional, Union, Any, Literal
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum
from datetime import datetime


# Core L1 State Types
class LeverageType(BaseModel):
    """Leverage configuration."""
    type: Literal['cross', 'isolated'] = Field(..., description="Leverage type")
    value: int = Field(..., description="Leverage value")
    raw_usd: str = Field(..., description="Raw USD value", alias='rawUsd')


class PerpPosition(BaseModel):
    """Perpetual position information."""
    coin: str = Field(..., description="Asset symbol")
    entry_px: Optional[str] = Field(default=None, description="Entry price", alias='entryPx')
    leverage: LeverageType = Field(..., description="Leverage configuration")
    liquidation_px: Optional[str] = Field(default=None, description="Liquidation price", alias='liquidationPx')
    margin_used: str = Field(..., description="Margin used", alias='marginUsed')
    max_leverage: int = Field(..., description="Maximum leverage", alias='maxLeverage')
    oir: str = Field(..., description="Open interest rate")
    position_value: str = Field(..., description="Position value", alias='positionValue')
    return_on_equity: str = Field(..., description="Return on equity", alias='returnOnEquity')
    szi: str = Field(..., description="Size")
    unrealized_pnl: str = Field(..., description="Unrealized P&L", alias='unrealizedPnl')


class SpotBalance(BaseModel):
    """Spot balance information."""
    coin: str = Field(..., description="Asset symbol")
    hold: str = Field(..., description="Held amount")
    total: str = Field(..., description="Total amount")


class VaultEquity(BaseModel):
    """Vault equity information."""
    vault_address: str = Field(..., description="Vault address", alias='vaultAddress')
    equity: str = Field(..., description="Vault equity")
    withdrawable: str = Field(..., description="Withdrawable amount")
    total_deposited: str = Field(..., description="Total deposited", alias='totalDeposited')
    pnl: str = Field(..., description="Profit and loss")


class WithdrawableBalance(BaseModel):
    """Withdrawable balance information."""
    coin: str = Field(..., description="Asset symbol")
    total: str = Field(..., description="Total amount")
    withdrawable: str = Field(..., description="Withdrawable amount")


# Delegation Types
class Delegation(BaseModel):
    """Delegation information."""
    delegate: str = Field(..., description="Delegate address")
    delegator: str = Field(..., description="Delegator address")
    coin: str = Field(..., description="Asset symbol")
    amount: str = Field(..., description="Delegated amount")
    timestamp: int = Field(..., description="Delegation timestamp")


class DelegatorSummary(BaseModel):
    """Delegator summary information."""
    delegator: str = Field(..., description="Delegator address")
    total_delegated: str = Field(..., description="Total delegated amount", alias='totalDelegated')
    active_delegations: int = Field(..., description="Active delegations count", alias='activeDelegations')
    total_rewards: str = Field(..., description="Total rewards", alias='totalRewards')


# Price Data Types
class PriceType(str, Enum):
    """Price data types."""
    MARK = "mark"
    ORACLE = "oracle"
    SPOT = "spot"


class BasePriceData(BaseModel):
    """Base price data."""
    coin: str = Field(..., description="Asset symbol")
    price: str = Field(..., description="Price")
    timestamp: int = Field(..., description="Price timestamp")
    confidence: float = Field(..., description="Price confidence")


class MarkPrice(BasePriceData):
    """Mark price data."""
    type: Literal["mark"] = Field(default="mark", description="Price type")
    funding_rate: Optional[str] = Field(default=None, description="Funding rate", alias='fundingRate')
    open_interest: Optional[str] = Field(default=None, description="Open interest", alias='openInterest')


class OraclePrice(BasePriceData):
    """Oracle price data."""
    type: Literal["oracle"] = Field(default="oracle", description="Price type")
    source: str = Field(..., description="Oracle source")
    deviation: Optional[str] = Field(default=None, description="Price deviation")


class SpotPrice(BasePriceData):
    """Spot price data."""
    type: Literal["spot"] = Field(default="spot", description="Price type")
    volume_24h: Optional[str] = Field(default=None, description="24h volume", alias='volume24h')
    high_24h: Optional[str] = Field(default=None, description="24h high", alias='high24h')
    low_24h: Optional[str] = Field(default=None, description="24h low", alias='low24h')


# Asset Information Types
class PerpAssetInfo(BaseModel):
    """Perpetual asset information."""
    coin: str = Field(..., description="Asset symbol")
    sz_decimals: int = Field(..., description="Size decimals", alias='szDecimals')
    max_leverage: int = Field(..., description="Maximum leverage", alias='maxLeverage')
    only_isolated: bool = Field(..., description="Only isolated margin", alias='onlyIsolated')
    min_size: str = Field(..., description="Minimum size", alias='minSize')
    impact_notional: str = Field(..., description="Impact notional", alias='impactNotional')
    mark_px: str = Field(..., description="Mark price", alias='markPx')
    mid_px: Optional[str] = Field(default=None, description="Mid price", alias='midPx')
    premium: Optional[str] = Field(default=None, description="Premium")
    funding: Optional[str] = Field(default=None, description="Funding")
    open_interest: Optional[str] = Field(default=None, description="Open interest", alias='openInterest')
    index_px: Optional[str] = Field(default=None, description="Index price", alias='indexPx')


class SpotAssetInfo(BaseModel):
    """Spot asset information."""
    coin: str = Field(..., description="Asset symbol")
    name: str = Field(..., description="Asset name")
    sz_decimals: int = Field(..., description="Size decimals", alias='szDecimals')
    wei_decimals: int = Field(..., description="Wei decimals", alias='weiDecimals')
    index: int = Field(..., description="Asset index")
    token_id: str = Field(..., description="Token ID", alias='tokenId')
    circulating_supply: Optional[str] = Field(default=None, description="Circulating supply", alias='circulatingSupply')
    max_supply: Optional[str] = Field(default=None, description="Maximum supply", alias='maxSupply')


class TokenInfo(BaseModel):
    """Token information."""
    name: str = Field(..., description="Token name")
    sz_decimals: int = Field(..., description="Size decimals", alias='szDecimals')
    wei_decimals: int = Field(..., description="Wei decimals", alias='weiDecimals')
    index: int = Field(..., description="Token index")
    token_id: str = Field(..., description="Token ID", alias='tokenId')
    evm_contract: Optional[str] = Field(default=None, description="EVM contract address", alias='evmContract')
    full_name: Optional[str] = Field(default=None, description="Full token name", alias='fullName')
    circulating: Optional[str] = Field(default=None, description="Circulating supply")
    url: Optional[str] = Field(default=None, description="Token URL")
    description: Optional[str] = Field(default=None, description="Token description")


# L1 Block Information
class L1BlockInfo(BaseModel):
    """L1 block information."""
    block_number: int = Field(..., description="Block number", alias='blockNumber')
    timestamp: int = Field(..., description="Block timestamp")
    hash: str = Field(..., description="Block hash")
    parent_hash: str = Field(..., description="Parent block hash", alias='parentHash')
    state_root: str = Field(..., description="State root", alias='stateRoot')
    transaction_count: int = Field(..., description="Transaction count", alias='transactionCount')
    gas_used: str = Field(..., description="Gas used", alias='gasUsed')
    gas_limit: str = Field(..., description="Gas limit", alias='gasLimit')


# Order Types
class OrderType(BaseModel):
    """Order type configuration."""
    limit: Optional[Dict[str, Any]] = Field(default=None, description="Limit order config")
    trigger: Optional['TriggerConfig'] = Field(default=None, description="Trigger order config")


class TriggerConfig(BaseModel):
    """Trigger order configuration."""
    trigger_px: str = Field(..., description="Trigger price", alias='triggerPx')
    is_market: bool = Field(..., description="Is market order", alias='isMarket')
    tpsl: Literal['tp', 'sl'] = Field(..., description="Take profit or stop loss")


# Cross-Layer Action Types
class L1ActionType(str, Enum):
    """L1 action types."""
    ORDER = "order"
    CANCEL = "cancel"
    CANCEL_BY_CLOID = "cancelByCloid"
    MODIFY = "modify"
    BATCH_MODIFY = "batchModify"
    UPDATE_LEVERAGE = "updateLeverage"
    UPDATE_ISOLATED_MARGIN = "updateIsolatedMargin"
    USD_TRANSFER = "usdTransfer"
    SPOT_TRANSFER = "spotTransfer"
    WITHDRAW = "withdraw"
    SUB_ACCOUNT_TRANSFER = "subAccountTransfer"
    VAULT_TRANSFER = "vaultTransfer"
    SET_REFERRER = "setReferrer"


class BaseL1Action(BaseModel):
    """Base L1 action."""
    type: L1ActionType = Field(..., description="Action type")
    user: str = Field(..., description="User address")
    data: Dict[str, Any] = Field(..., description="Action data")
    timestamp: int = Field(..., description="Action timestamp")
    block_number: int = Field(..., description="Block number", alias='blockNumber')
    tx_hash: Optional[str] = Field(default=None, description="Transaction hash", alias='txHash')


class SpotTransferData(BaseModel):
    """Spot transfer data."""
    token: str = Field(..., description="Token")
    amount: str = Field(..., description="Transfer amount")
    destination: Literal['l1', 'perp'] = Field(..., description="Transfer destination")


class PerpTransferData(BaseModel):
    """Perp transfer data."""
    amount: str = Field(..., description="Transfer amount")
    destination: Literal['spot', 'withdraw'] = Field(..., description="Transfer destination")


class WithdrawActionData(BaseModel):
    """Withdraw action data."""
    token: str = Field(..., description="Token")
    amount: str = Field(..., description="Withdraw amount")
    destination: str = Field(..., description="Destination address")
    nonce: int = Field(..., description="Nonce")
    fee: Optional[str] = Field(default=None, description="Withdraw fee")


class OrderActionData(BaseModel):
    """Order action data."""
    asset: str = Field(..., description="Asset")
    is_buy: bool = Field(..., description="Is buy order", alias='isBuy')
    limit_px: str = Field(..., description="Limit price", alias='limitPx')
    sz: str = Field(..., description="Size")
    reduce_only: bool = Field(..., description="Reduce only", alias='reduceOnly')
    order_type: OrderType = Field(..., description="Order type", alias='orderType')
    cloid: Optional[str] = Field(default=None, description="Client order ID")


# Precompile Contract Interfaces
class PrecompileInput(BaseModel):
    """Precompile function input."""
    name: str = Field(..., description="Input name")
    type: str = Field(..., description="Input type")
    description: str = Field(..., description="Input description")


class PrecompileOutput(BaseModel):
    """Precompile function output."""
    name: str = Field(..., description="Output name")
    type: str = Field(..., description="Output type")
    description: str = Field(..., description="Output description")


class PrecompileFunction(BaseModel):
    """Precompile function definition."""
    name: str = Field(..., description="Function name")
    inputs: List[PrecompileInput] = Field(..., description="Function inputs")
    outputs: List[PrecompileOutput] = Field(..., description="Function outputs")
    description: str = Field(..., description="Function description")


class PrecompileContract(BaseModel):
    """Precompile contract definition."""
    address: str = Field(..., description="Contract address")
    name: str = Field(..., description="Contract name")
    functions: List[PrecompileFunction] = Field(..., description="Contract functions")


# Cross-Layer Integration Types
class CrossLayerQueryType(str, Enum):
    """Cross-layer query types."""
    POSITION = "position"
    BALANCE = "balance"
    EQUITY = "equity"
    PRICE = "price"
    ASSET_INFO = "asset_info"


class CrossLayerQuery(BaseModel):
    """Cross-layer query request."""
    user: str = Field(..., description="User address")
    query_type: CrossLayerQueryType = Field(..., description="Query type", alias='queryType')
    asset: Optional[str] = Field(default=None, description="Asset symbol")
    block_number: Optional[int] = Field(default=None, description="Block number", alias='blockNumber')


class CrossLayerResult(BaseModel):
    """Cross-layer query result."""
    success: bool = Field(..., description="Query success")
    data: Optional[Any] = Field(default=None, description="Query data")
    error: Optional[str] = Field(default=None, description="Error message")
    block_number: int = Field(..., description="Block number", alias='blockNumber')
    timestamp: int = Field(..., description="Result timestamp")


# L1 Account Management
class L1Account(BaseModel):
    """L1 account information."""
    address: str = Field(..., description="Account address")
    exists: bool = Field(..., description="Account exists")
    perp_positions: List[PerpPosition] = Field(..., description="Perpetual positions", alias='perpPositions')
    spot_balances: List[SpotBalance] = Field(..., description="Spot balances", alias='spotBalances')
    vault_equities: List[VaultEquity] = Field(..., description="Vault equities", alias='vaultEquities')
    withdrawable_balances: List[WithdrawableBalance] = Field(
        ..., description="Withdrawable balances", alias='withdrawableBalances'
    )
    total_account_value: str = Field(..., description="Total account value", alias='totalAccountValue')
    margin_used: str = Field(..., description="Margin used", alias='marginUsed')
    margin_available: str = Field(..., description="Margin available", alias='marginAvailable')
    maintenance_margin: str = Field(..., description="Maintenance margin", alias='maintenanceMargin')


# Response Types from Precompiles
class PrecompileResponse(BaseModel):
    """Precompile function response."""
    success: bool = Field(..., description="Call success")
    data: Any = Field(..., description="Response data")
    gas_used: int = Field(..., description="Gas used", alias='gasUsed')
    block_number: int = Field(..., description="Block number", alias='blockNumber')


# Error Types for Cross-Layer Operations
class CrossLayerErrorCode(str, Enum):
    """Cross-layer error codes."""
    ACCOUNT_NOT_EXISTS = "ACCOUNT_NOT_EXISTS"
    INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE"
    INVALID_ASSET = "INVALID_ASSET"
    PRECOMPILE_ERROR = "PRECOMPILE_ERROR"


class CrossLayerError(BaseModel):
    """Cross-layer operation error."""
    code: CrossLayerErrorCode = Field(..., description="Error code")
    message: str = Field(..., description="Error message")
    details: Optional[Any] = Field(default=None, description="Error details")


# State Synchronization Types
class StateSyncRequest(BaseModel):
    """State synchronization request."""
    user: str = Field(..., description="User address")
    components: List[Literal['positions', 'balances', 'orders']] = Field(
        ..., description="Components to sync"
    )
    block_number: Optional[int] = Field(default=None, description="Block number", alias='blockNumber')


class StateSyncResponse(BaseModel):
    """State synchronization response."""
    user: str = Field(..., description="User address")
    block_number: int = Field(..., description="Block number", alias='blockNumber')
    timestamp: int = Field(..., description="Sync timestamp")
    positions: Optional[List[PerpPosition]] = Field(default=None, description="Synchronized positions")
    balances: Optional[List[SpotBalance]] = Field(default=None, description="Synchronized balances")
    orders: Optional[List[Any]] = Field(default=None, description="Synchronized orders")
    synced: bool = Field(..., description="Sync successful")


# Constants
class HyperCoreConstants:
    """HyperCore constants."""
    
    PRECOMPILE_ADDRESSES = {
        'POSITION': '0x0000000000000000000000000000000000000800',
        'SPOT_BALANCE': '0x0000000000000000000000000000000000000801',
        'VAULT_EQUITY': '0x0000000000000000000000000000000000000802',
        'WITHDRAWABLE': '0x0000000000000000000000000000000000000803',
        'DELEGATIONS': '0x0000000000000000000000000000000000000804',
        'DELEGATOR_SUMMARY': '0x0000000000000000000000000000000000000805',
        'MARK_PX': '0x0000000000000000000000000000000000000806',
        'ORACLE_PX': '0x0000000000000000000000000000000000000807',
        'SPOT_PX': '0x0000000000000000000000000000000000000808',
        'L1_BLOCK_NUMBER': '0x0000000000000000000000000000000000000809',
        'PERP_ASSET_INFO': '0x000000000000000000000000000000000000080a',
        'SPOT_INFO': '0x000000000000000000000000000000000000080b',
        'TOKEN_INFO': '0x000000000000000000000000000000000000080c'
    }
    
    CORE_WRITER_ADDRESS = '0x3333333333333333333333333333333333333333'
    ERC20_TRANSFER_ADDRESS = '0x2222222222222222222222222222222222222222'
    
    ASSET_INDICES = {
        'USDC': 0,
        'ETH': 1,
        'BTC': 2,
        'SOL': 3,
        'DOGE': 4,
        'HYPE': 5
    }


# Update forward references
TriggerConfig.model_rebuild()
OrderType.model_rebuild()
