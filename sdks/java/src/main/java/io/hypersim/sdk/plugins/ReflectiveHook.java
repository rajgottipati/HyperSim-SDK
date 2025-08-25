package io.hypersim.sdk.plugins;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.reflect.Method;

/**
 * Hook implementation using reflection.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
class ReflectiveHook implements PluginHook {
    
    private static final Logger logger = LoggerFactory.getLogger(ReflectiveHook.class);
    
    private final Plugin plugin;
    private final Method method;
    
    public ReflectiveHook(Plugin plugin, Method method) {
        this.plugin = plugin;
        this.method = method;
        this.method.setAccessible(true);
    }
    
    @Override
    public void execute(String requestId, Object data) {
        try {
            // Determine parameter types and invoke accordingly
            var paramTypes = method.getParameterTypes();
            
            if (paramTypes.length == 0) {
                method.invoke(plugin);
            } else if (paramTypes.length == 1) {
                if (paramTypes[0] == String.class) {
                    method.invoke(plugin, requestId);
                } else {
                    method.invoke(plugin, data);
                }
            } else if (paramTypes.length == 2) {
                method.invoke(plugin, requestId, data);
            } else {
                logger.warn("Hook method has unsupported parameter count: {} (plugin: {}, method: {})", 
                           paramTypes.length, plugin.getName(), method.getName());
            }
            
        } catch (Exception e) {
            logger.error("Failed to execute hook: plugin={}, method={}, error={}", 
                        plugin.getName(), method.getName(), e.getMessage());
        }
    }
}
