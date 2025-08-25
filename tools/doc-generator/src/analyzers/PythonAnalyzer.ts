import fs from 'fs-extra';
import { OpenAI } from 'openai';

import { CodeAnalyzer } from './CodeAnalyzer';
import { AnalysisResult } from '../types';
import { Logger } from '../utils/Logger';

/**
 * Python code analyzer
 */
export class PythonAnalyzer extends CodeAnalyzer {
  constructor(openai: OpenAI, logger: Logger) {
    super(openai, logger);
  }

  getLanguage(): string {
    return 'python';
  }

  getSupportedExtensions(): string[] {
    return ['.py'];
  }

  async analyze(filePath: string): Promise<AnalysisResult> {
    try {
      const sourceCode = await fs.readFile(filePath, 'utf-8');
      
      // Use AI analysis with basic static information
      const basicInfo = this.extractBasicInfo(filePath, sourceCode);
      const aiAnalysis = await this.analyzeWithAI(filePath, sourceCode, 'python');
      
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
      this.logger.error(`Failed to analyze Python file ${filePath}:`, error);
      return this.fallbackAnalysis(filePath, 'python', '');
    }
  }

  protected buildAnalysisPrompt(language: string, sourceCode: string): string {
    return super.buildAnalysisPrompt(language, sourceCode) + `

For Python code, pay special attention to:
- Class definitions and methods
- Function definitions with docstrings
- Type hints and annotations
- Async/await patterns
- Decorators and their usage
- Exception handling patterns
- Import statements and dependencies`;
  }

  private extractBasicInfo(filePath: string, sourceCode: string) {
    const dependencies: string[] = [];
    
    // Extract imports
    const importRegex = /^(?:from\s+([\w.]+)\s+)?import\s+([\w.,\s*]+)/gm;
    let match;
    while ((match = importRegex.exec(sourceCode)) !== null) {
      if (match[1]) {
        dependencies.push(match[1]);
      }
      const imports = match[2].split(',').map(imp => imp.trim().split(' as ')[0]);
      dependencies.push(...imports.filter(imp => !imp.startsWith('.')));
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
      /\btry\b/g,
      /\bexcept\b/g,
      /\bwith\b/g
    ];
    
    return patterns.reduce((count, pattern) => {
      return count + (sourceCode.match(pattern) || []).length;
    }, 0);
  }
}