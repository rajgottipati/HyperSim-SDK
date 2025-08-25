package plugins

import (
	"fmt"
	"time"
)

// Additional plugin system methods

// GetPlugins returns all registered plugins
func (s *PluginSystem) GetPlugins() map[string]*PluginConfig {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	plugins := make(map[string]*PluginConfig)
	for name, config := range s.plugins {
		plugins[name] = config
	}
	return plugins
}

// IsPluginEnabled checks if a plugin is enabled
func (s *PluginSystem) IsPluginEnabled(name string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	if config, exists := s.plugins[name]; exists {
		return config.Enabled
	}
	return false
}

// GetPluginConfig returns plugin configuration
func (s *PluginSystem) GetPluginConfig(name string) *PluginConfig {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	return s.plugins[name]
}

// registerPluginHooks registers hooks for a plugin
func (s *PluginSystem) registerPluginHooks(plugin Plugin) error {
	hooks := plugin.RegisterHooks()
	pluginName := plugin.Name()
	
	for hookType, hookFunc := range hooks {
		registeredHook := &registeredHook{
			pluginName: pluginName,
			function:   hookFunc,
			priority:   s.plugins[pluginName].Priority,
		}
		
		s.hooks[hookType] = append(s.hooks[hookType], registeredHook)
	}
	
	return nil
}

// unregisterPluginHooks removes all hooks for a plugin
func (s *PluginSystem) unregisterPluginHooks(pluginName string) {
	for hookType, hooks := range s.hooks {
		var filteredHooks []*registeredHook
		for _, hook := range hooks {
			if hook.pluginName != pluginName {
				filteredHooks = append(filteredHooks, hook)
			}
		}
		s.hooks[hookType] = filteredHooks
	}
}

// Close closes the plugin system
func (s *PluginSystem) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	for name, config := range s.plugins {
		if config.Enabled {
			if err := config.Plugin.Cleanup(); err != nil {
				if s.debug {
					fmt.Printf("[Plugin System] Error cleaning up plugin '%s': %v\n", name, err)
				}
			}
		}
	}
	
	s.plugins = make(map[string]*PluginConfig)
	s.hooks = make(map[HookType][]*registeredHook)
	s.initialized = false
	
	return nil
}

// CreateHookContext creates a new hook context
func CreateHookContext(requestID string, data interface{}) *HookContext {
	return &HookContext{
		RequestID: requestID,
		Timestamp: time.Now().Unix(),
		Data:      data,
		Metadata:  make(map[string]interface{}),
	}
}
