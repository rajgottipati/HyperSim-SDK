import { OpenAI } from 'openai';
import { 
  DocGeneratorConfig, 
  AnalysisResult, 
  GeneratedDocument, 
  CodeElement 
} from '../types';
import { Logger } from '../utils/Logger';

/**
 * Generates comprehensive API reference documentation
 */
export class APIReferenceGenerator {
  constructor(
    private openai: OpenAI,
    private config: DocGeneratorConfig,
    private logger: Logger
  ) {}

  async generate(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument[]> {
    const documents: GeneratedDocument[] = [];
    
    // Generate language-specific API references
    for (const [language, results] of analysisResults) {
      if (!this.config.languages[language]?.enabled) continue;
      
      const languageDoc = await this.generateLanguageAPIReference(language, results);
      documents.push(languageDoc);
      
      // Generate module/class specific documentation
      const modulesDocs = await this.generateModuleReferences(language, results);
      documents.push(...modulesDocs);
    }
    
    // Generate unified API reference
    const unifiedDoc = await this.generateUnifiedAPIReference(analysisResults);
    documents.push(unifiedDoc);
    
    return documents;
  }

  private async generateLanguageAPIReference(language: string, results: AnalysisResult[]): Promise<GeneratedDocument> {
    const allElements = results.flatMap(r => r.elements);
    const publicElements = allElements.filter(el => this.isPublicAPI(el));
    
    const prompt = `Generate comprehensive API reference documentation for the HyperSim SDK ${language} implementation.

Language: ${language}
Total API Elements: ${publicElements.length}

Elements:
${publicElements.map(el => `- ${el.type}: ${el.name} - ${el.description || 'No description'}`).join('\\n')}

Create a structured API reference that includes:
1. Overview of the ${language} SDK
2. Installation and setup instructions
3. Core concepts and architecture
4. Detailed API documentation for each element
5. Usage examples for key components
6. Error handling patterns
7. Best practices specific to ${language}

Format as markdown with clear headings, code examples, and cross-references.
Focus on developer experience and practical usage.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a technical documentation expert creating API reference documentation for a blockchain SDK. Focus on clarity, completeness, and developer usability.`
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
        type: 'api-reference',
        title: `${language.charAt(0).toUpperCase() + language.slice(1)} API Reference`,
        content: this.enhanceWithLiveExamples(content, language, publicElements),
        languages: [language],
        complexity: 3,
        outputPath: `api-reference/${language}/index`,
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: results.map(r => r.filePath)
        }
      };
    } catch (error) {
      this.logger.error(`Failed to generate API reference for ${language}:`, error);
      return this.generateFallbackAPIReference(language, results);
    }
  }

  private async generateModuleReferences(language: string, results: AnalysisResult[]): Promise<GeneratedDocument[]> {
    const documents: GeneratedDocument[] = [];
    
    // Group by modules/files
    const modules = this.groupByModules(results);
    
    for (const [moduleName, moduleResults] of modules) {
      if (moduleResults.length === 0) continue;
      
      const moduleElements = moduleResults.flatMap(r => r.elements);
      const publicElements = moduleElements.filter(el => this.isPublicAPI(el));
      
      if (publicElements.length === 0) continue;
      
      const prompt = `Generate detailed module documentation for: ${moduleName}

Language: ${language}
Module Elements:
${publicElements.map(el => 
  `${el.type}: ${el.name}
  Description: ${el.description || 'No description'}
  Complexity: ${el.complexity}
  Parameters: ${el.parameters?.map(p => `${p.name}: ${p.type}`).join(', ') || 'None'}`
).join('\\n\\n')}

Create comprehensive module documentation including:
1. Module overview and purpose
2. Key concepts and patterns
3. Detailed API for each element
4. Usage examples with real code
5. Integration patterns
6. Error handling
7. Performance considerations

Focus on practical usage and real-world scenarios.`;

      try {
        const response = await this.openai.chat.completions.create({
          model: this.config.openai.model || 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are creating detailed module documentation for developers. Provide clear, practical guidance with working code examples.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: this.config.openai.temperature || 0.1,
          max_tokens: this.config.openai.maxTokens || 3000
        });

        const content = response.choices[0]?.message?.content || '';
        
        documents.push({
          type: 'api-reference',
          title: `${moduleName} Module Reference`,
          content: this.enhanceWithLiveExamples(content, language, publicElements),
          languages: [language],
          complexity: Math.max(...publicElements.map(el => el.complexity)),
          outputPath: `api-reference/${language}/${moduleName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          metadata: {
            generated: new Date().toISOString(),
            version: '1.0.0',
            sources: moduleResults.map(r => r.filePath)
          }
        });
      } catch (error) {
        this.logger.error(`Failed to generate module reference for ${moduleName}:`, error);
      }
    }
    
    return documents;
  }

  private async generateUnifiedAPIReference(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument> {
    const allLanguages = Array.from(analysisResults.keys());
    const languageElements = new Map<string, CodeElement[]>();
    
    for (const [language, results] of analysisResults) {
      const elements = results.flatMap(r => r.elements).filter(el => this.isPublicAPI(el));
      languageElements.set(language, elements);
    }
    
    const prompt = `Generate a unified API reference that compares and contrasts the HyperSim SDK across all supported languages.

Supported Languages: ${allLanguages.join(', ')}

Create a comprehensive cross-language reference including:
1. SDK overview and unified concepts
2. Architecture comparison across languages
3. Core API mapping between languages
4. Language-specific differences and considerations
5. Migration guide between languages
6. Best practices for each language
7. Feature matrix showing what's available in each language

Focus on helping developers choose the right language and understand the consistent API design.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are creating a unified API reference for a multi-language SDK. Focus on consistency, clarity, and helping developers understand the unified design across languages.'
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
        type: 'api-reference',
        title: 'Unified API Reference',
        content,
        languages: allLanguages,
        complexity: 4,
        outputPath: 'api-reference/unified',
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: Array.from(analysisResults.values()).flat().map(r => r.filePath)
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate unified API reference:', error);
      return this.generateFallbackUnifiedReference(allLanguages);
    }
  }

  private enhanceWithLiveExamples(content: string, language: string, elements: CodeElement[]): string {
    if (!this.config.output.liveExamples) {
      return content;
    }
    
    // Add live example annotations
    let enhanced = content;
    
    // Find code blocks and add live example markers
    const codeBlockRegex = /```(\\w+)\\n([^`]+)```/g;
    enhanced = enhanced.replace(codeBlockRegex, (match, lang, code) => {
      if (lang === language || (language === 'typescript' && lang === 'javascript')) {
        return `${match}\n\n<!-- LIVE_EXAMPLE:${language}:${Buffer.from(code).toString('base64')} -->`;
      }
      return match;
    });
    
    return enhanced;
  }

  private isPublicAPI(element: CodeElement): boolean {
    // Simple heuristics to determine if an element is part of the public API
    if (element.name.startsWith('_') || element.name.startsWith('private')) {
      return false;
    }
    
    // Include classes, interfaces, and main functions
    return ['class', 'interface', 'function', 'type', 'enum'].includes(element.type);
  }

  private groupByModules(results: AnalysisResult[]): Map<string, AnalysisResult[]> {
    const modules = new Map<string, AnalysisResult[]>();
    
    for (const result of results) {
      const moduleName = this.extractModuleName(result.filePath);
      const existing = modules.get(moduleName) || [];
      existing.push(result);
      modules.set(moduleName, existing);
    }
    
    return modules;
  }

  private extractModuleName(filePath: string): string {
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];
    const nameWithoutExt = fileName.split('.')[0];
    
    // Use directory name for context
    if (parts.length > 1) {
      const dirName = parts[parts.length - 2];
      return `${dirName}/${nameWithoutExt}`;
    }
    
    return nameWithoutExt;
  }

  private generateFallbackAPIReference(language: string, results: AnalysisResult[]): GeneratedDocument {
    const elements = results.flatMap(r => r.elements);
    
    let content = `# ${language.charAt(0).toUpperCase() + language.slice(1)} API Reference\n\n`;
    content += `This is the API reference for the HyperSim SDK ${language} implementation.\n\n`;
    content += `## Elements\n\n`;
    
    for (const element of elements) {
      content += `### ${element.name}\n\n`;
      content += `**Type:** ${element.type}\n\n`;
      if (element.description) {
        content += `**Description:** ${element.description}\n\n`;
      }
      content += '---\n\n';
    }
    
    return {
      type: 'api-reference',
      title: `${language.charAt(0).toUpperCase() + language.slice(1)} API Reference`,
      content,
      languages: [language],
      complexity: 3,
      outputPath: `api-reference/${language}/index`,
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: results.map(r => r.filePath)
      }
    };
  }

  private generateFallbackUnifiedReference(languages: string[]): GeneratedDocument {
    let content = '# Unified API Reference\n\n';
    content += 'This is the unified API reference for the HyperSim SDK across all supported languages.\n\n';
    content += `## Supported Languages\n\n${languages.map(lang => `- ${lang}`).join('\\n')}\n\n`;
    
    return {
      type: 'api-reference',
      title: 'Unified API Reference',
      content,
      languages,
      complexity: 4,
      outputPath: 'api-reference/unified',
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }
}
