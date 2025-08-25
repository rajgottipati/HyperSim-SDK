"""
Validation utilities for HyperSim SDK.
"""

import re
from typing import Optional, Union, Dict, Any
from ..types.errors import ValidationError
from ..types.network import Network
from ..types.simulation import TransactionRequest


# Ethereum address pattern
ETH_ADDRESS_PATTERN = re.compile(r'^0x[a-fA-F0-9]{40}$')

# Hex string pattern
HEX_PATTERN = re.compile(r'^0x[a-fA-F0-9]*$')

# Numeric string pattern
NUMERIC_PATTERN = re.compile(r'^[0-9]+$')


def validate_ethereum_address(address: Optional[str], field_name: str = "address") -> None:
    """Validate Ethereum address format.
    
    Args:
        address: Address to validate
        field_name: Field name for error messages
        
    Raises:
        ValidationError: If address format is invalid
    """
    if address is None:
        return
    
    if not isinstance(address, str):
        raise ValidationError(f"{field_name} must be a string")
    
    if not ETH_ADDRESS_PATTERN.match(address):
        raise ValidationError(
            f"Invalid {field_name} format. Expected 0x followed by 40 hex characters"
        )


def validate_hex_string(hex_str: Optional[str], field_name: str = "hex string") -> None:
    """Validate hex string format.
    
    Args:
        hex_str: Hex string to validate
        field_name: Field name for error messages
        
    Raises:
        ValidationError: If hex string format is invalid
    """
    if hex_str is None:
        return
    
    if not isinstance(hex_str, str):
        raise ValidationError(f"{field_name} must be a string")
    
    if hex_str and not HEX_PATTERN.match(hex_str):
        raise ValidationError(
            f"Invalid {field_name} format. Expected 0x followed by hex characters"
        )


def validate_numeric_string(num_str: Optional[str], field_name: str = "numeric string") -> None:
    """Validate numeric string format.
    
    Args:
        num_str: Numeric string to validate
        field_name: Field name for error messages
        
    Raises:
        ValidationError: If numeric string format is invalid
    """
    if num_str is None:
        return
    
    if not isinstance(num_str, str):
        raise ValidationError(f"{field_name} must be a string")
    
    if not NUMERIC_PATTERN.match(num_str):
        raise ValidationError(
            f"Invalid {field_name} format. Expected numeric string"
        )


def validate_positive_integer(value: Optional[int], field_name: str = "value") -> None:
    """Validate positive integer.
    
    Args:
        value: Value to validate
        field_name: Field name for error messages
        
    Raises:
        ValidationError: If value is not a positive integer
    """
    if value is None:
        return
    
    if not isinstance(value, int):
        raise ValidationError(f"{field_name} must be an integer")
    
    if value < 0:
        raise ValidationError(f"{field_name} must be non-negative")


def validate_network(network: Union[str, Network]) -> Network:
    """Validate and normalize network.
    
    Args:
        network: Network to validate
        
    Returns:
        Network: Validated network enum
        
    Raises:
        ValidationError: If network is invalid
    """
    if isinstance(network, str):
        try:
            return Network(network.lower())
        except ValueError:
            raise ValidationError(f"Invalid network: {network}. Supported: {list(Network)}")
    
    if not isinstance(network, Network):
        raise ValidationError(f"Network must be string or Network enum, got {type(network)}")
    
    return network


def validate_transaction_request(transaction: TransactionRequest) -> None:
    """Validate transaction request.
    
    Args:
        transaction: Transaction to validate
        
    Raises:
        ValidationError: If transaction is invalid
    """
    if not isinstance(transaction, TransactionRequest):
        raise ValidationError("Transaction must be a TransactionRequest instance")
    
    # Validate addresses
    validate_ethereum_address(transaction.from_address, "from_address")
    validate_ethereum_address(transaction.to, "to")
    
    # Validate data
    validate_hex_string(transaction.data, "data")
    
    # Validate numeric fields
    validate_numeric_string(transaction.value, "value")
    validate_numeric_string(transaction.gas_limit, "gas_limit")
    validate_numeric_string(transaction.gas_price, "gas_price")
    validate_numeric_string(transaction.max_fee_per_gas, "max_fee_per_gas")
    validate_numeric_string(transaction.max_priority_fee_per_gas, "max_priority_fee_per_gas")
    
    # Validate nonce
    validate_positive_integer(transaction.nonce, "nonce")
    
    # EIP-1559 validation
    if transaction.max_fee_per_gas is not None or transaction.max_priority_fee_per_gas is not None:
        if transaction.gas_price is not None:
            raise ValidationError("Cannot specify both gas_price and EIP-1559 fee parameters")
        
        if transaction.max_fee_per_gas is None or transaction.max_priority_fee_per_gas is None:
            raise ValidationError("Both max_fee_per_gas and max_priority_fee_per_gas required for EIP-1559")
        
        # Validate fee relationship
        try:
            max_fee = int(transaction.max_fee_per_gas)
            priority_fee = int(transaction.max_priority_fee_per_gas)
            
            if priority_fee > max_fee:
                raise ValidationError("max_priority_fee_per_gas cannot exceed max_fee_per_gas")
        except ValueError as e:
            raise ValidationError(f"Invalid fee values: {e}")


def validate_gas_limit(gas_limit: Optional[str]) -> None:
    """Validate gas limit.
    
    Args:
        gas_limit: Gas limit to validate
        
    Raises:
        ValidationError: If gas limit is invalid
    """
    if gas_limit is None:
        return
    
    validate_numeric_string(gas_limit, "gas_limit")
    
    try:
        limit = int(gas_limit)
        if limit > 30_000_000:  # HyperEVM large block limit
            raise ValidationError(f"Gas limit {limit} exceeds maximum (30,000,000)")
        if limit < 21000:  # Minimum gas for simple transfer
            raise ValidationError(f"Gas limit {limit} below minimum (21,000)")
    except ValueError as e:
        raise ValidationError(f"Invalid gas limit: {e}")


def validate_openai_api_key(api_key: Optional[str]) -> None:
    """Validate OpenAI API key format.
    
    Args:
        api_key: API key to validate
        
    Raises:
        ValidationError: If API key format is invalid
    """
    if api_key is None:
        return
    
    if not isinstance(api_key, str):
        raise ValidationError("OpenAI API key must be a string")
    
    if not api_key.startswith("sk-"):
        raise ValidationError("OpenAI API key must start with 'sk-'")
    
    if len(api_key) < 20:
        raise ValidationError("OpenAI API key appears to be too short")


def validate_config_dict(config: Dict[str, Any], required_fields: list, field_name: str = "config") -> None:
    """Validate configuration dictionary.
    
    Args:
        config: Configuration dictionary to validate
        required_fields: List of required field names
        field_name: Field name for error messages
        
    Raises:
        ValidationError: If configuration is invalid
    """
    if not isinstance(config, dict):
        raise ValidationError(f"{field_name} must be a dictionary")
    
    missing_fields = [field for field in required_fields if field not in config]
    if missing_fields:
        raise ValidationError(f"Missing required {field_name} fields: {missing_fields}")


def sanitize_address(address: Optional[str]) -> Optional[str]:
    """Sanitize Ethereum address to lowercase.
    
    Args:
        address: Address to sanitize
        
    Returns:
        Optional[str]: Sanitized address or None
    """
    if address is None:
        return None
    return address.lower()


def normalize_hex_string(hex_str: Optional[str]) -> Optional[str]:
    """Normalize hex string by ensuring 0x prefix.
    
    Args:
        hex_str: Hex string to normalize
        
    Returns:
        Optional[str]: Normalized hex string or None
    """
    if hex_str is None:
        return None
    
    if hex_str == "":
        return "0x"
    
    if not hex_str.startswith("0x"):
        return f"0x{hex_str}"
    
    return hex_str
