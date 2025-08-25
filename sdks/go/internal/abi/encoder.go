package abi

import (
	"encoding/hex"
	"fmt"
	"math/big"
	"reflect"
	"strconv"
	"strings"
)

// ABIEncoder provides ABI encoding functionality for HyperCore integration
type ABIEncoder struct{}

// NewABIEncoder creates a new ABI encoder instance
func NewABIEncoder() *ABIEncoder {
	return &ABIEncoder{}
}

// EncodeFunction encodes a function call with parameters
func (e *ABIEncoder) EncodeFunction(functionSig string, params []interface{}) (string, error) {
	// Extract function name and parameter types
	functionName, paramTypes, err := e.parseFunctionSignature(functionSig)
	if err != nil {
		return "", fmt.Errorf("failed to parse function signature: %w", err)
	}
	
	// Generate function selector (first 4 bytes of keccak256 hash)
	selector := e.functionSelector(functionName, paramTypes)
	
	// Encode parameters
	encodedParams, err := e.encodeParameters(paramTypes, params)
	if err != nil {
		return "", fmt.Errorf("failed to encode parameters: %w", err)
	}
	
	return "0x" + selector + encodedParams, nil
}

// DecodeReturnData decodes function return data
func (e *ABIEncoder) DecodeReturnData(data string, returnTypes []string) ([]interface{}, error) {
	if !strings.HasPrefix(data, "0x") {
		return nil, fmt.Errorf("invalid hex data: missing 0x prefix")
	}
	
	hexData := strings.TrimPrefix(data, "0x")
	bytes, err := hex.DecodeString(hexData)
	if err != nil {
		return nil, fmt.Errorf("failed to decode hex data: %w", err)
	}
	
	return e.decodeParameters(returnTypes, bytes)
}

// EncodeEventData encodes event data
func (e *ABIEncoder) EncodeEventData(eventSig string, params []interface{}) ([]string, string, error) {
	// Parse event signature
	eventName, paramTypes, err := e.parseFunctionSignature(eventSig)
	if err != nil {
		return nil, "", fmt.Errorf("failed to parse event signature: %w", err)
	}
	
	// Generate event topic (keccak256 hash of signature)
	topic0 := e.eventTopic(eventName, paramTypes)
	topics := []string{"0x" + topic0}
	
	// For simplicity, encode all parameters as data (not topics)
	data, err := e.encodeParameters(paramTypes, params)
	if err != nil {
		return nil, "", fmt.Errorf("failed to encode event data: %w", err)
	}
	
	return topics, "0x" + data, nil
}

// parseFunctionSignature parses a function signature like "transfer(address,uint256)"
func (e *ABIEncoder) parseFunctionSignature(sig string) (string, []string, error) {
	openParen := strings.Index(sig, "(")
	closeParen := strings.LastIndex(sig, ")")
	
	if openParen == -1 || closeParen == -1 || openParen >= closeParen {
		return "", nil, fmt.Errorf("invalid function signature format")
	}
	
	functionName := sig[:openParen]
	paramsStr := sig[openParen+1 : closeParen]
	
	var paramTypes []string
	if paramsStr != "" {
		paramTypes = strings.Split(paramsStr, ",")
		for i, param := range paramTypes {
			paramTypes[i] = strings.TrimSpace(param)
		}
	}
	
	return functionName, paramTypes, nil
}

// functionSelector generates a 4-byte function selector
func (e *ABIEncoder) functionSelector(name string, paramTypes []string) string {
	signature := name + "(" + strings.Join(paramTypes, ",") + ")"
	hash := e.keccak256([]byte(signature))
	return hex.EncodeToString(hash[:4])
}

// eventTopic generates an event topic (32-byte hash)
func (e *ABIEncoder) eventTopic(name string, paramTypes []string) string {
	signature := name + "(" + strings.Join(paramTypes, ",") + ")"
	hash := e.keccak256([]byte(signature))
	return hex.EncodeToString(hash)
}

// encodeParameters encodes function parameters
func (e *ABIEncoder) encodeParameters(types []string, values []interface{}) (string, error) {
	if len(types) != len(values) {
		return "", fmt.Errorf("types and values length mismatch")
	}
	
	var encoded strings.Builder
	
	for i, typ := range types {
		value := values[i]
		encodedValue, err := e.encodeValue(typ, value)
		if err != nil {
			return "", fmt.Errorf("failed to encode parameter %d: %w", i, err)
		}
		encoded.WriteString(encodedValue)
	}
	
	return encoded.String(), nil
}

// encodeValue encodes a single value based on its type
func (e *ABIEncoder) encodeValue(typ string, value interface{}) (string, error) {
	switch {
	case typ == "address":
		return e.encodeAddress(value)
	case strings.HasPrefix(typ, "uint"):
		return e.encodeUint(value)
	case strings.HasPrefix(typ, "int"):
		return e.encodeInt(value)
	case typ == "bool":
		return e.encodeBool(value)
	case strings.HasPrefix(typ, "bytes"):
		return e.encodeBytes(value)
	case typ == "string":
		return e.encodeString(value)
	default:
		return "", fmt.Errorf("unsupported type: %s", typ)
	}
}

// encodeAddress encodes an Ethereum address
func (e *ABIEncoder) encodeAddress(value interface{}) (string, error) {
	addr, ok := value.(string)
	if !ok {
		return "", fmt.Errorf("address must be string")
	}
	
	addr = strings.TrimPrefix(addr, "0x")
	if len(addr) != 40 {
		return "", fmt.Errorf("invalid address length")
	}
	
	// Pad to 32 bytes (64 hex chars)
	return strings.Repeat("0", 24) + strings.ToLower(addr), nil
}

// encodeUint encodes an unsigned integer
func (e *ABIEncoder) encodeUint(value interface{}) (string, error) {
	var num *big.Int
	
	switch v := value.(type) {
	case string:
		var ok bool
		num, ok = new(big.Int).SetString(v, 10)
		if !ok {
			return "", fmt.Errorf("invalid uint string: %s", v)
		}
	case int, int8, int16, int32, int64:
		num = big.NewInt(reflect.ValueOf(v).Int())
	case uint, uint8, uint16, uint32, uint64:
		num = new(big.Int).SetUint64(reflect.ValueOf(v).Uint())
	case *big.Int:
		num = v
	default:
		return "", fmt.Errorf("unsupported uint type: %T", value)
	}
	
	if num.Sign() < 0 {
		return "", fmt.Errorf("uint cannot be negative")
	}
	
	// Convert to 32-byte hex string
	bytes := num.Bytes()
	padded := make([]byte, 32)
	copy(padded[32-len(bytes):], bytes)
	
	return hex.EncodeToString(padded), nil
}

// encodeInt encodes a signed integer
func (e *ABIEncoder) encodeInt(value interface{}) (string, error) {
	// For simplicity, treat as uint for now
	// In a full implementation, handle two's complement for negative numbers
	return e.encodeUint(value)
}

// encodeBool encodes a boolean value
func (e *ABIEncoder) encodeBool(value interface{}) (string, error) {
	bool, ok := value.(bool)
	if !ok {
		return "", fmt.Errorf("bool value must be boolean type")
	}
	
	if bool {
		return strings.Repeat("0", 63) + "1", nil
	}
	return strings.Repeat("0", 64), nil
}

// encodeBytes encodes bytes data
func (e *ABIEncoder) encodeBytes(value interface{}) (string, error) {
	var data []byte
	
	switch v := value.(type) {
	case []byte:
		data = v
	case string:
		if strings.HasPrefix(v, "0x") {
			var err error
			data, err = hex.DecodeString(v[2:])
			if err != nil {
				return "", err
			}
		} else {
			data = []byte(v)
		}
	default:
		return "", fmt.Errorf("bytes value must be []byte or string")
	}
	
	// Pad to multiple of 32 bytes
	padded := make([]byte, ((len(data)+31)/32)*32)
	copy(padded, data)
	
	return hex.EncodeToString(padded), nil
}

// encodeString encodes a string value
func (e *ABIEncoder) encodeString(value interface{}) (string, error) {
	str, ok := value.(string)
	if !ok {
		return "", fmt.Errorf("string value must be string type")
	}
	
	return e.encodeBytes([]byte(str))
}

// decodeParameters decodes parameters from bytes
func (e *ABIEncoder) decodeParameters(types []string, data []byte) ([]interface{}, error) {
	var results []interface{}
	offset := 0
	
	for _, typ := range types {
		if offset+32 > len(data) {
			return nil, fmt.Errorf("insufficient data for type %s", typ)
		}
		
		value, err := e.decodeValue(typ, data[offset:offset+32])
		if err != nil {
			return nil, err
		}
		
		results = append(results, value)
		offset += 32
	}
	
	return results, nil
}

// decodeValue decodes a single value
func (e *ABIEncoder) decodeValue(typ string, data []byte) (interface{}, error) {
	switch {
	case typ == "address":
		return "0x" + hex.EncodeToString(data[12:32]), nil
	case strings.HasPrefix(typ, "uint"):
		return new(big.Int).SetBytes(data).String(), nil
	case typ == "bool":
		return data[31] != 0, nil
	default:
		return hex.EncodeToString(data), nil
	}
}

// Simple keccak256 implementation (in production, use a proper crypto library)
func (e *ABIEncoder) keccak256(data []byte) []byte {
	// This is a placeholder - use a proper keccak256 implementation
	// For now, return a fake hash for compilation
	hash := make([]byte, 32)
	for i, b := range data {
		hash[i%32] ^= b
	}
	return hash
}
