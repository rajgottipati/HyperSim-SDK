package io.hypersim.sdk.types;

/**
 * Supported HyperEVM networks.
 * 
 * HyperEVM operates on both mainnet and testnet environments,
 * each with different chain IDs and configurations.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public enum Network {
    
    /** HyperEVM Mainnet (Chain ID: 999) */
    MAINNET("mainnet", 999, "https://api.hyperliquid.xyz/evm", "https://explorer.hyperliquid.xyz"),
    
    /** HyperEVM Testnet (Chain ID: 998) */
    TESTNET("testnet", 998, "https://api.hyperliquid-testnet.xyz/evm", "https://explorer.hyperliquid-testnet.xyz");
    
    private final String networkName;
    private final int chainId;
    private final String defaultRpcUrl;
    private final String explorerUrl;
    
    Network(String networkName, int chainId, String defaultRpcUrl, String explorerUrl) {
        this.networkName = networkName;
        this.chainId = chainId;
        this.defaultRpcUrl = defaultRpcUrl;
        this.explorerUrl = explorerUrl;
    }
    
    /**
     * Gets the network name.
     * 
     * @return the network name
     */
    public String getNetworkName() {
        return networkName;
    }
    
    /**
     * Gets the chain ID for this network.
     * 
     * @return the chain ID
     */
    public int getChainId() {
        return chainId;
    }
    
    /**
     * Gets the default RPC URL for this network.
     * 
     * @return the default RPC URL
     */
    public String getDefaultRpcUrl() {
        return defaultRpcUrl;
    }
    
    /**
     * Gets the block explorer URL for this network.
     * 
     * @return the explorer URL
     */
    public String getExplorerUrl() {
        return explorerUrl;
    }
    
    /**
     * Gets the display name for this network.
     * 
     * @return the display name
     */
    public String getDisplayName() {
        return switch (this) {
            case MAINNET -> "HyperEVM Mainnet";
            case TESTNET -> "HyperEVM Testnet";
        };
    }
    
    /**
     * Gets the native token symbol for this network.
     * 
     * @return the native token symbol
     */
    public String getNativeToken() {
        return "ETH";
    }
    
    /**
     * Parses a network from its string representation.
     * 
     * @param networkName the network name
     * @return the corresponding Network enum
     * @throws IllegalArgumentException if the network name is not recognized
     */
    public static Network fromString(String networkName) {
        if (networkName == null) {
            throw new IllegalArgumentException("Network name cannot be null");
        }
        
        return switch (networkName.toLowerCase()) {
            case "mainnet", "main" -> MAINNET;
            case "testnet", "test" -> TESTNET;
            default -> throw new IllegalArgumentException("Unknown network: " + networkName);
        };
    }
}
