/**
 * Cross-Layer Integration Example
 * 
 * This example demonstrates how to leverage HyperCore data
 * in transaction simulations and analysis.
 */

import { HyperSimSDK, Network } from '@hypersim/sdk';
import dotenv from 'dotenv';

dotenv.config();

async function crossLayerExample(): Promise<void> {
  try {
    const sdk = new HyperSimSDK({
      network: Network.TESTNET,
      aiEnabled: true,
      openaiApiKey: process.env.OPENAI_API_KEY,
      crossLayerEnabled: true, // Enable cross-layer integration
      debug: true
    });

    console.log('🌉 Starting cross-layer integration example...\n');

    // Example of a transaction that interacts with HyperCore precompiles
    const coreWriterTransaction = {
      from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
      to: '0x3333333333333333333333333333333333333333', // CoreWriter precompile
      data: '0x1234567890abcdef', // Example encoded core action
      gasLimit: '200000',
      gasPrice: '2000000000'
    };

    console.log('📝 CoreWriter Transaction:');
    console.log(`From: ${coreWriterTransaction.from}`);
    console.log(`To: ${coreWriterTransaction.to} (CoreWriter precompile)`);
    console.log(`Data: ${coreWriterTransaction.data}`);
    console.log(`Gas Limit: ${coreWriterTransaction.gasLimit}`);

    console.log('\n⏳ Simulating CoreWriter transaction...');
    const coreSimulation = await sdk.simulate(coreWriterTransaction);

    console.log('\n📊 Simulation Results:');
    console.log(`Success: ${coreSimulation.success ? '✅' : '❌'}`);
    console.log(`Gas Used: ${coreSimulation.gasUsed}`);
    console.log(`Block Type: ${coreSimulation.blockType}`);

    // Check for cross-layer data
    if (coreSimulation.hyperCoreData) {
      console.log('\n🌐 HyperCore Data Detected:');
      
      // Core state information
      if (coreSimulation.hyperCoreData.coreState) {
        console.log('📈 Core State Keys:', Object.keys(coreSimulation.hyperCoreData.coreState));
      }

      // Position information
      if (coreSimulation.hyperCoreData.positions && coreSimulation.hyperCoreData.positions.length > 0) {
        console.log('\n💼 User Positions:');
        coreSimulation.hyperCoreData.positions.forEach((position, index) => {
          console.log(`${index + 1}. ${position.asset}: ${position.size} (${position.side})`);
          console.log(`   Entry Price: ${position.entryPrice}`);
          console.log(`   Unrealized PnL: ${position.unrealizedPnl}`);
        });
      }

      // Market data
      if (coreSimulation.hyperCoreData.marketData) {
        console.log('\n💹 Market Data:');
        const marketData = coreSimulation.hyperCoreData.marketData;
        
        if (marketData.prices && Object.keys(marketData.prices).length > 0) {
          console.log('📊 Asset Prices:');
          Object.entries(marketData.prices).forEach(([asset, price]) => {
            console.log(`   ${asset}: ${price}`);
          });
        }

        if (marketData.fundingRates && Object.keys(marketData.fundingRates).length > 0) {
          console.log('💰 Funding Rates:');
          Object.entries(marketData.fundingRates).forEach(([asset, rate]) => {
            console.log(`   ${asset}: ${rate}%`);
          });
        }
      }

      // Cross-layer interactions
      if (coreSimulation.hyperCoreData.interactions && coreSimulation.hyperCoreData.interactions.length > 0) {
        console.log('\n🔗 Cross-Layer Interactions:');
        coreSimulation.hyperCoreData.interactions.forEach((interaction, index) => {
          console.log(`${index + 1}. Type: ${interaction.type}`);
          console.log(`   Precompile: ${interaction.precompile}`);
          console.log(`   Data: ${interaction.data}`);
          if (interaction.result) {
            console.log(`   Expected Result: ${interaction.result}`);
          }
        });
      }
    } else {
      console.log('\n📭 No HyperCore data available for this transaction');
    }

    // Example of reading from HyperCore precompiles
    const readPrecompileTransaction = {
      from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
      to: '0x0000000000000000000000000000000000000801', // Read precompile
      data: '0x00000001', // Example read operation
      gasLimit: '50000'
    };

    console.log('\n📖 Read Precompile Transaction:');
    console.log(`To: ${readPrecompileTransaction.to} (Read precompile)`);
    
    const readSimulation = await sdk.simulate(readPrecompileTransaction);
    console.log(`Success: ${readSimulation.success ? '✅' : '❌'}`);
    console.log(`Gas Used: ${readSimulation.gasUsed}`);
    
    if (readSimulation.returnData) {
      console.log(`Return Data: ${readSimulation.returnData}`);
    }

    // AI analysis with cross-layer context
    if (coreSimulation.success && process.env.OPENAI_API_KEY) {
      console.log('\n🤖 AI Analysis with Cross-Layer Context...');
      const insights = await sdk.getAIInsights(coreSimulation);
      
      console.log(`\n🎯 Cross-Layer Analysis:`);
      console.log(`Risk Level: ${insights.riskLevel}`);
      console.log(`Explanation: ${insights.explanation}`);
      
      if (insights.recommendations.length > 0) {
        console.log('\n📋 Cross-Layer Recommendations:');
        insights.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec}`);
        });
      }
    }

    // Demonstrate ERC20 precompile interaction
    console.log('\n💱 ERC20 Precompile Example:');
    const erc20Transaction = {
      from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
      to: '0x2222222222222222222222222222222222222222', // ERC20 precompile
      data: '0x70a08231000000000000000000000000742d35cc6635c0532925a3b8d2b9e0064c0b39ec', // balanceOf
      gasLimit: '30000'
    };

    const erc20Simulation = await sdk.simulate(erc20Transaction);
    console.log(`ERC20 Query Success: ${erc20Simulation.success ? '✅' : '❌'}`);
    console.log(`Gas Used: ${erc20Simulation.gasUsed}`);
    
    if (erc20Simulation.returnData) {
      // Parse return data as balance (uint256)
      const balance = parseInt(erc20Simulation.returnData, 16);
      console.log(`Account Balance: ${balance} tokens`);
    }

  } catch (error: any) {
    console.error('\n❌ Cross-layer example failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the example
if (require.main === module) {
  crossLayerExample()
    .then(() => {
      console.log('\n✅ Cross-layer integration example completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Example failed with error:', error);
      process.exit(1);
    });
}

export { crossLayerExample };
