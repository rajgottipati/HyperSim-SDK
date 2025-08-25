package io.hypersim.sdk.exceptions;

import java.io.Serial;

/**
 * Exception thrown when input validation fails.
 * 
 * This exception is raised when user-provided data does not meet
 * the required validation criteria, such as invalid addresses,
 * malformed transaction data, or missing required fields.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public class ValidationException extends HyperSimException {
    
    @Serial
    private static final long serialVersionUID = 1L;
    
    private final String field;
    private final Object value;
    
    /**
     * Constructs a validation exception with the specified message.
     *
     * @param message the validation error message
     */
    public ValidationException(String message) {
        super(message);
        this.field = null;
        this.value = null;
    }
    
    /**
     * Constructs a validation exception with field-specific information.
     *
     * @param message the validation error message
     * @param field the field that failed validation
     * @param value the invalid value
     */
    public ValidationException(String message, String field, Object value) {
        super(String.format("%s: field='%s', value='%s'", message, field, value));
        this.field = field;
        this.value = value;
    }
    
    /**
     * Constructs a validation exception with cause and field information.
     *
     * @param message the validation error message
     * @param cause the underlying cause
     * @param field the field that failed validation
     * @param value the invalid value
     */
    public ValidationException(String message, Throwable cause, String field, Object value) {
        super(String.format("%s: field='%s', value='%s'", message, field, value), cause);
        this.field = field;
        this.value = value;
    }
    
    /**
     * Gets the field that failed validation.
     *
     * @return the field name, or null if not applicable
     */
    public String getField() {
        return field;
    }
    
    /**
     * Gets the invalid value.
     *
     * @return the invalid value, or null if not applicable
     */
    public Object getValue() {
        return value;
    }
}
