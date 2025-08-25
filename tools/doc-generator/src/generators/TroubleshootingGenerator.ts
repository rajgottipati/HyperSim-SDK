import { OpenAI } from 'openai';
import { 
  DocGeneratorConfig, 
  AnalysisResult, 
  GeneratedDocument
} from '../types';
import { Logger } from '../utils/Logger';

/**
 * Generates troubleshooting guides based on common patterns and issues
 */
export class TroubleshootingGenerator {
  constructor(
    private openai: OpenAI,
    private config: DocGeneratorConfig,
    private logger: Logger
  ) {}

  async generate(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument[]> {
    const documents: GeneratedDocument[] = [];
    
    // Generate common issues guide
    const commonIssues = await this.generateCommonIssuesGuide(analysisResults);
    documents.push(commonIssues);
    
    // Generate error code reference
    const errorReference = await this.generateErrorCodeReference(analysisResults);
    documents.push(errorReference);
    
    // Generate debugging guide
    const debuggingGuide = await this.generateDebuggingGuide(analysisResults);
    documents.push(debuggingGuide);
    
    // Generate performance troubleshooting
    const performanceGuide = await this.generatePerformanceTroubleshootingGuide(analysisResults);
    documents.push(performanceGuide);
    
    // Generate language-specific troubleshooting
    for (const [language, results] of analysisResults) {
      if (!this.config.languages[language]?.enabled) continue;
      
      const langGuide = await this.generateLanguageTroubleshootingGuide(language, results);
      documents.push(langGuide);
    }
    
    return documents;
  }

  private async generateCommonIssuesGuide(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument> {
    const languages = Array.from(analysisResults.keys());
    const allElements = Array.from(analysisResults.values()).flat().flatMap(r => r.elements);
    
    const prompt = `Generate a comprehensive troubleshooting guide for common issues with the HyperSim SDK.

Supported Languages: ${languages.join(', ')}
Total API Elements: ${allElements.length}

Create a guide covering:

1. **Installation Issues**
   - Package installation failures
   - Dependency conflicts
   - Version compatibility problems
   - Environment setup issues

2. **Configuration Problems**
   - Invalid API keys
   - Network configuration errors
   - Endpoint connectivity issues
   - Authentication failures

3. **Runtime Errors**
   - Connection timeouts
   - Rate limiting issues
   - Invalid transaction formats
   - Simulation failures

4. **Integration Issues**
   - Framework compatibility
   - Import/export problems
   - Type definition conflicts
   - Build system integration

For each issue, provide:
- Clear problem description
- Symptoms to identify the issue
- Step-by-step solution
- Prevention strategies
- Code examples where applicable
- Links to relevant documentation

Make it practical and searchable for developers in crisis mode.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are creating troubleshooting documentation for developers facing urgent issues. Be clear, direct, and solution-focused.'
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
        type: 'troubleshooting',
        title: 'Common Issues and Solutions',
        content,
        languages,
        complexity: 2,
        outputPath: 'troubleshooting/common-issues',
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: Array.from(analysisResults.values()).flat().map(r => r.filePath)
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate common issues guide:', error);
      return this.generateFallbackCommonIssues(languages);
    }
  }

  private async generateErrorCodeReference(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument> {
    const languages = Array.from(analysisResults.keys());
    const errorElements = Array.from(analysisResults.values())
      .flat()
      .flatMap(r => r.elements)
      .filter(el => el.type === 'class' && (el.name.includes('Error') || el.name.includes('Exception')));
    
    const prompt = `Generate a comprehensive error code reference for the HyperSim SDK.

Languages: ${languages.join(', ')}
Error Types Found: ${errorElements.map(el => el.name).join(', ')}

Create a reference that includes:

1. **Error Code Categories**
   - Network errors (connection, timeout, etc.)
   - Validation errors (invalid input, format issues)
   - Authentication errors (API key, permissions)
   - Simulation errors (execution failures, gas issues)
   - AI analysis errors (service unavailable, quota exceeded)
   - Configuration errors (missing settings, invalid values)

2. **For Each Error:**
   - Error code/name
   - Description of when it occurs
   - Common causes
   - Immediate fixes
   - Prevention strategies
   - Related errors
   - Code examples showing the error and fix

3. **Error Handling Patterns**
   - Best practices for error handling
   - Retry strategies
   - Graceful degradation
   - Logging and monitoring

4. **Debugging Tips**
   - How to get more detailed error information
   - Debug mode settings
   - Log analysis
   - Common debugging workflows

Make it comprehensive and well-organized for quick reference during development.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are creating a technical reference for error codes. Be systematic, comprehensive, and include actionable solutions.'
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
        type: 'troubleshooting',
        title: 'Error Code Reference',
        content,
        languages,
        complexity: 3,
        outputPath: 'troubleshooting/error-codes',
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: errorElements.map(el => el.location.file)
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate error code reference:', error);
      return this.generateFallbackErrorReference(languages);
    }
  }

  private async generateDebuggingGuide(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument> {
    const languages = Array.from(analysisResults.keys());
    
    const prompt = `Create a comprehensive debugging guide for the HyperSim SDK.

Languages: ${languages.join(', ')}

Cover these debugging scenarios:

1. **Transaction Simulation Issues**
   - Simulation returns unexpected results
   - Gas estimation problems
   - State changes not as expected
   - Cross-layer data inconsistencies

2. **Network and Connectivity**
   - RPC endpoint issues
   - WebSocket connection problems
   - Timeout and retry scenarios
   - Rate limiting and quotas

3. **AI Analysis Problems**
   - AI service unavailable
   - Unexpected analysis results
   - Performance degradation
   - Cost optimization issues

4. **Performance Debugging**
   - Slow response times
   - Memory usage issues
   - Concurrent request handling
   - Resource leak detection

5. **Integration Debugging**
   - Framework compatibility issues
   - Version conflicts
   - Build and deployment problems
   - Testing challenges

For each scenario, provide:
- Systematic debugging approach
- Tools and techniques
- Code examples for debugging
- Common solutions
- Prevention strategies
- Performance profiling tips

Include language-specific debugging tools and techniques.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are creating a debugging guide for developers. Focus on systematic approaches, practical tools, and real-world scenarios.'
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
        type: 'troubleshooting',
        title: 'Debugging Guide',
        content,
        languages,
        complexity: 4,
        outputPath: 'troubleshooting/debugging-guide',
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: Array.from(analysisResults.values()).flat().map(r => r.filePath)
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate debugging guide:', error);
      return this.generateFallbackDebuggingGuide(languages);
    }
  }

  private async generatePerformanceTroubleshootingGuide(analysisResults: Map<string, AnalysisResult[]>): Promise<GeneratedDocument> {
    const languages = Array.from(analysisResults.keys());
    
    const prompt = `Create a performance troubleshooting guide for the HyperSim SDK.

Languages: ${languages.join(', ')}

Cover these performance areas:

1. **Response Time Issues**
   - Slow simulation responses
   - Network latency problems
   - AI analysis delays
   - Batch processing inefficiencies

2. **Memory and Resource Usage**
   - Memory leaks
   - High memory consumption
   - Resource cleanup issues
   - Connection pool problems

3. **Concurrency and Scaling**
   - Thread safety issues
   - Race conditions
   - Deadlocks and blocking
   - Load balancing problems

4. **Optimization Strategies**
   - Caching strategies
   - Request batching
   - Connection reuse
   - Data structure optimization

5. **Monitoring and Profiling**
   - Performance metrics
   - Monitoring setup
   - Profiling tools
   - Alerting strategies

For each area, provide:
- Common performance issues
- Diagnostic techniques
- Optimization solutions
- Monitoring approaches
- Code examples
- Benchmarking strategies

Include language-specific performance considerations and tools.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are creating a performance troubleshooting guide. Focus on practical optimization techniques and systematic performance analysis.'
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
        type: 'troubleshooting',
        title: 'Performance Troubleshooting Guide',
        content,
        languages,
        complexity: 4,
        outputPath: 'troubleshooting/performance-guide',
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: Array.from(analysisResults.values()).flat().map(r => r.filePath)
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate performance troubleshooting guide:', error);
      return this.generateFallbackPerformanceGuide(languages);
    }
  }

  private async generateLanguageTroubleshootingGuide(language: string, results: AnalysisResult[]): Promise<GeneratedDocument> {
    const elements = results.flatMap(r => r.elements);
    
    const prompt = `Create a ${language}-specific troubleshooting guide for the HyperSim SDK.

Language: ${language}
API Elements: ${elements.length}

Cover ${language}-specific issues:

1. **Language-Specific Installation**
   - Package manager issues
   - Dependency resolution
   - Version compatibility
   - Build system integration

2. **Runtime Environment**
   - Runtime version issues
   - Environment configuration
   - Path and module resolution
   - Memory management

3. **Framework Integration**
   - Popular ${language} framework issues
   - Async/await patterns
   - Error handling idioms
   - Testing framework integration

4. **Development Tools**
   - IDE/editor integration
   - Debugging tools
   - Linting and formatting
   - Build and deployment

5. **Common ${language} Patterns**
   - Idiomatic usage issues
   - Type system integration
   - Concurrency patterns
   - Error handling best practices

Focus on issues specific to ${language} developers and the ecosystem.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are creating ${language}-specific troubleshooting documentation. Focus on language ecosystem issues and idiomatic solutions.`
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
      
      return {
        type: 'troubleshooting',
        title: `${language.charAt(0).toUpperCase() + language.slice(1)} Troubleshooting Guide`,
        content,
        languages: [language],
        complexity: 3,
        outputPath: `troubleshooting/languages/${language}`,
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0.0',
          sources: results.map(r => r.filePath)
        }
      };
    } catch (error) {
      this.logger.error(`Failed to generate ${language} troubleshooting guide:`, error);
      return this.generateFallbackLanguageGuide(language);
    }
  }

  // Fallback methods
  private generateFallbackCommonIssues(languages: string[]): GeneratedDocument {
    let content = '# Common Issues and Solutions\n\n';
    content += 'This guide covers the most common issues developers encounter with the HyperSim SDK.\n\n';
    content += '## Installation Issues\n\n- Package not found\n- Version conflicts\n- Build failures\n\n';
    content += '## Runtime Issues\n\n- Connection errors\n- Authentication failures\n- Simulation errors\n\n';
    
    return {
      type: 'troubleshooting',
      title: 'Common Issues and Solutions',
      content,
      languages,
      complexity: 2,
      outputPath: 'troubleshooting/common-issues',
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }

  private generateFallbackErrorReference(languages: string[]): GeneratedDocument {
    let content = '# Error Code Reference\n\n';
    content += 'Reference guide for HyperSim SDK error codes and their solutions.\n\n';
    content += '## Error Categories\n\n- Network Errors\n- Validation Errors\n- Authentication Errors\n- Simulation Errors\n\n';
    
    return {
      type: 'troubleshooting',
      title: 'Error Code Reference',
      content,
      languages,
      complexity: 3,
      outputPath: 'troubleshooting/error-codes',
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }

  private generateFallbackDebuggingGuide(languages: string[]): GeneratedDocument {
    let content = '# Debugging Guide\n\n';
    content += 'Comprehensive debugging guide for the HyperSim SDK.\n\n';
    content += '## Debugging Strategies\n\n- Enable debug mode\n- Check network connectivity\n- Validate configuration\n- Review error logs\n\n';
    
    return {
      type: 'troubleshooting',
      title: 'Debugging Guide',
      content,
      languages,
      complexity: 4,
      outputPath: 'troubleshooting/debugging-guide',
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }

  private generateFallbackPerformanceGuide(languages: string[]): GeneratedDocument {
    let content = '# Performance Troubleshooting Guide\n\n';
    content += 'Guide to identifying and resolving performance issues.\n\n';
    content += '## Common Performance Issues\n\n- Slow response times\n- High memory usage\n- Connection bottlenecks\n- Inefficient algorithms\n\n';
    
    return {
      type: 'troubleshooting',
      title: 'Performance Troubleshooting Guide',
      content,
      languages,
      complexity: 4,
      outputPath: 'troubleshooting/performance-guide',
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }

  private generateFallbackLanguageGuide(language: string): GeneratedDocument {
    let content = `# ${language.charAt(0).toUpperCase() + language.slice(1)} Troubleshooting Guide\n\n`;
    content += `Troubleshooting guide specific to ${language} developers.\n\n`;
    content += `## ${language.charAt(0).toUpperCase() + language.slice(1)}-Specific Issues\n\n- Environment setup\n- Package management\n- Framework integration\n- Development tools\n\n`;
    
    return {
      type: 'troubleshooting',
      title: `${language.charAt(0).toUpperCase() + language.slice(1)} Troubleshooting Guide`,
      content,
      languages: [language],
      complexity: 3,
      outputPath: `troubleshooting/languages/${language}`,
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        sources: []
      }
    };
  }
}