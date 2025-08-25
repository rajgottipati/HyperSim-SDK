package types

// RiskLevel represents the risk assessment level
type RiskLevel string

const (
	RiskLevelLow    RiskLevel = "LOW"
	RiskLevelMedium RiskLevel = "MEDIUM"
	RiskLevelHigh   RiskLevel = "HIGH"
)

// AIInsights contains AI-generated analysis and insights
type AIInsights struct {
	RiskLevel           RiskLevel `json:"riskLevel"`
	SuccessProbability  float64   `json:"successProbability"`
	GasOptimization     *GasOptimization `json:"gasOptimization,omitempty"`
	SecurityWarnings    []string  `json:"securityWarnings,omitempty"`
	Recommendations     []string  `json:"recommendations,omitempty"`
	SimilarTransactions int       `json:"similarTransactions"`
	ConfidenceScore     float64   `json:"confidenceScore"`
}

// GasOptimization contains gas optimization suggestions
type GasOptimization struct {
	CurrentGas    string   `json:"currentGas"`
	OptimizedGas  string   `json:"optimizedGas"`
	Savings       string   `json:"savings"`
	Suggestions   []string `json:"suggestions"`
}

// AIAnalysisRequest represents a request for AI analysis
type AIAnalysisRequest struct {
	SimulationResult *SimulationResult `json:"simulationResult"`
	Context         map[string]interface{} `json:"context,omitempty"`
}
