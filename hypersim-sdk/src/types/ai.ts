/**
 * AI analysis types and interfaces
 */

import { SimulationResult, BundleOptimization } from './simulation';

/**
 * Risk levels for transaction analysis
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * AI-powered insights for transaction simulation
 */
export interface AIInsights {
  /** Overall risk assessment */
  riskLevel: RiskLevel;
  /** Gas optimization recommendations */
  gasOptimization: GasOptimization;
  /** Security warnings and vulnerabilities */
  securityWarnings?: string[];
  /** Performance suggestions */
  performanceSuggestions: string[];
  /** Human-readable explanation */
  explanation: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Recommended actions */
  recommendations: string[];
}

/**
 * Gas optimization suggestions
 */
export interface GasOptimization {
  /** Potential gas savings */
  potentialSavings: string;
  /** Specific optimization techniques */
  techniques: OptimizationTechnique[];
  /** Alternative approaches */
  alternatives?: string[];
  /** Gas price recommendations */
  gasPriceAdvice?: GasPriceAdvice;
}

/**
 * Specific optimization technique
 */
export interface OptimizationTechnique {
  /** Technique name */
  name: string;
  /** Description of the technique */
  description: string;
  /** Estimated gas savings */
  estimatedSavings: string;
  /** Implementation difficulty */
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  /** Code example (optional) */
  example?: string;
}

/**
 * Gas price recommendations
 */
export interface GasPriceAdvice {
  /** Recommended gas price for fast inclusion */
  fast: string;
  /** Recommended gas price for standard inclusion */
  standard: string;
  /** Recommended gas price for economy inclusion */
  economy: string;
  /** Estimated inclusion times */
  estimatedTimes: {
    fast: number;
    standard: number;
    economy: number;
  };
}

/**
 * Security analysis result
 */
export interface SecurityAnalysis {
  /** Security score (0-100) */
  score: number;
  /** Identified vulnerabilities */
  vulnerabilities: Vulnerability[];
  /** Compliance checks */
  compliance: ComplianceCheck[];
  /** MEV exposure analysis */
  mevExposure: MevAnalysis;
}

/**
 * Identified security vulnerability
 */
export interface Vulnerability {
  /** Vulnerability type */
  type: 'REENTRANCY' | 'OVERFLOW' | 'UNDERFLOW' | 'FLASH_LOAN' | 'FRONT_RUNNING' | 'OTHER';
  /** Severity level */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Description of the vulnerability */
  description: string;
  /** Recommended mitigation */
  mitigation: string;
  /** Confidence in detection (0-1) */
  confidence: number;
}

/**
 * Compliance check result
 */
export interface ComplianceCheck {
  /** Compliance standard */
  standard: string;
  /** Check result */
  passed: boolean;
  /** Details or failure reason */
  details: string;
}

/**
 * MEV (Maximal Extractable Value) analysis
 */
export interface MevAnalysis {
  /** MEV exposure level */
  exposureLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  /** Potential MEV value */
  potentialValue: string;
  /** MEV protection suggestions */
  protectionSuggestions: string[];
  /** Flashbot bundle recommendation */
  flashbotRecommended: boolean;
}

/**
 * AI analyzer configuration
 */
export interface AIConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Model to use for analysis */
  model?: string;
  /** Maximum tokens for responses */
  maxTokens?: number;
  /** Analysis temperature (creativity level) */
  temperature?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * AI analysis request
 */
export interface AnalysisRequest {
  /** Simulation result to analyze */
  simulation: SimulationResult;
  /** Analysis type requested */
  analysisType: AnalysisType[];
  /** Additional context */
  context?: AnalysisContext;
}

/**
 * Types of AI analysis available
 */
export type AnalysisType = 
  | 'RISK_ASSESSMENT'
  | 'GAS_OPTIMIZATION'
  | 'SECURITY_ANALYSIS'
  | 'PERFORMANCE_ANALYSIS'
  | 'MEV_ANALYSIS';

/**
 * Additional context for AI analysis
 */
export interface AnalysisContext {
  /** User's risk tolerance */
  riskTolerance?: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  /** Transaction purpose */
  purpose?: string;
  /** Budget constraints */
  gasbudget?: string;
  /** Time sensitivity */
  timePreference?: 'FAST' | 'STANDARD' | 'ECONOMY';
}
