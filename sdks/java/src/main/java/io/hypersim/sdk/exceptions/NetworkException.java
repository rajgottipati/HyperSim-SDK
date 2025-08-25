package io.hypersim.sdk.exceptions;

import java.io.Serial;

/**
 * Exception thrown when network-related operations fail.
 * 
 * This exception is raised when there are issues with network
 * connectivity, RPC endpoint availability, or other network-related
 * problems that prevent successful communication with HyperEVM.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public class NetworkException extends HyperSimException {
    
    @Serial
    private static final long serialVersionUID = 1L;
    
    private final String endpoint;
    private final int statusCode;
    
    /**
     * Constructs a network exception with the specified message.
     *
     * @param message the network error message
     */
    public NetworkException(String message) {
        super(message);
        this.endpoint = null;
        this.statusCode = -1;
    }
    
    /**
     * Constructs a network exception with cause.
     *
     * @param message the network error message
     * @param cause the underlying cause
     */
    public NetworkException(String message, Throwable cause) {
        super(message, cause);
        this.endpoint = null;
        this.statusCode = -1;
    }
    
    /**
     * Constructs a network exception with endpoint details.
     *
     * @param message the network error message
     * @param endpoint the endpoint that failed
     * @param statusCode the HTTP status code
     */
    public NetworkException(String message, String endpoint, int statusCode) {
        super(message);
        this.endpoint = endpoint;
        this.statusCode = statusCode;
    }
    
    /**
     * Constructs a network exception with full details.
     *
     * @param message the network error message
     * @param cause the underlying cause
     * @param endpoint the endpoint that failed
     * @param statusCode the HTTP status code
     */
    public NetworkException(String message, Throwable cause, String endpoint, int statusCode) {
        super(message, cause);
        this.endpoint = endpoint;
        this.statusCode = statusCode;
    }
    
    /**
     * Gets the endpoint that failed.
     *
     * @return the endpoint URL, or null if not available
     */
    public String getEndpoint() {
        return endpoint;
    }
    
    /**
     * Gets the HTTP status code.
     *
     * @return the status code, or -1 if not available
     */
    public int getStatusCode() {
        return statusCode;
    }
}
