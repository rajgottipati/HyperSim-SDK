/**
 * Advanced WebSocket Streaming Example
 * 
 * Demonstrates real-time data streaming with HyperSim SDK
 */

import { HyperSimSDK, Network, LoggingPlugin, MetricsPlugin } from '@hypersim/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface TradeData {
  coin: string;
  side: 'A' | 'B';
  px: string;
  sz: string;
  time: number;
}

interface OrderBookData {
  coin: string;
  levels: [[string, string, number][], [string, string, number][]];
  time: number;
}

async function streamingExample(): Promise<void> {
  try {
    console.log('🌊 Starting HyperSim SDK Streaming Example...\n');
    
    // Initialize SDK with streaming enabled and plugins
    const sdk = new HyperSimSDK({
      network: Network.TESTNET,
      streamingEnabled: true,
      aiEnabled: false, // Disabled for this example
      plugins: [
        {
          plugin: new LoggingPlugin({
            level: 'info',
            includeData: false,
            format: 'text'
          }),
          enabled: true,
          priority: 10
        },
        {
          plugin: new MetricsPlugin({
            enabled: true,
            interval: 30000, // Report every 30 seconds
            detailedTiming: true
          }),
          enabled: true,
          priority: 20
        }
      ],
      debug: true
    });

    // Set up event listeners
    setupEventListeners(sdk);

    console.log('📡 Connecting to WebSocket...');
    await sdk.connectWebSocket();
    
    console.log('✅ Connected! Setting up subscriptions...\n');

    // Subscribe to multiple data streams
    await sdk.subscribe({ type: 'trades', coin: 'ETH' });
    await sdk.subscribe({ type: 'bbo', coin: 'ETH' });
    await sdk.subscribe({ type: 'trades', coin: 'BTC' });
    await sdk.subscribe({ type: 'book', coin: 'ETH' });
    
    console.log('📊 Subscribed to data streams:');
    console.log('  - ETH trades');
    console.log('  - ETH best bid/offer');
    console.log('  - BTC trades');
    console.log('  - ETH order book\n');

    console.log('🎯 Streaming live data... (Press Ctrl+C to stop)\n');
    console.log('='.repeat(80));

    // Keep the connection alive and display periodic metrics
    const metricsInterval = setInterval(async () => {
      try {
        const plugins = sdk.getPlugins();
        const metricsPlugin = plugins.find(p => p.name === 'metrics');
        
        if (metricsPlugin && metricsPlugin.enabled) {
          console.log('\n📈 Connection Metrics:');
          console.log(`   Active subscriptions: ${sdk.getSubscriptions?.()?.length || 0}`);
          console.log(`   Connection status: ${sdk.isConnected() ? '🟢 Connected' : '🔴 Disconnected'}`);
          console.log(`   Timestamp: ${new Date().toLocaleTimeString()}`);
          console.log('='.repeat(80));
        }
      } catch (error) {
        console.error('Error displaying metrics:', error);
      }
    }, 30000);

    // Graceful shutdown handler
    const shutdown = async () => {
      console.log('\n🛑 Shutting down streaming example...');
      clearInterval(metricsInterval);
      
      sdk.disconnectWebSocket();
      await sdk.shutdown();
      
      console.log('✅ Shutdown complete!');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Simulate some transaction analysis while streaming
    setTimeout(async () => {
      try {
        console.log('\n🧪 Running sample transaction simulation during streaming...\n');
        
        const sampleTx = {
          from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
          to: '0x1234567890123456789012345678901234567890',
          value: '1000000000000000000',
          gasLimit: '21000',
          gasPrice: '1000000000'
        };

        const simulation = await sdk.simulate(sampleTx);
        console.log('📊 Simulation Result:', {
          success: simulation.success,
          gasUsed: simulation.gasUsed,
          blockType: simulation.blockType
        });
        
        console.log('\n🎯 Continuing to stream data...\n');
        console.log('='.repeat(80));
      } catch (error) {
        console.error('Simulation error:', error);
      }
    }, 10000);

  } catch (error: any) {
    console.error('\n❌ Streaming example failed:', error.message);
    if (process.env.DEBUG) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

function setupEventListeners(sdk: HyperSimSDK): void {
  // Connection state changes
  sdk.on('connectionStateChange', (state) => {
    const stateEmoji = {
      'connecting': '🔄',
      'connected': '🟢',
      'disconnected': '🔴',
      'reconnecting': '🔄',
      'error': '❌'
    };
    
    console.log(`${stateEmoji[state] || '🔵'} Connection state: ${state.toUpperCase()}`);
  });

  // Raw messages
  sdk.on('message', (message) => {
    const timestamp = new Date().toLocaleTimeString();
    
    switch (message.channel) {
      case 'trades':
        const trade = message.data as TradeData;
        const side = trade.side === 'B' ? '🟢 BUY' : '🔴 SELL';
        console.log(`[${timestamp}] 📈 ${trade.coin} Trade: ${side} ${trade.sz} @ ${trade.px}`);
        break;
        
      case 'bbo':
        const bbo = message.data as { coin: string; bbo: [any, any] };
        const [bid, ask] = bbo.bbo;
        if (bid && ask) {
          console.log(`[${timestamp}] 💰 ${bbo.coin} BBO: ${bid.px} / ${ask.px}`);
        }
        break;
        
      case 'book':
        const book = message.data as OrderBookData;
        const [bids, asks] = book.levels;
        const topBid = bids[0];
        const topAsk = asks[0];
        if (topBid && topAsk) {
          console.log(`[${timestamp}] 📚 ${book.coin} Book: ${topBid[0]} (${topBid[1]}) / ${topAsk[0]} (${topAsk[1]})`);
        }
        break;
        
      default:
        console.log(`[${timestamp}] 📨 ${message.channel}:`, JSON.stringify(message.data).substring(0, 100));
    }
  });

  // Connection errors
  sdk.on('error', (error) => {
    console.error('❌ WebSocket Error:', error.message);
  });

  // Connection closed
  sdk.on('connectionClosed', (info) => {
    console.log(`🔌 Connection closed: ${info.code} - ${info.reason}`);
  });
}

// Run the example
if (require.main === module) {
  streamingExample()
    .catch((error) => {
      console.error('\n💥 Example failed with error:', error);
      process.exit(1);
    });
}

export { streamingExample };