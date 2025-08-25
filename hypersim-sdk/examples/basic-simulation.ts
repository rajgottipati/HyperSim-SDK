/**
 * Basic Transaction Simulation Example
 * 
 * This example demonstrates how to simulate a simple transaction
 * on HyperEVM and get basic analysis results.
 */

import { HyperSimSDK, Network } from '@hypersim/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function basicSimulationExample(): Promise<void> {
  try {
    // Initialize SDK
    const sdk = new HyperSimSDK({
      network: Network.TESTNET, // Use testnet for examples
      aiEnabled: true,
      openaiApiKey: process.env.OPENAI_API_KEY,
      debug: true
    });

    console.log('🚀 Starting basic transaction simulation...\n');

    // Example transaction: Simple ETH transfer
    const transaction = {
      from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
      to: '0x1234567890123456789012345678901234567890',
      value: '1000000000000000000', // 1 ETH in wei
      gasLimit: '21000',
      gasPrice: '1000000000' // 1 Gwei
    };

    console.log('📝 Transaction Details:');
    console.log(`From: ${transaction.from}`);
    console.log(`To: ${transaction.to}`);
    console.log(`Value: ${transaction.value} wei (1 ETH)`);
    console.log(`Gas Limit: ${transaction.gasLimit}`);
    console.log(`Gas Price: ${transaction.gasPrice} wei (1 Gwei)\n`);

    // Simulate the transaction
    console.log('⏳ Simulating transaction...');
    const simulation = await sdk.simulate(transaction);

    console.log('\n📊 Simulation Results:');
    console.log(`Success: ${simulation.success ? '✅' : '❌'}`);
    console.log(`Gas Used: ${simulation.gasUsed}`);
    console.log(`Block Type: ${simulation.blockType}`);
    console.log(`Estimated Block: ${simulation.estimatedBlock}`);

    if (!simulation.success) {
      console.log(`❌ Error: ${simulation.error}`);
      if (simulation.revertReason) {
        console.log(`🔄 Revert Reason: ${simulation.revertReason}`);
      }
    }

    // Get AI insights if simulation was successful
    if (simulation.success && process.env.OPENAI_API_KEY) {
      console.log('\n🤖 Getting AI insights...');
      const insights = await sdk.getAIInsights(simulation);

      console.log(`\n🎯 AI Analysis:`)
      console.log(`Risk Level: ${insights.riskLevel}`);
      console.log(`Confidence: ${(insights.confidence * 100).toFixed(1)}%`);
      console.log(`\n💡 Explanation: ${insights.explanation}`);

      if (insights.gasOptimization.techniques.length > 0) {
        console.log('\n⚡ Gas Optimization Suggestions:');
        insights.gasOptimization.techniques.forEach((technique, index) => {
          console.log(`${index + 1}. ${technique.name}`);
          console.log(`   Description: ${technique.description}`);
          console.log(`   Estimated Savings: ${technique.estimatedSavings} gas`);
          console.log(`   Difficulty: ${technique.difficulty}\n`);
        });
      }

      if (insights.securityWarnings && insights.securityWarnings.length > 0) {
        console.log('🛡️ Security Warnings:');
        insights.securityWarnings.forEach((warning, index) => {
          console.log(`${index + 1}. ${warning}`);
        });
      }

      if (insights.recommendations.length > 0) {
        console.log('\n📋 Recommendations:');
        insights.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec}`);
        });
      }
    }

    // Get network status
    console.log('\n🌐 Checking network status...');
    const networkStatus = await sdk.getNetworkStatus();
    console.log(`Network: ${networkStatus.network}`);
    console.log(`Latest Block: ${networkStatus.latestBlock}`);
    console.log(`Gas Price: ${networkStatus.gasPrice} wei`);
    console.log(`Network Health: ${networkStatus.isHealthy ? '✅ Healthy' : '❌ Issues detected'}`);
    console.log(`Congestion Level: ${networkStatus.congestionLevel}`);

  } catch (error: any) {
    console.error('\n❌ Example failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the example
if (require.main === module) {
  basicSimulationExample()
    .then(() => {
      console.log('\n✅ Basic simulation example completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Example failed with error:', error);
      process.exit(1);
    });
}

export { basicSimulationExample };
