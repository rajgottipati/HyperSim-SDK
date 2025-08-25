/**
 * Error Handling Example
 * 
 * This example demonstrates comprehensive error handling
 * and recovery strategies when using the HyperSim SDK.
 */

import { 
  HyperSimSDK, 
  Network,
  ValidationError,
  NetworkError,
  SimulationError,
  AIAnalysisError,
  RateLimitError,
  TimeoutError,
  isHyperSimError
} from '@hypersim/sdk';
import dotenv from 'dotenv';

dotenv.config();

async function errorHandlingExample(): Promise<void> {
  console.log('🛡️ Starting error handling example...\n');

  // Example 1: Configuration errors
  console.log('1️⃣ Configuration Error Examples:');
  
  try {
    // Invalid network
    new HyperSimSDK({
      network: 'invalid-network' as any,
      aiEnabled: false
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(`✅ Caught configuration error: ${error.message}`);
      console.log(`   Error code: ${error.code}`);
    }
  }

  try {
    // AI enabled without API key
    new HyperSimSDK({
      network: Network.TESTNET,
      aiEnabled: true
      // Missing openaiApiKey
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(`✅ Caught validation error: ${error.message}`);
    }
  }

  // Example 2: Initialize SDK with proper error handling
  console.log('\n2️⃣ Proper SDK Initialization:');
  let sdk: HyperSimSDK;
  
  try {
    sdk = new HyperSimSDK({
      network: Network.TESTNET,
      aiEnabled: !!process.env.OPENAI_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      timeout: 10000, // Shorter timeout to demonstrate timeout handling
      debug: false // Reduce noise for error examples
    });
    console.log('✅ SDK initialized successfully');
  } catch (error: any) {
    console.error('❌ SDK initialization failed:', error.message);
    return;
  }

  // Example 3: Transaction validation errors
  console.log('\n3️⃣ Transaction Validation Errors:');
  
  const invalidTransactions = [
    {
      name: 'Missing from address',
      tx: {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000'
      }
    },
    {
      name: 'Invalid address format',
      tx: {
        from: 'invalid-address',
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000'
      }
    },
    {
      name: 'Invalid hex data',
      tx: {
        from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
        to: '0x1234567890123456789012345678901234567890',
        data: 'invalid-hex-data'
      }
    },
    {
      name: 'Excessive gas limit',
      tx: {
        from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
        to: '0x1234567890123456789012345678901234567890',
        gasLimit: '50000000' // Exceeds 30M limit
      }
    }
  ];

  for (const { name, tx } of invalidTransactions) {
    try {
      await sdk.simulate(tx as any);
      console.log(`❌ Should have failed: ${name}`);
    } catch (error) {
      if (error instanceof ValidationError) {
        console.log(`✅ Caught validation error for '${name}': ${error.message}`);
      } else {
        console.log(`⚠️ Unexpected error type for '${name}': ${error}`);
      }
    }
  }

  // Example 4: Network and simulation errors
  console.log('\n4️⃣ Network and Simulation Errors:');
  
  // Test with invalid RPC endpoint
  try {
    const badSdk = new HyperSimSDK({
      network: Network.TESTNET,
      rpcEndpoint: 'https://invalid-rpc-endpoint.com',
      timeout: 5000
    });
    
    await badSdk.simulate({
      from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
      to: '0x1234567890123456789012345678901234567890',
      value: '1000000000000000000'
    });
  } catch (error) {
    if (error instanceof NetworkError || error instanceof SimulationError) {
      console.log(`✅ Caught network/simulation error: ${error.message}`);
    } else {
      console.log(`⚠️ Unexpected error: ${error}`);
    }
  }

  // Example 5: Transaction that will fail
  console.log('\n5️⃣ Failed Transaction Simulation:');
  
  const failingTransaction = {
    from: '0x0000000000000000000000000000000000000001', // Unlikely to have balance
    to: '0x1234567890123456789012345678901234567890',
    value: '1000000000000000000000', // 1000 ETH - likely insufficient
    gasLimit: '21000'
  };

  try {
    const simulation = await sdk.simulate(failingTransaction);
    
    if (!simulation.success) {
      console.log(`✅ Detected failing transaction:`);
      console.log(`   Error: ${simulation.error}`);
      console.log(`   Revert reason: ${simulation.revertReason || 'N/A'}`);
    } else {
      console.log(`⚠️ Transaction unexpectedly succeeded`);
    }
  } catch (error) {
    if (isHyperSimError(error)) {
      console.log(`✅ Caught HyperSim error: ${error.message}`);
      console.log(`   Error details:`, error.toJSON());
    } else {
      console.log(`⚠️ Unknown error type:`, error);
    }
  }

  // Example 6: AI Analysis errors
  if (process.env.OPENAI_API_KEY) {
    console.log('\n6️⃣ AI Analysis Error Handling:');
    
    // Create a simulation result to analyze
    const validTransaction = {
      from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
      to: '0x1234567890123456789012345678901234567890',
      value: '1000000000000000000',
      gasLimit: '21000'
    };

    try {
      const simulation = await sdk.simulate(validTransaction);
      
      if (simulation.success) {
        // Test AI analysis with potential rate limiting
        try {
          const insights = await sdk.getAIInsights(simulation);
          console.log(`✅ AI analysis completed successfully`);
          console.log(`   Risk level: ${insights.riskLevel}`);
        } catch (aiError) {
          if (aiError instanceof RateLimitError) {
            console.log(`✅ Caught rate limit error: ${aiError.message}`);
            console.log(`   Retry after: ${aiError.retryAfter} seconds`);
          } else if (aiError instanceof AIAnalysisError) {
            console.log(`✅ Caught AI analysis error: ${aiError.message}`);
          } else {
            console.log(`⚠️ Unexpected AI error: ${aiError}`);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not create simulation for AI testing: ${error}`);
    }
  } else {
    console.log('\n6️⃣ AI Analysis Error Handling: Skipped (no API key)');
  }

  // Example 7: Bundle operation errors
  console.log('\n7️⃣ Bundle Operation Errors:');
  
  try {
    // Empty bundle
    await sdk.optimizeBundle([]);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(`✅ Caught empty bundle error: ${error.message}`);
    }
  }

  try {
    // Too large bundle
    const largeBundlle = Array.from({ length: 101 }, (_, i) => ({
      from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
      to: `0x${i.toString(16).padStart(40, '0')}`,
      value: '1000000000000000000'
    }));
    
    await sdk.optimizeBundle(largeBundlle);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(`✅ Caught oversized bundle error: ${error.message}`);
    }
  }

  // Example 8: Comprehensive error handling pattern
  console.log('\n8️⃣ Comprehensive Error Handling Pattern:');
  
  async function robustSimulation(transaction: any): Promise<void> {
    try {
      console.log(`📍 Attempting simulation...`);
      const simulation = await sdk.simulate(transaction);
      
      if (simulation.success) {
        console.log(`✅ Simulation successful, gas: ${simulation.gasUsed}`);
        
        // Try AI analysis with fallback
        if (process.env.OPENAI_API_KEY) {
          try {
            const insights = await sdk.getAIInsights(simulation);
            console.log(`🤖 AI insights: ${insights.riskLevel} risk`);
          } catch (aiError) {
            console.log(`⚠️ AI analysis failed, continuing without insights`);
          }
        }
      } else {
        console.log(`❌ Simulation failed: ${simulation.error}`);
      }
    } catch (error: any) {
      // Handle different error types appropriately
      if (error instanceof ValidationError) {
        console.log(`🔧 Fix transaction format: ${error.message}`);
      } else if (error instanceof NetworkError) {
        console.log(`🌐 Network issue, retry later: ${error.message}`);
      } else if (error instanceof TimeoutError) {
        console.log(`⏱️ Request timed out, try with longer timeout`);
      } else if (error instanceof RateLimitError) {
        console.log(`🚦 Rate limited, wait ${error.retryAfter}s`);
      } else if (isHyperSimError(error)) {
        console.log(`⚠️ SDK error: ${error.message} (${error.code})`);
      } else {
        console.log(`💥 Unexpected error: ${error.message}`);
        // Log full error for debugging
        console.error('Full error:', error);
      }
    }
  }

  // Test the robust pattern
  await robustSimulation({
    from: '0x742d35Cc6635C0532925a3b8D2B9E0064c0b39ec',
    to: '0x1234567890123456789012345678901234567890',
    value: '1000000000000000000',
    gasLimit: '21000'
  });

  console.log('\n✨ Error handling patterns demonstrated!');
}

// Run the example
if (require.main === module) {
  errorHandlingExample()
    .then(() => {
      console.log('\n✅ Error handling example completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Example failed with error:', error);
      process.exit(1);
    });
}

export { errorHandlingExample };
