package types

// HyperCoreData contains cross-layer data from HyperCore
type HyperCoreData struct {
	CoreState    map[string]interface{} `json:"coreState"`
	Positions    []Position             `json:"positions,omitempty"`
	MarketData   *MarketData            `json:"marketData,omitempty"`
	Interactions []CoreInteraction      `json:"interactions,omitempty"`
}

// Position represents a trading position
type Position struct {
	Asset         string `json:"asset"`
	Size          string `json:"size"`
	EntryPrice    string `json:"entryPrice"`
	UnrealizedPnL string `json:"unrealizedPnl"`
	Side          string `json:"side"` // LONG or SHORT
}

// MarketData contains market information
type MarketData struct {
	Prices       map[string]string     `json:"prices"`
	Depths       map[string]MarketDepth `json:"depths"`
	FundingRates map[string]string     `json:"fundingRates"`
}

// MarketDepth represents bid/ask depth information
type MarketDepth struct {
	Bid     string `json:"bid"`
	Ask     string `json:"ask"`
	BidSize string `json:"bidSize"`
	AskSize string `json:"askSize"`
}

// CoreInteraction represents a cross-layer operation
type CoreInteraction struct {
	Type       string `json:"type"`       // READ or WRITE
	Precompile string `json:"precompile"`
	Data       string `json:"data"`
	Result     string `json:"result,omitempty"`
}
