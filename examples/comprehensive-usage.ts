/**
 * Comprehensive HyperSim SDK Example
 * Demonstrates advanced usage including AI optimization, real-time streaming, and cross-layer integration
 */

import { HyperSimSDK, createHyperSimSDK } from '../src/index.js';
import type { SimulateOptions, TradeSubscription, UserFillsSubscription } from '../src/index.js';

/**
 * Main example function demonstrating comprehensive SDK usage
 */
async function comprehensiveExample() {
  console.log('🚀 HyperSim SDK Comprehensive Example\n');

  // Initialize SDK with full configuration
  const sdk = createHyperSimSDK({
    network: 'mainnet',
    enableAI: true, // Enable AI-powered analysis (requires OpenAI API key)
    crossLayer: true, // Enable cross-layer HyperCore integration
    debug: true, // Enable debug logging
    timeout: 30000,
    retries: 3,
    apiKey: process.env.OPENAI_API_KEY, // Set your OpenAI API key
    // plugins: [customPlugin] // Add custom plugins if needed
  });

  try {
    // 1. Basic Network Information
    console.log('📡 Network Information:');
    const hyperEVM = sdk.getHyperEVMClient();
    const blockNumber = await hyperEVM.getBlockNumber();
    const chainId = await hyperEVM.getChainId();
    const gasPrice = await hyperEVM.getGasPrice();
    
    console.log(`  Current Block: ${blockNumber}`);
    console.log(`  Chain ID: ${chainId}`);
    console.log(`  Gas Price: ${gasPrice} wei\n`);

    // 2. Account Information
    console.log('👤 Account Information:');
    const userAddress = '0x1234567890123456789012345678901234567890'; // Example address
    
    try {
      const balance = await hyperEVM.getBalance(userAddress);
      const nonce = await hyperEVM.getNonce(userAddress);
      console.log(`  Address: ${userAddress}`);
      console.log(`  Balance: ${balance} wei`);
      console.log(`  Nonce: ${nonce}\n`);
    } catch (error) {
      console.log(`  Could not fetch account data: ${error}\n`);
    }

    // 3. Cross-Layer HyperCore Data
    if (sdk.getConfig().crossLayer) {
      console.log('🔗 HyperCore Cross-Layer Data:');
      const hyperCore = sdk.getHyperCoreClient();
      
      try {
        // Get asset prices
        const prices = await hyperCore.getAssetPrices(['ETH', 'BTC', 'SOL']);
        console.log('  Asset Prices:');
        Object.entries(prices).forEach(([asset, price]) => {
          console.log(`    ${asset}: $${price.price}`);
        });
        
        // Get L1 block info
        const l1Block = await hyperCore.getCurrentL1Block();
        console.log(`  L1 Block Number: ${l1Block.blockNumber}`);
        console.log(`  L1 Transactions: ${l1Block.transactionCount}\n`);
      } catch (error) {
        console.log(`  Could not fetch HyperCore data: ${error}\n`);
      }
    }

    // 4. Transaction Simulation
    console.log('🧪 Transaction Simulation:');
    const simulationOptions: SimulateOptions = {
      transaction: {
        from: '0x742d35cc6335c06c75ce59e0b8f9bb94e8c8a8b6',
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000', // 1 ETH in wei
        gas: '21000',
        gasPrice: gasPrice
      },
      hyperCoreData: true,
      aiAnalysis: sdk.getConfig().enableAI,
      dualBlocks: true
    };

    try {
      const simulationResult = await sdk.simulate(simulationOptions);
      console.log(`  Simulation Success: ${simulationResult.success}`);
      console.log(`  Gas Used: ${simulationResult.gasUsed}`);
      console.log(`  Estimated Cost: ${simulationResult.estimatedCost}`);
      
      if (simulationResult.aiAnalysis) {
        console.log('  🤖 AI Analysis:');
        console.log(`    Risk Level: ${simulationResult.aiAnalysis.riskAssessment?.level}`);
        console.log(`    Optimization: ${simulationResult.aiAnalysis.optimization}`);
      }
      
      if ((simulationResult as any).blockTypeRecommendation) {
        const blockRec = (simulationResult as any).blockTypeRecommendation;
        console.log(`  📦 Block Type: ${blockRec.recommended} (${blockRec.estimatedConfirmationTime}s)`);
      }
      console.log();
    } catch (error) {
      console.error(`  Simulation failed: ${error}\n`);
    }

    // 5. AI-Powered Transaction Optimization
    if (sdk.getConfig().enableAI) {
      console.log('🤖 AI Transaction Optimization:');
      try {
        const optimization = await sdk.optimizeTransaction(simulationOptions);
        console.log(`  Gas Reduction: ${optimization.savings.gasReduction}`);
        console.log(`  Cost Savings: ${optimization.savings.costSavings}`);
        console.log(`  Time Optimization: ${optimization.savings.timeOptimization}s`);
        console.log(`  Recommendations: ${optimization.recommendations.join(', ')}\n`);
      } catch (error) {
        console.log(`  AI optimization failed: ${error}\n`);
      }
    }

    // 6. WebSocket Real-Time Streaming
    console.log('📡 WebSocket Real-Time Streaming:');
    const wsClient = sdk.getWebSocketClient();
    
    if (wsClient) {
      try {
        // Connect to WebSocket
        await sdk.connect();
        console.log('  ✅ WebSocket connected');
        
        // Set up event listeners
        sdk.on('connected', () => {
          console.log('  🔗 WebSocket connection established');
        });
        
        sdk.on('data', (data) => {
          console.log(`  📊 Real-time data: ${JSON.stringify(data).slice(0, 100)}...`);
        });
        
        sdk.on('error', (error) => {
          console.error(`  ❌ WebSocket error: ${error}`);
        });
        
        // Subscribe to trade data
        const tradeSubscription: TradeSubscription = {
          type: 'trades',
          coin: 'ETH'
        };
        sdk.subscribe(tradeSubscription);
        console.log('  📈 Subscribed to ETH trades');
        
        // Subscribe to user fills (if user address is available)
        const userFillsSubscription: UserFillsSubscription = {
          type: 'userFills',
          user: userAddress
        };
        sdk.subscribe(userFillsSubscription);
        console.log(`  👤 Subscribed to user fills for ${userAddress}`);
        
        // Keep connection alive for a few seconds to receive data
        console.log('  ⏱️  Listening for real-time data (5 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.error(`  WebSocket connection failed: ${error}`);
      }
    } else {
      console.log('  ⚠️  WebSocket not configured (no wsUrl provided)');
    }

    // 7. Plugin System Demonstration
    console.log('\n🔌 Plugin System:');
    const pluginManager = sdk.getPluginManager();
    const stats = pluginManager.getAllPlugins();
    console.log(`  Loaded Plugins: ${stats.size}`);
    
    // Example custom plugin
    const customPlugin = {
      name: 'example-logger',
      version: '1.0.0',
      initialize: async (context: any) => {
        context.log('Custom plugin initialized!');
      },
      beforeRequest: async (context: any, request: any) => {
        console.log('  🔍 Custom plugin: Processing request...');
        return request;
      }
    };
    
    try {
      pluginManager.register(customPlugin);
      await pluginManager.load('example-logger');
      console.log('  ✅ Custom plugin loaded successfully');
    } catch (error) {
      console.log(`  ⚠️  Plugin loading: ${error}`);
    }

    // 8. Advanced Features Summary
    console.log('\n📊 SDK Configuration Summary:');
    const config = sdk.getConfig();
    console.log(`  Network: ${config.network}`);
    console.log(`  AI Enabled: ${config.enableAI}`);
    console.log(`  Cross-Layer: ${config.crossLayer}`);
    console.log(`  Debug Mode: ${config.debug}`);
    console.log(`  WebSocket Connected: ${sdk.isConnected()}`);
    
    // 9. Performance Metrics
    const middlewareManager = sdk.getMiddlewareManager();
    const middlewareStats = middlewareManager.getPipeline().getStats();
    console.log(`  Middleware Components: ${Object.values(middlewareStats).reduce((a, b) => a + b, 0)}`);
    
  } catch (error) {
    console.error('❌ Example execution failed:', error);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up...');
    sdk.disconnect();
    console.log('✅ Example completed successfully!');
  }
}

/**
 * Run the example
 */
if (require.main === module) {
  comprehensiveExample().catch(console.error);
}

export { comprehensiveExample };