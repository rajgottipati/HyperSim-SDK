package utils

import (
	"regexp"
	"strconv"
	"strings"

	"github.com/hypersim/hypersim-go-sdk/types"
)

var (
	ethAddressRegex = regexp.MustCompile(EthereumAddressPattern)
	txHashRegex     = regexp.MustCompile(TransactionHashPattern)
)

// ValidateNetwork validates a network type
func ValidateNetwork(network types.Network) error {
	switch network {
	case types.NetworkMainnet, types.NetworkTestnet:
		return nil
	default:
		return types.ErrValidation("invalid network: "+string(network), nil)
	}
}

// ValidateAddress validates an Ethereum address
func ValidateAddress(address string) error {
	if address == "" {
		return types.ErrValidation("address cannot be empty", nil)
	}
	
	if !ethAddressRegex.MatchString(address) {
		return types.ErrValidation("invalid Ethereum address format", nil)
	}
	
	return nil
}

// ValidateTransactionHash validates a transaction hash
func ValidateTransactionHash(hash string) error {
	if hash == "" {
		return types.ErrValidation("transaction hash cannot be empty", nil)
	}
	
	if !txHashRegex.MatchString(hash) {
		return types.ErrValidation("invalid transaction hash format", nil)
	}
	
	return nil
}

// ValidateTransactionRequest validates a transaction request
func ValidateTransactionRequest(tx *types.TransactionRequest) error {
	if tx == nil {
		return types.ErrValidation("transaction request cannot be nil", nil)
	}
	
	// Validate From address
	if err := ValidateAddress(tx.From); err != nil {
		return types.ErrValidation("invalid from address", err)
	}
	
	// Validate To address if present
	if tx.To != "" {
		if err := ValidateAddress(tx.To); err != nil {
			return types.ErrValidation("invalid to address", err)
		}
	}
	
	// Validate gas limit if present
	if tx.GasLimit != "" {
		gasLimit, err := strconv.ParseInt(tx.GasLimit, 10, 64)
		if err != nil {
			return types.ErrValidation("invalid gas limit format", err)
		}
		if gasLimit < 0 || gasLimit > MaxGasLimit {
			return types.ErrValidation("gas limit out of bounds", nil)
		}
	}
	
	// Validate gas price if present
	if tx.GasPrice != "" {
		gasPrice, err := strconv.ParseInt(tx.GasPrice, 10, 64)
		if err != nil {
			return types.ErrValidation("invalid gas price format", err)
		}
		if gasPrice < 0 {
			return types.ErrValidation("gas price cannot be negative", nil)
		}
	}
	
	// Validate value if present
	if tx.Value != "" {
		value, err := strconv.ParseInt(tx.Value, 10, 64)
		if err != nil {
			return types.ErrValidation("invalid value format", err)
		}
		if value < 0 {
			return types.ErrValidation("value cannot be negative", nil)
		}
	}
	
	// Validate data format if present
	if tx.Data != "" && !strings.HasPrefix(tx.Data, "0x") {
		return types.ErrValidation("data must be hex string starting with 0x", nil)
	}
	
	return nil
}

// ValidateGasAmount validates a gas amount string
func ValidateGasAmount(gas string) error {
	if gas == "" {
		return types.ErrValidation("gas amount cannot be empty", nil)
	}
	
	gasAmount, err := strconv.ParseInt(gas, 10, 64)
	if err != nil {
		return types.ErrValidation("invalid gas amount format", err)
	}
	
	if gasAmount < 0 {
		return types.ErrValidation("gas amount cannot be negative", nil)
	}
	
	return nil
}

// ValidateTimeout validates a timeout duration
func ValidateTimeout(timeout int) error {
	if timeout < 0 {
		return types.ErrValidation("timeout cannot be negative", nil)
	}
	
	if timeout > 0 && timeout < 1000 {
		return types.ErrValidation("timeout must be at least 1000ms", nil)
	}
	
	return nil
}
