package io.hypersim.sdk.exceptions;

import java.io.Serial;

/**
 * Base exception class for all HyperSim SDK exceptions.
 * 
 * Provides common functionality for error handling across the SDK,
 * including request correlation and structured error information.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public class HyperSimException extends Exception {
    
    @Serial
    private static final long serialVersionUID = 1L;
    
    private final String requestId;
    private final long timestamp;
    private final String errorCode;
    
    /**
     * Constructs a new HyperSim exception with the specified detail message.
     *
     * @param message the detail message
     */
    public HyperSimException(String message) {
        super(message);
        this.requestId = null;
        this.timestamp = System.currentTimeMillis();
        this.errorCode = getClass().getSimpleName().toUpperCase();
    }
    
    /**
     * Constructs a new HyperSim exception with the specified detail message and cause.
     *
     * @param message the detail message
     * @param cause the cause
     */
    public HyperSimException(String message, Throwable cause) {
        super(message, cause);
        this.requestId = null;
        this.timestamp = System.currentTimeMillis();
        this.errorCode = getClass().getSimpleName().toUpperCase();
    }
    
    /**
     * Constructs a new HyperSim exception with detailed error information.
     *
     * @param message the detail message
     * @param cause the cause
     * @param requestId the request ID that caused this exception
     * @param errorCode the specific error code
     */
    public HyperSimException(String message, Throwable cause, String requestId, String errorCode) {
        super(message, cause);
        this.requestId = requestId;
        this.timestamp = System.currentTimeMillis();
        this.errorCode = errorCode != null ? errorCode : getClass().getSimpleName().toUpperCase();
    }
    
    /**
     * Gets the request ID associated with this exception.
     *
     * @return the request ID, or null if not available
     */
    public String getRequestId() {
        return requestId;
    }
    
    /**
     * Gets the timestamp when this exception occurred.
     *
     * @return the timestamp in milliseconds since epoch
     */
    public long getTimestamp() {
        return timestamp;
    }
    
    /**
     * Gets the error code for this exception.
     *
     * @return the error code
     */
    public String getErrorCode() {
        return errorCode;
    }
    
    /**
     * Returns a detailed string representation of this exception.
     *
     * @return a string representation including all error details
     */
    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append(getClass().getSimpleName());
        sb.append("[errorCode=").append(errorCode);
        if (requestId != null) {
            sb.append(", requestId=").append(requestId);
        }
        sb.append(", timestamp=").append(timestamp);
        sb.append(", message=").append(getMessage());
        sb.append("]");
        return sb.toString();
    }
}
