import { OpenAI } from 'openai';
import { AnalysisResult } from '../types';
import { Logger } from '../utils/Logger';

/**
 * Base class for language-specific code analyzers
 */
export abstract class CodeAnalyzer {
  protected openai: OpenAI;
  protected logger: Logger;

  constructor(openai: OpenAI, logger: Logger) {
    this.openai = openai;
    this.logger = logger;
  }

  /**
   * Analyze a source file and extract documentation-relevant information
   */
  abstract analyze(filePath: string): Promise<AnalysisResult>;

  /**
   * Get the language name this analyzer handles
   */
  abstract getLanguage(): string;

  /**
   * Get supported file extensions for this language
   */
  abstract getSupportedExtensions(): string[];

  /**
   * Extract code elements using AI-powered analysis
   */
  protected async analyzeWithAI(
    filePath: string,
    sourceCode: string,
    language: string
  ): Promise<AnalysisResult> {
    const prompt = this.buildAnalysisPrompt(language, sourceCode);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert code analyst specializing in ${language}. Analyze the provided code and extract detailed information for documentation generation.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      });

      const analysisText = response.choices[0]?.message?.content;
      if (!analysisText) {
        throw new Error('No analysis response from AI');
      }

      return this.parseAIResponse(filePath, language, analysisText);
    } catch (error) {
      this.logger.error(`AI analysis failed for ${filePath}:`, error);
      return this.fallbackAnalysis(filePath, language, sourceCode);
    }
  }

  /**
   * Build the AI analysis prompt for the specific language
   */
  protected buildAnalysisPrompt(language: string, sourceCode: string): string {
    return `Analyze this ${language} code and provide a detailed JSON response with the following structure:

{
  "documentation": "Overall file documentation/description",
  "complexity": 1-5, // Complexity score
  "dependencies": ["list", "of", "imports"],
  "exports": [
    {
      "name": "exportName",
      "type": "function|class|interface|constant",
      "isDefault": true|false,
      "description": "What this export does"
    }
  ],
  "elements": [
    {
      "type": "class|function|interface|type|enum|constant|module",
      "name": "elementName",
      "description": "Detailed description of what this element does",
      "parameters": [
        {
          "name": "paramName",
          "type": "paramType",
          "description": "Parameter description",
          "required": true|false,
          "defaultValue": "defaultVal or null"
        }
      ],
      "returnType": {
        "name": "returnTypeName",
        "description": "What the return value represents"
      },
      "examples": ["Example usage code snippets"],
      "related": ["relatedElement1", "relatedElement2"],
      "complexity": 1-5, // Element complexity score
      "location": {
        "line": 10, // Estimated line number
        "column": 0
      }
    }
  ]
}

Code to analyze:
\`\`\`${language}
${sourceCode}
\`\`\`

Focus on:
1. Public APIs and interfaces
2. Main classes and functions
3. Type definitions and interfaces
4. Configuration options
5. Error handling patterns
6. Usage patterns and best practices

Provide clear, comprehensive descriptions that would help developers understand and use the code.`;
  }

  /**
   * Parse AI response and convert to AnalysisResult
   */
  protected parseAIResponse(filePath: string, language: string, response: string): AnalysisResult {
    try {
      // Extract JSON from the response (it might be wrapped in markdown)
      const jsonMatch = response.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, response];
      const jsonText = jsonMatch[1] || response;
      
      const parsed = JSON.parse(jsonText);
      
      // Ensure all elements have proper location info
      const elements = (parsed.elements || []).map((element: any, index: number) => ({
        ...element,
        location: {
          file: filePath,
          line: element.location?.line || (index + 1) * 10, // Estimate if not provided
          column: element.location?.column || 0
        }
      }));
      
      return {
        filePath,
        language,
        elements,
        documentation: parsed.documentation || '',
        complexity: Math.max(1, Math.min(5, parsed.complexity || 3)), // Clamp between 1-5
        dependencies: parsed.dependencies || [],
        exports: parsed.exports || []
      };
    } catch (error) {
      this.logger.warn(`Failed to parse AI response for ${filePath}, using fallback`);
      return this.fallbackAnalysis(filePath, language, response);
    }
  }

  /**
   * Fallback analysis when AI analysis fails
   */
  protected fallbackAnalysis(filePath: string, language: string, sourceCode: string): AnalysisResult {
    return {
      filePath,
      language,
      elements: [],
      documentation: `${language} source file`,
      complexity: 3,
      dependencies: [],
      exports: []
    };
  }

  /**
   * Calculate complexity score based on various factors
   */
  protected calculateComplexity(
    linesOfCode: number,
    cyclomaticComplexity: number,
    dependencyCount: number
  ): number {
    // Simple complexity calculation
    let score = 1;
    
    if (linesOfCode > 500) score += 2;
    else if (linesOfCode > 200) score += 1;
    
    if (cyclomaticComplexity > 20) score += 2;
    else if (cyclomaticComplexity > 10) score += 1;
    
    if (dependencyCount > 10) score += 1;
    
    return Math.min(5, score);
  }

  /**
   * Extract imports/dependencies from source code
   */
  protected extractDependencies(sourceCode: string, language: string): string[] {
    const patterns: Record<string, RegExp[]> = {
      typescript: [
        /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g,
        /import\s+['"`]([^'"`]+)['"`]/g,
        /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
      ],
      python: [
        /import\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g,
        /from\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s+import/g
      ],
      rust: [
        /use\s+([^;]+);/g,
        /extern\s+crate\s+([^;]+);/g
      ],
      go: [
        /import\s+['"`]([^'"`]+)['"`]/g,
        /import\s+\(\s*\n([\s\S]*?)\n\s*\)/g
      ],
      java: [
        /import\s+([a-zA-Z_][a-zA-Z0-9_.]*);/g
      ]
    };

    const deps = new Set<string>();
    const langPatterns = patterns[language] || [];
    
    for (const pattern of langPatterns) {
      let match;
      while ((match = pattern.exec(sourceCode)) !== null) {
        const dep = match[1].trim();
        if (dep && !dep.startsWith('.') && !dep.startsWith('/')) {
          deps.add(dep);
        }
      }
    }
    
    return Array.from(deps);
  }

  /**
   * Estimate line number for a code element
   */
  protected estimateLineNumber(sourceCode: string, elementName: string): number {
    const lines = sourceCode.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(elementName)) {
        return i + 1;
      }
    }
    return 1;
  }
}
