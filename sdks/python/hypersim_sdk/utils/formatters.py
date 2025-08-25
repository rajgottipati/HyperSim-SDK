"""
Formatting utilities for HyperSim SDK.
"""

from typing import Dict, Any, Optional, Union
from decimal import Decimal
import json
from datetime import datetime
from ..types.simulation import TransactionRequest, SimulationResult
from ..types.network import BlockType


def format_wei_to_ether(wei_value: Union[str, int]) -> str:
    """Convert wei to ether string.
    
    Args:
        wei_value: Value in wei
        
    Returns:
        str: Value in ether with appropriate precision
    """
    try:
        wei = Decimal(str(wei_value))
        ether = wei / Decimal('1000000000000000000')  # 10^18
        return f"{ether:.6f}"
    except (ValueError, TypeError):
        return "0.0"


def format_ether_to_wei(ether_value: Union[str, float, Decimal]) -> str:
    """Convert ether to wei string.
    
    Args:
        ether_value: Value in ether
        
    Returns:
        str: Value in wei
    """
    try:
        ether = Decimal(str(ether_value))
        wei = ether * Decimal('1000000000000000000')  # 10^18
        return str(int(wei))
    except (ValueError, TypeError):
        return "0"


def format_gas_price_gwei(gas_price: Union[str, int]) -> str:
    """Format gas price in Gwei.
    
    Args:
        gas_price: Gas price in wei
        
    Returns:
        str: Gas price in Gwei with appropriate precision
    """
    try:
        wei = Decimal(str(gas_price))
        gwei = wei / Decimal('1000000000')  # 10^9
        return f"{gwei:.2f} Gwei"
    except (ValueError, TypeError):
        return "0.0 Gwei"


def format_transaction_for_display(transaction: TransactionRequest) -> Dict[str, Any]:
    """Format transaction for display.
    
    Args:
        transaction: Transaction to format
        
    Returns:
        Dict[str, Any]: Formatted transaction data
    """
    return {
        "from": transaction.from_address,
        "to": transaction.to or "Contract Creation",
        "value": format_wei_to_ether(transaction.value or "0"),
        "gas_limit": transaction.gas_limit or "Auto",
        "gas_price": format_gas_price_gwei(transaction.gas_price or "0") if transaction.gas_price else "EIP-1559",
        "data_size": len(transaction.data or "0x") - 2 if transaction.data else 0,
        "type": transaction.transaction_type.value if transaction.transaction_type else "Auto"
    }


def format_simulation_result_summary(result: SimulationResult) -> Dict[str, Any]:
    """Format simulation result summary.
    
    Args:
        result: Simulation result to format
        
    Returns:
        Dict[str, Any]: Formatted result summary
    """
    return {
        "status": "SUCCESS" if result.success else "FAILED",
        "gas_used": f"{int(result.gas_used):,}",
        "gas_cost_eth": format_wei_to_ether(int(result.gas_used) * 20_000_000_000),  # Estimate at 20 Gwei
        "block_type": result.block_type.value.upper(),
        "estimated_block": result.estimated_block,
        "error": result.error,
        "revert_reason": result.revert_reason,
        "events_count": len(result.events),
        "state_changes": len(result.state_changes)
    }


def format_block_type_info(block_type: BlockType) -> Dict[str, Any]:
    """Format block type information.
    
    Args:
        block_type: Block type to format
        
    Returns:
        Dict[str, Any]: Block type information
    """
    if block_type == BlockType.SMALL:
        return {
            "type": "Small Block",
            "gas_limit": "2,000,000",
            "interval": "1 second",
            "typical_use": "Simple transfers, basic operations"
        }
    else:
        return {
            "type": "Large Block",
            "gas_limit": "30,000,000",
            "interval": "1 minute",
            "typical_use": "Complex contracts, DeFi operations"
        }


def format_address_short(address: Optional[str], chars: int = 6) -> str:
    """Format address with ellipsis.
    
    Args:
        address: Address to format
        chars: Number of characters to show on each side
        
    Returns:
        str: Shortened address
    """
    if not address:
        return "N/A"
    
    if len(address) <= chars * 2 + 2:  # +2 for '0x'
        return address
    
    return f"{address[:chars+2]}...{address[-chars:]}"


def format_timestamp(timestamp: Union[int, float, datetime]) -> str:
    """Format timestamp for display.
    
    Args:
        timestamp: Timestamp to format
        
    Returns:
        str: Formatted timestamp
    """
    if isinstance(timestamp, (int, float)):
        timestamp = datetime.fromtimestamp(timestamp)
    
    return timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")


def format_json_compact(data: Any) -> str:
    """Format data as compact JSON.
    
    Args:
        data: Data to format
        
    Returns:
        str: Compact JSON string
    """
    return json.dumps(data, separators=(',', ':'), default=str)


def format_json_pretty(data: Any) -> str:
    """Format data as pretty JSON.
    
    Args:
        data: Data to format
        
    Returns:
        str: Pretty JSON string
    """
    return json.dumps(data, indent=2, default=str)


def format_bytes_size(size_bytes: int) -> str:
    """Format byte size for display.
    
    Args:
        size_bytes: Size in bytes
        
    Returns:
        str: Formatted size string
    """
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB"]
    i = 0
    size = float(size_bytes)
    
    while size >= 1024.0 and i < len(size_names) - 1:
        size /= 1024.0
        i += 1
    
    return f"{size:.1f} {size_names[i]}"


def format_percentage(value: float, decimals: int = 2) -> str:
    """Format value as percentage.
    
    Args:
        value: Value between 0 and 1
        decimals: Number of decimal places
        
    Returns:
        str: Formatted percentage
    """
    return f"{value * 100:.{decimals}f}%"


def format_duration(seconds: float) -> str:
    """Format duration in human-readable format.
    
    Args:
        seconds: Duration in seconds
        
    Returns:
        str: Formatted duration
    """
    if seconds < 1:
        return f"{seconds * 1000:.0f}ms"
    elif seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        minutes = seconds // 60
        secs = seconds % 60
        return f"{int(minutes)}m {int(secs)}s"
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        return f"{int(hours)}h {int(minutes)}m"


def format_number_compact(number: Union[int, float]) -> str:
    """Format large numbers with K, M, B suffixes.
    
    Args:
        number: Number to format
        
    Returns:
        str: Formatted number string
    """
    if abs(number) >= 1_000_000_000:
        return f"{number / 1_000_000_000:.1f}B"
    elif abs(number) >= 1_000_000:
        return f"{number / 1_000_000:.1f}M"
    elif abs(number) >= 1_000:
        return f"{number / 1_000:.1f}K"
    else:
        return str(number)
