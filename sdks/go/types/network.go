package types

import "time"

// Network represents the blockchain network
type Network string

const (
	NetworkMainnet Network = "mainnet"
	NetworkTestnet Network = "testnet"
)

// BlockType represents the type of block (small or large)
type BlockType string

const (
	BlockTypeSmall BlockType = "SMALL"
	BlockTypeLarge BlockType = "LARGE"
)

// NetworkConfig contains network-specific configuration
type NetworkConfig struct {
	DisplayName  string
	ChainID      int64
	RPCURL       string
	WSURL        string
	ExplorerURL  string
	BlockTime    time.Duration
}

// NetworkStatus represents current network status
type NetworkStatus struct {
	Network         Network `json:"network"`
	LatestBlock     int64   `json:"latestBlock"`
	GasPrice        string  `json:"gasPrice"`
	IsHealthy       bool    `json:"isHealthy"`
	AvgBlockTime    float64 `json:"avgBlockTime"`
	CongestionLevel string  `json:"congestionLevel"`
}

// BlockInfo contains information about a block
type BlockInfo struct {
	Number           int64     `json:"number"`
	Hash             string    `json:"hash"`
	Type             BlockType `json:"type"`
	Timestamp        int64     `json:"timestamp"`
	GasLimit         string    `json:"gasLimit"`
	GasUsed          string    `json:"gasUsed"`
	TransactionCount int       `json:"transactionCount"`
}
