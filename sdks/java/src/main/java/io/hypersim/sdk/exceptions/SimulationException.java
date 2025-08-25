package io.hypersim.sdk.exceptions;

import java.io.Serial;

/**
 * Exception thrown when transaction simulation fails.
 * 
 * This exception is raised when the HyperEVM simulation process
 * encounters an error, such as network connectivity issues,
 * invalid transaction parameters, or simulation timeouts.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public class SimulationException extends HyperSimException {
    
    @Serial
    private static final long serialVersionUID = 1L;
    
    private final String transactionHash;
    private final String revertReason;
    
    /**
     * Constructs a simulation exception with the specified message.
     *
     * @param message the simulation error message
     */
    public SimulationException(String message) {
        super(message);
        this.transactionHash = null;
        this.revertReason = null;
    }
    
    /**
     * Constructs a simulation exception with cause.
     *
     * @param message the simulation error message
     * @param cause the underlying cause
     */
    public SimulationException(String message, Throwable cause) {
        super(message, cause);
        this.transactionHash = null;
        this.revertReason = null;
    }
    
    /**
     * Constructs a simulation exception with transaction details.
     *
     * @param message the simulation error message
     * @param transactionHash the transaction hash that failed
     * @param revertReason the revert reason if available
     */
    public SimulationException(String message, String transactionHash, String revertReason) {
        super(message);
        this.transactionHash = transactionHash;
        this.revertReason = revertReason;
    }
    
    /**
     * Constructs a simulation exception with full details.
     *
     * @param message the simulation error message
     * @param cause the underlying cause
     * @param transactionHash the transaction hash that failed
     * @param revertReason the revert reason if available
     */
    public SimulationException(String message, Throwable cause, String transactionHash, String revertReason) {
        super(message, cause);
        this.transactionHash = transactionHash;
        this.revertReason = revertReason;
    }
    
    /**
     * Gets the transaction hash that failed simulation.
     *
     * @return the transaction hash, or null if not available
     */
    public String getTransactionHash() {
        return transactionHash;
    }
    
    /**
     * Gets the revert reason if the transaction reverted.
     *
     * @return the revert reason, or null if not available
     */
    public String getRevertReason() {
        return revertReason;
    }
}
