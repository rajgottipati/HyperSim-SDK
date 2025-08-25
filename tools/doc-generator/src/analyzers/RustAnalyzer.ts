import fs from 'fs-extra';
import { OpenAI } from 'openai';

import { CodeAnalyzer } from './CodeAnalyzer';
import { AnalysisResult } from '../types';
import { Logger } from '../utils/Logger';

/**
 * Rust code analyzer
 */
export class RustAnalyzer extends CodeAnalyzer {
  constructor(openai: OpenAI, logger: Logger) {
    super(openai, logger);
  }

  getLanguage(): string {
    return 'rust';
  }

  getSupportedExtensions(): string[] {
    return ['.rs'];
  }

  async analyze(filePath: string): Promise<AnalysisResult> {
    try {
      const sourceCode = await fs.readFile(filePath, 'utf-8');
      
      const basicInfo = this.extractBasicInfo(filePath, sourceCode);
      const aiAnalysis = await this.analyzeWithAI(filePath, sourceCode, 'rust');
      
      return {
        ...aiAnalysis,
        dependencies: basicInfo.dependencies,
        complexity: this.calculateComplexity(
          sourceCode.split('\n').length,
          this.countComplexity(sourceCode),
          basicInfo.dependencies.length
        )
      };
    } catch (error) {
      this.logger.error(`Failed to analyze Rust file ${filePath}:`, error);
      return this.fallbackAnalysis(filePath, 'rust', '');
    }
  }

  protected buildAnalysisPrompt(language: string, sourceCode: string): string {
    return super.buildAnalysisPrompt(language, sourceCode) + `

For Rust code, pay special attention to:
- Struct and impl block definitions
- Function signatures with lifetime parameters
- Trait definitions and implementations
- Enum definitions with variants
- Macro definitions and usage
- Error handling with Result<T, E>
- Async functions and futures
- Unsafe blocks and their purpose
- Memory management patterns`;
  }

  private extractBasicInfo(filePath: string, sourceCode: string) {
    const dependencies: string[] = [];
    
    // Extract use statements
    const useRegex = /^use\s+([^;]+);/gm;
    let match;
    while ((match = useRegex.exec(sourceCode)) !== null) {
      const usePath = match[1].trim();
      if (!usePath.startsWith('crate::') && !usePath.startsWith('self::') && !usePath.startsWith('super::')) {
        const rootModule = usePath.split('::')[0];
        dependencies.push(rootModule);
      }
    }
    
    // Extract extern crate statements
    const externRegex = /^extern\s+crate\s+([^;]+);/gm;
    while ((match = externRegex.exec(sourceCode)) !== null) {
      dependencies.push(match[1].trim());
    }
    
    return {
      dependencies: [...new Set(dependencies)]
    };
  }

  private countComplexity(sourceCode: string): number {
    const patterns = [
      /\bif\b/g,
      /\bmatch\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bloop\b/g,
      /\bunsafe\b/g,
      /\basync\b/g
    ];
    
    return patterns.reduce((count, pattern) => {
      return count + (sourceCode.match(pattern) || []).length;
    }, 0);
  }
}