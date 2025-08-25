import { OpenAI } from 'openai';
import { 
  DocGeneratorConfig, 
  AnalysisResult, 
  GeneratedDocument,
  ComparisonTable,
  CodeElement
} from '../types';
import { Logger } from '../utils/Logger';

/**
 * Generates comparison tables showing API consistency across languages
 */
export class ComparisonGenerator {
  constructor(
    private openai: OpenAI,
    private config: DocGeneratorConfig,
    private logger: Logger
  ) {}

  async generate(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument[]> {
    const documents: GeneratedDocument[] = [];
    
    if (analysisResults.size < 2) {
      this.logger.warn('Need at least 2 languages for comparison generation');
      return documents;
    }
    
    // Generate API consistency comparison
    const apiComparison = await this.generateAPIConsistencyComparison(analysisResults);
    documents.push(apiComparison);
    
    // Generate feature matrix
    const featureMatrix = await this.generateFeatureMatrix(analysisResults);
    documents.push(featureMatrix);
    
    // Generate performance comparison
    const performanceComparison = await this.generatePerformanceComparison(analysisResults);
    documents.push(performanceComparison);
    
    // Generate syntax comparison
    const syntaxComparison = await this.generateSyntaxComparison(analysisResults);
    documents.push(syntaxComparison);
    
    // Generate migration guide
    const migrationGuide = await this.generateMigrationGuide(analysisResults);
    documents.push(migrationGuide);
    
    return documents;
  }

  private async generateAPIConsistencyComparison(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument> {
    const languages = Array.from(analysisResults.keys());
    const commonAPIs = this.findCommonAPIs(analysisResults);
    
    const prompt = `Generate a comprehensive API consistency comparison for the HyperSim SDK across multiple languages.

Languages: ${languages.join(', ')}
Common APIs: ${commonAPIs.map(api => api.name).slice(0, 10).join(', ')} (and ${Math.max(0, commonAPIs.length - 10)} more)

Create a detailed comparison covering:

1. **Core API Consistency**
   - Method naming conventions
   - Parameter ordering and types
   - Return value structures
   - Error handling patterns

2. **Language Adaptations**
   - Idiomatic patterns for each language
   - Type system integration
   - Async/concurrency models
   - Memory management approaches

3. **Feature Parity Analysis**
   - Features available in all languages
   - Language-specific extensions
   - Planned features and roadmap
   - Migration considerations

4. **Comparison Tables**
   - Side-by-side API comparison
   - Code examples for identical operations
   - Performance characteristics
   - Best practices for each language

5. **Developer Experience**
   - Installation and setup differences
   - Documentation and tooling
   - Community and ecosystem
   - Learning curve considerations

Focus on helping developers understand:
- Which language to choose for their project
- How consistent the experience is across languages
- What to expect when switching between languages
- Language-specific advantages and trade-offs

Use tables, code examples, and clear comparisons throughout.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are creating technical comparison documentation. Focus on objective analysis, clear tables, and practical guidance for choosing between options.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.openai.temperature || 0.1,
        max_tokens: this.config.openai.maxTokens || 5000
      });

      const content = response.choices[0]?.message?.content || '';
      
      return {
        type: 'comparison',
        title: 'API Consistency Comparison',
        content: this.enhanceWithComparisonTables(content, analysisResults),
        languages,
        complexity: 4,
        outputPath: 'comparisons/api-consistency',
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: Array.from(analysisResults.values()).flat().map(r => r.filePath)
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate API consistency comparison:', error);
      return this.generateFallbackAPIComparison(languages);
    }
  }

  private async generateFeatureMatrix(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument> {
    const languages = Array.from(analysisResults.keys());
    const features = this.extractFeatures(analysisResults);
    
    const prompt = `Generate a comprehensive feature matrix for the HyperSim SDK across all supported languages.

Languages: ${languages.join(', ')}
Identified Features: ${features.slice(0, 15).join(', ')} (and more)

Create a detailed feature matrix that includes:

1. **Core Features Matrix**
   - Transaction simulation
   - AI-powered analysis
   - Cross-layer integration
   - Real-time streaming
   - Plugin system
   - Error handling
   - Performance optimization

2. **Advanced Features**
   - Batch processing
   - Custom precompiles
   - State snapshots
   - Gas estimation
   - MEV analysis
   - Risk assessment

3. **Language-Specific Features**
   - Type safety (TypeScript, Rust)
   - Memory management (Rust, Go)
   - Async patterns (all languages)
   - Ecosystem integration

4. **Development Features**
   - Testing utilities
   - Debugging support
   - Documentation generation
   - Code examples
   - IDE integration

5. **Deployment Features**
   - Package distribution
   - Dependency management
   - Version compatibility
   - Performance benchmarks

For each feature, indicate:
✅ Fully supported
⚠️ Partial support
🔄 In development
❌ Not supported
📋 Planned

Include notes about implementation differences and recommendations for each language.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are creating a comprehensive feature matrix. Use clear symbols, provide detailed explanations, and focus on practical decision-making information.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.openai.temperature || 0.1,
        max_tokens: this.config.openai.maxTokens || 4000
      });

      const content = response.choices[0]?.message?.content || '';
      
      return {
        type: 'comparison',
        title: 'Feature Matrix',
        content,
        languages,
        complexity: 3,
        outputPath: 'comparisons/feature-matrix',
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: Array.from(analysisResults.values()).flat().map(r => r.filePath)
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate feature matrix:', error);
      return this.generateFallbackFeatureMatrix(languages);
    }
  }

  private async generatePerformanceComparison(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument> {
    const languages = Array.from(analysisResults.keys());
    
    const prompt = `Generate a performance comparison analysis for the HyperSim SDK across different languages.

Languages: ${languages.join(', ')}

Create a comprehensive performance analysis covering:

1. **Benchmark Scenarios**
   - Single transaction simulation
   - Batch processing (100 transactions)
   - Concurrent simulations
   - Memory usage patterns
   - Startup and initialization time

2. **Performance Characteristics**
   - Throughput (transactions/second)
   - Latency (response time)
   - Memory footprint
   - CPU usage
   - Network efficiency

3. **Scalability Analysis**
   - Horizontal scaling capabilities
   - Resource utilization patterns
   - Connection pooling efficiency
   - Garbage collection impact

4. **Real-World Scenarios**
   - High-frequency trading applications
   - Batch analytics processing
   - Real-time monitoring systems
   - Development and testing environments

5. **Optimization Recommendations**
   - Language-specific optimizations
   - Configuration tuning
   - Resource allocation strategies
   - Monitoring and profiling approaches

For each language, provide:
- Expected performance ranges
- Optimization strategies
- Resource requirements
- Scaling considerations
- Trade-offs and limitations

Include practical guidance for choosing the right language based on performance requirements.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are creating performance comparison documentation. Focus on measurable metrics, practical benchmarks, and actionable optimization advice.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.openai.temperature || 0.1,
        max_tokens: this.config.openai.maxTokens || 4000
      });

      const content = response.choices[0]?.message?.content || '';
      
      return {
        type: 'comparison',
        title: 'Performance Comparison',
        content,
        languages,
        complexity: 4,
        outputPath: 'comparisons/performance',
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: Array.from(analysisResults.values()).flat().map(r => r.filePath)
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate performance comparison:', error);
      return this.generateFallbackPerformanceComparison(languages);
    }
  }

  private async generateSyntaxComparison(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument> {
    const languages = Array.from(analysisResults.keys());
    const commonOperations = this.identifyCommonOperations(analysisResults);
    
    const prompt = `Generate a syntax comparison guide showing how common operations are performed across different languages in the HyperSim SDK.

Languages: ${languages.join(', ')}
Common Operations: ${commonOperations.slice(0, 10).join(', ')}

Create side-by-side syntax comparisons for:

1. **Basic Operations**
   - SDK initialization
   - Configuration setup
   - Simple transaction simulation
   - Result handling

2. **Intermediate Operations**
   - Batch processing
   - Error handling
   - Async operations
   - Event handling

3. **Advanced Operations**
   - Plugin system usage
   - Custom configurations
   - Performance optimization
   - Integration patterns

4. **Language-Specific Idioms**
   - Error handling patterns
   - Async/await usage
   - Resource management
   - Type annotations

For each operation, show:
- Code example in each language
- Key differences and similarities
- Language-specific best practices
- Common pitfalls to avoid
- Migration notes between languages

Format as clear, side-by-side comparisons with explanatory notes.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are creating syntax comparison documentation. Use clear side-by-side examples, highlight differences, and provide practical migration guidance.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.openai.temperature || 0.1,
        max_tokens: this.config.openai.maxTokens || 4000
      });

      const content = response.choices[0]?.message?.content || '';
      
      return {
        type: 'comparison',
        title: 'Syntax Comparison Guide',
        content,
        languages,
        complexity: 3,
        outputPath: 'comparisons/syntax',
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: Array.from(analysisResults.values()).flat().map(r => r.filePath)
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate syntax comparison:', error);
      return this.generateFallbackSyntaxComparison(languages);
    }
  }

  private async generateMigrationGuide(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument> {
    const languages = Array.from(analysisResults.keys());
    
    const prompt = `Generate a comprehensive migration guide for moving between different languages in the HyperSim SDK.

Supported Languages: ${languages.join(', ')}

Create migration guidance covering:

1. **Migration Scenarios**
   - Prototyping in one language, production in another
   - Team skill set changes
   - Performance optimization needs
   - Ecosystem integration requirements

2. **Language Pairs Analysis**
   - TypeScript ↔ Python (rapid development)
   - Python ↔ Rust (performance optimization)
   - JavaScript ↔ Go (backend services)
   - Any language → Java (enterprise integration)

3. **Migration Strategies**
   - Gradual migration approaches
   - API mapping and translation
   - Data structure conversions
   - Configuration adaptations

4. **Code Translation Patterns**
   - Common code patterns and their equivalents
   - Error handling translation
   - Async pattern conversions
   - Type system adaptations

5. **Migration Tools and Resources**
   - Automated conversion tools
   - Validation strategies
   - Testing approaches
   - Performance verification

6. **Best Practices**
   - When to migrate vs. when to stay
   - Risk assessment and mitigation
   - Team training considerations
   - Timeline and resource planning

Provide specific examples, checklists, and practical guidance for each migration scenario.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are creating migration documentation. Focus on practical steps, risk mitigation, and realistic timelines. Provide actionable guidance for technical decisions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.openai.temperature || 0.1,
        max_tokens: this.config.openai.maxTokens || 4000
      });

      const content = response.choices[0]?.message?.content || '';
      
      return {
        type: 'comparison',
        title: 'Migration Guide',
        content,
        languages,
        complexity: 5,
        outputPath: 'comparisons/migration-guide',
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: Array.from(analysisResults.values()).flat().map(r => r.filePath)
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate migration guide:', error);
      return this.generateFallbackMigrationGuide(languages);
    }
  }

  // Helper methods
  private findCommonAPIs(analysisResults: Map<string, AnalysisResult[]>): CodeElement[] {
    const languageAPIs = new Map<string, Set<string>>();
    
    // Collect API names for each language
    for (const [language, results] of analysisResults) {
      const apiNames = new Set<string>();
      for (const result of results) {
        for (const element of result.elements) {
          if (['class', 'function', 'interface'].includes(element.type)) {
            apiNames.add(element.name);
          }
        }
      }
      languageAPIs.set(language, apiNames);
    }
    
    // Find APIs common to all languages
    const allLanguages = Array.from(languageAPIs.keys());
    const firstLanguageAPIs = languageAPIs.get(allLanguages[0]) || new Set();
    
    const commonAPIs: CodeElement[] = [];
    for (const apiName of firstLanguageAPIs) {
      const isCommon = allLanguages.every(lang => 
        languageAPIs.get(lang)?.has(apiName)
      );
      
      if (isCommon) {
        // Find the element details from any language
        for (const results of analysisResults.values()) {
          const element = results.flatMap(r => r.elements)
            .find(el => el.name === apiName);
          if (element) {
            commonAPIs.push(element);
            break;
          }
        }
      }
    }
    
    return commonAPIs;
  }

  private extractFeatures(analysisResults: Map<string, AnalysisResult[]>): string[] {
    const features = new Set<string>();
    
    for (const results of analysisResults.values()) {
      for (const result of results) {
        for (const element of result.elements) {
          // Extract feature names from element names and descriptions
          if (element.name.toLowerCase().includes('simulation')) {
            features.add('Transaction Simulation');
          }
          if (element.name.toLowerCase().includes('ai') || element.name.toLowerCase().includes('analysis')) {
            features.add('AI Analysis');
          }
          if (element.name.toLowerCase().includes('stream') || element.name.toLowerCase().includes('websocket')) {
            features.add('Real-time Streaming');
          }
          if (element.name.toLowerCase().includes('plugin')) {
            features.add('Plugin System');
          }
          if (element.name.toLowerCase().includes('gas')) {
            features.add('Gas Optimization');
          }
          // Add more feature detection logic...
        }
      }
    }
    
    return Array.from(features);
  }

  private identifyCommonOperations(analysisResults: Map<string, AnalysisResult[]>): string[] {
    return [
      'Initialize SDK',
      'Configure Settings',
      'Simulate Transaction',
      'Handle Errors',
      'Process Results',
      'Batch Operations',
      'Async Operations',
      'Resource Cleanup'
    ];
  }

  private enhanceWithComparisonTables(content: string, analysisResults: Map<string, AnalysisResult[]>): string {
    // Add comparison table markers for post-processing
    const languages = Array.from(analysisResults.keys());
    const tableHeader = `\n\n<!-- COMPARISON_TABLE:${languages.join(',')} -->\n\n`;
    return content + tableHeader;
  }

  // Fallback methods
  private generateFallbackAPIComparison(languages: string[]): GeneratedDocument {
    let content = '# API Consistency Comparison\n\n';
    content += `This document compares the API consistency across ${languages.join(', ')} implementations.\n\n`;
    content += '## Core APIs\n\nThe following core APIs are available in all languages:\n\n';
    content += '- SDK initialization\n- Transaction simulation\n- Result processing\n- Error handling\n\n';
    
    return {
      type: 'comparison',
      title: 'API Consistency Comparison',
      content,
      languages,
      complexity: 4,
      outputPath: 'comparisons/api-consistency',
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }

  private generateFallbackFeatureMatrix(languages: string[]): GeneratedDocument {
    let content = '# Feature Matrix\n\n';
    content += 'Feature availability across different language implementations:\n\n';
    content += '| Feature | ' + languages.join(' | ') + ' |\n';
    content += '|---------|' + languages.map(() => '---').join('|') + '|\n';
    content += '| Transaction Simulation | ' + languages.map(() => '✅').join(' | ') + ' |\n';
    content += '| AI Analysis | ' + languages.map(() => '✅').join(' | ') + ' |\n';
    
    return {
      type: 'comparison',
      title: 'Feature Matrix',
      content,
      languages,
      complexity: 3,
      outputPath: 'comparisons/feature-matrix',
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }

  private generateFallbackPerformanceComparison(languages: string[]): GeneratedDocument {
    let content = '# Performance Comparison\n\n';
    content += `Performance characteristics across ${languages.join(', ')} implementations.\n\n`;
    content += '## Benchmark Results\n\nPerformance benchmarks will be added here.\n\n';
    
    return {
      type: 'comparison',
      title: 'Performance Comparison',
      content,
      languages,
      complexity: 4,
      outputPath: 'comparisons/performance',
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }

  private generateFallbackSyntaxComparison(languages: string[]): GeneratedDocument {
    let content = '# Syntax Comparison Guide\n\n';
    content += 'Side-by-side syntax comparisons for common operations.\n\n';
    
    return {
      type: 'comparison',
      title: 'Syntax Comparison Guide',
      content,
      languages,
      complexity: 3,
      outputPath: 'comparisons/syntax',
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }

  private generateFallbackMigrationGuide(languages: string[]): GeneratedDocument {
    let content = '# Migration Guide\n\n';
    content += `Guide for migrating between ${languages.join(', ')} implementations.\n\n`;
    content += '## Migration Strategies\n\nMigration strategies will be documented here.\n\n';
    
    return {
      type: 'comparison',
      title: 'Migration Guide',
      content,
      languages,
      complexity: 5,
      outputPath: 'comparisons/migration-guide',
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }
}