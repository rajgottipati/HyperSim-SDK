#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { DocGenerator } from './generators/DocGenerator';
import { ConfigManager } from './utils/ConfigManager';
import { Logger } from './utils/Logger';
import { DocGeneratorConfig } from './types';

const program = new Command();
const logger = new Logger();

program
  .name('hypersim-docs')
  .description('AI-powered documentation generator for HyperSim SDK')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize documentation generator configuration')
  .action(async () => {
    console.log(chalk.blue.bold('\n🚀 HyperSim Documentation Generator\n'));
    
    try {
      const config = await ConfigManager.createInteractiveConfig();
      await ConfigManager.saveConfig(config);
      console.log(chalk.green('✅ Configuration saved successfully!'));
      console.log(chalk.gray('Run `hypersim-docs generate` to start generating documentation.'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize configuration:'), error);
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('Generate comprehensive documentation')
  .option('-c, --config <path>', 'Path to configuration file', './doc-generator.config.json')
  .option('-o, --output <path>', 'Output directory override')
  .option('-f, --formats <formats>', 'Output formats (comma-separated)', 'markdown,html')
  .option('--api-only', 'Generate API reference only')
  .option('--tutorials-only', 'Generate tutorials only')
  .option('--examples-only', 'Generate examples only')
  .option('--dry-run', 'Show what would be generated without actually generating')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options) => {
    const spinner = ora('Loading configuration...').start();
    
    try {
      // Load configuration
      const config = await ConfigManager.loadConfig(options.config);
      
      // Apply CLI overrides
      if (options.output) config.output.directory = options.output;
      if (options.formats) config.output.formats = options.formats.split(',');
      if (options.verbose) config.verbose = true;
      
      // Set generation flags
      if (options.apiOnly) {
        config.generation.apiReference = true;
        config.generation.tutorials = false;
        config.generation.examples = false;
        config.generation.troubleshooting = false;
      }
      if (options.tutorialsOnly) {
        config.generation.apiReference = false;
        config.generation.tutorials = true;
        config.generation.examples = false;
        config.generation.troubleshooting = false;
      }
      if (options.examplesOnly) {
        config.generation.apiReference = false;
        config.generation.tutorials = false;
        config.generation.examples = true;
        config.generation.troubleshooting = false;
      }
      
      logger.setVerbose(config.verbose);
      spinner.succeed('Configuration loaded');
      
      if (options.dryRun) {
        console.log(chalk.yellow('🔍 Dry run mode - showing what would be generated:\n'));
        await showDryRun(config);
        return;
      }
      
      // Initialize generator
      const generator = new DocGenerator(config, logger);
      
      // Generate documentation
      await generator.generateAll();
      
      console.log(chalk.green.bold('\n🎉 Documentation generation complete!'));
      console.log(chalk.gray(`Output directory: ${config.output.directory}`));
      
    } catch (error) {
      spinner.fail('Generation failed');
      console.error(chalk.red('❌ Error:'), error);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze source code without generating documentation')
  .option('-c, --config <path>', 'Path to configuration file', './doc-generator.config.json')
  .option('-l, --language <lang>', 'Analyze specific language only')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options) => {
    const spinner = ora('Analyzing source code...').start();
    
    try {
      const config = await ConfigManager.loadConfig(options.config);
      if (options.verbose) config.verbose = true;
      
      logger.setVerbose(config.verbose);
      
      const generator = new DocGenerator(config, logger);
      const analysis = await generator.analyzeOnly(options.language);
      
      spinner.succeed('Analysis complete');
      
      console.log(chalk.blue.bold('\n📊 Source Code Analysis Results:\n'));
      
      for (const [language, results] of Object.entries(analysis)) {
        console.log(chalk.cyan.bold(`${language.toUpperCase()}:`));
        console.log(`  Files: ${results.length}`);
        console.log(`  Total elements: ${results.reduce((sum, r) => sum + r.elements.length, 0)}`);
        console.log(`  Average complexity: ${(results.reduce((sum, r) => sum + r.complexity, 0) / results.length).toFixed(2)}`);
        console.log();
      }
      
    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(chalk.red('❌ Error:'), error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate configuration file')
  .option('-c, --config <path>', 'Path to configuration file', './doc-generator.config.json')
  .action(async (options) => {
    try {
      const config = await ConfigManager.loadConfig(options.config);
      const validation = ConfigManager.validateConfig(config);
      
      if (validation.valid) {
        console.log(chalk.green('✅ Configuration is valid'));
      } else {
        console.log(chalk.red('❌ Configuration errors:'));
        validation.errors.forEach(error => {
          console.log(chalk.red(`  - ${error}`));
        });
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to validate configuration:'), error);
      process.exit(1);
    }
  });

program
  .command('serve')
  .description('Start development server for live documentation preview')
  .option('-p, --port <port>', 'Server port', '3000')
  .option('-o, --open', 'Open browser automatically')
  .action(async (options) => {
    console.log(chalk.blue('🌐 Starting development server...'));
    // TODO: Implement development server
    console.log(chalk.yellow('Development server not yet implemented'));
  });

async function showDryRun(config: DocGeneratorConfig) {
  console.log(chalk.bold('Configuration:'));
  console.log(`  Output directory: ${config.output.directory}`);
  console.log(`  Formats: ${config.output.formats.join(', ')}`);
  console.log(`  Languages: ${Object.keys(config.languages).filter(l => config.languages[l].enabled).join(', ')}`);
  console.log();
  
  console.log(chalk.bold('Will generate:'));
  if (config.generation.apiReference) console.log('  ✓ API Reference');
  if (config.generation.tutorials) console.log('  ✓ Tutorials');
  if (config.generation.examples) console.log('  ✓ Examples');
  if (config.generation.troubleshooting) console.log('  ✓ Troubleshooting Guides');
  if (config.generation.comparisons) console.log('  ✓ Comparison Tables');
  console.log();
  
  console.log(chalk.bold('Source paths:'));
  Object.entries(config.sources).forEach(([lang, paths]) => {
    if (paths.length > 0) {
      console.log(`  ${lang}: ${paths.join(', ')}`);
    }
  });
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled rejection:'), error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught exception:'), error);
  process.exit(1);
});

program.parse();
