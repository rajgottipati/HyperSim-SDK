import { OpenAI } from 'openai';
import { 
  DocGeneratorConfig, 
  AnalysisResult, 
  GeneratedDocument,
  CodeElement
} from '../types';
import { Logger } from '../utils/Logger';

/**
 * Generates comprehensive code examples
 */
export class ExampleGenerator {
  constructor(
    private openai: OpenAI,
    private config: DocGeneratorConfig,
    private logger: Logger
  ) {}

  async generate(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument[]> {
    const documents: GeneratedDocument[] = [];
    
    // Generate basic examples
    const basicExamples = await this.generateBasicExamples(analysisResults);
    documents.push(...basicExamples);
    
    // Generate use case examples
    const useCaseExamples = await this.generateUseCaseExamples(analysisResults);
    documents.push(...useCaseExamples);
    
    // Generate integration examples
    const integrationExamples = await this.generateIntegrationExamples(analysisResults);
    documents.push(...integrationExamples);
    
    // Generate language comparison examples
    const comparisonExamples = await this.generateComparisonExamples(analysisResults);
    documents.push(...comparisonExamples);
    
    return documents;
  }

  private async generateBasicExamples(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument[]> {
    const documents: GeneratedDocument[] = [];
    const basicScenarios = [
      'Simple Transaction Simulation',
      'Transaction with AI Analysis',
      'Bundle Optimization',
      'Error Handling',
      'Configuration Setup'
    ];
    
    for (const scenario of basicScenarios) {
      const doc = await this.generateBasicExample(scenario, analysisResults);
      documents.push(doc);
    }
    
    return documents;
  }

  private async generateBasicExample(scenario: string, analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument> {
    const languages = Array.from(analysisResults.keys());
    
    const prompt = `Create a comprehensive code example for "${scenario}" using the HyperSim SDK.

Scenario: ${scenario}
Languages: ${languages.join(', ')}

For each language, provide:
1. Complete, runnable code example
2. Detailed code comments explaining each step
3. Expected output and what it means
4. Common variations and alternatives
5. Error handling approach
6. Performance considerations

Make the examples practical and ready-to-use. Focus on real-world scenarios that developers would actually encounter.

Ensure consistency across languages while leveraging each language's strengths.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are creating practical code examples for developers. Focus on real-world usage, proper error handling, and clear explanations.'
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
        type: 'example',
        title: `Example: ${scenario}`,
        content: this.enhanceWithExecutableMarkers(content),
        languages,
        complexity: 2,
        outputPath: `examples/basic/${scenario.toLowerCase().replace(/\s+/g, '-')}`,
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: Array.from(analysisResults.values()).flat().map(r => r.filePath)
        }
      };
    } catch (error) {
      this.logger.error(`Failed to generate basic example for ${scenario}:`, error);
      return this.generateFallbackBasicExample(scenario, languages);
    }
  }

  private async generateUseCaseExamples(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument[]> {
    const documents: GeneratedDocument[] = [];
    const useCases = [
      'DeFi Arbitrage Bot',
      'MEV Protection Service',
      'Gas Optimization Tool',
      'Risk Assessment System',
      'Trading Strategy Backtester'
    ];
    
    for (const useCase of useCases) {
      const doc = await this.generateUseCaseExample(useCase, analysisResults);
      documents.push(doc);
    }
    
    return documents;
  }

  private async generateUseCaseExample(useCase: string, analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument> {
    const languages = Array.from(analysisResults.keys());
    
    const prompt = `Create a comprehensive real-world example: "${useCase}" using the HyperSim SDK.

Use Case: ${useCase}
Languages: ${languages.join(', ')}

For each language, provide:
1. Complete application structure
2. Core business logic implementation
3. Integration with HyperSim SDK features
4. Error handling and edge cases
5. Performance optimization techniques
6. Testing approach
7. Deployment considerations

Make this a production-ready example that demonstrates:
- Real-world problem solving
- Best practices and patterns
- SDK feature integration
- Scalability considerations

Include architecture diagrams and flow explanations where helpful.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are creating production-ready examples for real-world applications. Focus on architecture, scalability, and best practices.'
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
        type: 'example',
        title: `Use Case: ${useCase}`,
        content: this.enhanceWithExecutableMarkers(content),
        languages,
        complexity: 4,
        outputPath: `examples/use-cases/${useCase.toLowerCase().replace(/\s+/g, '-')}`,
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: Array.from(analysisResults.values()).flat().map(r => r.filePath)
        }
      };
    } catch (error) {
      this.logger.error(`Failed to generate use case example for ${useCase}:`, error);
      return this.generateFallbackUseCaseExample(useCase, languages);
    }
  }

  private async generateIntegrationExamples(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument[]> {
    const documents: GeneratedDocument[] = [];
    const integrations = [
      'Web3 Frameworks Integration',
      'Database Integration',
      'Monitoring and Logging',
      'Microservices Architecture',
      'Cloud Deployment'
    ];
    
    for (const integration of integrations) {
      const doc = await this.generateIntegrationExample(integration, analysisResults);
      documents.push(doc);
    }
    
    return documents;
  }

  private async generateIntegrationExample(integration: string, analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument> {
    const languages = Array.from(analysisResults.keys());
    
    const prompt = `Create integration examples for "${integration}" with the HyperSim SDK.

Integration: ${integration}
Languages: ${languages.join(', ')}

For each language, show:
1. Integration architecture and patterns
2. Configuration and setup
3. Code examples with proper abstractions
4. Error handling and resilience
5. Performance and scaling considerations
6. Testing strategies
7. Production deployment guidance

Focus on real-world integration patterns that developers commonly need.
Include popular frameworks and libraries for each language.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are creating integration examples showing how to combine the SDK with other technologies and frameworks.'
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
        type: 'example',
        title: `Integration: ${integration}`,
        content: this.enhanceWithExecutableMarkers(content),
        languages,
        complexity: 3,
        outputPath: `examples/integrations/${integration.toLowerCase().replace(/\s+/g, '-')}`,
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: Array.from(analysisResults.values()).flat().map(r => r.filePath)
        }
      };
    } catch (error) {
      this.logger.error(`Failed to generate integration example for ${integration}:`, error);
      return this.generateFallbackIntegrationExample(integration, languages);
    }
  }

  private async generateComparisonExamples(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument[]> {
    const documents: GeneratedDocument[] = [];
    const languages = Array.from(analysisResults.keys());
    
    if (languages.length < 2) {
      return documents; // Need at least 2 languages for comparison
    }
    
    const comparisonDoc = await this.generateLanguageComparisonExample(analysisResults);
    documents.push(comparisonDoc);
    
    return documents;
  }

  private async generateLanguageComparisonExample(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument> {
    const languages = Array.from(analysisResults.keys());
    
    const prompt = `Create side-by-side comparison examples showing the same functionality implemented in different languages.

Languages: ${languages.join(', ')}

Create comparisons for:
1. Basic SDK usage - same operation in each language
2. Advanced features - leveraging language strengths
3. Error handling patterns
4. Async/concurrent programming approaches
5. Testing and debugging techniques

For each comparison:
- Show identical functionality across languages
- Highlight language-specific advantages
- Explain performance differences
- Note ease-of-use considerations
- Provide migration guidance

Help developers understand when to choose which language and how to migrate between them.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are creating language comparison examples to help developers choose the right language and understand differences.'
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
        type: 'example',
        title: 'Language Comparison Examples',
        content: this.enhanceWithExecutableMarkers(content),
        languages,
        complexity: 3,
        outputPath: 'examples/language-comparisons',
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: Array.from(analysisResults.values()).flat().map(r => r.filePath)
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate language comparison example:', error);
      return this.generateFallbackComparisonExample(languages);
    }
  }

  private enhanceWithExecutableMarkers(content: string): string {
    if (!this.config.output.liveExamples) {
      return content;
    }
    
    // Add executable markers to code blocks
    const codeBlockRegex = /```(\w+)\n([^`]+)```/g;
    return content.replace(codeBlockRegex, (match, lang, code) => {
      // Add markers for executable code
      const isExecutable = this.isExecutableCode(code, lang);
      if (isExecutable) {
        return `${match}\n\n<!-- EXECUTABLE:${lang}:${Buffer.from(code).toString('base64')} -->`;
      }
      return match;
    });
  }

  private isExecutableCode(code: string, language: string): boolean {
    // Simple heuristics to determine if code is executable
    const executablePatterns: Record<string, RegExp[]> = {
      typescript: [/import.*from/, /export.*{/, /async function/, /new.*SDK/],
      python: [/import /, /from .* import/, /async def/, /def /],
      rust: [/use /, /fn /, /async fn/, /let /],
      go: [/package /, /import/, /func /, /go /],
      java: [/public class/, /public static/, /import /]
    };
    
    const patterns = executablePatterns[language] || [];
    return patterns.some(pattern => pattern.test(code));
  }

  private generateFallbackBasicExample(scenario: string, languages: string[]): GeneratedDocument {
    let content = `# Example: ${scenario}\n\n`;
    content += `This example demonstrates ${scenario} using the HyperSim SDK.\n\n`;
    
    for (const lang of languages) {
      content += `## ${lang.charAt(0).toUpperCase() + lang.slice(1)}\n\n`;
      content += `\`\`\`${lang}\n// ${scenario} example\n// TODO: Add implementation\n\`\`\`\n\n`;
    }
    
    return {
      type: 'example',
      title: `Example: ${scenario}`,
      content,
      languages,
      complexity: 2,
      outputPath: `examples/basic/${scenario.toLowerCase().replace(/\s+/g, '-')}`,
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }

  private generateFallbackUseCaseExample(useCase: string, languages: string[]): GeneratedDocument {
    let content = `# Use Case: ${useCase}\n\n`;
    content += `This example shows how to build a ${useCase} using the HyperSim SDK.\n\n`;
    
    return {
      type: 'example',
      title: `Use Case: ${useCase}`,
      content,
      languages,
      complexity: 4,
      outputPath: `examples/use-cases/${useCase.toLowerCase().replace(/\s+/g, '-')}`,
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }

  private generateFallbackIntegrationExample(integration: string, languages: string[]): GeneratedDocument {
    let content = `# Integration: ${integration}\n\n`;
    content += `This example shows how to integrate ${integration} with the HyperSim SDK.\n\n`;
    
    return {
      type: 'example',
      title: `Integration: ${integration}`,
      content,
      languages,
      complexity: 3,
      outputPath: `examples/integrations/${integration.toLowerCase().replace(/\s+/g, '-')}`,
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }

  private generateFallbackComparisonExample(languages: string[]): GeneratedDocument {
    let content = '# Language Comparison Examples\n\n';
    content += `This document compares HyperSim SDK usage across ${languages.join(', ')}.\n\n`;
    
    return {
      type: 'example',
      title: 'Language Comparison Examples',
      content,
      languages,
      complexity: 3,
      outputPath: 'examples/language-comparisons',
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }
}