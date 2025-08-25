//! ABI encoding and decoding utilities

use crate::error::{HyperSimError, Result};

/// Encode function call data
pub fn encode_function_call(function_signature: &str, params: &[&str]) -> Result<String> {
    // This is a simplified implementation
    // In production, use ethers-rs or similar library for proper ABI encoding
    
    let function_selector = keccak256_hash(function_signature.as_bytes());
    let selector = &function_selector[0..8]; // First 4 bytes
    
    let mut encoded = format!("0x{}", hex::encode(selector));
    
    // Simplified parameter encoding (for demo purposes)
    for param in params {
        let padded = format!("{:0>64}", param.trim_start_matches("0x"));
        encoded.push_str(&padded);
    }
    
    Ok(encoded)
}

/// Decode function call data
pub fn decode_function_call(data: &str) -> Result<(String, Vec<String>)> {
    if data.len() < 10 {
        return Err(HyperSimError::abi("Invalid function call data"));
    }
    
    let selector = &data[2..10];
    let params_data = &data[10..];
    
    // Simplified decoding (for demo purposes)
    let mut params = Vec::new();
    let mut i = 0;
    while i + 64 <= params_data.len() {
        let param = &params_data[i..i+64];
        params.push(format!("0x{}", param));
        i += 64;
    }
    
    Ok((format!("0x{}", selector), params))
}

/// Encode event signature
pub fn encode_event_signature(event_signature: &str) -> Result<String> {
    let hash = keccak256_hash(event_signature.as_bytes());
    Ok(format!("0x{}", hex::encode(hash)))
}

/// Calculate keccak256 hash
fn keccak256_hash(data: &[u8]) -> [u8; 32] {
    use keccak_hash::Keccak;
    let mut hasher = Keccak::v256();
    let mut output = [0u8; 32];
    hasher.update(data);
    hasher.finalize(&mut output);
    output
}

/// Encode address parameter
pub fn encode_address(address: &str) -> Result<String> {
    let address = address.trim_start_matches("0x");
    if address.len() != 40 {
        return Err(HyperSimError::abi("Invalid address length"));
    }
    
    Ok(format!("{:0>64}", address))
}

/// Encode uint256 parameter
pub fn encode_uint256(value: &str) -> Result<String> {
    let value = value.trim_start_matches("0x");
    if value.len() > 64 {
        return Err(HyperSimError::abi("Value too large for uint256"));
    }
    
    Ok(format!("{:0>64}", value))
}

/// Encode string parameter
pub fn encode_string(s: &str) -> Result<String> {
    let bytes = s.as_bytes();
    let length = format!("{:064x}", bytes.len());
    let mut data = hex::encode(bytes);
    
    // Pad to 32-byte boundary
    while data.len() % 64 != 0 {
        data.push('0');
    }
    
    Ok(format!("{}{}", length, data))
}

/// Decode address from ABI encoded data
pub fn decode_address(data: &str) -> Result<String> {
    if data.len() != 64 {
        return Err(HyperSimError::abi("Invalid address data length"));
    }
    
    let address = &data[24..64]; // Last 20 bytes (40 hex chars)
    Ok(format!("0x{}", address))
}

/// Decode uint256 from ABI encoded data
pub fn decode_uint256(data: &str) -> Result<String> {
    if data.len() != 64 {
        return Err(HyperSimError::abi("Invalid uint256 data length"));
    }
    
    // Remove leading zeros
    let trimmed = data.trim_start_matches('0');
    if trimmed.is_empty() {
        Ok("0".to_string())
    } else {
        Ok(format!("0x{}", trimmed))
    }
}

/// Common function selectors
pub mod selectors {
    /// ERC-20 transfer function
    pub const TRANSFER: &str = "0xa9059cbb";
    
    /// ERC-20 transferFrom function
    pub const TRANSFER_FROM: &str = "0x23b872dd";
    
    /// ERC-20 approve function
    pub const APPROVE: &str = "0x095ea7b3";
    
    /// ERC-20 balanceOf function
    pub const BALANCE_OF: &str = "0x70a08231";
    
    /// ERC-20 allowance function
    pub const ALLOWANCE: &str = "0xdd62ed3e";
}

/// Common event signatures
pub mod events {
    /// ERC-20 Transfer event
    pub const TRANSFER: &str = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    
    /// ERC-20 Approval event
    pub const APPROVAL: &str = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";
}

/// Create function signature for common operations
pub fn create_transfer_signature(to: &str, amount: &str) -> Result<String> {
    encode_function_call(
        "transfer(address,uint256)",
        &[&encode_address(to)?, &encode_uint256(amount)?]
    )
}

/// Create approve signature
pub fn create_approve_signature(spender: &str, amount: &str) -> Result<String> {
    encode_function_call(
        "approve(address,uint256)",
        &[&encode_address(spender)?, &encode_uint256(amount)?]
    )
}

/// Parse ERC-20 transfer event data
pub fn parse_transfer_event(topics: &[String], data: &str) -> Result<(String, String, String)> {
    if topics.len() < 3 {
        return Err(HyperSimError::abi("Invalid transfer event topics"));
    }
    
    // topics[0] is event signature, topics[1] is from, topics[2] is to
    let from = decode_address(&topics[1][2..])?;
    let to = decode_address(&topics[2][2..])?;
    let amount = decode_uint256(data.trim_start_matches("0x"))?;
    
    Ok((from, to, amount))
}

#[cfg(feature = "cross-layer")]
pub mod cross_layer {
    use super::*;
    
    /// Encode cross-layer transaction data
    pub fn encode_cross_layer_tx(
        target_chain: u64,
        target_address: &str,
        data: &str,
    ) -> Result<String> {
        let chain_data = encode_uint256(&format!("{:x}", target_chain))?;
        let address_data = encode_address(target_address)?;
        let data_length = encode_uint256(&format!("{:x}", data.len() / 2))?;
        
        Ok(format!("0x{}{}{}{}", 
            &chain_data[..64],
            &address_data[..64], 
            &data_length[..64],
            data.trim_start_matches("0x")
        ))
    }
    
    /// Decode cross-layer transaction data
    pub fn decode_cross_layer_tx(encoded: &str) -> Result<(u64, String, String)> {
        if encoded.len() < 194 { // Minimum length for header
            return Err(HyperSimError::abi("Invalid cross-layer data length"));
        }
        
        let encoded = encoded.trim_start_matches("0x");
        
        let chain_hex = &encoded[0..64];
        let address_hex = &encoded[64..128];
        let length_hex = &encoded[128..192];
        
        let chain_id = u64::from_str_radix(chain_hex.trim_start_matches('0'), 16)
            .map_err(|_| HyperSimError::abi("Invalid chain ID"))?;
        
        let address = decode_address(address_hex)?;
        
        let data_length = usize::from_str_radix(length_hex.trim_start_matches('0'), 16)
            .map_err(|_| HyperSimError::abi("Invalid data length"))?;
        
        let data = if data_length > 0 {
            format!("0x{}", &encoded[192..192 + data_length * 2])
        } else {
            "0x".to_string()
        };
        
        Ok((chain_id, address, data))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_function_encoding() {
        let encoded = encode_function_call("transfer(address,uint256)", &[
            "0000000000000000000000001234567890123456789012345678901234567890",
            "00000000000000000000000000000000000000000000000000000000000003e8"
        ]).unwrap();
        
        assert!(encoded.starts_with("0x"));
        assert_eq!(encoded.len(), 138); // 2 + 8 + 64 + 64
    }

    #[test]
    fn test_address_encoding() {
        let encoded = encode_address("0x1234567890123456789012345678901234567890").unwrap();
        assert_eq!(encoded.len(), 64);
        assert!(encoded.ends_with("1234567890123456789012345678901234567890"));
    }

    #[test]
    fn test_uint256_encoding() {
        let encoded = encode_uint256("0x3e8").unwrap();
        assert_eq!(encoded.len(), 64);
        assert!(encoded.ends_with("3e8"));
    }

    #[test]
    fn test_address_decoding() {
        let decoded = decode_address("0000000000000000000000001234567890123456789012345678901234567890").unwrap();
        assert_eq!(decoded, "0x1234567890123456789012345678901234567890");
    }

    #[test]
    fn test_uint256_decoding() {
        let decoded = decode_uint256("00000000000000000000000000000000000000000000000000000000000003e8").unwrap();
        assert_eq!(decoded, "0x3e8");
    }

    #[test]
    fn test_common_selectors() {
        assert_eq!(selectors::TRANSFER, "0xa9059cbb");
        assert_eq!(selectors::BALANCE_OF, "0x70a08231");
    }

    #[cfg(feature = "cross-layer")]
    #[test]
    fn test_cross_layer_encoding() {
        let encoded = cross_layer::encode_cross_layer_tx(
            137, // Polygon
            "0x1234567890123456789012345678901234567890",
            "0xabcd"
        ).unwrap();
        
        assert!(encoded.starts_with("0x"));
        
        let (chain_id, address, data) = cross_layer::decode_cross_layer_tx(&encoded).unwrap();
        assert_eq!(chain_id, 137);
        assert_eq!(address, "0x1234567890123456789012345678901234567890");
        assert_eq!(data, "0xabcd");
    }
}
