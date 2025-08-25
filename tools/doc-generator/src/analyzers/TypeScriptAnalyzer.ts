import fs from 'fs-extra';
import path from 'path';
import { OpenAI } from 'openai';

import { CodeAnalyzer } from './CodeAnalyzer';
import { AnalysisResult, CodeElement } from '../types';
import { Logger } from '../utils/Logger';

/**
 * TypeScript/JavaScript code analyzer using regex-based parsing
 * Simplified version for demonstration purposes
 */
export class TypeScriptAnalyzer extends CodeAnalyzer {
  constructor(openai: OpenAI, logger: Logger) {
    super(openai, logger);
  }

  getLanguage(): string {
    return 'typescript';
  }

  getSupportedExtensions(): string[] {
    return ['.ts', '.tsx', '.js', '.jsx'];
  }

  async analyze(filePath: string): Promise<AnalysisResult> {
    try {
      const sourceCode = await fs.readFile(filePath, 'utf-8');
      
      // Try static analysis first, then enhance with AI
      const staticAnalysis = await this.staticAnalysis(filePath, sourceCode);
      const aiAnalysis = await this.analyzeWithAI(filePath, sourceCode, 'typescript');
      
      // Merge static and AI analysis
      return this.mergeAnalysis(staticAnalysis, aiAnalysis);
    } catch (error) {
      this.logger.error(`Failed to analyze TypeScript file ${filePath}:`, error);
      return this.fallbackAnalysis(filePath, 'typescript', '');
    }
  }

  private async staticAnalysis(filePath: string, sourceCode: string): Promise<AnalysisResult> {
    const elements: CodeElement[] = [];
    const dependencies: string[] = this.extractDependencies(sourceCode, 'typescript');
    const exports: any[] = [];
    
    // Extract classes
    const classRegex = /export\s+(?:abstract\s+)?class\s+(\w+)[\s\S]*?{/g;
    let match;
    while ((match = classRegex.exec(sourceCode)) !== null) {
      elements.push({
        type: 'class',
        name: match[1],
        description: this.extractJSDocDescription(sourceCode, match.index),
        parameters: [],
        complexity: 3,
        location: {
          file: filePath,
          line: this.getLineNumber(sourceCode, match.index),
          column: 0
        },
        related: []
      });
      
      exports.push({
        name: match[1],
        type: 'class',
        isDefault: false,
        description: this.extractJSDocDescription(sourceCode, match.index)
      });
    }
    
    // Extract functions
    const functionRegex = /export\s+(?:async\s+)?function\s+(\w+)\s*\([^)]*\)/g;
    while ((match = functionRegex.exec(sourceCode)) !== null) {
      elements.push({
        type: 'function',
        name: match[1],
        description: this.extractJSDocDescription(sourceCode, match.index),
        parameters: this.parseParameters(match[0]),
        complexity: 2,
        location: {
          file: filePath,
          line: this.getLineNumber(sourceCode, match.index),
          column: 0
        },
        related: []
      });
      
      exports.push({
        name: match[1],
        type: 'function',
        isDefault: false,
        description: this.extractJSDocDescription(sourceCode, match.index)
      });
    }
    
    // Extract interfaces
    const interfaceRegex = /export\s+interface\s+(\w+)/g;
    while ((match = interfaceRegex.exec(sourceCode)) !== null) {
      elements.push({
        type: 'interface',
        name: match[1],
        description: this.extractJSDocDescription(sourceCode, match.index),
        parameters: [],
        complexity: 2,
        location: {
          file: filePath,
          line: this.getLineNumber(sourceCode, match.index),
          column: 0
        },
        related: []
      });
      
      exports.push({
        name: match[1],
        type: 'interface',
        isDefault: false,
        description: this.extractJSDocDescription(sourceCode, match.index)
      });
    }
    
    // Extract type aliases
    const typeRegex = /export\s+type\s+(\w+)/g;
    while ((match = typeRegex.exec(sourceCode)) !== null) {
      elements.push({
        type: 'type',
        name: match[1],
        description: this.extractJSDocDescription(sourceCode, match.index),
        parameters: [],
        complexity: 1,
        location: {
          file: filePath,
          line: this.getLineNumber(sourceCode, match.index),
          column: 0
        },
        related: []
      });
      
      exports.push({
        name: match[1],
        type: 'type',
        isDefault: false,
        description: this.extractJSDocDescription(sourceCode, match.index)
      });
    }
    
    // Calculate overall complexity
    const complexity = this.calculateComplexity(
      sourceCode.split('\n').length,
      elements.reduce((sum, el) => sum + el.complexity, 0),
      dependencies.length
    );

    return {
      filePath,
      language: 'typescript',
      elements,
      documentation: this.extractFileDocumentation(sourceCode),
      complexity,
      dependencies: [...new Set(dependencies)], // Remove duplicates
      exports
    };
  }

  private mergeAnalysis(staticAnalysis: AnalysisResult, aiAnalysis: AnalysisResult): AnalysisResult {
    // Use static analysis as base, enhance with AI descriptions
    const mergedElements = staticAnalysis.elements.map(staticEl => {
      const aiEl = aiAnalysis.elements.find(ai => ai.name === staticEl.name && ai.type === staticEl.type);
      if (aiEl) {
        return {
          ...staticEl,
          description: aiEl.description || staticEl.description,
          examples: aiEl.examples || [],
          related: aiEl.related || []
        };
      }
      return staticEl;
    });

    // Add any AI-only elements that weren't caught by static analysis
    const staticNames = new Set(staticAnalysis.elements.map(el => el.name));
    const aiOnlyElements = aiAnalysis.elements.filter(el => !staticNames.has(el.name));
    mergedElements.push(...aiOnlyElements);

    return {
      ...staticAnalysis,
      elements: mergedElements,
      documentation: aiAnalysis.documentation || staticAnalysis.documentation
    };
  }

  private extractJSDocDescription(sourceCode: string, position: number): string {
    const lines = sourceCode.substring(0, position).split('\n');
    let description = '';
    
    // Look backwards for JSDoc comment
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.includes('*/')) {
        // Found end of JSDoc, collect content
        for (let j = i - 1; j >= 0; j--) {
          const commentLine = lines[j].trim();
          if (commentLine.startsWith('/**')) {
            break;
          }
          if (commentLine.startsWith('*')) {
            const content = commentLine.substring(1).trim();
            if (content && !content.startsWith('@')) {
              description = content + ' ' + description;
            }
          }
        }
        break;
      } else if (!line.startsWith('*') && line !== '') {
        break;
      }
    }
    
    return description.trim();
  }

  private extractFileDocumentation(sourceCode: string): string {
    const lines = sourceCode.split('\n');
    let documentation = '';
    
    // Look for file-level comments at the beginning
    for (let i = 0; i < lines.length && i < 20; i++) {
      const line = lines[i].trim();
      if (line.startsWith('/**')) {
        // Collect JSDoc content
        for (let j = i + 1; j < lines.length; j++) {
          const commentLine = lines[j].trim();
          if (commentLine.includes('*/')) {
            break;
          }
          if (commentLine.startsWith('*')) {
            const content = commentLine.substring(1).trim();
            if (content && !content.startsWith('@')) {
              documentation += content + ' ';
            }
          }
        }
        break;
      } else if (line.startsWith('//')) {
        documentation += line.substring(2).trim() + ' ';
      } else if (line !== '' && !line.startsWith('import') && !line.startsWith('export')) {
        break;
      }
    }
    
    return documentation.trim() || path.basename(sourceCode);
  }

  private parseParameters(functionSignature: string): any[] {
    const paramMatch = functionSignature.match(/\(([^)]*)\)/);
    if (!paramMatch || !paramMatch[1].trim()) {
      return [];
    }
    
    const paramString = paramMatch[1];
    const params = paramString.split(',').map(p => p.trim()).filter(p => p.length > 0);
    
    return params.map(param => {
      const parts = param.split(':');
      const name = parts[0]?.trim() || 'unknown';
      const type = parts[1]?.trim() || 'any';
      const hasDefault = param.includes('=');
      
      return {
        name,
        type,
        description: '',
        required: !hasDefault,
        defaultValue: hasDefault ? 'unknown' : null
      };
    });
  }

  private getLineNumber(sourceCode: string, position: number): number {
    return sourceCode.substring(0, position).split('\n').length;
  }
}
