//! Formatting utilities for data conversion

use crate::types::{Address, Wei, Hash};
use crate::error::{HyperSimError, Result};

/// Format wei amount to ETH with specified decimals
pub fn wei_to_ether_string(wei: &Wei, decimals: usize) -> Result<String> {
    let wei_value: u128 = wei.as_str().parse()
        .map_err(|_| HyperSimError::serialization("Invalid wei amount"))?;
    
    let ether = wei_value as f64 / 1e18;
    Ok(format!("{:.precision$}", ether, precision = decimals))
}

/// Format address with checksum encoding (EIP-55)
pub fn checksum_address(address: &Address) -> String {
    // Simplified checksum implementation
    // In production, use a proper EIP-55 implementation
    let addr = address.as_str().to_lowercase();
    addr.chars()
        .enumerate()
        .map(|(i, c)| {
            if i < 2 {
                c // Keep "0x" as-is
            } else if c.is_ascii_hexdigit() && c.is_ascii_alphabetic() {
                // Simple alternating case for demo
                if i % 2 == 0 { c.to_ascii_uppercase() } else { c }
            } else {
                c
            }
        })
        .collect()
}

/// Format gas amount with units
pub fn format_gas_with_units(gas: &str) -> Result<String> {
    let gas_value: u64 = gas.parse()
        .map_err(|_| HyperSimError::serialization("Invalid gas amount"))?;
    
    match gas_value {
        0..=999 => Ok(format!("{} gas", gas_value)),
        1_000..=999_999 => Ok(format!("{:.1}K gas", gas_value as f64 / 1_000.0)),
        1_000_000..=999_999_999 => Ok(format!("{:.1}M gas", gas_value as f64 / 1_000_000.0)),
        _ => Ok(format!("{:.1}B gas", gas_value as f64 / 1_000_000_000.0)),
    }
}

/// Format transaction hash for display (show first 8 and last 4 characters)
pub fn format_hash_short(hash: &Hash) -> String {
    let hash_str = hash.as_str();
    if hash_str.len() >= 14 {
        format!("{}...{}", &hash_str[0..10], &hash_str[hash_str.len()-4..])
    } else {
        hash_str.to_string()
    }
}

/// Format duration in milliseconds to human readable
pub fn format_duration_ms(duration_ms: u64) -> String {
    match duration_ms {
        0..=999 => format!("{}ms", duration_ms),
        1_000..=59_999 => format!("{:.1}s", duration_ms as f64 / 1_000.0),
        60_000..=3_599_999 => format!("{:.1}m", duration_ms as f64 / 60_000.0),
        _ => format!("{:.1}h", duration_ms as f64 / 3_600_000.0),
    }
}

/// Format percentage with specified decimal places
pub fn format_percentage(value: f64, decimals: usize) -> String {
    format!("{:.precision$}%", value * 100.0, precision = decimals)
}

/// Format large numbers with appropriate units (K, M, B)
pub fn format_large_number(value: u64) -> String {
    match value {
        0..=999 => value.to_string(),
        1_000..=999_999 => format!("{:.1}K", value as f64 / 1_000.0),
        1_000_000..=999_999_999 => format!("{:.1}M", value as f64 / 1_000_000.0),
        _ => format!("{:.1}B", value as f64 / 1_000_000_000.0),
    }
}

/// Format timestamp to ISO 8601 string
pub fn format_timestamp(timestamp: u64) -> String {
    let datetime = chrono::DateTime::from_timestamp(timestamp as i64 / 1000, 0)
        .unwrap_or_else(chrono::Utc::now);
    datetime.format("%Y-%m-%dT%H:%M:%SZ").to_string()
}

/// Parse hex string to bytes
pub fn hex_to_bytes(hex: &str) -> Result<Vec<u8>> {
    let hex = if hex.starts_with("0x") { &hex[2..] } else { hex };
    
    if hex.len() % 2 != 0 {
        return Err(HyperSimError::serialization("Hex string must have even length"));
    }
    
    (0..hex.len())
        .step_by(2)
        .map(|i| {
            u8::from_str_radix(&hex[i..i+2], 16)
                .map_err(|_| HyperSimError::serialization("Invalid hex character"))
        })
        .collect()
}

/// Convert bytes to hex string with 0x prefix
pub fn bytes_to_hex(bytes: &[u8]) -> String {
    format!("0x{}", bytes.iter().map(|b| format!("{:02x}", b)).collect::<String>())
}

/// Format contract address with name if known
pub fn format_address_with_name(address: &Address, name: Option<&str>) -> String {
    match name {
        Some(name) => format!("{} ({})", name, format_hash_short(&Hash(address.as_str().to_string()))),
        None => format_hash_short(&Hash(address.as_str().to_string())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wei_to_ether_formatting() {
        let wei = Wei::new("1000000000000000000"); // 1 ETH
        let formatted = wei_to_ether_string(&wei, 4).unwrap();
        assert_eq!(formatted, "1.0000");

        let wei = Wei::new("500000000000000000"); // 0.5 ETH
        let formatted = wei_to_ether_string(&wei, 2).unwrap();
        assert_eq!(formatted, "0.50");
    }

    #[test]
    fn test_gas_formatting() {
        assert_eq!(format_gas_with_units("21000").unwrap(), "21.0K gas");
        assert_eq!(format_gas_with_units("500").unwrap(), "500 gas");
        assert_eq!(format_gas_with_units("2000000").unwrap(), "2.0M gas");
    }

    #[test]
    fn test_hash_short_formatting() {
        let hash = Hash("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string());
        let formatted = format_hash_short(&hash);
        assert!(formatted.contains("0x12345678"));
        assert!(formatted.contains("cdef"));
        assert!(formatted.contains("..."));
    }

    #[test]
    fn test_duration_formatting() {
        assert_eq!(format_duration_ms(500), "500ms");
        assert_eq!(format_duration_ms(2500), "2.5s");
        assert_eq!(format_duration_ms(65000), "1.1m");
        assert_eq!(format_duration_ms(7200000), "2.0h");
    }

    #[test]
    fn test_hex_conversion() {
        let bytes = vec![0x12, 0x34, 0xab, 0xcd];
        let hex = bytes_to_hex(&bytes);
        assert_eq!(hex, "0x1234abcd");

        let parsed_bytes = hex_to_bytes(&hex).unwrap();
        assert_eq!(parsed_bytes, bytes);
    }

    #[test]
    fn test_percentage_formatting() {
        assert_eq!(format_percentage(0.1234, 2), "12.34%");
        assert_eq!(format_percentage(0.5, 1), "50.0%");
    }
}
