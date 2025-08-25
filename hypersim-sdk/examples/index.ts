/**
 * Example Index - Run all examples
 * 
 * This file allows running all examples or specific ones.
 */

import { basicSimulationExample } from './basic-simulation';
import { bundleOptimizationExample } from './bundle-optimization';
import { crossLayerExample } from './cross-layer';
import { errorHandlingExample } from './error-handling';

// Available examples
const examples = {
  'basic': {
    name: 'Basic Transaction Simulation',
    description: 'Simple transaction simulation and analysis',
    fn: basicSimulationExample
  },
  'bundle': {
    name: 'Bundle Optimization',
    description: 'Transaction bundle optimization with AI',
    fn: bundleOptimizationExample
  },
  'cross-layer': {
    name: 'Cross-Layer Integration',
    description: 'HyperCore integration and precompile interactions',
    fn: crossLayerExample
  },
  'error-handling': {
    name: 'Error Handling',
    description: 'Comprehensive error handling patterns',
    fn: errorHandlingExample
  }
};

/**
 * Run a specific example by name
 */
export async function runExample(exampleName: string): Promise<void> {
  const example = examples[exampleName as keyof typeof examples];
  
  if (!example) {
    console.error(`❌ Unknown example: ${exampleName}`);
    console.log('Available examples:');
    Object.entries(examples).forEach(([key, ex]) => {
      console.log(`  ${key}: ${ex.name} - ${ex.description}`);
    });
    process.exit(1);
  }

  console.log(`🚀 Running example: ${example.name}`);
  console.log(`📝 Description: ${example.description}\n`);
  
  try {
    await example.fn();
    console.log(`\n✅ Example '${example.name}' completed successfully!`);
  } catch (error: any) {
    console.error(`\n💥 Example '${example.name}' failed:`, error.message);
    if (process.env.DEBUG) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

/**
 * Run all examples in sequence
 */
export async function runAllExamples(): Promise<void> {
  console.log('🎯 Running all HyperSim SDK examples...\n');
  
  for (const [key, example] of Object.entries(examples)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Running: ${example.name}`);
    console.log(`📝 ${example.description}`);
    console.log(`${'='.repeat(60)}\n`);
    
    try {
      await example.fn();
      console.log(`\n✅ '${example.name}' completed successfully!`);
    } catch (error: any) {
      console.error(`\n💥 '${example.name}' failed:`, error.message);
      
      // Continue with other examples even if one fails
      console.log('⏭️ Continuing with next example...\n');
    }
    
    // Add delay between examples
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 All examples completed!');
}

// CLI interface
if (require.main === module) {
  const exampleName = process.argv[2];
  
  if (!exampleName || exampleName === 'all') {
    runAllExamples()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    runExample(exampleName)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}
