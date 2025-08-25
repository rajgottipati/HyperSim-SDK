import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import { DocGeneratorConfig } from '../types';

/**
 * Manages configuration for the documentation generator
 */
export class ConfigManager {
  /**
   * Load configuration from file
   */
  static async loadConfig(configPath: string): Promise<DocGeneratorConfig> {
    try {
      const configFile = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configFile);
      
      // Validate and set defaults
      return this.normalizeConfig(config);
    } catch (error) {
      throw new Error(`Failed to load configuration from ${configPath}: ${error}`);
    }
  }

  /**
   * Save configuration to file
   */
  static async saveConfig(config: DocGeneratorConfig, configPath = './doc-generator.config.json'): Promise<void> {
    try {
      const configDir = path.dirname(configPath);
      await fs.ensureDir(configDir);
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  /**
   * Create configuration interactively
   */
  static async createInteractiveConfig(): Promise<DocGeneratorConfig> {
    console.log('\n🚀 Setting up HyperSim Documentation Generator\n');
    
    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'openaiApiKey',
        message: 'OpenAI API Key:',
        validate: (input) => input.length > 0 || 'API key is required'
      },
      {
        type: 'list',
        name: 'openaiModel',
        message: 'OpenAI Model:',
        choices: ['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo'],
        default: 'gpt-4'
      },
      {
        type: 'input',
        name: 'outputDirectory',
        message: 'Output directory:',
        default: './generated-docs'
      },
      {
        type: 'checkbox',
        name: 'outputFormats',
        message: 'Output formats:',
        choices: [
          { name: 'Markdown', value: 'markdown', checked: true },
          { name: 'HTML', value: 'html', checked: true },
          { name: 'JSON', value: 'json', checked: false }
        ]
      },
      {
        type: 'confirm',
        name: 'liveExamples',
        message: 'Enable live code examples?',
        default: true
      },
      {
        type: 'checkbox',
        name: 'languages',
        message: 'Languages to analyze:',
        choices: [
          { name: 'TypeScript', value: 'typescript', checked: true },
          { name: 'Python', value: 'python', checked: true },
          { name: 'Rust', value: 'rust', checked: true },
          { name: 'Go', value: 'go', checked: true },
          { name: 'Java', value: 'java', checked: true }
        ]
      },
      {
        type: 'checkbox',
        name: 'generationTypes',
        message: 'What to generate:',
        choices: [
          { name: 'API Reference', value: 'apiReference', checked: true },
          { name: 'Tutorials', value: 'tutorials', checked: true },
          { name: 'Examples', value: 'examples', checked: true },
          { name: 'Troubleshooting', value: 'troubleshooting', checked: true },
          { name: 'Comparisons', value: 'comparisons', checked: true }
        ]
      },
      {
        type: 'list',
        name: 'maxComplexity',
        message: 'Maximum tutorial complexity:',
        choices: [1, 2, 3, 4, 5],
        default: 5
      },
      {
        type: 'confirm',
        name: 'debug',
        message: 'Enable debug mode?',
        default: false
      }
    ]);
    
    // Collect source paths
    const sourcePaths: Record<string, string[]> = {};
    for (const language of answers.languages) {
      const pathAnswer = await inquirer.prompt({
        type: 'input',
        name: 'paths',
        message: `${language.charAt(0).toUpperCase() + language.slice(1)} source paths (comma-separated):`,
        default: this.getDefaultSourcePaths(language),
        filter: (input: string) => input.split(',').map(p => p.trim()).filter(p => p.length > 0)
      });
      sourcePaths[language] = pathAnswer.paths;
    }
    
    const config: DocGeneratorConfig = {
      openai: {
        apiKey: answers.openaiApiKey,
        model: answers.openaiModel,
        temperature: 0.1,
        maxTokens: 4000
      },
      sources: {
        typescript: sourcePaths.typescript || [],
        python: sourcePaths.python || [],
        rust: sourcePaths.rust || [],
        go: sourcePaths.go || [],
        java: sourcePaths.java || []
      },
      output: {
        directory: answers.outputDirectory,
        formats: answers.outputFormats,
        liveExamples: answers.liveExamples
      },
      generation: {
        apiReference: answers.generationTypes.includes('apiReference'),
        tutorials: answers.generationTypes.includes('tutorials'),
        examples: answers.generationTypes.includes('examples'),
        troubleshooting: answers.generationTypes.includes('troubleshooting'),
        comparisons: answers.generationTypes.includes('comparisons'),
        maxComplexity: answers.maxComplexity
      },
      languages: {},
      templates: {},
      debug: answers.debug,
      verbose: answers.debug
    };
    
    // Set language configurations
    for (const language of answers.languages) {
      config.languages[language] = {
        enabled: true,
        priority: 1
      };
    }
    
    return config;
  }

  /**
   * Validate configuration
   */
  static validateConfig(config: DocGeneratorConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate OpenAI configuration
    if (!config.openai?.apiKey) {
      errors.push('OpenAI API key is required');
    }
    
    // Validate output configuration
    if (!config.output?.directory) {
      errors.push('Output directory is required');
    }
    
    if (!config.output?.formats || config.output.formats.length === 0) {
      errors.push('At least one output format must be specified');
    }
    
    // Validate source paths
    const enabledLanguages = Object.keys(config.languages || {})
      .filter(lang => config.languages[lang].enabled);
    
    if (enabledLanguages.length === 0) {
      errors.push('At least one language must be enabled');
    }
    
    for (const language of enabledLanguages) {
      const sourcePaths = config.sources[language as keyof typeof config.sources];
      if (!sourcePaths || sourcePaths.length === 0) {
        errors.push(`Source paths for ${language} are required`);
      }
    }
    
    // Validate generation settings
    const generationFlags = [
      config.generation?.apiReference,
      config.generation?.tutorials,
      config.generation?.examples,
      config.generation?.troubleshooting,
      config.generation?.comparisons
    ];
    
    if (!generationFlags.some(flag => flag)) {
      errors.push('At least one generation type must be enabled');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Normalize and set defaults for configuration
   */
  private static normalizeConfig(config: Partial<DocGeneratorConfig>): DocGeneratorConfig {
    return {
      openai: {
        apiKey: config.openai?.apiKey || '',
        model: config.openai?.model || 'gpt-4',
        temperature: config.openai?.temperature ?? 0.1,
        maxTokens: config.openai?.maxTokens ?? 4000
      },
      sources: {
        typescript: config.sources?.typescript || [],
        python: config.sources?.python || [],
        rust: config.sources?.rust || [],
        go: config.sources?.go || [],
        java: config.sources?.java || []
      },
      output: {
        directory: config.output?.directory || './generated-docs',
        formats: config.output?.formats || ['markdown'],
        liveExamples: config.output?.liveExamples ?? false
      },
      generation: {
        apiReference: config.generation?.apiReference ?? true,
        tutorials: config.generation?.tutorials ?? true,
        examples: config.generation?.examples ?? true,
        troubleshooting: config.generation?.troubleshooting ?? true,
        comparisons: config.generation?.comparisons ?? true,
        maxComplexity: config.generation?.maxComplexity ?? 5
      },
      languages: config.languages || {},
      templates: config.templates || {},
      debug: config.debug ?? false,
      verbose: config.verbose ?? false
    };
  }

  /**
   * Get default source paths for a language
   */
  private static getDefaultSourcePaths(language: string): string {
    const defaults: Record<string, string> = {
      typescript: './src, ./hypersim-sdk/src',
      python: './sdks/python/hypersim_sdk',
      rust: './sdks/rust/src',
      go: './sdks/go',
      java: './sdks/java/src'
    };
    return defaults[language] || './';
  }

  /**
   * Get example configuration
   */
  static getExampleConfig(): DocGeneratorConfig {
    return {
      openai: {
        apiKey: 'your-openai-api-key',
        model: 'gpt-4',
        temperature: 0.1,
        maxTokens: 4000
      },
      sources: {
        typescript: ['./src', './hypersim-sdk/src'],
        python: ['./sdks/python/hypersim_sdk'],
        rust: ['./sdks/rust/src'],
        go: ['./sdks/go'],
        java: ['./sdks/java/src']
      },
      output: {
        directory: './generated-docs',
        formats: ['markdown', 'html'],
        liveExamples: true
      },
      generation: {
        apiReference: true,
        tutorials: true,
        examples: true,
        troubleshooting: true,
        comparisons: true,
        maxComplexity: 5
      },
      languages: {
        typescript: { enabled: true, priority: 1 },
        python: { enabled: true, priority: 2 },
        rust: { enabled: true, priority: 3 },
        go: { enabled: true, priority: 4 },
        java: { enabled: true, priority: 5 }
      },
      templates: {
        directory: './templates',
        variables: {
          projectName: 'HyperSim SDK',
          version: '1.0.0',
          author: 'HyperSim Team'
        }
      },
      debug: false,
      verbose: false
    };
  }
}