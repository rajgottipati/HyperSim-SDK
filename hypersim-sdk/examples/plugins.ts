/**
 * Plugin System Example
 * 
 * Demonstrates how to create and use custom plugins with the HyperSim SDK
 */

import { 
  HyperSimSDK, 
  Network, 
  Plugin, 
  HookContext,
  LoggingPlugin, 
  MetricsPlugin,
  CachingPlugin,
  RetryPlugin 
} from '@hypersim/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Custom Analytics Plugin
 * Tracks transaction patterns and generates insights
 */
class AnalyticsPlugin implements Plugin {
  public readonly name = 'analytics';
  public readonly version = '1.0.0';
  public readonly description = 'Advanced transaction analytics and pattern detection';

  private transactionStats = {
    total: 0,
    successful: 0,
    failed: 0,
    gasUsed: 0,
    avgGasPrice: 0
  };

  private gasHistogram: number[] = [];
  private startTime = Date.now();

  async initialize(): Promise<void> {
    console.log('📊 [Analytics Plugin] Initialized');
  }

  async cleanup(): Promise<void> {
    console.log('📊 [Analytics Plugin] Final Stats:', this.getStats());
  }

  public readonly hooks = {
    'after-simulation': async (context: HookContext, result: any): Promise<void> => {
      this.transactionStats.total++;
      
      if (result.success) {
        this.transactionStats.successful++;
        const gasUsed = parseInt(result.gasUsed || '0');
        this.transactionStats.gasUsed += gasUsed;
        this.gasHistogram.push(gasUsed);
      } else {
        this.transactionStats.failed++;
      }
    },

    'before-simulation': async (context: HookContext, transaction: any): Promise<void> => {
      if (transaction.gasPrice) {
        const gasPrice = parseInt(transaction.gasPrice);
        this.transactionStats.avgGasPrice = 
          (this.transactionStats.avgGasPrice + gasPrice) / 2;
      }
    }
  };

  getStats() {
    const uptime = Date.now() - this.startTime;
    const successRate = this.transactionStats.total > 0 
      ? (this.transactionStats.successful / this.transactionStats.total * 100).toFixed(2)
      : '0';
      
    const avgGasUsed = this.gasHistogram.length > 0
      ? Math.round(this.gasHistogram.reduce((a, b) => a + b, 0) / this.gasHistogram.length)
      : 0;

    return {
      uptime: Math.round(uptime / 1000),
      transactions: this.transactionStats.total,
      successRate: `${successRate}%`,
      avgGasUsed,
      avgGasPrice: Math.round(this.transactionStats.avgGasPrice),
      totalGasUsed: this.transactionStats.gasUsed
    };
  }
}

/**
 * Custom Rate Limiting Plugin
 * Implements sophisticated rate limiting with different tiers
 */
class RateLimitingPlugin implements Plugin {
  public readonly name = 'rateLimiting';
  public readonly version = '1.0.0';
  public readonly description = 'Advanced rate limiting with tier-based controls';

  private requestCounts = new Map<string, { count: number; resetTime: number }>();
  private limits = {
    simulation: { requests: 100, window: 60000 }, // 100 per minute
    ai: { requests: 20, window: 60000 }  // 20 per minute
  };

  async initialize(): Promise<void> {
    console.log('🚦 [Rate Limiting Plugin] Initialized with limits:', this.limits);
  }

  public readonly hooks = {
    'before-simulation': async (context: HookContext): Promise<HookContext> => {
      await this.checkRateLimit('simulation', context);
      return context;
    },

    'before-ai-analysis': async (context: HookContext): Promise<HookContext> => {
      await this.checkRateLimit('ai', context);
      return context;
    }
  };

  private async checkRateLimit(type: 'simulation' | 'ai', context: HookContext): Promise<void> {
    const now = Date.now();
    const limit = this.limits[type];
    const key = `${type}:${context.requestId.split('_')[0]}`; // Use timestamp as grouping
    
    let bucket = this.requestCounts.get(key);
    
    if (!bucket || now > bucket.resetTime) {
      bucket = { count: 0, resetTime: now + limit.window };
      this.requestCounts.set(key, bucket);
    }
    
    if (bucket.count >= limit.requests) {
      const resetIn = Math.ceil((bucket.resetTime - now) / 1000);
      throw new Error(`Rate limit exceeded for ${type}. Resets in ${resetIn} seconds.`);
    }
    
    bucket.count++;
  }
}

async function pluginExample(): Promise<void> {
  try {
    console.log('🔌 Starting Plugin System Example...\n');

    // Create custom plugin instances
    const analyticsPlugin = new AnalyticsPlugin();
    const rateLimitingPlugin = new RateLimitingPlugin();
    
    // Initialize SDK with multiple plugins
    const sdk = new HyperSimSDK({
      network: Network.TESTNET,
      aiEnabled: false, // Disabled for this example
      plugins: [
        // Built-in plugins
        {
          plugin: new LoggingPlugin({
            level: 'info',
            includeData: false,
            format: 'text'
          }),
          enabled: true,
          priority: 5 // Highest priority
        },
        {
          plugin: new MetricsPlugin({
            enabled: true,
            interval: 10000,
            detailedTiming: true
          }),
          enabled: true,
          priority: 10
        },
        {
          plugin: new CachingPlugin({
            enabled: true,
            defaultTtl: 300,
            maxSize: 100
          }),
          enabled: true,
          priority: 15
        },
        {
          plugin: new RetryPlugin({
            maxAttempts: 3,
            initialDelay: 1000,
            circuitBreaker: true
          }),
          enabled: true,
          priority: 20
        },
        
        // Custom plugins
        {
          plugin: analyticsPlugin,
          enabled: true,
          priority: 25
        },
        {
          plugin: rateLimitingPlugin,
          enabled: true,
          priority: 30
        }
      ],
      debug: true
    });

    console.log('📋 Registered plugins:');
    const plugins = sdk.getPlugins();
    plugins.forEach(plugin => {
      console.log(`   ${plugin.enabled ? '✅' : '❌'} ${plugin.name} v${plugin.version}`);
    });
    console.log();

    // Test transactions to demonstrate plugin functionality
    const testTransactions = [
      {
        from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        gasLimit: '21000',
        gasPrice: '1000000000'
      },
      {
        from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
        to: '0x0987654321098765432109876543210987654321',
        value: '500000000000000000',
        gasLimit: '50000',
        gasPrice: '2000000000'
      },
      {
        from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
        to: '0x1111111111111111111111111111111111111111',
        value: '2000000000000000000',
        gasLimit: '100000',
        gasPrice: '1500000000'
      }
    ];

    console.log('🧪 Running test simulations...\n');

    for (let i = 0; i < testTransactions.length; i++) {
      const tx = testTransactions[i];
      console.log(`📝 Simulating transaction ${i + 1}/${testTransactions.length}...`);
      
      try {
        const result = await sdk.simulate(tx);
        console.log(`   ✅ Success: Gas used = ${result.gasUsed}, Block type = ${result.blockType}`);
      } catch (error: any) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
      
      // Add delay between transactions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n📊 Analytics Summary:');
    console.log(analyticsPlugin.getStats());

    // Demonstrate plugin management
    console.log('\n🔧 Demonstrating plugin management...');
    
    // Disable analytics plugin
    console.log('   Disabling analytics plugin...');
    await sdk.enablePlugin('analytics', false);
    
    const updatedPlugins = sdk.getPlugins();
    const analyticsPluginStatus = updatedPlugins.find(p => p.name === 'analytics');
    console.log(`   Analytics plugin enabled: ${analyticsPluginStatus?.enabled}`);
    
    // Re-enable it
    console.log('   Re-enabling analytics plugin...');
    await sdk.enablePlugin('analytics', true);
    
    // Test adding a plugin at runtime
    console.log('   Adding new plugin at runtime...');
    const runtimePlugin: Plugin = {
      name: 'runtime-test',
      version: '1.0.0',
      description: 'Plugin added at runtime',
      hooks: {
        'after-simulation': async () => {
          console.log('     🚀 Runtime plugin executed!');
        }
      }
    };
    
    await sdk.addPlugin({ plugin: runtimePlugin, enabled: true });
    
    // Test the runtime plugin
    console.log('   Testing runtime plugin...');
    await sdk.simulate(testTransactions[0]);
    
    // Cleanup
    console.log('\n🧹 Shutting down...');
    await sdk.shutdown();
    
    console.log('\n✅ Plugin example completed successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Plugin example failed:', error.message);
    if (process.env.DEBUG) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  pluginExample()
    .catch((error) => {
      console.error('\n💥 Example failed with error:', error);
      process.exit(1);
    });
}

export { pluginExample, AnalyticsPlugin, RateLimitingPlugin };