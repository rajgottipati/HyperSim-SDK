package hypersim

import (
	"context"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/hypersim/hypersim-go-sdk/ai"
	"github.com/hypersim/hypersim-go-sdk/clients"
	"github.com/hypersim/hypersim-go-sdk/plugins"
	"github.com/hypersim/hypersim-go-sdk/types"
	"github.com/hypersim/hypersim-go-sdk/utils"
)

// SDK is the main HyperSim SDK instance
type SDK struct {
	config *Config
	
	// Clients
	hyperEVMClient  *clients.HyperEVMClient
	hyperCoreClient *clients.HyperCoreClient
	wsClient        *clients.WebSocketClient
	aiAnalyzer      *ai.AIAnalyzer
	
	// Plugin system
	pluginSystem *plugins.PluginSystem
	
	// State management
	mu            sync.RWMutex
	requestCounter int64
	isInitialized bool
	isClosed      bool
	
	// Context for graceful shutdown
	ctx    context.Context
	cancel context.CancelFunc
}

// Config contains SDK configuration
type Config struct {
	// Network configuration
	Network           types.Network `json:"network"`
	RPCEndpoint       string        `json:"rpcEndpoint,omitempty"`
	WSEndpoint        string        `json:"wsEndpoint,omitempty"`
	
	// Feature toggles
	AIEnabled         bool   `json:"aiEnabled"`
	OpenAIAPIKey      string `json:"openaiApiKey,omitempty"`
	CrossLayerEnabled bool   `json:"crossLayerEnabled"`
	StreamingEnabled  bool   `json:"streamingEnabled"`
	
	// Performance settings
	Timeout         time.Duration `json:"timeout"`
	MaxConcurrency  int           `json:"maxConcurrency"`
	
	// Plugin configuration
	Plugins []PluginConfig `json:"plugins,omitempty"`
	
	// Debug settings
	Debug bool `json:"debug"`
}

// PluginConfig contains plugin configuration
type PluginConfig struct {
	Name     string                 `json:"name"`
	Enabled  bool                   `json:"enabled"`
	Priority int                    `json:"priority"`
	Config   map[string]interface{} `json:"config,omitempty"`
}

// New creates a new HyperSim SDK instance
func New(config *Config) (*SDK, error) {
	if config == nil {
		return nil, types.ErrConfiguration("config cannot be nil", nil)
	}
	
	// Validate configuration
	if err := validateConfig(config); err != nil {
		return nil, err
	}
	
	// Set defaults
	setConfigDefaults(config)
	
	// Create context for lifecycle management
	ctx, cancel := context.WithCancel(context.Background())
	
	sdk := &SDK{
		config: config,
		ctx:    ctx,
		cancel: cancel,
	}
	
	// Initialize components
	if err := sdk.initialize(); err != nil {
		cancel()
		return nil, err
	}
	
	if config.Debug {
		fmt.Printf("[HyperSim SDK] Initialized successfully\n")
	}
	
	return sdk, nil
}

// initialize sets up all SDK components
func (s *SDK) initialize() error {
	var err error
	
	// Initialize plugin system first
	s.pluginSystem = plugins.NewPluginSystem(&plugins.SystemConfig{
		Debug: s.config.Debug,
	})
	
	// Register built-in plugins if configured
	if err := s.registerBuiltinPlugins(); err != nil {
		return types.ErrConfiguration("failed to register plugins", err)
	}
	
	// Initialize HyperEVM client
	hyperEVMConfig := &clients.HyperEVMConfig{
		Network:     s.config.Network,
		RPCEndpoint: s.config.RPCEndpoint,
		Timeout:     s.config.Timeout,
		Debug:       s.config.Debug,
	}
	
	s.hyperEVMClient, err = clients.NewHyperEVMClient(hyperEVMConfig)
	if err != nil {
		return types.ErrConfiguration("failed to create HyperEVM client", err)
	}
	
	// Initialize HyperCore client
	hyperCoreConfig := &clients.HyperCoreConfig{
		Network: s.config.Network,
		Enabled: s.config.CrossLayerEnabled,
		Debug:   s.config.Debug,
	}
	
	s.hyperCoreClient, err = clients.NewHyperCoreClient(hyperCoreConfig)
	if err != nil {
		return types.ErrConfiguration("failed to create HyperCore client", err)
	}
	
	// Initialize WebSocket client if streaming is enabled
	if s.config.StreamingEnabled {
		wsConfig := &clients.WebSocketConfig{
			Network:          s.config.Network,
			WSEndpoint:       s.config.WSEndpoint,
			ReconnectEnabled: true,
			MaxReconnects:    utils.MaxReconnectAttempts,
			ReconnectDelay:   utils.WebSocketReconnectDelay,
			Debug:           s.config.Debug,
		}
		
		s.wsClient, err = clients.NewWebSocketClient(wsConfig)
		if err != nil {
			return types.ErrConfiguration("failed to create WebSocket client", err)
		}
	}
	
	// Initialize AI analyzer if enabled
	if s.config.AIEnabled && s.config.OpenAIAPIKey != \"\" {
		aiConfig := &ai.AIConfig{
			APIKey:    s.config.OpenAIAPIKey,
			Model:     utils.OpenAIModel,
			MaxTokens: utils.MaxTokens,
			Timeout:   utils.AITimeout,
			Debug:     s.config.Debug,
		}
		
		s.aiAnalyzer, err = ai.NewAIAnalyzer(aiConfig)
		if err != nil {
			return types.ErrConfiguration("failed to create AI analyzer", err)
		}
	}
	
	// Initialize plugin system
	if err := s.pluginSystem.Initialize(); err != nil {
		return types.ErrPlugin("failed to initialize plugin system", err)
	}
	
	s.isInitialized = true
	return nil
}

// Simulate executes a transaction simulation
func (s *SDK) Simulate(ctx context.Context, tx *types.TransactionRequest) (*types.SimulationResult, error) {
	if s.isClosed {
		return nil, types.ErrConfiguration("SDK is closed", nil)
	}
	
	if !s.isInitialized {
		return nil, types.ErrConfiguration("SDK is not initialized", nil)
	}
	
	requestID := s.generateRequestID()
	
	if s.config.Debug {
		fmt.Printf("[HyperSim SDK] Starting simulation: %s\n", requestID)
	}
	
	// Create hook context
	hookCtx := plugins.CreateHookContext(requestID, tx)
	
	// Execute before-simulation hooks
	hookCtx, err := s.pluginSystem.ExecuteHooks(ctx, plugins.HookBeforeSimulation, hookCtx, tx)
	if err != nil {
		return nil, types.ErrPlugin("before-simulation hook failed", err)
	}
	
	if hookCtx.Halt {
		return nil, types.ErrPlugin("simulation halted by plugin", nil)
	}
	
	// Perform the simulation
	result, err := s.hyperEVMClient.Simulate(ctx, tx)
	if err != nil {
		// Execute error hooks
		errorCtx := plugins.CreateHookContext(requestID, err)
		s.pluginSystem.ExecuteHooks(ctx, plugins.HookOnError, errorCtx, err)
		return nil, err
	}
	
	// Fetch cross-layer data if enabled
	if s.config.CrossLayerEnabled && s.hyperCoreClient != nil {
		coreData, err := s.hyperCoreClient.GetRelevantData(ctx, tx, s.hyperEVMClient)
		if err != nil {
			if s.config.Debug {
				fmt.Printf("[HyperSim SDK] Failed to fetch HyperCore data: %v\n", err)
			}
			// Don't fail the simulation, just log the error
		} else {
			result.HyperCoreData = coreData
		}
	}
	
	// Execute after-simulation hooks
	hookCtx.Data = result
	_, err = s.pluginSystem.ExecuteHooks(ctx, plugins.HookAfterSimulation, hookCtx, result)
	if err != nil {
		if s.config.Debug {
			fmt.Printf("[HyperSim SDK] After-simulation hook error: %v\n", err)
		}
		// Don't fail the simulation for hook errors
	}
	
	if s.config.Debug {
		fmt.Printf("[HyperSim SDK] Simulation completed: %s (success: %t)\n", 
			requestID, result.Success)
	}
	
	return result, nil
}

// GetAIInsights returns AI-powered insights for a simulation result
func (s *SDK) GetAIInsights(ctx context.Context, result *types.SimulationResult) (*types.AIInsights, error) {
	if s.isClosed {
		return nil, types.ErrConfiguration("SDK is closed", nil)
	}
	
	if s.aiAnalyzer == nil {
		return nil, types.ErrConfiguration("AI features not enabled", nil)
	}
	
	requestID := s.generateRequestID()
	
	// Create hook context
	hookCtx := plugins.CreateHookContext(requestID, result)
	
	// Execute before-ai-analysis hooks
	hookCtx, err := s.pluginSystem.ExecuteHooks(ctx, plugins.HookBeforeAIAnalysis, hookCtx, result)
	if err != nil {
		return nil, types.ErrPlugin("before-ai-analysis hook failed", err)
	}
	
	// Perform AI analysis
	insights, err := s.aiAnalyzer.AnalyzeSimulation(ctx, result)
	if err != nil {
		errorCtx := plugins.CreateHookContext(requestID, err)
		s.pluginSystem.ExecuteHooks(ctx, plugins.HookOnError, errorCtx, err)
		return nil, err
	}
	
	// Execute after-ai-analysis hooks
	hookCtx.Data = insights
	_, err = s.pluginSystem.ExecuteHooks(ctx, plugins.HookAfterAIAnalysis, hookCtx, insights)
	if err != nil {
		if s.config.Debug {
			fmt.Printf("[HyperSim SDK] After-ai-analysis hook error: %v\n", err)
		}
	}
	
	return insights, nil
}

// OptimizeBundle optimizes a bundle of transactions
func (s *SDK) OptimizeBundle(ctx context.Context, transactions []*types.TransactionRequest) (*types.BundleOptimization, error) {
	if s.isClosed {
		return nil, types.ErrConfiguration("SDK is closed", nil)
	}
	
	if len(transactions) == 0 {
		return nil, types.ErrValidation("transactions cannot be empty", nil)
	}
	
	// Simulate all transactions concurrently
	simulations := make([]*types.SimulationResult, len(transactions))
	errChan := make(chan error, len(transactions))
	
	// Use semaphore for concurrency control
	semaphore := make(chan struct{}, s.config.MaxConcurrency)
	
	var wg sync.WaitGroup
	for i, tx := range transactions {
		wg.Add(1)
		go func(index int, transaction *types.TransactionRequest) {
			defer wg.Done()
			
			// Acquire semaphore
			semaphore <- struct{}{}
			defer func() { <-semaphore }()
			
			result, err := s.Simulate(ctx, transaction)
			if err != nil {
				errChan <- err
				return
			}
			simulations[index] = result
		}(i, tx)
	}
	
	wg.Wait()
	close(errChan)
	
	// Check for errors
	if err := <-errChan; err != nil {
		return nil, err
	}
	
	// Optimize using AI if available
	if s.aiAnalyzer != nil {
		return s.aiAnalyzer.OptimizeBundle(ctx, simulations)
	}
	
	// Basic optimization without AI
	return s.basicBundleOptimization(simulations), nil
}

// AssessRisk assesses the risk level of a transaction
func (s *SDK) AssessRisk(ctx context.Context, tx *types.TransactionRequest) (*types.AIInsights, error) {
	// Simulate the transaction first
	result, err := s.Simulate(ctx, tx)
	if err != nil {
		return nil, err
	}
	
	// Get AI insights if available
	if s.aiAnalyzer != nil {
		return s.GetAIInsights(ctx, result)
	}
	
	// Basic risk assessment without AI
	return s.basicRiskAssessment(result), nil
}

// GetNetworkStatus returns current network status
func (s *SDK) GetNetworkStatus(ctx context.Context) (*types.NetworkStatus, error) {
	if s.isClosed {
		return nil, types.ErrConfiguration("SDK is closed", nil)
	}
	
	return s.hyperEVMClient.GetNetworkStatus(ctx)
}

// ConnectWebSocket establishes WebSocket connection for streaming
func (s *SDK) ConnectWebSocket(ctx context.Context) error {
	if s.wsClient == nil {
		return types.ErrConfiguration("WebSocket streaming not enabled", nil)
	}
	
	return s.wsClient.Connect(ctx)
}

// Subscribe creates a WebSocket subscription
func (s *SDK) Subscribe(ctx context.Context, subType types.SubscriptionType, params map[string]interface{}) (*types.WSSubscription, error) {
	if s.wsClient == nil {
		return nil, types.ErrConfiguration("WebSocket streaming not enabled", nil)
	}
	
	return s.wsClient.Subscribe(ctx, subType, params)
}

// SetWebSocketHandler sets a message handler for WebSocket events
func (s *SDK) SetWebSocketHandler(subType types.SubscriptionType, handler clients.MessageHandler) {
	if s.wsClient != nil {
		s.wsClient.SetMessageHandler(subType, handler)
	}
}

// GetPluginSystem returns the plugin system for advanced plugin management
func (s *SDK) GetPluginSystem() *plugins.PluginSystem {
	return s.pluginSystem
}

// Close gracefully shuts down the SDK
func (s *SDK) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	if s.isClosed {
		return nil
	}
	
	if s.config.Debug {
		fmt.Printf("[HyperSim SDK] Closing...\n")
	}
	
	s.isClosed = true
	s.cancel()
	
	// Close all components
	var errors []error
	
	if s.wsClient != nil {
		if err := s.wsClient.Close(); err != nil {
			errors = append(errors, err)
		}
	}
	
	if s.hyperEVMClient != nil {
		if err := s.hyperEVMClient.Close(); err != nil {
			errors = append(errors, err)
		}
	}
	
	if s.hyperCoreClient != nil {
		if err := s.hyperCoreClient.Close(); err != nil {
			errors = append(errors, err)
		}
	}
	
	if s.aiAnalyzer != nil {
		if err := s.aiAnalyzer.Close(); err != nil {
			errors = append(errors, err)
		}
	}
	
	if s.pluginSystem != nil {
		if err := s.pluginSystem.Close(); err != nil {
			errors = append(errors, err)
		}
	}
	
	if len(errors) > 0 {
		return types.ErrConfiguration("failed to close some components", errors[0])
	}
	
	if s.config.Debug {
		fmt.Printf("[HyperSim SDK] Closed successfully\n")
	}
	
	return nil
}

// Helper methods

func (s *SDK) generateRequestID() string {
	s.mu.Lock()
	s.requestCounter++
	counter := s.requestCounter
	s.mu.Unlock()
	
	return fmt.Sprintf("%d-%s", counter, uuid.New().String()[:8])
}

func (s *SDK) registerBuiltinPlugins() error {
	// Register logging plugin if configured
	for _, pluginConfig := range s.config.Plugins {
		switch pluginConfig.Name {
		case "logging":
			config := plugins.LoggingConfig{
				Level:       getStringFromConfig(pluginConfig.Config, "level", "info"),
				ShowHeaders: getBoolFromConfig(pluginConfig.Config, "showHeaders", false),
				ShowBody:    getBoolFromConfig(pluginConfig.Config, "showBody", true),
				Enabled:     pluginConfig.Enabled,
			}
			
			plugin := plugins.NewLoggingPlugin(config)
			pluginSystemConfig := &plugins.PluginConfig{
				Plugin:   plugin,
				Priority: pluginConfig.Priority,
				Enabled:  pluginConfig.Enabled,
				Config:   pluginConfig.Config,
			}
			
			if err := s.pluginSystem.RegisterPlugin(pluginSystemConfig); err != nil {
				return err
			}
			
		case "metrics":
			config := plugins.MetricsConfig{
				Enabled:       pluginConfig.Enabled,
				CollectTiming: getBoolFromConfig(pluginConfig.Config, "collectTiming", true),
				CollectCounts: getBoolFromConfig(pluginConfig.Config, "collectCounts", true),
			}
			
			plugin := plugins.NewMetricsPlugin(config)
			pluginSystemConfig := &plugins.PluginConfig{
				Plugin:   plugin,
				Priority: pluginConfig.Priority,
				Enabled:  pluginConfig.Enabled,
				Config:   pluginConfig.Config,
			}
			
			if err := s.pluginSystem.RegisterPlugin(pluginSystemConfig); err != nil {
				return err
			}
			
		case "retry":
			config := plugins.RetryConfig{
				Enabled:           pluginConfig.Enabled,
				MaxAttempts:       getIntFromConfig(pluginConfig.Config, "maxAttempts", 3),
				InitialDelay:      getDurationFromConfig(pluginConfig.Config, "initialDelay", time.Second),
				MaxDelay:          getDurationFromConfig(pluginConfig.Config, "maxDelay", 30*time.Second),
				BackoffMultiplier: getFloatFromConfig(pluginConfig.Config, "backoffMultiplier", 2.0),
			}
			
			plugin := plugins.NewRetryPlugin(config)
			pluginSystemConfig := &plugins.PluginConfig{
				Plugin:   plugin,
				Priority: pluginConfig.Priority,
				Enabled:  pluginConfig.Enabled,
				Config:   pluginConfig.Config,
			}
			
			if err := s.pluginSystem.RegisterPlugin(pluginSystemConfig); err != nil {
				return err
			}
		}
	}
	
	return nil
}

func (s *SDK) basicBundleOptimization(simulations []*types.SimulationResult) *types.BundleOptimization {
	originalGas := int64(0)
	for _, sim := range simulations {
		if gas, err := strconv.ParseInt(sim.GasUsed, 10, 64); err == nil {
			originalGas += gas
		}
	}
	
	// Create default indices (no reordering)
	indices := make([]int, len(simulations))
	for i := range indices {
		indices[i] = i
	}
	
	return &types.BundleOptimization{
		OriginalGas:      strconv.FormatInt(originalGas, 10),
		OptimizedGas:     strconv.FormatInt(originalGas, 10),
		GasSaved:         "0",
		Suggestions:      []string{"Enable AI features for advanced bundle optimization"},
		ReorderedIndices: indices,
	}
}

func (s *SDK) basicRiskAssessment(result *types.SimulationResult) *types.AIInsights {
	riskLevel := types.RiskLevelLow
	probability := 0.9
	
	if !result.Success {
		riskLevel = types.RiskLevelHigh
		probability = 0.1
	} else {
		// Simple heuristics
		if gas, err := strconv.ParseInt(result.GasUsed, 10, 64); err == nil {
			if gas > utils.SmallBlockGasLimit {
				riskLevel = types.RiskLevelMedium
				probability = 0.7
			}
		}
	}
	
	return &types.AIInsights{
		RiskLevel:          riskLevel,
		SuccessProbability: probability,
		Recommendations: []string{
			"Enable AI features for detailed risk analysis",
			"Monitor gas prices for optimal execution timing",
		},
		ConfidenceScore: 0.6,
	}
}

// Configuration validation and defaults

func validateConfig(config *Config) error {
	if err := utils.ValidateNetwork(config.Network); err != nil {
		return err
	}
	
	if config.AIEnabled && config.OpenAIAPIKey == "" {
		return types.ErrValidation("OpenAI API key required when AI is enabled", nil)
	}
	
	if config.Timeout > 0 && config.Timeout < time.Second {
		return types.ErrValidation("timeout must be at least 1 second", nil)
	}
	
	return nil
}

func setConfigDefaults(config *Config) {
	if config.Timeout == 0 {
		config.Timeout = utils.DefaultTimeout
	}
	
	if config.MaxConcurrency == 0 {
		config.MaxConcurrency = 10
	}
	
	// Set default RPC endpoint if not provided
	if config.RPCEndpoint == "" {
		if networkConfig, exists := utils.NetworkConfigs[config.Network]; exists {
			config.RPCEndpoint = networkConfig.RPCURL
		}
	}
	
	// Set default WebSocket endpoint if not provided and streaming is enabled
	if config.StreamingEnabled && config.WSEndpoint == "" {
		if networkConfig, exists := utils.NetworkConfigs[config.Network]; exists {
			config.WSEndpoint = networkConfig.WSURL
		}
	}
}

// Helper functions for plugin configuration

func getStringFromConfig(config map[string]interface{}, key, defaultValue string) string {
	if value, exists := config[key]; exists {
		if str, ok := value.(string); ok {
			return str
		}
	}
	return defaultValue
}

func getBoolFromConfig(config map[string]interface{}, key string, defaultValue bool) bool {
	if value, exists := config[key]; exists {
		if b, ok := value.(bool); ok {
			return b
		}
	}
	return defaultValue
}

func getIntFromConfig(config map[string]interface{}, key string, defaultValue int) int {
	if value, exists := config[key]; exists {
		if i, ok := value.(float64); ok {
			return int(i)
		}
		if i, ok := value.(int); ok {
			return i
		}
	}
	return defaultValue
}

func getFloatFromConfig(config map[string]interface{}, key string, defaultValue float64) float64 {
	if value, exists := config[key]; exists {
		if f, ok := value.(float64); ok {
			return f
		}
	}
	return defaultValue
}

func getDurationFromConfig(config map[string]interface{}, key string, defaultValue time.Duration) time.Duration {
	if value, exists := config[key]; exists {
		if str, ok := value.(string); ok {
			if duration, err := time.ParseDuration(str); err == nil {
				return duration
			}
		}
		if ms, ok := value.(float64); ok {
			return time.Duration(ms) * time.Millisecond
		}
	}
	return defaultValue
}
