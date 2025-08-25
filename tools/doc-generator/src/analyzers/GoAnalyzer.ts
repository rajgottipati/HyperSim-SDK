import fs from 'fs-extra';
import { OpenAI } from 'openai';

import { CodeAnalyzer } from './CodeAnalyzer';
import { AnalysisResult } from '../types';
import { Logger } from '../utils/Logger';

/**
 * Go code analyzer
 */
export class GoAnalyzer extends CodeAnalyzer {
  constructor(openai: OpenAI, logger: Logger) {
    super(openai, logger);
  }

  getLanguage(): string {
    return 'go';
  }

  getSupportedExtensions(): string[] {
    return ['.go'];
  }

  async analyze(filePath: string): Promise<AnalysisResult> {
    try {
      const sourceCode = await fs.readFile(filePath, 'utf-8');
      
      const basicInfo = this.extractBasicInfo(filePath, sourceCode);
      const aiAnalysis = await this.analyzeWithAI(filePath, sourceCode, 'go');
      
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
      this.logger.error(`Failed to analyze Go file ${filePath}:`, error);
      return this.fallbackAnalysis(filePath, 'go', '');
    }
  }

  protected buildAnalysisPrompt(language: string, sourceCode: string): string {
    return super.buildAnalysisPrompt(language, sourceCode) + `

For Go code, pay special attention to:
- Function and method definitions
- Struct definitions and embedded types
- Interface definitions
- Type definitions
- Package-level variables and constants
- Goroutine and channel usage
- Error handling patterns
- Context usage for cancellation
- HTTP handlers and middleware`;
  }

  private extractBasicInfo(filePath: string, sourceCode: string) {
    const dependencies: string[] = [];
    
    // Extract imports
    const importRegex = /import\s+(?:\(([^)]+)\)|"([^"]+)")/g;
    let match;
    while ((match = importRegex.exec(sourceCode)) !== null) {
      if (match[1]) {
        // Multi-line imports
        const imports = match[1].split('\n')
          .map(line => line.trim().replace(/"/g, ''))
          .filter(line => line && !line.startsWith('//'))
          .map(line => line.split(' ').pop() || '')
          .filter(imp => imp && !imp.startsWith('.'));
        dependencies.push(...imports);
      } else if (match[2]) {
        // Single import
        dependencies.push(match[2]);
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
      /\bswitch\b/g,
      /\bselect\b/g,
      /\bgo\s+/g,
      /\bdefer\b/g
    ];
    
    return patterns.reduce((count, pattern) => {
      return count + (sourceCode.match(pattern) || []).length;
    }, 0);
  }
}