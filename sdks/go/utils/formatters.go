package utils

import (
	"encoding/hex"
	"fmt"
	"math/big"
	"strconv"
	"strings"
)

// FormatWei formats a wei amount to a more readable format
func FormatWei(wei string) (string, error) {
	weiBig, ok := new(big.Int).SetString(wei, 10)
	if !ok {
		return "", fmt.Errorf("invalid wei amount: %s", wei)
	}
	
	// Convert to ETH (divide by 10^18)
	eth := new(big.Float).Quo(new(big.Float).SetInt(weiBig), new(big.Float).SetInt(new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil)))
	
	return eth.String(), nil
}

// FormatGwei formats a wei amount to Gwei
func FormatGwei(wei string) (string, error) {
	weiBig, ok := new(big.Int).SetString(wei, 10)
	if !ok {
		return "", fmt.Errorf("invalid wei amount: %s", wei)
	}
	
	// Convert to Gwei (divide by 10^9)
	gwei := new(big.Float).Quo(new(big.Float).SetInt(weiBig), new(big.Float).SetInt(new(big.Int).Exp(big.NewInt(10), big.NewInt(9), nil)))
	
	return gwei.String(), nil
}

// FormatAddress formats an address to ensure consistent casing
func FormatAddress(address string) string {
	if !strings.HasPrefix(address, "0x") {
		return "0x" + address
	}
	return strings.ToLower(address)
}

// FormatHexData ensures hex data has proper 0x prefix
func FormatHexData(data string) string {
	if data == "" {
		return "0x"
	}
	if !strings.HasPrefix(data, "0x") {
		return "0x" + data
	}
	return data
}

// FormatGasPrice formats gas price with proper units
func FormatGasPrice(gasPrice string) (string, error) {
	gwei, err := FormatGwei(gasPrice)
	if err != nil {
		return "", err
	}
	return gwei + " Gwei", nil
}

// ToHex converts a decimal string to hexadecimal
func ToHex(decimal string) (string, error) {
	num, err := strconv.ParseInt(decimal, 10, 64)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("0x%x", num), nil
}

// FromHex converts a hexadecimal string to decimal
func FromHex(hexStr string) (string, error) {
	hexStr = strings.TrimPrefix(hexStr, "0x")
	num, err := strconv.ParseInt(hexStr, 16, 64)
	if err != nil {
		return "", err
	}
	return strconv.FormatInt(num, 10), nil
}

// PadHex pads a hex string to the specified length
func PadHex(hexStr string, length int) string {
	hexStr = strings.TrimPrefix(hexStr, "0x")
	for len(hexStr) < length {
		hexStr = "0" + hexStr
	}
	return "0x" + hexStr
}

// CleanHex removes 0x prefix and makes lowercase
func CleanHex(hexStr string) string {
	return strings.ToLower(strings.TrimPrefix(hexStr, "0x"))
}

// IsHex checks if a string is valid hexadecimal
func IsHex(s string) bool {
	s = strings.TrimPrefix(s, "0x")
	_, err := hex.DecodeString(s)
	return err == nil
}

// TruncateString truncates a string to the specified length with ellipsis
func TruncateString(s string, length int) string {
	if len(s) <= length {
		return s
	}
	if length <= 3 {
		return s[:length]
	}
	return s[:length-3] + "..."
}

// FormatDuration formats a duration in milliseconds to a human-readable string
func FormatDuration(ms int64) string {
	if ms < 1000 {
		return fmt.Sprintf("%dms", ms)
	}
	seconds := float64(ms) / 1000.0
	if seconds < 60 {
		return fmt.Sprintf("%.2fs", seconds)
	}
	minutes := seconds / 60.0
	return fmt.Sprintf("%.2fm", minutes)
}
