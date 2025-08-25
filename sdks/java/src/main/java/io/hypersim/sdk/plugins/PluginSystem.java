package io.hypersim.sdk.plugins;

import io.hypersim.sdk.core.HyperSimSDK;
import io.hypersim.sdk.exceptions.PluginException;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Plugin system for SDK extensibility.
 * 
 * Provides a comprehensive plugin architecture with hook-based
 * extensibility, service loading, and lifecycle management.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public class PluginSystem {
    
    private static final Logger logger = LoggerFactory.getLogger(PluginSystem.class);
    
    private final Config config;
    private final Map<String, PluginRegistration> plugins = new ConcurrentHashMap<>();
    private final Map<String, List<HookRegistration>> hooks = new ConcurrentHashMap<>();
    private volatile boolean initialized = false;
    private volatile boolean shutdown = false;
    
    /**
     * Configuration for plugin system.
     */
    public record Config(
        boolean debug,
        boolean metricsEnabled
    ) {
        public static class Builder {
            private boolean debug = false;
            private boolean metricsEnabled = true;
            
            public Builder debug(boolean debug) {
                this.debug = debug;
                return this;
            }
            
            public Builder metricsEnabled(boolean metricsEnabled) {
                this.metricsEnabled = metricsEnabled;
                return this;
            }
            
            public Config build() {
                return new Config(debug, metricsEnabled);
            }
        }
        
        public static Builder builder() {
            return new Builder();
        }
    }
    
    public PluginSystem(@NotNull Config config) {
        this.config = Objects.requireNonNull(config);
        
        if (config.debug()) {
            logger.info("Plugin system initialized");
        }
    }
    
    /**
     * Initialize the plugin system.
     */
    public void initialize() {
        if (initialized) {
            return;
        }
        
        try {
            // Initialize all registered plugins
            for (var registration : plugins.values()) {
                if (registration.config().enabled()) {
                    initializePlugin(registration);
                }
            }
            
            initialized = true;
            
            if (config.debug()) {
                logger.info("Plugin system initialization completed. Active plugins: {}", 
                           plugins.size());
            }
            
        } catch (Exception e) {
            throw new PluginException("Failed to initialize plugin system", e);
        }
    }
    
    /**
     * Register a plugin.
     * 
     * @param pluginConfig the plugin configuration
     */
    public void registerPlugin(@NotNull io.hypersim.sdk.core.HyperSimConfig.PluginConfig pluginConfig) {
        Objects.requireNonNull(pluginConfig, "Plugin config cannot be null");
        checkNotShutdown();
        
        try {
            // Load plugin class
            Class<?> pluginClass = Class.forName(pluginConfig.className());
            if (!Plugin.class.isAssignableFrom(pluginClass)) {
                throw new PluginException("Plugin class must implement Plugin interface: " + pluginConfig.className());
            }
            
            // Create plugin instance
            Plugin plugin = (Plugin) pluginClass.getDeclaredConstructor().newInstance();
            
            var registration = new PluginRegistration(plugin, pluginConfig);
            plugins.put(pluginConfig.name(), registration);
            
            // Register hooks
            registerPluginHooks(plugin, pluginConfig.priority());
            
            if (initialized && pluginConfig.enabled()) {
                initializePlugin(registration);
            }
            
            if (config.debug()) {
                logger.debug("Plugin registered: {} ({})", pluginConfig.name(), pluginConfig.className());
            }
            
        } catch (Exception e) {
            throw new PluginException("Failed to register plugin: " + pluginConfig.name(), e);
        }
    }
    
    /**
     * Unregister a plugin.
     * 
     * @param pluginName the name of the plugin to unregister
     */
    public void unregisterPlugin(@NotNull String pluginName) {
        Objects.requireNonNull(pluginName, "Plugin name cannot be null");
        checkNotShutdown();
        
        var registration = plugins.remove(pluginName);
        if (registration != null) {
            try {
                // Cleanup plugin
                if (registration.plugin() instanceof Plugin plugin) {
                    plugin.cleanup();
                }
                
                // Remove hooks
                unregisterPluginHooks(pluginName);
                
                if (config.debug()) {
                    logger.debug("Plugin unregistered: {}", pluginName);
                }
                
            } catch (Exception e) {
                logger.warn("Error during plugin cleanup: {}", pluginName, e);
            }
        }
    }
    
    /**
     * Execute hooks for a specific event.
     * 
     * @param hookName the hook name
     * @param requestId the request ID
     * @param data the event data
     */
    public void executeHooks(@NotNull String hookName, @NotNull String requestId, @Nullable Object data) {
        Objects.requireNonNull(hookName, "Hook name cannot be null");
        Objects.requireNonNull(requestId, "Request ID cannot be null");
        
        if (!initialized || shutdown) {
            return;
        }
        
        var hookList = hooks.get(hookName);
        if (hookList == null || hookList.isEmpty()) {
            return;
        }
        
        if (config.debug()) {
            logger.debug("Executing {} hooks for event: {}", hookList.size(), hookName);
        }
        
        // Execute hooks in priority order
        for (var hookReg : hookList) {
            try {
                hookReg.hook().execute(requestId, data);
            } catch (Exception e) {
                logger.warn("Hook execution failed: plugin={}, hook={}, error={}", 
                           hookReg.pluginName(), hookName, e.getMessage());
            }
        }
    }
    
    /**
     * Get list of registered plugins.
     * 
     * @return list of plugin information
     */
    @NotNull
    public List<HyperSimSDK.PluginInfo> getPlugins() {
        return plugins.values().stream()
            .map(reg -> new HyperSimSDK.PluginInfo(
                reg.config().name(),
                reg.plugin().getVersion(),
                reg.config().enabled()
            ))
            .toList();
    }
    
    /**
     * Shutdown the plugin system.
     */
    public void shutdown() {
        if (shutdown) {
            return;
        }
        
        shutdown = true;
        
        // Cleanup all plugins
        for (var registration : plugins.values()) {
            try {
                registration.plugin().cleanup();
            } catch (Exception e) {
                logger.warn("Error during plugin cleanup: {}", registration.config().name(), e);
            }
        }
        
        plugins.clear();
        hooks.clear();
        
        if (config.debug()) {
            logger.info("Plugin system shutdown completed");
        }
    }
    
    private void initializePlugin(PluginRegistration registration) {
        try {
            registration.plugin().initialize();
            
            if (config.debug()) {
                logger.debug("Plugin initialized: {}", registration.config().name());
            }
            
        } catch (Exception e) {
            throw new PluginException("Failed to initialize plugin: " + registration.config().name(), e);
        }
    }
    
    private void registerPluginHooks(Plugin plugin, int priority) {
        var hookMethods = plugin.getClass().getDeclaredMethods();
        
        for (var method : hookMethods) {
            var hookAnnotation = method.getAnnotation(Hook.class);
            if (hookAnnotation != null) {
                var hookName = hookAnnotation.value();
                var hook = new ReflectiveHook(plugin, method);
                var hookReg = new HookRegistration(plugin.getName(), hook, priority);
                
                hooks.computeIfAbsent(hookName, k -> new CopyOnWriteArrayList<>()).add(hookReg);
                
                // Sort hooks by priority
                hooks.get(hookName).sort(Comparator.comparingInt(HookRegistration::priority));
            }
        }
    }
    
    private void unregisterPluginHooks(String pluginName) {
        hooks.values().forEach(hookList -> 
            hookList.removeIf(hookReg -> hookReg.pluginName().equals(pluginName)));
    }
    
    private void checkNotShutdown() {
        if (shutdown) {
            throw new IllegalStateException("Plugin system has been shut down");
        }
    }
    
    private record PluginRegistration(
        @NotNull Plugin plugin,
        @NotNull io.hypersim.sdk.core.HyperSimConfig.PluginConfig config
    ) {}
    
    private record HookRegistration(
        @NotNull String pluginName,
        @NotNull PluginHook hook,
        int priority
    ) {}
}
