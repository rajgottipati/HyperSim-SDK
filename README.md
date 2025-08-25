# HyperSim SDK 🚀

**Advanced TypeScript SDK for HyperEVM Blockchain**

[![npm version](https://badge.fury.io/js/%40hypersim%2Fsdk.svg)](https://badge.fury.io/js/%40hypersim%2Fsdk)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/hypersim/typescript-sdk/workflows/CI/badge.svg)](https://github.com/hypersim/typescript-sdk/actions)

A production-ready, enterprise-grade TypeScript SDK for HyperEVM that provides transaction simulation, cross-layer integration with HyperCore, AI-powered analysis, and real-time streaming capabilities.

## ✨ Key Features

### 🎯 Core Capabilities
- **Transaction Simulation**: Advanced simulation engine with dual-block architecture support
- **Cross-Layer Integration**: Native HyperCore precompile contract interactions
- **AI-Powered Analysis**: OpenAI integration for transaction optimization and risk assessment
- **Real-Time Streaming**: WebSocket client with automatic reconnection and connection pooling
- **Plugin Architecture**: Extensible system with middleware patterns for customization

### 🔧 Developer Experience
- **Full TypeScript Support**: Complete type safety with comprehensive IntelliSense
- **Modern Architecture**: Built with ES modules, async/await, and modern JavaScript patterns
- **Robust Error Handling**: Hierarchical error system with detailed context information
- **Performance Optimized**: Connection pooling, caching, and efficient resource management
- **Tree-Shakeable**: Modular design for optimal bundle sizes

### 🌐 Network Support
- **HyperEVM Mainnet** (Chain ID: 999)
- **HyperEVM Testnet** (Chain ID: 998)
- **Multiple RPC Providers**: Automatic failover and load balancing

## 📚 Quick Start

### Installation

```bash
npm install @hypersim/sdk
# or
yarn add @hypersim/sdk
# or
pnpm add @hypersim/sdk
```

### Basic Usage

```typescript
import { HyperSimSDK } from '@hypersim/sdk';

// Initialize the SDK
const sdk = new HyperSimSDK({
  network: 'mainnet', // or 'testnet'
  enableAI: true,     // Enable AI analysis (requires OpenAI API key)
  crossLayer: true,   // Enable HyperCore integration
  debug: false        // Set to true for detailed logging
});

// Simulate a transaction
const result = await sdk.simulate({
  transaction: {
    from: '0x742d35cc6335c06c75ce59e0b8f9bb94e8c8a8b6',
    to: '0x1234567890123456789012345678901234567890',
    value: '1000000000000000000', // 1 HYPE
    gas: '21000'
  },
  aiAnalysis: true,
  hyperCoreData: true,
  dualBlocks: true
});

console.log('Simulation result:', result);
```

### Advanced Usage with AI Optimization

```typescript
// Set your OpenAI API key (required for AI features)
const sdk = new HyperSimSDK({
  network: 'mainnet',
  enableAI: true,
  apiKey: process.env.OPENAI_API_KEY
});

// Get AI-powered optimization recommendations
const optimization = await sdk.optimizeTransaction({
  transaction: {
    from: '0x742d35cc6335c06c75ce59e0b8f9bb94e8c8a8b6',
    to: '0x1234567890123456789012345678901234567890',
    value: '1000000000000000000',
    gas: '50000', // Potentially suboptimal gas limit
    gasPrice: '20000000000' // 20 gwei
  }
});

console.log('Gas reduction:', optimization.savings.gasReduction);
console.log('Cost savings:', optimization.savings.costSavings);
console.log('Recommendations:', optimization.recommendations);
```

### Real-Time Data Streaming

```typescript
// Connect to WebSocket for real-time data
await sdk.connect();

// Subscribe to trade data
sdk.subscribe({
  type: 'trades',
  coin: 'ETH'
});

// Listen for real-time events
sdk.on('data', (data) => {
  console.log('Real-time trade data:', data);
});

// Subscribe to user-specific events
sdk.subscribe({
  type: 'userFills',
  user: '0x742d35cc6335c06c75ce59e0b8f9bb94e8c8a8b6'
});
```

### Cross-Layer HyperCore Integration

```typescript
// Access HyperCore data through precompile contracts
const hyperCore = sdk.getHyperCoreClient();

// Get user positions
const positions = await hyperCore.getUserPositions('0x742d35cc6335c06c75ce59e0b8f9bb94e8c8a8b6');

// Get asset prices
const prices = await hyperCore.getAssetPrices(['ETH', 'BTC', 'SOL']);

// Get current L1 block information
const l1Block = await hyperCore.getCurrentL1Block();
```

## 📚 API Documentation

### Core SDK Options

```typescript
interface SDKOptions {
  network?: 'mainnet' | 'testnet';  // Default: 'mainnet'
  rpcUrl?: string;                   // Custom RPC endpoint
  wsUrl?: string;                    // Custom WebSocket endpoint
  apiKey?: string;                   // OpenAI API key for AI features
  timeout?: number;                  // Request timeout (default: 30000ms)
  retries?: number;                  // Retry attempts (default: 3)
  retryDelay?: number;               // Retry delay (default: 1000ms)
  enableAI?: boolean;                // Enable AI features (default: false)
  crossLayer?: boolean;              // Enable HyperCore integration (default: true)
  plugins?: Plugin[];                // Custom plugins
  debug?: boolean;                   // Debug mode (default: false)
}
```

### Transaction Simulation

```typescript
interface SimulateOptions {
  transaction: {
    from: string;
    to?: string;
    value?: string;
    data?: string;
    gas?: string;
    gasPrice?: string;
    nonce?: number;
  };
  hyperCoreData?: boolean;    // Include cross-layer data
  aiAnalysis?: boolean;       // Include AI analysis
  dualBlocks?: boolean;       // Include block type analysis
  blockNumber?: number | string;
}

interface SimulateResult {
  success: boolean;
  gasUsed: number;
  gasPrice: string;
  result?: string;
  error?: string;
  stateChanges?: StateChange[];
  hyperCoreData?: any;
  aiAnalysis?: AIAnalysisResult;
  estimatedCost: string;
  timestamp: number;
}
```

### WebSocket Subscriptions

```typescript
// Available subscription types
type SubscriptionType = 
  | { type: 'trades'; coin: string }
  | { type: 'l2Book'; coin: string; nSigFigs?: number }
  | { type: 'candle'; coin: string; interval: '1m' | '15m' | '1h' | '4h' | '1d' }
  | { type: 'userEvents'; user: string }
  | { type: 'userFills'; user: string }
  | { type: 'userPositions'; user: string };
```

### Plugin System

```typescript
interface Plugin {
  name: string;
  version?: string;
  initialize?(context: any): Promise<void> | void;
  beforeRequest?(options: any): Promise<any> | any;
  afterResponse?(response: any): Promise<any> | any;
  onError?(error: any): Promise<void> | void;
}

// Register and use plugins
sdk.getPluginManager().register(myPlugin);
await sdk.getPluginManager().load('my-plugin');
```

## 🔌 Advanced Features

### Middleware System

The SDK includes a powerful middleware system for request/response processing:

```typescript
const middleware = sdk.getMiddlewareManager();

// Built-in middleware
middleware.applyDefaults({
  enableLogging: true,
  enableRetry: true,
  enableRateLimit: true,
  enableCache: true,
  enablePerformance: true
});

// Custom middleware
const customMiddleware = {
  request: async (options, context, next) => {
    console.log('Processing request...');
    return next();
  },
  response: async (response, context, next) => {
    console.log('Processing response...');
    return next();
  }
};

middleware.getPipeline().useRequest(customMiddleware.request);
middleware.getPipeline().useResponse(customMiddleware.response);
```

### Error Handling

Comprehensive error system with specific error types:

```typescript
try {
  const result = await sdk.simulate(options);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.field, error.value);
  } else if (error instanceof NetworkError) {
    console.error('Network issue:', error.message);
  } else if (error instanceof SimulationError) {
    console.error('Simulation failed:', error.transactionHash);
  }
}
```

### Connection Pooling

For high-throughput applications:

```typescript
import { PooledWebSocketClient } from '@hypersim/sdk';

const pooledClient = new PooledWebSocketClient(5); // Pool of 5 connections
const connection = await pooledClient.getConnection();
```

## 🎨 Examples

Check out the `examples/` directory for comprehensive usage examples:

- **Basic Usage**: Simple transaction simulation and account queries
- **AI Analysis**: Transaction optimization with AI recommendations
- **WebSocket Streaming**: Real-time data subscriptions and event handling
- **Cross-Layer Integration**: HyperCore precompile contract interactions
- **Plugin Development**: Creating and registering custom plugins
- **Error Handling**: Proper error handling patterns

## 🛠️ Development

### Prerequisites

- Node.js 16.0.0 or higher
- TypeScript 4.5.0 or higher

### Setup

```bash
# Clone the repository
git clone https://github.com/hypersim/typescript-sdk.git
cd typescript-sdk

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run examples
npm run example:basic
npm run example:simulation
npm run example:streaming
npm run example:ai
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 🔒 Environment Variables

For full functionality, set these environment variables:

```bash
# OpenAI API key for AI-powered features
OPENAI_API_KEY=your_openai_api_key_here

# Custom RPC endpoints (optional)
HYPEREVM_MAINNET_RPC=https://your-custom-rpc-url
HYPEREVM_TESTNET_RPC=https://your-custom-testnet-rpc-url

# WebSocket endpoints (optional)
HYPEREVM_MAINNET_WS=wss://your-custom-ws-url
HYPEREVM_TESTNET_WS=wss://your-custom-testnet-ws-url
```

## 📊 Performance Considerations

### Optimization Tips

1. **Connection Pooling**: Use `PooledWebSocketClient` for high-frequency applications
2. **Caching**: Enable response caching for frequently accessed data
3. **Batch Operations**: Use batch RPC calls when possible
4. **Rate Limiting**: Implement appropriate rate limiting for your use case
5. **Tree Shaking**: Import only the components you need

### Bundle Size

The SDK is designed to be tree-shakeable:

```typescript
// Import only what you need
import { HyperSimSDK, ValidationError } from '@hypersim/sdk';

// Or import specific components
import { HyperEVMClient } from '@hypersim/sdk/clients';
import { formatWei } from '@hypersim/sdk/utils';
```

## 📎 Roadmap

- [ ] **Multi-language Support**: Python, Rust, and Go SDKs
- [ ] **Mobile SDKs**: React Native and Flutter support
- [ ] **GraphQL API**: Alternative query interface
- [ ] **Advanced Analytics**: Historical data analysis tools
- [ ] **Smart Contract Templates**: Pre-built contract interactions
- [ ] **MEV Protection**: Built-in MEV detection and mitigation

## 🔗 Useful Links

- [HyperLiquid Documentation](https://hyperliquid.gitbook.io/hyperliquid-docs)
- [HyperEVM Block Explorer](https://hypurrscan.io/)
- [API Reference](https://hypersim.dev/docs/api)
- [Discord Community](https://discord.gg/hyperliquid)
- [GitHub Issues](https://github.com/hypersim/typescript-sdk/issues)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- HyperLiquid team for the innovative blockchain architecture
- OpenAI for providing AI analysis capabilities
- The TypeScript community for excellent tooling
- All contributors who help improve this SDK

---

**Built with ❤️ by the HyperSim SDK Team**

*For support, please join our [Discord](https://discord.gg/hyperliquid) or create an issue on [GitHub](https://github.com/hypersim/typescript-sdk/issues).*