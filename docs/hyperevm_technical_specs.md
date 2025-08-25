# HyperEVM Technical Specifications

## Executive Summary

HyperEVM is a general-purpose Ethereum Virtual Machine integrated into the Hyperliquid ecosystem, featuring a unique dual-block architecture that optimizes for both speed and capacity. Built on the Cancun EVM specification (without blob support), HyperEVM operates as part of a dual-chain system alongside HyperCore, secured by the HyperBFT consensus protocol. The system features innovative precompiled contracts for cross-chain interaction, EIP-1559 gas mechanics with fee burning, and comprehensive EVM compatibility while maintaining high performance through its specialized architecture.

## 1. Introduction

This technical specification document provides comprehensive details about HyperEVM's architecture, implementation, and operational parameters. HyperEVM transforms Hyperliquid into a fully programmable financial system by integrating smart contract capabilities directly with Hyperliquid's high-performance order books[8]. The system enables developers to build applications that tap into deep, high-performance liquidity while maintaining compatibility with existing Ethereum tools and development practices.

## 2. Network Specifications

### 2.1 Mainnet Configuration
- **Chain ID**: 999
- **JSON-RPC Endpoint**: https://rpc.hyperliquid.xyz/evm
- **Native Gas Token**: HYPE (18 decimals)
- **Network Name**: HyperEVM Mainnet
- **Block Explorer Integration**: Supported via standard EVM tools

### 2.2 Testnet Configuration
- **Chain ID**: 998  
- **JSON-RPC Endpoint**: https://rpc.hyperliquid-testnet.xyz/evm
- **Native Gas Token**: HYPE (18 decimals)
- **Network Name**: HyperEVM Testnet
- **Additional Features**: Read precompiles for HyperCore state querying[5]

### 2.3 Network Connectivity

HyperEVM supports standard JSON-RPC interaction methods[1], enabling seamless integration with existing Ethereum development tools including MetaMask, Web3.js, and ethers.js. Users can add HyperEVM to their wallet extensions using Chainlist (https://chainlist.org/chain/999) or by manually configuring the network parameters.

**Key Differences Between Networks**:
- Both mainnet and testnet use HYPE tokens with 18 decimal precision[1]
- Testnet includes additional read precompiles for development and testing[5]
- Both networks share the same dual-block architecture and consensus mechanisms

## 3. Dual-Block System Architecture

### 3.1 Architecture Overview

HyperEVM implements a unique dual-block architecture designed to address the inherent trade-off between block speed and capacity[3]. This system separates transactions into two distinct processing lanes, each optimized for different use cases and performance characteristics.

### 3.2 Small Block Processing
- **Gas Limit**: 2M gas
- **Production Frequency**: Every 1 second
- **Primary Use Case**: Typical user transactions requiring fast confirmation
- **Target Audience**: Standard DeFi operations, token transfers, simple contract interactions

### 3.3 Large Block Processing  
- **Gas Limit**: 30M gas
- **Production Frequency**: Every 1 minute
- **Primary Use Case**: Complex operations such as contract deployments
- **Target Audience**: Large-scale operations, complex contract deployments, high-computation transactions

### 3.4 Mempool Structure

The dual-block system utilizes a sophisticated mempool implementation[2]:

- **Split Mempool Design**: Two independent mempools source transactions for the respective block types
- **Block Number Sequencing**: Each block type is assigned unique and increasing EVM block numbers in an interleaved pattern
- **Nonce Management**: Onchain mempool enforces a limit of accepting only the next 8 nonces per address
- **Transaction Pruning**: Automatic removal of transactions remaining in mempool for longer than 1 day

### 3.5 Block Execution Model

The system operates under a sequential execution model where HyperCore (L1) produces blocks faster than HyperEVM, but both are executed sequentially[4]. This design enables:

- EVM contracts to read HyperCore state from previous blocks
- EVM transactions to influence future HyperCore blocks
- Maintained consistency across both execution environments

## 4. Precompiled Contracts System

### 4.1 Precompiled Contract Overview

HyperEVM utilizes specialized precompiled contracts to enable efficient interaction between the EVM environment and HyperCore[4]. These contracts operate at addresses with special significance and provide native-level performance for critical operations.

### 4.2 Core System Contracts

#### 4.2.1 Event System Contract
- **Address**: `0x3333333333333333333333333333333333333333`
- **Function**: CoreWriter.sendRawAction(bytes memory data)
- **Purpose**: Enables HyperEVM smart contracts to send actions to HyperCore
- **Data Format**: 4-byte header + ABI-encoded parameters
- **Example Header**: `0x01000007` for USD class transfers

#### 4.2.2 ERC20 Transfer Contract
- **Address**: `0x2222222222222222222222222222222222222222`
- **Function**: Native token transfers to HyperCore
- **Mechanism**: ERC20 transfers to this address are credited to L1 spot balance
- **Event Emission**: `Received(address indexed user, uint256 amount)`
- **Supported Senders**: Both smart contracts and EOAs (Externally Owned Accounts)

#### 4.2.3 Read Precompiles
- **Address Range**: Starting at `0x0000000000000000000000000000000000000800`
- **Function**: Query HyperCore information from EVM contracts
- **Access Method**: `staticcall` to precompile addresses
- **Guaranteed Freshness**: State reads are up-to-date due to sequential block execution
- **Example Usage**: Reading user perpetual positions, order book data, protocol metrics

### 4.3 Precompile Interaction Patterns

#### 4.3.1 Reading HyperCore State
```solidity
// Example: Reading user perp positions
PRECOMPILE_ADDRESS.staticcall(abi.encode(user, perp))
```

#### 4.3.2 Executing HyperCore Actions
Actions are executed through the CoreWriter contract with structured data encoding:
- **Header Bytes**: Identify the specific action type
- **Payload**: ABI-encoded parameters for the action
- **Validation**: Actions must conform to predefined schemas

### 4.4 Technical Limitations and Considerations

#### 4.4.1 Partial Atomicity
- **Event Emission**: Guaranteed atomic with EVM transaction
- **L1 Action Execution**: Not atomic with EVM transaction
- **Failure Handling**: L1 action failures do not revert EVM transactions
- **State Visibility**: Updated L1 state only available in subsequent EVM blocks

#### 4.4.2 Account Management
- **L1 Account Requirement**: Smart contracts must have corresponding L1 accounts
- **Account Creation**: Requires manual USDC transfer to force L1 account creation
- **Silent Failures**: L1 actions fail silently if L1 account doesn't exist

#### 4.4.3 Balance Visibility
- **Pre-crediting State**: Transferred amounts not immediately visible in same block
- **Balance Tracking**: Protocols must internally track pending transfers
- **Cross-Environment Consistency**: Eventual consistency between EVM and L1 balances

## 5. Gas Mechanics and Fee Structure

### 5.1 EIP-1559 Implementation

HyperEVM implements EIP-1559 gas mechanics with several distinctive characteristics[8]:

- **Base Fee**: Dynamic base fee adjustment based on network congestion
- **Priority Fee**: Additional fee to incentivize faster transaction processing  
- **Fee Burning**: Both base fees and priority fees are burned, reducing HYPE supply
- **Consensus Integration**: Gas mechanics driven by HyperBFT consensus protocol

### 5.2 Gas Price Dynamics

The dual-block architecture creates differentiated gas markets:

#### 5.2.1 Small Block Gas Market
- **Target Utilization**: Optimized for 1-second block times
- **Gas Limit**: 2M gas ceiling constrains complex operations
- **Price Sensitivity**: Higher responsiveness to congestion due to frequent blocks

#### 5.2.2 Large Block Gas Market  
- **Target Utilization**: Optimized for 1-minute block intervals
- **Gas Limit**: 30M gas accommodates complex operations
- **Price Stability**: More stable pricing due to higher capacity and longer intervals

### 5.3 Native Token Economics

- **Gas Token**: HYPE serves as the native gas token
- **Decimals**: 18 decimal precision on both mainnet and testnet
- **Supply Mechanism**: Deflationary through fee burning
- **Transfer Mechanism**: Native transfers to HyperCore via system contract at `0x222..2`

### 5.4 Cross-Chain Transfer Costs

- **HYPE Transfers**: Small gas cost for event emission during HyperCore transfers[7]
- **ERC20 Bridging**: Gas costs for precompile interactions and state updates
- **Action Execution**: Variable costs based on action complexity and data size

## 6. Transaction Format and Validation Rules

### 6.1 EVM Compatibility Specification

HyperEVM is built on the **Cancun EVM specification (without blob support)**[8], ensuring broad compatibility with existing Ethereum tooling while maintaining performance optimizations.

#### 6.1.1 Supported Transaction Types
- **Legacy Transactions**: Full support for pre-EIP-1559 transaction formats
- **EIP-1559 Transactions**: Primary transaction type with dynamic fee structure
- **EIP-2930 Access Lists**: Supported for gas optimization in contract interactions

#### 6.1.2 Excluded Features
- **Blob Transactions (EIP-4844)**: Not supported in current implementation
- **Custom Transaction Types**: Limited to standard Ethereum transaction formats

### 6.2 Transaction Validation Rules

#### 6.2.1 Nonce Management
- **Sequential Nonces**: Standard Ethereum nonce sequencing required
- **Mempool Limits**: Maximum of 8 pending nonces per address accepted[2]
- **Nonce Gaps**: Transactions with nonce gaps rejected until earlier nonces processed

#### 6.2.2 Gas Validation
- **Minimum Gas**: Standard EVM minimum gas requirements (21,000 for transfers)
- **Maximum Gas**: Constrained by block gas limits (2M for small blocks, 30M for large blocks)
- **Gas Price**: Must meet minimum base fee requirements plus optional priority fee

#### 6.2.3 Balance Requirements
- **Sufficient Balance**: Account must have sufficient HYPE for gas costs
- **Value Transfers**: Account balance must cover transaction value plus gas
- **Precompile Interactions**: Additional gas requirements for cross-chain operations

### 6.3 Transaction Processing Pipeline

#### 6.3.1 Mempool Processing
1. **Transaction Receipt**: Initial validation of format and signature
2. **Mempool Assignment**: Routing to appropriate mempool based on gas requirements
3. **Nonce Validation**: Verification of nonce sequence and limits
4. **Balance Check**: Confirmation of sufficient funds for execution

#### 6.3.2 Block Inclusion
1. **Gas Market Dynamics**: Transaction selection based on fee bidding
2. **Block Type Selection**: Automatic routing based on gas requirements and timing
3. **Execution Order**: Sequential processing within blocks
4. **State Updates**: Application of state changes and event emissions

#### 6.3.3 Cross-Chain Integration
1. **Precompile Detection**: Identification of HyperCore interaction transactions
2. **Event Processing**: Extraction and formatting of cross-chain events
3. **L1 Action Queuing**: Scheduling of HyperCore actions for subsequent blocks
4. **State Synchronization**: Coordination between HyperEVM and HyperCore state

### 6.4 Validation Edge Cases

#### 6.4.1 Cross-Chain Transaction Failures
- **L1 Action Failures**: Do not revert EVM transaction state
- **Insufficient L1 Balance**: Silent failures require manual recovery mechanisms
- **Account Existence**: L1 account creation prerequisite for cross-chain operations

#### 6.4.2 Mempool Management
- **Transaction Pruning**: 24-hour retention policy for pending transactions
- **Nonce Recovery**: Automatic cleanup of expired transaction sequences
- **Priority Adjustment**: Dynamic repricing based on network conditions

## 7. Consensus and Security Architecture

### 7.1 HyperBFT Consensus Protocol

HyperEVM operates under the HyperBFT consensus mechanism, a derivative of HotStuff optimized for high throughput[6]:

- **Theoretical Performance**: Up to 2 million orders per second
- **Communication Complexity**: Improved over Tendermint's O(n²) approach
- **Implementation**: Written in Rust for performance optimization
- **Leader-Based Model**: Reduced communication overhead through vote summarization

### 7.2 Validator Architecture

The network operates with a structured validator system[6]:

#### 7.2.1 Validator Set Composition
- **Total Validators**: 4 validator nodes
- **Hot Validator Set**: 4 active validators for real-time consensus
- **Cold Validator Set**: 4 validators for dispute resolution and security
- **Finalizers**: Specialized validator group (often same as hot validator set)
- **Lockers**: 5 addresses with 2-vote suspension capability

#### 7.2.2 Security Mechanisms
- **Bridge Dispute Period**: 200 seconds for withdrawal validation
- **Validator Set Updates**: 200-second dispute period for configuration changes
- **Multi-Signature Schemes**: Different signature weights for various operations
- **Suspension Capability**: Locker addresses can halt operations if needed

### 7.3 Cross-Chain Security Model

The dual-chain architecture provides several security advantages:

- **Unified Consensus**: Both HyperCore and HyperEVM secured by same consensus protocol
- **Sequential Execution**: Prevents race conditions between chain states  
- **Atomic Precompiles**: Native-level security for cross-chain operations
- **Validator Oversight**: Same validator set secures both execution environments

## 8. Developer Integration Guidelines

### 8.1 Wallet Integration

Developers can integrate HyperEVM into applications using standard Ethereum practices:

```javascript
// Network configuration for MetaMask
const hyperEVMConfig = {
  chainId: '0x3E7', // 999 in hex for mainnet
  chainName: 'HyperEVM Mainnet',
  rpcUrls: ['https://rpc.hyperliquid.xyz/evm'],
  nativeCurrency: {
    name: 'HYPE',
    symbol: 'HYPE',
    decimals: 18
  }
};
```

### 8.2 Smart Contract Development

HyperEVM supports standard Solidity development with additional precompile capabilities:

#### 8.2.1 Standard EVM Operations
- Full Solidity compiler compatibility
- Standard library support (OpenZeppelin, etc.)
- Existing deployment tools (Remix, Hardhat, Foundry)

#### 8.2.2 HyperCore Integration
```solidity
// Example: Interacting with HyperCore precompiles
contract HyperCoreReader {
    address constant PRECOMPILE_ADDR = 0x0000000000000000000000000000000000000800;
    
    function readUserPosition(address user, uint256 perp) external view returns (bytes memory) {
        (bool success, bytes memory result) = PRECOMPILE_ADDR.staticcall(
            abi.encode(user, perp)
        );
        require(success, "Precompile call failed");
        return result;
    }
}
```

### 8.3 Cross-Chain Asset Management

Developers must implement careful asset management for cross-chain operations:

#### 8.3.1 Balance Tracking
```solidity
contract CrossChainBalance {
    mapping(address => uint256) public pendingTransfers;
    
    function transferToL1(uint256 amount) external {
        // Transfer to system contract
        IERC20(token).transfer(0x2222222222222222222222222222222222222222, amount);
        // Track pending state
        pendingTransfers[msg.sender] += amount;
    }
}
```

#### 8.3.2 Recovery Mechanisms
Implement fund recovery for failed L1 actions:
```solidity
function recoverFailedTransfer(bytes calldata proof) external {
    // Implement recovery logic for failed L1 actions
    // This requires off-chain monitoring and proof generation
}
```

## 9. Performance Characteristics

### 9.1 Throughput Metrics

The dual-block architecture provides differentiated performance characteristics:

#### 9.1.1 Small Block Performance
- **Block Time**: 1 second consistent intervals
- **Gas Throughput**: 2M gas per second sustained
- **Transaction Capacity**: ~95 simple transfers per second (21k gas each)
- **Latency**: Sub-second confirmation for standard operations

#### 9.1.2 Large Block Performance  
- **Block Time**: 60 second intervals
- **Gas Throughput**: 30M gas per minute (500k gas per second average)
- **Transaction Capacity**: Optimized for complex contract deployments
- **Batch Processing**: Efficient handling of high-computation operations

### 9.2 Network Efficiency

- **Consensus Efficiency**: HyperBFT optimization reduces validator communication overhead
- **Cross-Chain Operations**: Native precompiles eliminate bridge complexity
- **Fee Structure**: EIP-1559 implementation with complete fee burning
- **State Synchronization**: Sequential execution ensures consistency

## 10. Limitations and Considerations

### 10.1 Current Limitations

#### 10.1.1 Blob Transaction Support
HyperEVM does not support EIP-4844 blob transactions, limiting certain Layer 2 scaling approaches and data availability solutions that rely on blob space.

#### 10.1.2 Cross-Chain Atomicity
The partial atomicity model means that L1 action failures do not revert EVM transactions, requiring developers to implement comprehensive error handling and recovery mechanisms.

#### 10.1.3 Account Management Complexity
The requirement for L1 account existence before cross-chain operations adds operational complexity for smart contract deployments.

### 10.2 Development Considerations

#### 10.2.1 Message Sender Handling
When interacting through L1 system contracts, `msg.sender` in HyperEVM will be the system contract address, not the original user address[6]. Developers must implement alternative authentication mechanisms.

#### 10.2.2 State Visibility Delays
Updated L1 state via precompiles is only available in subsequent EVM blocks, requiring developers to account for state propagation delays in application logic.

#### 10.2.3 Gas Market Dynamics
The dual-block system creates complex gas market dynamics that developers must understand for optimal transaction routing and cost management.

## 11. Future Roadmap and Evolution

### 11.1 Planned Enhancements

Based on the current proof-of-concept status[4], several enhancements are anticipated:

- **Expanded Precompile Functionality**: Additional precompiles for more comprehensive HyperCore integration
- **Improved Cross-Chain Atomicity**: Enhanced mechanisms for atomic cross-chain operations  
- **Gas Optimization Features**: Further refinements to dual-block gas markets
- **Development Tooling**: Specialized tools for HyperEVM development and debugging

### 11.2 Ecosystem Development

The growing HyperEVM ecosystem is attracting various applications:

- **DeFi Protocols**: Leveraging deep liquidity access through HyperCore integration
- **Trading Applications**: Utilizing high-performance order book access
- **Cross-Chain Infrastructure**: Building on native bridge capabilities
- **Developer Tooling**: Expanding support for HyperEVM-specific development needs

## 12. Conclusion

HyperEVM represents a significant advancement in EVM-compatible blockchain architecture, successfully combining the programmability of smart contracts with the performance characteristics of high-frequency trading systems. The dual-block architecture addresses fundamental blockchain scalability challenges while maintaining EVM compatibility and introducing innovative cross-chain integration mechanisms.

The system's technical sophistication, from its HyperBFT consensus protocol to its specialized precompiled contracts, positions it as a compelling platform for applications requiring both smart contract flexibility and high-performance liquidity access. While certain limitations exist, particularly around cross-chain atomicity and account management, the overall architecture provides a solid foundation for the next generation of decentralized financial applications.

As the ecosystem continues to mature and additional features are implemented, HyperEVM is well-positioned to serve as a critical infrastructure component for applications that demand both the programmability of Ethereum and the performance characteristics of centralized trading systems.

## 13. Sources

[1] [HyperEVM - Official Developer Documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm) - High Reliability - Official Hyperliquid technical documentation providing RPC endpoints, network specifications, and basic integration guidelines

[2] [Dual-Block Architecture Documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/dual-block-architecture) - High Reliability - Official Hyperliquid documentation detailing mempool structure, transaction limits, and block processing mechanics

[3] [Hyperliquid Integration Guide](https://docs.chain.link/ccip/tools-resources/network-specific/hyperliquid-integration-guide) - High Reliability - Chainlink's official integration documentation providing technical specifications for dual-block architecture and system capabilities

[4] [The Not-So-Definitive Guide to Hyperliquid Precompiles](https://medium.com/@ambitlabs/the-not-so-definitive-guide-to-hyperliquid-precompiles-f0b6025bb4a3) - Medium Reliability - Technical analysis by Ambit Labs providing detailed precompile specifications, addresses, and implementation details

[5] [Interacting with HyperCore Documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/interacting-with-hypercore) - High Reliability - Official documentation covering CoreWriter contract specifications and cross-chain interaction mechanisms

[6] [Technical Analysis of Hyperliquid's Bridge and Architecture](https://www.panewslab.com/en/articles/l3o76fqd) - Medium Reliability - Comprehensive technical analysis covering HyperBFT consensus, validator architecture, and system implementation details

[7] [HyperCore <> HyperEVM Transfers Documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers) - High Reliability - Official documentation for cross-chain transfer mechanisms and token handling procedures

[8] [HyperEVM Architecture - Hyperliquid Wiki](https://hyperliquid-co.gitbook.io/wiki/architecture/hyperevm) - High Reliability - Official architectural overview covering EVM specification compliance, gas mechanics, and system integration details
