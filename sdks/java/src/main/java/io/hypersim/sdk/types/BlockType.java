package io.hypersim.sdk.types;

/**
 * Block type in HyperEVM's dual-block system.
 * 
 * HyperEVM uses a dual-block system with different gas limits
 * and intervals to optimize for different transaction types.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public enum BlockType {
    
    /** Small blocks: 2M gas limit, 1-second intervals */
    SMALL("small", 2_000_000L, 1000L),
    
    /** Large blocks: 30M gas limit, 1-minute intervals */
    LARGE("large", 30_000_000L, 60_000L);
    
    private final String name;
    private final long gasLimit;
    private final long intervalMs;
    
    BlockType(String name, long gasLimit, long intervalMs) {
        this.name = name;
        this.gasLimit = gasLimit;
        this.intervalMs = intervalMs;
    }
    
    /**
     * Gets the block type name.
     * 
     * @return the block type name
     */
    public String getName() {
        return name;
    }
    
    /**
     * Gets the gas limit for this block type.
     * 
     * @return the gas limit
     */
    public long getGasLimit() {
        return gasLimit;
    }
    
    /**
     * Gets the interval between blocks of this type in milliseconds.
     * 
     * @return the interval in milliseconds
     */
    public long getIntervalMs() {
        return intervalMs;
    }
    
    /**
     * Parses a block type from its string representation.
     * 
     * @param typeName the block type name
     * @return the corresponding BlockType enum
     * @throws IllegalArgumentException if the type name is not recognized
     */
    public static BlockType fromString(String typeName) {
        if (typeName == null) {
            throw new IllegalArgumentException("Block type name cannot be null");
        }
        
        return switch (typeName.toLowerCase()) {
            case "small" -> SMALL;
            case "large" -> LARGE;
            default -> throw new IllegalArgumentException("Unknown block type: " + typeName);
        };
    }
}
