package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/hypersim/hypersim-go-sdk/types"
	"github.com/hypersim/hypersim-go-sdk/utils"
	"github.com/sashabaranov/go-openai"
)

// AIAnalyzer provides AI-powered transaction analysis using OpenAI
type AIAnalyzer struct {
	config *AIConfig
	client *openai.Client
}

// AIConfig contains AI analyzer configuration
type AIConfig struct {
	APIKey    string        `json:"apiKey"`
	Model     string        `json:"model"`
	MaxTokens int           `json:"maxTokens"`
	Timeout   time.Duration `json:"timeout"`
	Debug     bool          `json:"debug"`
}

// NewAIAnalyzer creates a new AI analyzer instance
func NewAIAnalyzer(config *AIConfig) (*AIAnalyzer, error) {
	if config == nil {
		return nil, types.ErrConfiguration("config cannot be nil", nil)
	}
	
	if config.APIKey == "" {
		return nil, types.ErrConfiguration("API key cannot be empty", nil)
	}
	
	// Set defaults
	if config.Model == "" {
		config.Model = openai.GPT3Dot5Turbo
	}
	if config.MaxTokens == 0 {
		config.MaxTokens = 1000
	}
	if config.Timeout == 0 {
		config.Timeout = 30 * time.Second
	}
	
	client := openai.NewClient(config.APIKey)
	
	analyzer := &AIAnalyzer{
		config: config,
		client: client,
	}
	
	if config.Debug {
		fmt.Printf("[AI Analyzer] Initialized with model: %s\n", config.Model)
	}
	
	return analyzer, nil
}

// AnalyzeSimulation analyzes a simulation result and provides insights
func (a *AIAnalyzer) AnalyzeSimulation(ctx context.Context, result *types.SimulationResult) (*types.AIInsights, error) {
	if result == nil {
		return nil, types.ErrValidation("simulation result cannot be nil", nil)
	}
	
	// Create analysis prompt
	prompt := a.createAnalysisPrompt(result)
	
	// Call OpenAI
	response, err := a.callOpenAI(ctx, prompt)
	if err != nil {
		return nil, types.ErrAI("failed to analyze simulation", err)
	}
	
	// Parse response
	insights, err := a.parseAIResponse(response)
	if err != nil {
		return nil, types.ErrAI("failed to parse AI response", err)
	}
	
	return insights, nil
}

// OptimizeBundle optimizes a bundle of transactions
func (a *AIAnalyzer) OptimizeBundle(ctx context.Context, simulations []*types.SimulationResult) (*types.BundleOptimization, error) {
	if len(simulations) == 0 {
		return nil, types.ErrValidation("simulations cannot be empty", nil)
	}
	
	// Create bundle optimization prompt
	prompt := a.createBundleOptimizationPrompt(simulations)
	
	// Call OpenAI
	response, err := a.callOpenAI(ctx, prompt)
	if err != nil {
		return nil, types.ErrAI("failed to optimize bundle", err)
	}
	
	// Parse optimization response
	optimization, err := a.parseBundleResponse(response)
	if err != nil {
		return nil, types.ErrAI("failed to parse optimization response", err)
	}
	
	return optimization, nil
}

// Close cleans up the AI analyzer
func (a *AIAnalyzer) Close() error {
	if a.config.Debug {
		fmt.Printf("[AI Analyzer] Closed\n")
	}
	return nil
}

// Helper methods

func (a *AIAnalyzer) createAnalysisPrompt(result *types.SimulationResult) string {
	prompt := fmt.Sprintf(`
Analyze this Ethereum transaction simulation and provide insights:

Simulation Result:
- Success: %t
- Gas Used: %s
- Block Type: %s
- Error: %s
- Revert Reason: %s

Provide analysis in JSON format with:
- riskLevel ("low", "medium", "high")
- successProbability (0.0-1.0)
- recommendations (array of strings)
- securityWarnings (array of strings)
- confidenceScore (0.0-1.0)
- gasOptimization with currentGas, optimizedGas, savings
`,
		result.Success,
		result.GasUsed,
		result.BlockType,
		result.Error,
		result.RevertReason,
	)
	
	return strings.TrimSpace(prompt)
}

func (a *AIAnalyzer) createBundleOptimizationPrompt(simulations []*types.SimulationResult) string {
	prompt := "Optimize this transaction bundle for gas efficiency:\n\n"
	
	for i, sim := range simulations {
		prompt += fmt.Sprintf("Transaction %d: Success=%t, Gas=%s\n", i, sim.Success, sim.GasUsed)
	}
	
	prompt += "\nProvide optimization in JSON format with originalGas, optimizedGas, gasSaved, suggestions, reorderedIndices."
	
	return prompt
}

func (a *AIAnalyzer) callOpenAI(ctx context.Context, prompt string) (string, error) {
	req := openai.ChatCompletionRequest{
		Model: a.config.Model,
		MaxTokens: a.config.MaxTokens,
		Messages: []openai.ChatCompletionMessage{
			{
				Role:    openai.ChatMessageRoleSystem,
				Content: "You are an expert blockchain analyst specializing in Ethereum transaction analysis.",
			},
			{
				Role:    openai.ChatMessageRoleUser,
				Content: prompt,
			},
		},
	}
	
	resp, err := a.client.CreateChatCompletion(ctx, req)
	if err != nil {
		return "", err
	}
	
	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no response from AI")
	}
	
	return resp.Choices[0].Message.Content, nil
}

func (a *AIAnalyzer) parseAIResponse(response string) (*types.AIInsights, error) {
	// Try to extract JSON from response
	start := strings.Index(response, "{")
	end := strings.LastIndex(response, "}")
	
	if start == -1 || end == -1 || start >= end {
		return a.createFallbackInsights("Failed to parse AI response"), nil
	}
	
	jsonStr := response[start : end+1]
	
	var insights types.AIInsights
	if err := json.Unmarshal([]byte(jsonStr), &insights); err != nil {
		return a.createFallbackInsights("Invalid JSON in AI response"), nil
	}
	
	return &insights, nil
}

func (a *AIAnalyzer) parseBundleResponse(response string) (*types.BundleOptimization, error) {
	// Similar JSON parsing logic
	start := strings.Index(response, "{")
	end := strings.LastIndex(response, "}")
	
	if start == -1 || end == -1 || start >= end {
		return &types.BundleOptimization{
			Suggestions: []string{"AI optimization failed, using default"},
		}, nil
	}
	
	jsonStr := response[start : end+1]
	
	var optimization types.BundleOptimization
	if err := json.Unmarshal([]byte(jsonStr), &optimization); err != nil {
		return &types.BundleOptimization{
			Suggestions: []string{"Failed to parse AI optimization"},
		}, nil
	}
	
	return &optimization, nil
}

func (a *AIAnalyzer) createFallbackInsights(reason string) *types.AIInsights {
	return &types.AIInsights{
		RiskLevel:          types.RiskLevelMedium,
		SuccessProbability: 0.7,
		Recommendations:    []string{"AI analysis unavailable: " + reason},
		ConfidenceScore:   0.5,
	}
}
