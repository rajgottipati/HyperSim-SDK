import { OpenAI } from 'openai';
import { 
  DocGeneratorConfig, 
  AnalysisResult, 
  GeneratedDocument,
  TutorialSection
} from '../types';
import { Logger } from '../utils/Logger';

/**
 * Generates progressive tutorials showing increasing complexity
 */
export class TutorialGenerator {
  constructor(
    private openai: OpenAI,
    private config: DocGeneratorConfig,
    private logger: Logger
  ) {}

  async generate(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument[]> {
    const documents: GeneratedDocument[] = [];
    
    // Generate getting started tutorial
    const gettingStarted = await this.generateGettingStartedTutorial(analysisResults);
    documents.push(gettingStarted);
    
    // Generate progressive complexity tutorials
    const complexityLevels = [1, 2, 3, 4, 5];
    for (const level of complexityLevels) {
      if (level > this.config.generation.maxComplexity) break;
      
      const tutorial = await this.generateComplexityTutorial(analysisResults, level);
      documents.push(tutorial);
    }
    
    // Generate language-specific tutorials
    for (const [language, results] of analysisResults) {
      if (!this.config.languages[language]?.enabled) continue;
      
      const langTutorial = await this.generateLanguageSpecificTutorial(language, results);
      documents.push(langTutorial);
    }
    
    return documents;
  }

  private async generateGettingStartedTutorial(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument> {
    const languages = Array.from(analysisResults.keys());
    
    const prompt = `Create a comprehensive "Getting Started" tutorial for the HyperSim SDK that works across all supported languages.

Available Languages: ${languages.join(', ')}

The tutorial should include:
1. What is HyperSim SDK and why use it
2. Installation instructions for each language
3. Basic configuration and setup
4. Your first transaction simulation
5. Understanding the results
6. Next steps and where to go from here

Make it beginner-friendly but comprehensive. Include working code examples for each language.
Focus on the core value proposition: HyperEVM transaction simulation with AI analysis.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are creating beginner-friendly tutorials for a blockchain SDK. Make complex concepts accessible while maintaining technical accuracy.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.openai.temperature || 0.2,
        max_tokens: this.config.openai.maxTokens || 4000
      });

      const content = response.choices[0]?.message?.content || '';
      
      return {
        type: 'tutorial',
        title: 'Getting Started with HyperSim SDK',
        content,
        languages,
        complexity: 1,
        outputPath: 'tutorials/getting-started',
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: Array.from(analysisResults.values()).flat().map(r => r.filePath)
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate getting started tutorial:', error);
      return this.generateFallbackGettingStarted(languages);
    }
  }

  private async generateComplexityTutorial(analysisResults: Map<string, AnalysisResult[]>, level: number): Promise<GeneratedDocument> {
    const complexityTopics = {
      1: 'Basic Transaction Simulation',
      2: 'AI-Powered Analysis',
      3: 'Cross-Layer Integration',
      4: 'Advanced Streaming and Real-time Data',
      5: 'Plugin System and Custom Extensions'
    };
    
    const topic = complexityTopics[level as keyof typeof complexityTopics];
    const languages = Array.from(analysisResults.keys());
    
    // Get elements matching this complexity level
    const relevantElements = Array.from(analysisResults.values())
      .flat()
      .flatMap(r => r.elements)
      .filter(el => el.complexity === level);
    
    const prompt = `Create an advanced tutorial on "${topic}" for the HyperSim SDK.

Complexity Level: ${level}/5
Target Audience: ${this.getAudienceForLevel(level)}
Languages: ${languages.join(', ')}

Relevant API Elements:
${relevantElements.map(el => `- ${el.type}: ${el.name} - ${el.description || 'No description'}`).join('\n')}

The tutorial should:
1. Build upon previous knowledge
2. Explain advanced concepts clearly
3. Provide real-world use cases
4. Include comprehensive code examples
5. Show best practices and common pitfalls
6. Demonstrate integration patterns

Make it practical and actionable with working examples.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are creating advanced tutorials for experienced developers. Focus on practical implementation and real-world scenarios.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.openai.temperature || 0.2,
        max_tokens: this.config.openai.maxTokens || 4000
      });

      const content = response.choices[0]?.message?.content || '';
      
      return {
        type: 'tutorial',
        title: `${topic} Tutorial`,
        content,
        languages,
        complexity: level,
        outputPath: `tutorials/level-${level}-${topic.toLowerCase().replace(/\s+/g, '-')}`,
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: relevantElements.map(el => el.location.file)
        }
      };
    } catch (error) {
      this.logger.error(`Failed to generate complexity ${level} tutorial:`, error);
      return this.generateFallbackComplexityTutorial(topic, level, languages);
    }
  }

  private async generateLanguageSpecificTutorial(language: string, results: AnalysisResult[]): Promise<GeneratedDocument> {
    const elements = results.flatMap(r => r.elements);
    const languageFeatures = this.getLanguageSpecificFeatures(language);
    
    const prompt = `Create a comprehensive ${language}-specific tutorial for the HyperSim SDK.

Language: ${language}
Language-specific features to highlight: ${languageFeatures.join(', ')}

API Elements:
${elements.slice(0, 10).map(el => `- ${el.type}: ${el.name} - ${el.description || 'No description'}`).join('\n')}

The tutorial should:
1. Leverage ${language}'s unique strengths
2. Show idiomatic ${language} patterns
3. Demonstrate language-specific optimizations
4. Cover error handling patterns in ${language}
5. Show integration with popular ${language} frameworks
6. Include performance considerations
7. Provide debugging and testing strategies

Make it comprehensive but focused on ${language} developers.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are creating language-specific tutorials for ${language} developers. Focus on idiomatic patterns and language strengths.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.openai.temperature || 0.2,
        max_tokens: this.config.openai.maxTokens || 4000
      });

      const content = response.choices[0]?.message?.content || '';
      
      return {
        type: 'tutorial',
        title: `${language.charAt(0).toUpperCase() + language.slice(1)} Developer Guide`,
        content,
        languages: [language],
        complexity: 3,
        outputPath: `tutorials/language-guides/${language}`,
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: results.map(r => r.filePath)
        }
      };
    } catch (error) {
      this.logger.error(`Failed to generate ${language} tutorial:`, error);
      return this.generateFallbackLanguageTutorial(language);
    }
  }

  private getAudienceForLevel(level: number): string {
    const audiences = {
      1: 'Beginners new to blockchain simulation',
      2: 'Developers familiar with basic concepts',
      3: 'Intermediate developers seeking advanced features',
      4: 'Advanced developers building complex applications',
      5: 'Expert developers extending the SDK'
    };
    return audiences[level as keyof typeof audiences] || 'General developers';
  }

  private getLanguageSpecificFeatures(language: string): string[] {
    const features: Record<string, string[]> = {
      typescript: ['Type Safety', 'Async/Await', 'Decorators', 'Generics', 'Union Types'],
      python: ['Async/Await', 'Context Managers', 'Decorators', 'Type Hints', 'List Comprehensions'],
      rust: ['Memory Safety', 'Zero-cost Abstractions', 'Pattern Matching', 'Ownership', 'Async/Await'],
      go: ['Goroutines', 'Channels', 'Interfaces', 'Error Handling', 'Context'],
      java: ['Streams', 'Optional', 'Annotations', 'Generics', 'CompletableFuture']
    };
    return features[language] || ['Standard Features'];
  }

  private generateFallbackGettingStarted(languages: string[]): GeneratedDocument {
    let content = '# Getting Started with HyperSim SDK\n\n';
    content += 'Welcome to the HyperSim SDK - the first SDK for HyperEVM transaction simulation.\n\n';
    content += `## Supported Languages\n\n${languages.map(lang => `- ${lang}`).join('\n')}\n\n`;
    content += '## Quick Start\n\n1. Install the SDK\n2. Configure your environment\n3. Run your first simulation\n\n';
    
    return {
      type: 'tutorial',
      title: 'Getting Started with HyperSim SDK',
      content,
      languages,
      complexity: 1,
      outputPath: 'tutorials/getting-started',
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }

  private generateFallbackComplexityTutorial(topic: string, level: number, languages: string[]): GeneratedDocument {
    let content = `# ${topic} Tutorial\n\n`;
    content += `This is a level ${level} tutorial on ${topic}.\n\n`;
    content += `## Prerequisites\n\nBefore starting this tutorial, ensure you understand the basics of the HyperSim SDK.\n\n`;
    
    return {
      type: 'tutorial',
      title: `${topic} Tutorial`,
      content,
      languages,
      complexity: level,
      outputPath: `tutorials/level-${level}-${topic.toLowerCase().replace(/\s+/g, '-')}`,
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }

  private generateFallbackLanguageTutorial(language: string): GeneratedDocument {
    let content = `# ${language.charAt(0).toUpperCase() + language.slice(1)} Developer Guide\n\n`;
    content += `This guide shows how to use the HyperSim SDK effectively in ${language}.\n\n`;
    
    return {
      type: 'tutorial',
      title: `${language.charAt(0).toUpperCase() + language.slice(1)} Developer Guide`,
      content,
      languages: [language],
      complexity: 3,
      outputPath: `tutorials/language-guides/${language}`,
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }
}