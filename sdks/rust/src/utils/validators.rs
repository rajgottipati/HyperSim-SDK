//! Validation utilities for input data

use crate::types::{Address, Hash, Wei, TransactionRequest, Network};
use crate::error::{HyperSimError, Result};

/// Validate an Ethereum address
pub fn validate_address(address: &str) -> Result<()> {
    if address.len() != 42 {
        return Err(HyperSimError::validation_with_field(
            "Address must be 42 characters long",
            "address"
        ));
    }

    if !address.starts_with("0x") {
        return Err(HyperSimError::validation_with_field(
            "Address must start with 0x",
            "address"
        ));
    }

    // Check if all characters after 0x are valid hex
    let hex_part = &address[2..];
    if !hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(HyperSimError::validation_with_field(
            "Address contains invalid hexadecimal characters",
            "address"
        ));
    }

    Ok(())
}

/// Validate a transaction hash
pub fn validate_hash(hash: &str) -> Result<()> {
    if hash.len() != 66 {
        return Err(HyperSimError::validation_with_field(
            "Hash must be 66 characters long",
            "hash"
        ));
    }

    if !hash.starts_with("0x") {
        return Err(HyperSimError::validation_with_field(
            "Hash must start with 0x",
            "hash"
        ));
    }

    // Check if all characters after 0x are valid hex
    let hex_part = &hash[2..];
    if !hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(HyperSimError::validation_with_field(
            "Hash contains invalid hexadecimal characters",
            "hash"
        ));
    }

    Ok(())
}

/// Validate a Wei amount string
pub fn validate_wei_amount(amount: &str) -> Result<()> {
    if amount.is_empty() {
        return Err(HyperSimError::validation_with_field(
            "Wei amount cannot be empty",
            "amount"
        ));
    }

    // Check if it's a valid number
    amount.parse::<u128>().map_err(|_| {
        HyperSimError::validation_with_field(
            "Wei amount must be a valid positive integer",
            "amount"
        )
    })?;

    Ok(())
}

/// Validate a hex data string
pub fn validate_hex_data(data: &str) -> Result<()> {
    if !data.starts_with("0x") {
        return Err(HyperSimError::validation_with_field(
            "Hex data must start with 0x",
            "data"
        ));
    }

    let hex_part = &data[2..];
    if hex_part.len() % 2 != 0 {
        return Err(HyperSimError::validation_with_field(
            "Hex data must have even length",
            "data"
        ));
    }

    if !hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(HyperSimError::validation_with_field(
            "Hex data contains invalid characters",
            "data"
        ));
    }

    Ok(())
}

/// Validate a transaction request
pub fn validate_transaction_request(tx: &TransactionRequest) -> Result<()> {
    // Validate from address
    validate_address(&tx.from.0)?;

    // Validate to address if present
    if let Some(ref to) = tx.to {
        validate_address(&to.0)?;
    }

    // Validate value if present
    if let Some(ref value) = tx.value {
        validate_wei_amount(&value.0)?;
    }

    // Validate data if present
    if let Some(ref data) = tx.data {
        validate_hex_data(data)?;
    }

    // Validate gas limit if present
    if let Some(ref gas_limit) = tx.gas_limit {
        gas_limit.parse::<u64>().map_err(|_| {
            HyperSimError::validation_with_field(
                "Gas limit must be a valid positive integer",
                "gas_limit"
            )
        })?;

        let limit: u64 = gas_limit.parse().unwrap();
        if limit > 30_000_000 {
            return Err(HyperSimError::validation_with_field(
                "Gas limit cannot exceed 30M",
                "gas_limit"
            ));
        }
    }

    // Validate gas price if present
    if let Some(ref gas_price) = tx.gas_price {
        validate_wei_amount(&gas_price.0)?;
    }

    // Validate max fee per gas if present
    if let Some(ref max_fee) = tx.max_fee_per_gas {
        validate_wei_amount(&max_fee.0)?;
    }

    // Validate max priority fee per gas if present
    if let Some(ref priority_fee) = tx.max_priority_fee_per_gas {
        validate_wei_amount(&priority_fee.0)?;
    }

    // Validate transaction type if present
    if let Some(tx_type) = tx.tx_type {
        if tx_type > 2 {
            return Err(HyperSimError::validation_with_field(
                "Transaction type must be 0, 1, or 2",
                "tx_type"
            ));
        }
    }

    // EIP-1559 validation
    if tx.tx_type == Some(2) {
        if tx.max_fee_per_gas.is_none() || tx.max_priority_fee_per_gas.is_none() {
            return Err(HyperSimError::validation(
                "EIP-1559 transactions require max_fee_per_gas and max_priority_fee_per_gas"
            ));
        }

        if tx.gas_price.is_some() {
            return Err(HyperSimError::validation(
                "EIP-1559 transactions cannot have gas_price set"
            ));
        }
    }

    Ok(())
}

/// Validate network configuration
pub fn validate_network_config(network: Network, endpoint: Option<&str>) -> Result<()> {
    if let Some(endpoint) = endpoint {
        if !endpoint.starts_with("http://") && !endpoint.starts_with("https://") {
            return Err(HyperSimError::validation(
                "Network endpoint must use HTTP or HTTPS"
            ));
        }

        // Additional validation for production networks
        if network.is_production() && endpoint.contains("localhost") {
            return Err(HyperSimError::validation(
                "Production network cannot use localhost endpoints"
            ));
        }
    }

    Ok(())
}

/// Validate WebSocket endpoint
pub fn validate_websocket_endpoint(endpoint: &str) -> Result<()> {
    if !endpoint.starts_with("ws://") && !endpoint.starts_with("wss://") {
        return Err(HyperSimError::validation(
            "WebSocket endpoint must use WS or WSS protocol"
        ));
    }

    Ok(())
}

/// Check if an address is a valid contract address (not zero address)
pub fn is_contract_address(address: &Address) -> bool {
    address.as_str() != "0x0000000000000000000000000000000000000000"
}

/// Check if a transaction is a contract creation
pub fn is_contract_creation(tx: &TransactionRequest) -> bool {
    tx.to.is_none() && tx.data.is_some()
}

/// Validate gas parameters for consistency
pub fn validate_gas_parameters(
    gas_limit: Option<&str>,
    gas_price: Option<&Wei>,
    max_fee_per_gas: Option<&Wei>,
    max_priority_fee_per_gas: Option<&Wei>,
) -> Result<()> {
    if let Some(limit) = gas_limit {
        let limit_value: u64 = limit.parse()
            .map_err(|_| HyperSimError::validation("Invalid gas limit"))?;
        
        if limit_value < 21000 {
            return Err(HyperSimError::validation(
                "Gas limit must be at least 21000 for basic transactions"
            ));
        }
    }

    // Check EIP-1559 parameter consistency
    if let (Some(max_fee), Some(priority_fee)) = (max_fee_per_gas, max_priority_fee_per_gas) {
        let max_fee_val: u128 = max_fee.0.parse()
            .map_err(|_| HyperSimError::validation("Invalid max fee per gas"))?;
        let priority_fee_val: u128 = priority_fee.0.parse()
            .map_err(|_| HyperSimError::validation("Invalid max priority fee per gas"))?;
            
        if priority_fee_val > max_fee_val {
            return Err(HyperSimError::validation(
                "Max priority fee per gas cannot exceed max fee per gas"
            ));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_address_validation() {
        // Valid address
        assert!(validate_address("0x742d35Cc6563C7dE26d1e0d7Ad8e8c61c94c7De1").is_ok());
        
        // Invalid addresses
        assert!(validate_address("0x742d35Cc6563C7dE26d1e0d7Ad8e8c61c94c7De").is_err()); // Too short
        assert!(validate_address("742d35Cc6563C7dE26d1e0d7Ad8e8c61c94c7De1").is_err());  // Missing 0x
        assert!(validate_address("0x742d35Cc6563C7dE26d1e0d7Ad8e8c61c94c7DeG").is_err()); // Invalid hex
    }

    #[test]
    fn test_hash_validation() {
        // Valid hash
        assert!(validate_hash("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef").is_ok());
        
        // Invalid hashes
        assert!(validate_hash("0x1234567890abcdef").is_err()); // Too short
        assert!(validate_hash("1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef").is_err()); // Missing 0x
    }

    #[test]
    fn test_wei_validation() {
        assert!(validate_wei_amount("1000000000000000000").is_ok()); // 1 ETH in wei
        assert!(validate_wei_amount("0").is_ok());
        assert!(validate_wei_amount("").is_err()); // Empty
        assert!(validate_wei_amount("abc").is_err()); // Not a number
        assert!(validate_wei_amount("-100").is_err()); // Negative
    }

    #[test]
    fn test_hex_data_validation() {
        assert!(validate_hex_data("0x").is_ok()); // Empty data
        assert!(validate_hex_data("0x1234abcd").is_ok()); // Valid hex
        assert!(validate_hex_data("0x123").is_err()); // Odd length
        assert!(validate_hex_data("1234abcd").is_err()); // Missing 0x
        assert!(validate_hex_data("0x123g").is_err()); // Invalid hex character
    }

    #[test]
    fn test_gas_parameters_validation() {
        // Valid parameters
        assert!(validate_gas_parameters(
            Some("21000"),
            Some(&Wei::new("20000000000")),
            None,
            None
        ).is_ok());

        // Invalid gas limit (too low)
        assert!(validate_gas_parameters(
            Some("20000"),
            Some(&Wei::new("20000000000")),
            None,
            None
        ).is_err());

        // EIP-1559: priority fee > max fee
        assert!(validate_gas_parameters(
            Some("21000"),
            None,
            Some(&Wei::new("20000000000")),
            Some(&Wei::new("25000000000")) // Priority fee higher than max fee
        ).is_err());
    }
}
