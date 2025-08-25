package io.hypersim.sdk.exceptions;

import java.io.Serial;

/**
 * Exception thrown when SDK configuration is invalid.
 * 
 * This exception is raised when the SDK is initialized with
 * invalid configuration parameters, such as missing API keys,
 * invalid network settings, or conflicting options.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public class ConfigurationException extends HyperSimException {
    
    @Serial
    private static final long serialVersionUID = 1L;
    
    private final String configKey;
    private final Object configValue;
    
    /**
     * Constructs a configuration exception with the specified message.
     *
     * @param message the configuration error message
     */
    public ConfigurationException(String message) {
        super(message);
        this.configKey = null;
        this.configValue = null;
    }
    
    /**
     * Constructs a configuration exception with cause.
     *
     * @param message the configuration error message
     * @param cause the underlying cause
     */
    public ConfigurationException(String message, Throwable cause) {
        super(message, cause);
        this.configKey = null;
        this.configValue = null;
    }
    
    /**
     * Constructs a configuration exception with config details.
     *
     * @param message the configuration error message
     * @param configKey the configuration key that is invalid
     * @param configValue the invalid configuration value
     */
    public ConfigurationException(String message, String configKey, Object configValue) {
        super(String.format("%s: key='%s', value='%s'", message, configKey, configValue));
        this.configKey = configKey;
        this.configValue = configValue;
    }
    
    /**
     * Gets the configuration key that is invalid.
     *
     * @return the configuration key, or null if not applicable
     */
    public String getConfigKey() {
        return configKey;
    }
    
    /**
     * Gets the invalid configuration value.
     *
     * @return the configuration value, or null if not applicable
     */
    public Object getConfigValue() {
        return configValue;
    }
}
