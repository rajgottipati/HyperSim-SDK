import { OpenAI } from 'openai';
import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import chalk from 'chalk';
import ora from 'ora';

import { 
  DocGeneratorConfig, 
  AnalysisResult, 
  GeneratedDocument, 
  ComparisonTable,
  TutorialSection
} from '../types';
import { Logger } from '../utils/Logger';
import { CodeAnalyzer } from '../analyzers/CodeAnalyzer';
import { TypeScriptAnalyzer } from '../analyzers/TypeScriptAnalyzer';
import { PythonAnalyzer } from '../analyzers/PythonAnalyzer';
import { RustAnalyzer } from '../analyzers/RustAnalyzer';
import { GoAnalyzer } from '../analyzers/GoAnalyzer';
import { JavaAnalyzer } from '../analyzers/JavaAnalyzer';
import { APIReferenceGenerator } from './APIReferenceGenerator';
import { TutorialGenerator } from './TutorialGenerator';
import { ExampleGenerator } from './ExampleGenerator';
import { TroubleshootingGenerator } from './TroubleshootingGenerator';
import { ComparisonGenerator } from './ComparisonGenerator';
import { MarkdownFormatter } from '../formatters/MarkdownFormatter';
import { HTMLFormatter } from '../formatters/HTMLFormatter';
import { JSONFormatter } from '../formatters/JSONFormatter';

export class DocGenerator {
  private openai: OpenAI;
  private analyzers: Map<string, CodeAnalyzer>;
  private analysisResults: Map<string, AnalysisResult[]> = new Map();

  constructor(
    private config: DocGeneratorConfig,
    private logger: Logger
  ) {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
    
    this.analyzers = new Map([
      ['typescript', new TypeScriptAnalyzer(this.openai, this.logger)],
      ['python', new PythonAnalyzer(this.openai, this.logger)],
      ['rust', new RustAnalyzer(this.openai, this.logger)],
      ['go', new GoAnalyzer(this.openai, this.logger)],
      ['java', new JavaAnalyzer(this.openai, this.logger)]
    ]);
  }

  /**
   * Generate all documentation based on configuration
   */
  async generateAll(): Promise<void> {
    const spinner = ora('Starting documentation generation...').start();
    
    try {
      // Phase 1: Analyze source code
      spinner.text = 'Analyzing source code...';
      await this.analyzeAllSources();
      
      // Phase 2: Generate documentation
      const documents: GeneratedDocument[] = [];
      
      if (this.config.generation.apiReference) {
        spinner.text = 'Generating API reference...';
        const apiDocs = await this.generateAPIReference();
        documents.push(...apiDocs);
      }
      
      if (this.config.generation.tutorials) {
        spinner.text = 'Generating tutorials...';
        const tutorials = await this.generateTutorials();
        documents.push(...tutorials);
      }
      
      if (this.config.generation.examples) {
        spinner.text = 'Generating examples...';
        const examples = await this.generateExamples();
        documents.push(...examples);
      }
      
      if (this.config.generation.troubleshooting) {
        spinner.text = 'Generating troubleshooting guides...';
        const troubleshooting = await this.generateTroubleshooting();
        documents.push(...troubleshooting);
      }
      
      if (this.config.generation.comparisons) {
        spinner.text = 'Generating comparison tables...';
        const comparisons = await this.generateComparisons();
        documents.push(...comparisons);
      }
      
      // Phase 3: Format and write output
      spinner.text = 'Formatting and writing output...';
      await this.writeDocuments(documents);
      
      // Phase 4: Generate index and navigation
      spinner.text = 'Generating index and navigation...';
      await this.generateIndex(documents);
      
      spinner.succeed(`Generated ${documents.length} documents`);
      
    } catch (error) {
      spinner.fail('Documentation generation failed');
      throw error;
    }
  }

  /**
   * Analyze source code only (no generation)
   */
  async analyzeOnly(language?: string): Promise<Record<string, AnalysisResult[]>> {
    if (language) {
      await this.analyzeLanguage(language);
      return { [language]: this.analysisResults.get(language) || [] };
    }
    
    await this.analyzeAllSources();
    return Object.fromEntries(this.analysisResults);
  }

  private async analyzeAllSources(): Promise<void> {
    const enabledLanguages = Object.keys(this.config.languages)
      .filter(lang => this.config.languages[lang].enabled);
    
    for (const language of enabledLanguages) {
      await this.analyzeLanguage(language);
    }
  }

  private async analyzeLanguage(language: string): Promise<void> {
    const analyzer = this.analyzers.get(language);
    if (!analyzer) {
      this.logger.warn(`No analyzer found for language: ${language}`);
      return;
    }
    
    const sourcePaths = this.config.sources[language as keyof typeof this.config.sources] || [];
    if (sourcePaths.length === 0) {
      this.logger.debug(`No source paths configured for ${language}`);
      return;
    }
    
    const results: AnalysisResult[] = [];
    
    for (const sourcePath of sourcePaths) {
      const files = await this.getSourceFiles(sourcePath, language);
      
      for (const file of files) {
        try {
          this.logger.debug(`Analyzing ${file}`);
          const result = await analyzer.analyze(file);
          results.push(result);
        } catch (error) {
          this.logger.error(`Failed to analyze ${file}:`, error);
        }
      }
    }
    
    this.analysisResults.set(language, results);
    this.logger.info(`Analyzed ${results.length} ${language} files`);
  }

  private async getSourceFiles(sourcePath: string, language: string): Promise<string[]> {
    const patterns: Record<string, string[]> = {
      typescript: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
      python: ['**/*.py'],
      rust: ['**/*.rs'],
      go: ['**/*.go'],
      java: ['**/*.java']
    };
    
    const languagePatterns = patterns[language] || ['**/*'];
    const files: string[] = [];
    
    for (const pattern of languagePatterns) {
      const fullPattern = path.join(sourcePath, pattern);
      const matches = await glob(fullPattern, { ignore: ['**/node_modules/**', '**/target/**', '**/dist/**', '**/.git/**'] });
      files.push(...matches);
    }
    
    return [...new Set(files)]; // Remove duplicates
  }

  private async generateAPIReference(): Promise<GeneratedDocument[]> {
    const generator = new APIReferenceGenerator(this.openai, this.config, this.logger);
    return generator.generate(this.analysisResults);
  }

  private async generateTutorials(): Promise<GeneratedDocument[]> {
    const generator = new TutorialGenerator(this.openai, this.config, this.logger);
    return generator.generate(this.analysisResults);
  }

  private async generateExamples(): Promise<GeneratedDocument[]> {
    const generator = new ExampleGenerator(this.openai, this.config, this.logger);
    return generator.generate(this.analysisResults);
  }

  private async generateTroubleshooting(): Promise<GeneratedDocument[]> {
    const generator = new TroubleshootingGenerator(this.openai, this.config, this.logger);
    return generator.generate(this.analysisResults);
  }

  private async generateComparisons(): Promise<GeneratedDocument[]> {
    const generator = new ComparisonGenerator(this.openai, this.config, this.logger);
    return generator.generate(this.analysisResults);
  }

  private async writeDocuments(documents: GeneratedDocument[]): Promise<void> {
    await fs.ensureDir(this.config.output.directory);
    
    const formatters = {
      markdown: new MarkdownFormatter(this.config),
      html: new HTMLFormatter(this.config),
      json: new JSONFormatter(this.config)
    };
    
    for (const document of documents) {
      for (const format of this.config.output.formats) {
        if (format === 'pdf') {
          // PDF generation would require additional dependencies
          this.logger.warn('PDF generation not yet implemented');
          continue;
        }
        
        const formatter = formatters[format as keyof typeof formatters];
        if (!formatter) {
          this.logger.warn(`No formatter found for format: ${format}`);
          continue;
        }
        
        const formatted = await formatter.format(document);
        const extension = formatter.getExtension();
        const filename = `${path.basename(document.outputPath, path.extname(document.outputPath))}.${extension}`;
        const outputPath = path.join(
          this.config.output.directory,
          format,
          path.dirname(document.outputPath),
          filename
        );
        
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, formatted, 'utf-8');
        
        this.logger.debug(`Wrote ${outputPath}`);
      }
    }
  }

  private async generateIndex(documents: GeneratedDocument[]): Promise<void> {
    const indexContent = this.generateIndexContent(documents);
    
    for (const format of this.config.output.formats) {
      if (format === 'pdf') continue;
      
      const formatter = format === 'markdown' 
        ? new MarkdownFormatter(this.config)
        : format === 'html'
        ? new HTMLFormatter(this.config)
        : new JSONFormatter(this.config);
      
      const indexDocument: GeneratedDocument = {
        type: 'api-reference',
        title: 'HyperSim SDK Documentation',
        content: indexContent,
        languages: Object.keys(this.config.languages).filter(l => this.config.languages[l].enabled),
        complexity: 1,
        outputPath: 'index',
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: Object.values(this.config.sources).flat()
        }
      };
      
      const formatted = await formatter.format(indexDocument);
      const extension = formatter.getExtension();
      const indexPath = path.join(this.config.output.directory, format, `index.${extension}`);
      
      await fs.writeFile(indexPath, formatted, 'utf-8');
    }
  }

  private generateIndexContent(documents: GeneratedDocument[]): string {
    const sections = {
      'API Reference': documents.filter(d => d.type === 'api-reference'),
      'Tutorials': documents.filter(d => d.type === 'tutorial'),
      'Examples': documents.filter(d => d.type === 'example'),
      'Troubleshooting': documents.filter(d => d.type === 'troubleshooting'),
      'Comparisons': documents.filter(d => d.type === 'comparison')
    };
    
    let content = `# HyperSim SDK Documentation

Welcome to the comprehensive documentation for the HyperSim SDK - the first SDK for HyperEVM transaction simulation with AI-powered analysis and cross-layer HyperCore integration.

## Available Languages

${Object.keys(this.config.languages)
  .filter(l => this.config.languages[l].enabled)
  .map(lang => `- ${lang.charAt(0).toUpperCase() + lang.slice(1)}`)
  .join('\n')}

## Documentation Sections

`;
    
    for (const [sectionName, sectionDocs] of Object.entries(sections)) {
      if (sectionDocs.length === 0) continue;
      
      content += `### ${sectionName}\n\n`;
      
      for (const doc of sectionDocs) {
        content += `- [${doc.title}](${doc.outputPath})\n`;
      }
      
      content += '\n';
    }
    
    content += `## Generation Information

- **Generated**: ${new Date().toISOString()}
- **Total Documents**: ${documents.length}
- **AI Model**: ${this.config.openai.model || 'gpt-4'}

---

*This documentation was automatically generated using AI-powered analysis of the HyperSim SDK source code.*
`;
    
    return content;
  }
}
