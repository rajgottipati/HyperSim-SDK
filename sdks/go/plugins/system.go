package plugins

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/hypersim/hypersim-go-sdk/types"
	"github.com/hypersim/hypersim-go-sdk/utils"
)

// HookType represents different plugin hook points
type HookType string

const (
	HookBeforeRequest     HookType = "before-request"
	HookAfterResponse     HookType = "after-response"
	HookBeforeSimulation  HookType = "before-simulation"
	HookAfterSimulation   HookType = "after-simulation"
	HookBeforeAIAnalysis  HookType = "before-ai-analysis"
	HookAfterAIAnalysis   HookType = "after-ai-analysis"
	HookOnError           HookType = "on-error"
	HookOnConnect         HookType = "on-connect"
	HookOnDisconnect      HookType = "on-disconnect"
)

// HookContext provides context information for hook execution
type HookContext struct {
	RequestID    string                 `json:"requestId"`
	Timestamp    int64                  `json:"timestamp"`
	Data         interface{}            `json:"data,omitempty"`
	Halt         bool                   `json:"halt,omitempty"`
	ModifiedData interface{}            `json:"modifiedData,omitempty"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

// HookFunction is the function signature for plugin hooks
type HookFunction func(ctx context.Context, hookCtx *HookContext, args ...interface{}) (*HookContext, error)

// Plugin interface defines the contract for SDK plugins
type Plugin interface {
	// Basic plugin information
	Name() string
	Version() string
	Description() string
	
	// Plugin lifecycle
	Initialize(system *PluginSystem) error
	Cleanup() error
	
	// Hook registration
	RegisterHooks() map[HookType]HookFunction
	
	// Health check
	IsHealthy() bool
}

// PluginConfig contains plugin configuration
type PluginConfig struct {
	Plugin   Plugin                 `json:"-"`
	Config   map[string]interface{} `json:"config,omitempty"`
	Priority int                    `json:"priority"`
	Enabled  bool                   `json:"enabled"`
}

// registeredHook represents a registered hook with metadata
type registeredHook struct {
	pluginName string
	function   HookFunction
	priority   int
}

// PluginSystem manages plugins and their execution
type PluginSystem struct {
	plugins     map[string]*PluginConfig
	hooks       map[HookType][]*registeredHook
	middleware  []MiddlewareFunc
	mu          sync.RWMutex
	initialized bool
	debug       bool
}

// MiddlewareFunc represents middleware function signature
type MiddlewareFunc func(ctx context.Context, next func(context.Context) error) error

// SystemConfig contains plugin system configuration
type SystemConfig struct {
	Debug bool `json:"debug"`
}

// NewPluginSystem creates a new plugin system
func NewPluginSystem(config *SystemConfig) *PluginSystem {
	if config == nil {
		config = &SystemConfig{}
	}
	
	system := &PluginSystem{
		plugins: make(map[string]*PluginConfig),
		hooks:   make(map[HookType][]*registeredHook),
		debug:   config.Debug,
	}
	
	if system.debug {
		fmt.Printf("[Plugin System] Initialized\n")
	}
	
	return system
}

// RegisterPlugin registers a plugin with the system
func (s *PluginSystem) RegisterPlugin(config *PluginConfig) error {
	if config == nil {
		return types.ErrValidation("plugin config cannot be nil", nil)
	}
	
	if config.Plugin == nil {
		return types.ErrValidation("plugin cannot be nil", nil)
	}
	
	pluginName := config.Plugin.Name()
	if pluginName == "" {
		return types.ErrValidation("plugin name cannot be empty", nil)
	}
	
	s.mu.Lock()
	defer s.mu.Unlock()
	
	// Check if plugin is already registered
	if _, exists := s.plugins[pluginName]; exists {
		return types.ErrConfiguration(fmt.Sprintf("plugin '%s' is already registered", pluginName), nil)
	}
	
	// Set defaults
	if config.Priority == 0 {
		config.Priority = 10
	}
	
	if config.Config == nil {
		config.Config = make(map[string]interface{})
	}
	
	// Register the plugin
	s.plugins[pluginName] = config
	
	// Register hooks if plugin is enabled
	if config.Enabled {
		if err := s.registerPluginHooks(config.Plugin); err != nil {
			delete(s.plugins, pluginName)
			return types.ErrPlugin(fmt.Sprintf("failed to register hooks for plugin '%s'", pluginName), err)
		}
		
		// Initialize plugin if system is already initialized
		if s.initialized {
			if err := config.Plugin.Initialize(s); err != nil {
				delete(s.plugins, pluginName)
				s.unregisterPluginHooks(pluginName)
				return types.ErrPlugin(fmt.Sprintf("failed to initialize plugin '%s'", pluginName), err)
			}
		}
	}
	
	if s.debug {
		fmt.Printf("[Plugin System] Registered plugin: %s v%s (enabled: %t)\n", 
			pluginName, config.Plugin.Version(), config.Enabled)
	}
	
	return nil
}

// UnregisterPlugin unregisters a plugin from the system
func (s *PluginSystem) UnregisterPlugin(name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	config, exists := s.plugins[name]
	if !exists {
		return types.ErrValidation(fmt.Sprintf("plugin '%s' is not registered", name), nil)
	}
	
	// Cleanup plugin
	if err := config.Plugin.Cleanup(); err != nil {
		if s.debug {
			fmt.Printf("[Plugin System] Plugin cleanup error for '%s': %v\n", name, err)
		}
	}
	
	// Unregister hooks
	s.unregisterPluginHooks(name)
	
	// Remove plugin
	delete(s.plugins, name)
	
	if s.debug {
		fmt.Printf("[Plugin System] Unregistered plugin: %s\n", name)
	}
	
	return nil
}

// EnablePlugin enables a registered plugin
func (s *PluginSystem) EnablePlugin(name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	config, exists := s.plugins[name]
	if !exists {
		return types.ErrValidation(fmt.Sprintf("plugin '%s' is not registered", name), nil)
	}
	
	if config.Enabled {
		return nil // Already enabled
	}
	
	// Enable the plugin
	config.Enabled = true
	
	// Register hooks
	if err := s.registerPluginHooks(config.Plugin); err != nil {
		config.Enabled = false
		return types.ErrPlugin(fmt.Sprintf("failed to register hooks for plugin '%s'", name), err)
	}
	
	// Initialize if system is initialized
	if s.initialized {
		if err := config.Plugin.Initialize(s); err != nil {
			config.Enabled = false
			s.unregisterPluginHooks(name)
			return types.ErrPlugin(fmt.Sprintf("failed to initialize plugin '%s'", name), err)
		}
	}
	
	if s.debug {
		fmt.Printf("[Plugin System] Enabled plugin: %s\n", name)
	}
	
	return nil
}

// DisablePlugin disables a plugin
func (s *PluginSystem) DisablePlugin(name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	config, exists := s.plugins[name]
	if !exists {
		return types.ErrValidation(fmt.Sprintf("plugin '%s' is not registered", name), nil)
	}
	
	if !config.Enabled {
		return nil // Already disabled
	}
	
	// Cleanup plugin
	if err := config.Plugin.Cleanup(); err != nil {
		if s.debug {
			fmt.Printf("[Plugin System] Plugin cleanup error for '%s': %v\n", name, err)
		}
	}
	
	// Disable the plugin
	config.Enabled = false
	
	// Unregister hooks
	s.unregisterPluginHooks(name)
	
	if s.debug {
		fmt.Printf("[Plugin System] Disabled plugin: %s\n", name)
	}
	
	return nil
}

// ExecuteHooks executes all registered hooks for a given type
func (s *PluginSystem) ExecuteHooks(ctx context.Context, hookType HookType, hookCtx *HookContext, args ...interface{}) (*HookContext, error) {
	s.mu.RLock()
	hooks := s.hooks[hookType]
	s.mu.RUnlock()
	
	if len(hooks) == 0 {
		return hookCtx, nil
	}
	
	// Sort hooks by priority (lower number = higher priority)
	sortedHooks := make([]*registeredHook, len(hooks))
	copy(sortedHooks, hooks)
	
	// Simple bubble sort by priority
	for i := 0; i < len(sortedHooks); i++ {
		for j := i + 1; j < len(sortedHooks); j++ {
			if sortedHooks[i].priority > sortedHooks[j].priority {
				sortedHooks[i], sortedHooks[j] = sortedHooks[j], sortedHooks[i]
			}
		}
	}
	
	currentCtx := hookCtx
	
	for _, hook := range sortedHooks {
		// Create context with timeout for plugin execution
		pluginCtx, cancel := context.WithTimeout(ctx, utils.PluginExecutionTimeout)
		
		// Execute hook with error handling
		func() {
			defer cancel()
			defer func() {
				if r := recover(); r != nil {
					if s.debug {
						fmt.Printf("[Plugin System] Plugin '%s' panicked in hook '%s': %v\n", 
							hook.pluginName, hookType, r)
					}
				}
			}()
			
			result, err := hook.function(pluginCtx, currentCtx, args...)
			if err != nil {
				if s.debug {
					fmt.Printf("[Plugin System] Plugin '%s' error in hook '%s': %v\n", 
						hook.pluginName, hookType, err)
				}
				return
			}
			
			if result != nil {
				currentCtx = result
			}
		}()
		
		// Check if execution should be halted
		if currentCtx.Halt {
			if s.debug {
				fmt.Printf("[Plugin System] Hook execution halted by plugin: %s\n", hook.pluginName)
			}
			break
		}
	}
	
	return currentCtx, nil
}

// AddMiddleware adds middleware to the system
func (s *PluginSystem) AddMiddleware(middleware MiddlewareFunc) {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	s.middleware = append(s.middleware, middleware)
	
	if s.debug {
		fmt.Printf("[Plugin System] Added middleware (total: %d)\n", len(s.middleware))
	}
}

// ExecuteMiddleware executes all registered middleware
func (s *PluginSystem) ExecuteMiddleware(ctx context.Context, operation func(context.Context) error) error {
	s.mu.RLock()
	middleware := make([]MiddlewareFunc, len(s.middleware))
	copy(middleware, s.middleware)
	s.mu.RUnlock()
	
	if len(middleware) == 0 {
		return operation(ctx)
	}
	
	// Build middleware chain
	var execute func(int) error
	execute = func(index int) error {
		if index >= len(middleware) {
			return operation(ctx)
		}
		
		return middleware[index](ctx, func(ctx context.Context) error {
			return execute(index + 1)
		})
	}
	
	return execute(0)
}

// Initialize initializes all registered plugins
func (s *PluginSystem) Initialize() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	if s.initialized {
		return nil
	}
	
	for name, config := range s.plugins {
		if config.Enabled {
			if err := config.Plugin.Initialize(s); err != nil {
				if s.debug {
					fmt.Printf("[Plugin System] Failed to initialize plugin '%s': %v\n", name, err)
				}
				return types.ErrPlugin(fmt.Sprintf("failed to initialize plugin '%s'", name), err)
			}
		}
	}
	
	s.initialized = true
	
	if s.debug {
		fmt.Printf("[Plugin System] Initialized all plugins\n")
	}
	
	return nil
}

// Shutdown shuts down the plugin system
func (s *PluginSystem) Shutdown() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	if !s.initialized {
		return nil
	}
	
	// Cleanup all plugins
	for name, config := range s.plugins {
		if err := config.Plugin.Cleanup(); err != nil {
			if s.debug {
				fmt.Printf("[Plugin System] Failed to cleanup plugin '%s': %v\n", name, err)
			}
		}
	}
	
	// Clear all data
	s.plugins = make(map[string]*PluginConfig)
	s.hooks = make(map[HookType][]*registeredHook)
	s.middleware = []MiddlewareFunc{}
	s.initialized = false
	
	if s.debug {
		fmt.Printf("[Plugin System] Shut down\n")
	}
	
	return nil
}

// GetPlugins returns information about registered plugins
func (s *PluginSystem) GetPlugins() []PluginInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	info := make([]PluginInfo, 0, len(s.plugins))
	for _, config := range s.plugins {
		info = append(info, PluginInfo{
			Name:        config.Plugin.Name(),
			Version:     config.Plugin.Version(),
			Description: config.Plugin.Description(),
			Enabled:     config.Enabled,
			Healthy:     config.Plugin.IsHealthy(),
		})
	}
	
	return info
}

// PluginInfo contains information about a plugin
type PluginInfo struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	Description string `json:"description"`
	Enabled     bool   `json:"enabled"`
	Healthy     bool   `json:"healthy"`
}

// HasPlugin checks if a plugin is registered
func (s *PluginSystem) HasPlugin(name string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	_, exists := s.plugins[name]
	return exists
}

// IsPluginEnabled checks if a plugin is enabled
func (s *PluginSystem) IsPluginEnabled(name string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	config, exists := s.plugins[name]
	return exists && config.Enabled
}

// GetPluginConfig returns the configuration for a plugin
func (s *PluginSystem) GetPluginConfig(name string) (map[string]interface{}, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	config, exists := s.plugins[name]
	if !exists {
		return nil, types.ErrValidation(fmt.Sprintf("plugin '%s' is not registered", name), nil)
	}
	
	// Return a copy to prevent modification
	result := make(map[string]interface{})
	for k, v := range config.Config {
		result[k] = v
	}
	
	return result, nil
}

// Internal methods

func (s *PluginSystem) registerPluginHooks(plugin Plugin) error {
	hooks := plugin.RegisterHooks()
	pluginName := plugin.Name()
	
	config := s.plugins[pluginName]
	
	for hookType, hookFunc := range hooks {
		if s.hooks[hookType] == nil {
			s.hooks[hookType] = []*registeredHook{}
		}
		
		s.hooks[hookType] = append(s.hooks[hookType], &registeredHook{
			pluginName: pluginName,
			function:   hookFunc,
			priority:   config.Priority,
		})
	}
	
	return nil
}

func (s *PluginSystem) unregisterPluginHooks(pluginName string) {
	for hookType, hooks := range s.hooks {
		filtered := make([]*registeredHook, 0)
		for _, hook := range hooks {
			if hook.pluginName != pluginName {
				filtered = append(filtered, hook)
			}
		}
		s.hooks[hookType] = filtered
	}
}

// CreateHookContext is a helper to create hook context
func CreateHookContext(requestID string, data interface{}) *HookContext {
	return &HookContext{
		RequestID: requestID,
		Timestamp: time.Now().Unix(),
		Data:      data,
		Halt:      false,
		Metadata:  make(map[string]interface{}),
	}
}

// Close closes the plugin system
func (s *PluginSystem) Close() error {
	return s.Shutdown()
}
