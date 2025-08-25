import fs from 'fs-extra';
import { OpenAI } from 'openai';

import { CodeAnalyzer } from './CodeAnalyzer';
import { AnalysisResult } from '../types';
import { Logger } from '../utils/Logger';

/**
 * Java code analyzer
 */
export class JavaAnalyzer extends CodeAnalyzer {
  constructor(openai: OpenAI, logger: Logger) {
    super(openai, logger);
  }

  getLanguage(): string {
    return 'java';
  }

  getSupportedExtensions(): string[] {
    return ['.java'];
  }

  async analyze(filePath: string): Promise<AnalysisResult> {
    try {
      const sourceCode = await fs.readFile(filePath, 'utf-8');
      
      const basicInfo = this.extractBasicInfo(filePath, sourceCode);
      const aiAnalysis = await this.analyzeWithAI(filePath, sourceCode, 'java');
      
      return {
        ...aiAnalysis,
        dependencies: basicInfo.dependencies,
        complexity: this.calculateComplexity(
          sourceCode.split('\n').length,
          this.countControlStructures(sourceCode),
          basicInfo.dependencies.length
        )
      };
    } catch (error) {
      this.logger.error(`Failed to analyze Java file ${filePath}:`, error);
      return this.fallbackAnalysis(filePath, 'java', '');
    }
  }

  protected buildAnalysisPrompt(language: string, sourceCode: string): string {
    return super.buildAnalysisPrompt(language, sourceCode) + `

For Java code, pay special attention to:
- Class and interface definitions
- Method signatures with access modifiers
- Annotation usage and definitions
- Generic type parameters
- Exception handling patterns
- Static methods and variables
- Inner and nested classes
- Lambda expressions and streams
- Builder patterns and factories`;
  }

  private extractBasicInfo(filePath: string, sourceCode: string) {
    const dependencies: string[] = [];
    
    // Extract imports
    const importRegex = /^import\s+(?:static\s+)?([\w.]+(?:\.\*)?);/gm;
    let match;
    while ((match = importRegex.exec(sourceCode)) !== null) {
      const importPath = match[1];
      if (!importPath.startsWith('java.lang.')) {
        dependencies.push(importPath);
      }
    }
    
    return {
      dependencies: [...new Set(dependencies)]
    };
  }

  private countControlStructures(sourceCode: string): number {
    const patterns = [
      /\bif\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bswitch\b/g,
      /\btry\b/g,
      /\bcatch\b/g,
      /\bsynchronized\b/g
    ];
    
    return patterns.reduce((count, pattern) => {
      return count + (sourceCode.match(pattern) || []).length;
    }, 0);
  }
}
