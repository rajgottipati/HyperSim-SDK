/**
 * Bundle Optimization Example
 * 
 * This example demonstrates how to optimize multiple transactions
 * for gas efficiency and optimal execution order.
 */

import { HyperSimSDK, Network, TransactionRequest } from '@hypersim/sdk';
import dotenv from 'dotenv';

dotenv.config();

async function bundleOptimizationExample(): Promise<void> {
  try {
    const sdk = new HyperSimSDK({
      network: Network.TESTNET,
      aiEnabled: true,
      openaiApiKey: process.env.OPENAI_API_KEY,
      debug: true
    });

    console.log('📦 Starting bundle optimization example...\n');

    // Create a bundle of different transaction types
    const transactionBundle: TransactionRequest[] = [
      {
        from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
        to: '0x1111111111111111111111111111111111111111',
        value: '500000000000000000', // 0.5 ETH
        gasLimit: '21000',
        gasPrice: '2000000000' // 2 Gwei
      },
      {
        from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
        to: '0x2222222222222222222222222222222222222222', // ERC20 precompile
        data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890000000000000000000000000000000000000000000000000de0b6b3a7640000', // transfer 1 token
        gasLimit: '65000',
        gasPrice: '2000000000'
      },
      {
        from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
        to: '0x3333333333333333333333333333333333333333', // CoreWriter
        data: '0x12345678', // Example core interaction
        gasLimit: '150000',
        gasPrice: '3000000000' // 3 Gwei (higher priority)
      }
    ];

    console.log('📋 Original Transaction Bundle:');
    transactionBundle.forEach((tx, index) => {
      console.log(`${index + 1}. ${tx.to} - Gas: ${tx.gasLimit}, Price: ${tx.gasPrice}`);
    });

    // Calculate original total gas cost
    const originalTotalGas = transactionBundle.reduce(
      (total, tx) => total + (parseInt(tx.gasLimit!) * parseInt(tx.gasPrice!)),
      0
    );
    console.log(`\n💰 Original Total Gas Cost: ${originalTotalGas} wei`);

    // Optimize the bundle
    console.log('\n🤖 Optimizing transaction bundle...');
    const optimization = await sdk.optimizeBundle(transactionBundle);

    console.log('\n🎯 Optimization Results:');
    console.log(`Original Gas: ${optimization.originalGas}`);
    console.log(`Optimized Gas: ${optimization.optimizedGas}`);
    console.log(`Gas Saved: ${optimization.gasSaved} (${((parseInt(optimization.gasSaved) / parseInt(optimization.originalGas)) * 100).toFixed(2)}%)`);

    if (optimization.reorderedIndices.length > 0) {
      console.log('\n🔄 Recommended Execution Order:');
      optimization.reorderedIndices.forEach((originalIndex, newIndex) => {
        const tx = transactionBundle[originalIndex];
        console.log(`${newIndex + 1}. Transaction ${originalIndex + 1} → ${tx.to}`);
      });
    }

    if (optimization.suggestions.length > 0) {
      console.log('\n💡 Optimization Suggestions:');
      optimization.suggestions.forEach((suggestion, index) => {
        console.log(`${index + 1}. ${suggestion}`);
      });
    }

    if (optimization.warnings && optimization.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      optimization.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }

    // Demonstrate individual transaction analysis
    console.log('\n🔍 Individual Transaction Analysis:');
    for (let i = 0; i < transactionBundle.length; i++) {
      const tx = transactionBundle[i];
      console.log(`\nTransaction ${i + 1}:`);
      
      try {
        const simulation = await sdk.simulate(tx);
        console.log(`  Success: ${simulation.success ? '✅' : '❌'}`);
        console.log(`  Gas Used: ${simulation.gasUsed}`);
        console.log(`  Block Type: ${simulation.blockType}`);
        
        if (!simulation.success && simulation.error) {
          console.log(`  Error: ${simulation.error}`);
        }

        // Risk assessment
        const riskAssessment = await sdk.assessRisk(tx);
        console.log(`  Risk Level: ${riskAssessment.riskLevel}`);
        if (riskAssessment.factors.length > 0) {
          console.log(`  Risk Factors: ${riskAssessment.factors.join(', ')}`);
        }
      } catch (error: any) {
        console.log(`  ❌ Analysis failed: ${error.message}`);
      }
    }

    // Demonstrate advanced bundle scenarios
    console.log('\n🚀 Advanced Bundle Scenarios:');
    
    // High-value bundle
    const highValueBundle: TransactionRequest[] = [
      {
        from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
        to: '0x1111111111111111111111111111111111111111',
        value: '10000000000000000000', // 10 ETH
        gasLimit: '21000'
      }
    ];

    console.log('\n💎 High-Value Transaction Analysis:');
    const highValueOptimization = await sdk.optimizeBundle(highValueBundle);
    console.log(`Suggestions: ${highValueOptimization.suggestions.join(', ')}`);

  } catch (error: any) {
    console.error('\n❌ Bundle optimization example failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the example
if (require.main === module) {
  bundleOptimizationExample()
    .then(() => {
      console.log('\n✅ Bundle optimization example completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Example failed with error:', error);
      process.exit(1);
    });
}

export { bundleOptimizationExample };
