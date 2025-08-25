package io.hypersim.sdk.plugins;

/**
 * Base interface for all HyperSim SDK plugins.
 * 
 * Plugins provide extensibility points for the SDK through
 * a hook-based architecture with lifecycle management.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public interface Plugin {
    
    /**
     * Gets the plugin name.
     * 
     * @return the plugin name
     */
    String getName();
    
    /**
     * Gets the plugin version.
     * 
     * @return the plugin version
     */
    String getVersion();
    
    /**
     * Gets the plugin description.
     * 
     * @return the plugin description
     */
    default String getDescription() {
        return "";
    }
    
    /**
     * Initialize the plugin.
     * 
     * Called when the plugin is loaded and should perform
     * any necessary initialization tasks.
     * 
     * @throws Exception if initialization fails
     */
    default void initialize() throws Exception {
        // Default implementation does nothing
    }
    
    /**
     * Cleanup plugin resources.
     * 
     * Called when the plugin is unloaded and should clean
     * up any resources or connections.
     * 
     * @throws Exception if cleanup fails
     */
    default void cleanup() throws Exception {
        // Default implementation does nothing
    }
}
