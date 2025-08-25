package io.hypersim.sdk.plugins;

/**
 * Interface for plugin hooks.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public interface PluginHook {
    
    /**
     * Execute the hook.
     * 
     * @param requestId the request ID
     * @param data the event data
     */
    void execute(String requestId, Object data);
}
