/**
 * HyperSim SDK AI-Powered Documentation Generator
 * 
 * A comprehensive tool for generating multi-language documentation
 * using AI analysis and intelligent content generation.
 */

// Main generator
export { DocGenerator } from './generators/DocGenerator';

// Specialized generators
export { APIReferenceGenerator } from './generators/APIReferenceGenerator';
export { TutorialGenerator } from './generators/TutorialGenerator';
export { ExampleGenerator } from './generators/ExampleGenerator';
export { TroubleshootingGenerator } from './generators/TroubleshootingGenerator';
export { ComparisonGenerator } from './generators/ComparisonGenerator';

// Code analyzers
export { CodeAnalyzer } from './analyzers/CodeAnalyzer';
export { TypeScriptAnalyzer } from './analyzers/TypeScriptAnalyzer';
export { PythonAnalyzer } from './analyzers/PythonAnalyzer';
export { RustAnalyzer } from './analyzers/RustAnalyzer';
export { GoAnalyzer } from './analyzers/GoAnalyzer';
export { JavaAnalyzer } from './analyzers/JavaAnalyzer';

// Formatters
export { BaseFormatter } from './formatters/BaseFormatter';
export { MarkdownFormatter } from './formatters/MarkdownFormatter';
export { HTMLFormatter } from './formatters/HTMLFormatter';
export { JSONFormatter } from './formatters/JSONFormatter';

// Utilities
export { ConfigManager } from './utils/ConfigManager';
export { Logger } from './utils/Logger';

// Types
export * from './types';

// Version
export const VERSION = '1.0.0';

/**
 * Quick start function for simple usage
 */
export async function generateDocumentation(config: any) {
  const { DocGenerator } = await import('./generators/DocGenerator');
  const { Logger } = await import('./utils/Logger');
  
  const logger = new Logger({ verbose: config.verbose });
  const generator = new DocGenerator(config, logger);
  
  return generator.generateAll();
}

/**
 * Create a new documentation generator instance
 */
export async function createGenerator(config: any) {
  const { DocGenerator } = await import('./generators/DocGenerator');
  const { Logger } = await import('./utils/Logger');
  
  const logger = new Logger({ verbose: config.verbose });
  return new DocGenerator(config, logger);
}

/**
 * Analyze source code without generating documentation
 */
export async function analyzeCode(config: any, language?: string) {
  const generator = await createGenerator(config);
  return generator.analyzeOnly(language);
}