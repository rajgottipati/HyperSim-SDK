package io.hypersim.sdk.exceptions;

import java.io.Serial;
import java.time.Duration;

/**
 * Exception thrown when operations exceed their timeout limits.
 * 
 * This exception is raised when network requests, simulations,
 * or other operations take longer than the configured timeout
 * period to complete.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public class TimeoutException extends HyperSimException {
    
    @Serial
    private static final long serialVersionUID = 1L;
    
    private final Duration timeout;
    private final String operation;
    
    /**
     * Constructs a timeout exception with the specified message.
     *
     * @param message the timeout error message
     */
    public TimeoutException(String message) {
        super(message);
        this.timeout = null;
        this.operation = null;
    }
    
    /**
     * Constructs a timeout exception with operation details.
     *
     * @param message the timeout error message
     * @param operation the operation that timed out
     * @param timeout the timeout duration
     */
    public TimeoutException(String message, String operation, Duration timeout) {
        super(String.format("%s: operation='%s', timeout=%s", message, operation, timeout));
        this.operation = operation;
        this.timeout = timeout;
    }
    
    /**
     * Constructs a timeout exception with cause and details.
     *
     * @param message the timeout error message
     * @param cause the underlying cause
     * @param operation the operation that timed out
     * @param timeout the timeout duration
     */
    public TimeoutException(String message, Throwable cause, String operation, Duration timeout) {
        super(String.format("%s: operation='%s', timeout=%s", message, operation, timeout), cause);
        this.operation = operation;
        this.timeout = timeout;
    }
    
    /**
     * Gets the timeout duration.
     *
     * @return the timeout duration, or null if not available
     */
    public Duration getTimeout() {
        return timeout;
    }
    
    /**
     * Gets the operation that timed out.
     *
     * @return the operation name, or null if not available
     */
    public String getOperation() {
        return operation;
    }
}
