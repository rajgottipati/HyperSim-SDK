package io.hypersim.sdk.exceptions;

import java.io.Serial;

/**
 * Exception thrown when plugin-related operations fail.
 * 
 * This exception is raised when there are issues with plugin
 * loading, initialization, execution, or other plugin system
 * operations.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public class PluginException extends HyperSimException {
    
    @Serial
    private static final long serialVersionUID = 1L;
    
    private final String pluginName;
    private final String pluginVersion;
    
    /**
     * Constructs a plugin exception with the specified message.
     *
     * @param message the plugin error message
     */
    public PluginException(String message) {
        super(message);
        this.pluginName = null;
        this.pluginVersion = null;
    }
    
    /**
     * Constructs a plugin exception with cause.
     *
     * @param message the plugin error message
     * @param cause the underlying cause
     */
    public PluginException(String message, Throwable cause) {
        super(message, cause);
        this.pluginName = null;
        this.pluginVersion = null;
    }
    
    /**
     * Constructs a plugin exception with plugin details.
     *
     * @param message the plugin error message
     * @param pluginName the name of the plugin that failed
     * @param pluginVersion the version of the plugin
     */
    public PluginException(String message, String pluginName, String pluginVersion) {
        super(String.format("%s: plugin='%s', version='%s'", message, pluginName, pluginVersion));
        this.pluginName = pluginName;
        this.pluginVersion = pluginVersion;
    }
    
    /**
     * Constructs a plugin exception with full details.
     *
     * @param message the plugin error message
     * @param cause the underlying cause
     * @param pluginName the name of the plugin that failed
     * @param pluginVersion the version of the plugin
     */
    public PluginException(String message, Throwable cause, String pluginName, String pluginVersion) {
        super(String.format("%s: plugin='%s', version='%s'", message, pluginName, pluginVersion), cause);
        this.pluginName = pluginName;
        this.pluginVersion = pluginVersion;
    }
    
    /**
     * Gets the name of the plugin that failed.
     *
     * @return the plugin name, or null if not available
     */
    public String getPluginName() {
        return pluginName;
    }
    
    /**
     * Gets the version of the plugin that failed.
     *
     * @return the plugin version, or null if not available
     */
    public String getPluginVersion() {
        return pluginVersion;
    }
}
