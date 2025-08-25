package types

// TransactionRequest represents a transaction to be simulated
type TransactionRequest struct {
	From                 string `json:"from"`
	To                   string `json:"to,omitempty"`
	Value                string `json:"value,omitempty"`
	Data                 string `json:"data,omitempty"`
	GasLimit             string `json:"gasLimit,omitempty"`
	GasPrice             string `json:"gasPrice,omitempty"`
	MaxFeePerGas         string `json:"maxFeePerGas,omitempty"`
	MaxPriorityFeePerGas string `json:"maxPriorityFeePerGas,omitempty"`
	Nonce                *int64 `json:"nonce,omitempty"`
	Type                 *int   `json:"type,omitempty"`
}

// SimulationResult contains the result of transaction simulation
type SimulationResult struct {
	Success          bool              `json:"success"`
	GasUsed          string            `json:"gasUsed"`
	ReturnData       string            `json:"returnData,omitempty"`
	Error            string            `json:"error,omitempty"`
	RevertReason     string            `json:"revertReason,omitempty"`
	BlockType        BlockType         `json:"blockType"`
	EstimatedBlock   int64             `json:"estimatedBlock"`
	Trace            *ExecutionTrace   `json:"trace,omitempty"`
	HyperCoreData    *HyperCoreData    `json:"hyperCoreData,omitempty"`
	StateChanges     []StateChange     `json:"stateChanges,omitempty"`
	Events           []SimulationEvent `json:"events,omitempty"`
}

// ExecutionTrace contains execution trace information
type ExecutionTrace struct {
	Calls           []TraceCall       `json:"calls"`
	GasBreakdown    GasBreakdown      `json:"gasBreakdown"`
	StorageAccesses []StorageAccess   `json:"storageAccesses"`
}

// TraceCall represents a single call in the execution trace
type TraceCall struct {
	Type     string       `json:"type"`
	From     string       `json:"from"`
	To       string       `json:"to"`
	Value    string       `json:"value"`
	Input    string       `json:"input"`
	Output   string       `json:"output,omitempty"`
	GasUsed  string       `json:"gasUsed"`
	Error    string       `json:"error,omitempty"`
	Calls    []TraceCall  `json:"calls,omitempty"`
}

// GasBreakdown provides detailed gas usage information
type GasBreakdown struct {
	BaseGas      string `json:"baseGas"`
	ExecutionGas string `json:"executionGas"`
	StorageGas   string `json:"storageGas"`
	MemoryGas    string `json:"memoryGas"`
	LogGas       string `json:"logGas"`
}

// StorageAccess represents a storage read/write operation
type StorageAccess struct {
	Address string `json:"address"`
	Slot    string `json:"slot"`
	Value   string `json:"value"`
	Type    string `json:"type"` // READ or WRITE
}

// StateChange represents a state modification
type StateChange struct {
	Address string  `json:"address"`
	Type    string  `json:"type"`    // BALANCE, NONCE, CODE, STORAGE
	Slot    *string `json:"slot,omitempty"`
	Before  string  `json:"before"`
	After   string  `json:"after"`
}

// SimulationEvent represents an event emitted during simulation
type SimulationEvent struct {
	Address string                 `json:"address"`
	Topics  []string               `json:"topics"`
	Data    string                 `json:"data"`
	Name    string                 `json:"name,omitempty"`
	Args    map[string]interface{} `json:"args,omitempty"`
}

// BundleOptimization contains bundle optimization results
type BundleOptimization struct {
	OriginalGas       string   `json:"originalGas"`
	OptimizedGas      string   `json:"optimizedGas"`
	GasSaved          string   `json:"gasSaved"`
	Suggestions       []string `json:"suggestions"`
	ReorderedIndices  []int    `json:"reorderedIndices"`
	Warnings          []string `json:"warnings,omitempty"`
}
