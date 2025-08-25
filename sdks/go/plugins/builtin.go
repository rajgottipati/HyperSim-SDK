package plugins

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/hypersim/hypersim-go-sdk/types"
)

// LoggingPlugin provides request/response logging
type LoggingPlugin struct {
	config LoggingConfig
}

// LoggingConfig contains configuration for logging
type LoggingConfig struct {
	Level       string `json:"level"`
	ShowHeaders bool   `json:"showHeaders"`
	ShowBody    bool   `json:"showBody"`
	Enabled     bool   `json:"enabled"`
}

// NewLoggingPlugin creates a new logging plugin
func NewLoggingPlugin(config LoggingConfig) *LoggingPlugin {
	return &LoggingPlugin{
		config: config,
	}
}

func (p *LoggingPlugin) Name() string {
	return "logging"
}

func (p *LoggingPlugin) Version() string {
	return "1.0.0"
}

func (p *LoggingPlugin) Description() string {
	return "Provides comprehensive logging for requests and responses"
}

func (p *LoggingPlugin) Initialize(system *PluginSystem) error {
	if p.config.Enabled {
		log.Printf("[Logging Plugin] Initialized with level: %s", p.config.Level)
	}
	return nil
}

func (p *LoggingPlugin) Cleanup() error {
	if p.config.Enabled {
		log.Printf("[Logging Plugin] Cleaned up")
	}
	return nil
}

func (p *LoggingPlugin) RegisterHooks() map[HookType]HookFunction {
	return map[HookType]HookFunction{
		HookBeforeRequest:    p.logBeforeRequest,
		HookAfterResponse:    p.logAfterResponse,
		HookBeforeSimulation: p.logBeforeSimulation,
		HookAfterSimulation:  p.logAfterSimulation,
		HookOnError:          p.logError,
	}
}

func (p *LoggingPlugin) IsHealthy() bool {
	return p.config.Enabled
}

func (p *LoggingPlugin) logBeforeRequest(ctx context.Context, hookCtx *HookContext, args ...interface{}) (*HookContext, error) {
	if !p.config.Enabled {
		return hookCtx, nil
	}
	
	log.Printf("[Request] ID: %s, Timestamp: %d", hookCtx.RequestID, hookCtx.Timestamp)
	
	if p.config.ShowBody && hookCtx.Data != nil {
		log.Printf("[Request Body] %+v", hookCtx.Data)
	}
	
	return hookCtx, nil
}

func (p *LoggingPlugin) logAfterResponse(ctx context.Context, hookCtx *HookContext, args ...interface{}) (*HookContext, error) {
	if !p.config.Enabled {
		return hookCtx, nil
	}
	
	duration := time.Now().Unix() - hookCtx.Timestamp
	log.Printf("[Response] ID: %s, Duration: %ds", hookCtx.RequestID, duration)
	
	if p.config.ShowBody && hookCtx.Data != nil {
		log.Printf("[Response Body] %+v", hookCtx.Data)
	}
	
	return hookCtx, nil
}

func (p *LoggingPlugin) logBeforeSimulation(ctx context.Context, hookCtx *HookContext, args ...interface{}) (*HookContext, error) {
	if !p.config.Enabled {
		return hookCtx, nil
	}
	
	log.Printf("[Simulation Start] ID: %s", hookCtx.RequestID)
	return hookCtx, nil
}

func (p *LoggingPlugin) logAfterSimulation(ctx context.Context, hookCtx *HookContext, args ...interface{}) (*HookContext, error) {
	if !p.config.Enabled {
		return hookCtx, nil
	}
	
	if result, ok := hookCtx.Data.(*types.SimulationResult); ok {
		log.Printf("[Simulation Complete] ID: %s, Success: %t, Gas: %s", 
			hookCtx.RequestID, result.Success, result.GasUsed)
	}
	
	return hookCtx, nil
}

func (p *LoggingPlugin) logError(ctx context.Context, hookCtx *HookContext, args ...interface{}) (*HookContext, error) {
	if !p.config.Enabled {
		return hookCtx, nil
	}
	
	if err, ok := hookCtx.Data.(error); ok {
		log.Printf("[Error] ID: %s, Error: %v", hookCtx.RequestID, err)
	}
	
	return hookCtx, nil
}

// MetricsPlugin provides performance metrics collection
type MetricsPlugin struct {
	config  MetricsConfig
	metrics map[string]*Metric
}

type MetricsConfig struct {
	Enabled      bool   `json:"enabled"`
	CollectTiming bool   `json:"collectTiming"`
	CollectCounts bool   `json:"collectCounts"`
}

type Metric struct {
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	Value     float64   `json:"value"`
	Count     int64     `json:"count"`
	Total     float64   `json:"total"`
	LastUpdate time.Time `json:"lastUpdate"`
}

func NewMetricsPlugin(config MetricsConfig) *MetricsPlugin {
	return &MetricsPlugin{
		config:  config,
		metrics: make(map[string]*Metric),
	}
}

func (p *MetricsPlugin) Name() string {
	return "metrics"
}

func (p *MetricsPlugin) Version() string {
	return "1.0.0"
}

func (p *MetricsPlugin) Description() string {
	return "Collects performance metrics and statistics"
}

func (p *MetricsPlugin) Initialize(system *PluginSystem) error {
	if p.config.Enabled {
		log.Printf("[Metrics Plugin] Initialized")
		p.initializeMetrics()
	}
	return nil
}

func (p *MetricsPlugin) Cleanup() error {
	if p.config.Enabled {
		p.printMetrics()
		log.Printf("[Metrics Plugin] Cleaned up")
	}
	return nil
}

func (p *MetricsPlugin) RegisterHooks() map[HookType]HookFunction {
	return map[HookType]HookFunction{
		HookBeforeSimulation: p.recordSimulationStart,
		HookAfterSimulation:  p.recordSimulationEnd,
		HookOnError:          p.recordError,
	}
}

func (p *MetricsPlugin) IsHealthy() bool {
	return p.config.Enabled
}

func (p *MetricsPlugin) initializeMetrics() {
	p.metrics["simulations_total"] = &Metric{
		Name: "simulations_total",
		Type: "counter",
	}
	p.metrics["simulations_successful"] = &Metric{
		Name: "simulations_successful", 
		Type: "counter",
	}
	p.metrics["simulations_failed"] = &Metric{
		Name: "simulations_failed",
		Type: "counter",
	}
	p.metrics["simulation_duration"] = &Metric{
		Name: "simulation_duration",
		Type: "histogram",
	}
}

func (p *MetricsPlugin) recordSimulationStart(ctx context.Context, hookCtx *HookContext, args ...interface{}) (*HookContext, error) {
	if !p.config.Enabled {
		return hookCtx, nil
	}
	
	if hookCtx.Metadata == nil {
		hookCtx.Metadata = make(map[string]interface{})
	}
	hookCtx.Metadata["simulation_start_time"] = time.Now()
	
	p.incrementMetric("simulations_total")
	
	return hookCtx, nil
}

func (p *MetricsPlugin) recordSimulationEnd(ctx context.Context, hookCtx *HookContext, args ...interface{}) (*HookContext, error) {
	if !p.config.Enabled {
		return hookCtx, nil
	}
	
	// Record timing
	if startTime, ok := hookCtx.Metadata["simulation_start_time"].(time.Time); ok {
		duration := time.Since(startTime).Seconds()
		p.recordHistogram("simulation_duration", duration)
	}
	
	// Record success/failure
	if result, ok := hookCtx.Data.(*types.SimulationResult); ok {
		if result.Success {
			p.incrementMetric("simulations_successful")
		} else {
			p.incrementMetric("simulations_failed")
		}
	}
	
	return hookCtx, nil
}

func (p *MetricsPlugin) recordError(ctx context.Context, hookCtx *HookContext, args ...interface{}) (*HookContext, error) {
	if !p.config.Enabled {
		return hookCtx, nil
	}
	
	p.incrementMetric("errors_total")
	
	return hookCtx, nil
}

func (p *MetricsPlugin) incrementMetric(name string) {
	if metric, exists := p.metrics[name]; exists {
		metric.Count++
		metric.LastUpdate = time.Now()
	} else {
		p.metrics[name] = &Metric{
			Name:       name,
			Type:       "counter",
			Count:      1,
			LastUpdate: time.Now(),
		}
	}
}

func (p *MetricsPlugin) recordHistogram(name string, value float64) {
	if metric, exists := p.metrics[name]; exists {
		metric.Count++
		metric.Total += value
		metric.Value = metric.Total / float64(metric.Count) // Average
		metric.LastUpdate = time.Now()
	}
}

func (p *MetricsPlugin) printMetrics() {
	fmt.Printf("\n=== SDK Metrics ===\n")
	for name, metric := range p.metrics {
		if metric.Type == "counter" {
			fmt.Printf("%s: %d\n", name, metric.Count)
		} else if metric.Type == "histogram" {
			fmt.Printf("%s: avg=%.3fs, count=%d\n", name, metric.Value, metric.Count)
		}
	}
	fmt.Printf("==================\n")
}

func (p *MetricsPlugin) GetMetrics() map[string]*Metric {
	result := make(map[string]*Metric)
	for name, metric := range p.metrics {
		result[name] = metric
	}
	return result
}

// RetryPlugin provides automatic retry functionality
type RetryPlugin struct {
	config RetryConfig
}

type RetryConfig struct {
	Enabled          bool          `json:"enabled"`
	MaxAttempts      int           `json:"maxAttempts"`
	InitialDelay     time.Duration `json:"initialDelay"`
	MaxDelay         time.Duration `json:"maxDelay"`
	BackoffMultiplier float64      `json:"backoffMultiplier"`
	RetryableErrors  []string      `json:"retryableErrors"`
}

func NewRetryPlugin(config RetryConfig) *RetryPlugin {
	// Set defaults
	if config.MaxAttempts == 0 {
		config.MaxAttempts = 3
	}
	if config.InitialDelay == 0 {
		config.InitialDelay = time.Second
	}
	if config.MaxDelay == 0 {
		config.MaxDelay = 30 * time.Second
	}
	if config.BackoffMultiplier == 0 {
		config.BackoffMultiplier = 2.0
	}
	
	return &RetryPlugin{
		config: config,
	}
}

func (p *RetryPlugin) Name() string {
	return "retry"
}

func (p *RetryPlugin) Version() string {
	return "1.0.0"
}

func (p *RetryPlugin) Description() string {
	return "Provides automatic retry functionality for failed operations"
}

func (p *RetryPlugin) Initialize(system *PluginSystem) error {
	if p.config.Enabled {
		log.Printf("[Retry Plugin] Initialized with max attempts: %d", p.config.MaxAttempts)
	}
	return nil
}

func (p *RetryPlugin) Cleanup() error {
	if p.config.Enabled {
		log.Printf("[Retry Plugin] Cleaned up")
	}
	return nil
}

func (p *RetryPlugin) RegisterHooks() map[HookType]HookFunction {
	return map[HookType]HookFunction{
		HookOnError: p.handleError,
	}
}

func (p *RetryPlugin) IsHealthy() bool {
	return p.config.Enabled
}

func (p *RetryPlugin) handleError(ctx context.Context, hookCtx *HookContext, args ...interface{}) (*HookContext, error) {
	if !p.config.Enabled {
		return hookCtx, nil
	}
	
	if err, ok := hookCtx.Data.(error); ok {
		if p.isRetryableError(err) {
			// Get current attempt count
			attempts, _ := hookCtx.Metadata["retry_attempts"].(int)
			attempts++
			
			if attempts <= p.config.MaxAttempts {
				hookCtx.Metadata["retry_attempts"] = attempts
				hookCtx.Metadata["should_retry"] = true
				
				// Calculate delay
				delay := p.calculateDelay(attempts)
				hookCtx.Metadata["retry_delay"] = delay
				
				log.Printf("[Retry Plugin] Scheduling retry %d/%d after %v for error: %v", 
					attempts, p.config.MaxAttempts, delay, err)
			}
		}
	}
	
	return hookCtx, nil
}

func (p *RetryPlugin) isRetryableError(err error) bool {
	if len(p.config.RetryableErrors) == 0 {
		// Default retryable error patterns
		errStr := err.Error()
		return contains(errStr, "timeout") ||
			   contains(errStr, "connection") ||
			   contains(errStr, "network") ||
			   contains(errStr, "temporary")
	}
	
	errStr := err.Error()
	for _, pattern := range p.config.RetryableErrors {
		if contains(errStr, pattern) {
			return true
		}
	}
	
	return false
}

func (p *RetryPlugin) calculateDelay(attempt int) time.Duration {
	delay := float64(p.config.InitialDelay)
	for i := 1; i < attempt; i++ {
		delay *= p.config.BackoffMultiplier
	}
	
	if time.Duration(delay) > p.config.MaxDelay {
		return p.config.MaxDelay
	}
	
	return time.Duration(delay)
}

// Helper function for string contains check
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || 
		(len(s) > len(substr) && 
		(s[0:len(substr)] == substr || 
		 s[len(s)-len(substr):] == substr ||
		 indexOf(s, substr) != -1)))
}

func indexOf(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}
