/**
 * Configuration types for the AI-powered documentation generator
 */

export interface DocGeneratorConfig {
  /** OpenAI API configuration */
  openai: {
    apiKey: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  
  /** Source code paths to analyze */
  sources: {
    /** TypeScript/JavaScript source paths */
    typescript: string[];
    /** Python source paths */
    python: string[];
    /** Rust source paths */
    rust: string[];
    /** Go source paths */
    go: string[];
    /** Java source paths */
    java: string[];
  };
  
  /** Output configuration */
  output: {
    /** Base output directory */
    directory: string;
    /** Formats to generate */
    formats: ('markdown' | 'html' | 'json' | 'pdf')[];
    /** Enable live examples */
    liveExamples: boolean;
  };
  
  /** Documentation generation options */
  generation: {
    /** Generate API reference */
    apiReference: boolean;
    /** Generate tutorials */
    tutorials: boolean;
    /** Generate examples */
    examples: boolean;
    /** Generate troubleshooting guides */
    troubleshooting: boolean;
    /** Generate comparison tables */
    comparisons: boolean;
    /** Maximum complexity level for tutorials */
    maxComplexity: 1 | 2 | 3 | 4 | 5;
  };
  
  /** Language-specific settings */
  languages: {
    [key: string]: {
      enabled: boolean;
      priority: number;
      customInstructions?: string;
    };
  };
  
  /** Template configuration */
  templates: {
    /** Custom template directory */
    directory?: string;
    /** Template variables */
    variables?: Record<string, any>;
  };
  
  /** Debug and logging options */
  debug: boolean;
  verbose: boolean;
}

export interface AnalysisResult {
  /** Source file path */
  filePath: string;
  /** Programming language */
  language: string;
  /** Extracted code elements */
  elements: CodeElement[];
  /** File-level documentation */
  documentation: string;
  /** Complexity score */
  complexity: number;
  /** Dependencies */
  dependencies: string[];
  /** Export information */
  exports: ExportInfo[];
}

export interface CodeElement {
  /** Element type (class, function, interface, etc.) */
  type: 'class' | 'function' | 'interface' | 'type' | 'enum' | 'constant' | 'module';
  /** Element name */
  name: string;
  /** Element description */
  description?: string;
  /** Parameter information */
  parameters?: ParameterInfo[];
  /** Return type information */
  returnType?: TypeInfo;
  /** Examples */
  examples?: string[];
  /** Related elements */
  related?: string[];
  /** Complexity score */
  complexity: number;
  /** Source location */
  location: {
    file: string;
    line: number;
    column: number;
  };
}

export interface ParameterInfo {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
}

export interface TypeInfo {
  name: string;
  description?: string;
  properties?: ParameterInfo[];
}

export interface ExportInfo {
  name: string;
  type: string;
  isDefault: boolean;
  description?: string;
}

export interface GeneratedDocument {
  /** Document type */
  type: 'api-reference' | 'tutorial' | 'example' | 'troubleshooting' | 'comparison';
  /** Document title */
  title: string;
  /** Document content */
  content: string;
  /** Target languages */
  languages: string[];
  /** Complexity level */
  complexity: number;
  /** Output path */
  outputPath: string;
  /** Metadata */
  metadata: {
    generated: string;
    version: string;
    sources: string[];
  };
}

export interface ComparisonTable {
  /** Feature being compared */
  feature: string;
  /** Language implementations */
  implementations: {
    [language: string]: {
      syntax: string;
      example: string;
      notes?: string;
    };
  };
}

export interface TutorialSection {
  /** Section title */
  title: string;
  /** Section content */
  content: string;
  /** Code examples */
  examples: {
    language: string;
    code: string;
    explanation: string;
  }[];
  /** Complexity level */
  complexity: number;
  /** Prerequisites */
  prerequisites?: string[];
  /** Next steps */
  nextSteps?: string[];
}
