/**
 * AI-powered transaction analysis using OpenAI GPT-4
 */

import OpenAI from 'openai';
import { 
  AIConfig, 
  AIInsights, 
  AnalysisRequest, 
  SecurityAnalysis, 
  Vulnerability, 
  GasOptimization,
  RiskLevel,
  OptimizationTechnique
} from '../types/ai';
import { SimulationResult, BundleOptimization } from '../types/simulation';
import { AIAnalysisError, RateLimitError, ConfigurationError } from '../types/errors';

/**
 * AI analyzer for transaction simulation results
 */
export class AIAnalyzer {
  private readonly config: Required<AIConfig>;
  private readonly openai: OpenAI;

  constructor(config: AIConfig) {
    if (!config.apiKey) {
      throw new ConfigurationError('OpenAI API key is required for AI analysis');
    }

    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'gpt-4-turbo-preview',
      maxTokens: config.maxTokens || 2000,
      temperature: config.temperature || 0.1,
      debug: config.debug || false,
    };

    this.openai = new OpenAI({
      apiKey: this.config.apiKey,
    });

    if (this.config.debug) {
      console.log('[AI Analyzer] Initialized with model:', this.config.model);
    }
  }

  /**
   * Analyze simulation result with AI
   */
  async analyzeSimulation(simulation: SimulationResult): Promise<AIInsights> {
    try {
      if (this.config.debug) {
        console.log('[AI Analyzer] Analyzing simulation:', simulation);
      }

      const analysisPrompt = this.buildAnalysisPrompt(simulation);
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new AIAnalysisError('No response from AI model');
      }

      const analysis = JSON.parse(content);
      const insights = this.parseAIResponse(analysis, simulation);

      if (this.config.debug) {
        console.log('[AI Analyzer] Analysis complete:', insights);
      }

      return insights;
    } catch (error: any) {
      if (error.status === 429) {
        throw new RateLimitError('OpenAI API rate limit exceeded', 60);
      }
      
      if (this.config.debug) {
        console.error('[AI Analyzer] Analysis failed:', error);
      }
      
      throw new AIAnalysisError(`AI analysis failed: ${error.message}`);
    }
  }

  /**
   * Optimize transaction bundle with AI
   */
  async optimizeBundle(simulations: SimulationResult[]): Promise<BundleOptimization> {
    try {
      const bundlePrompt = this.buildBundleOptimizationPrompt(simulations);
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.getBundleOptimizationSystemPrompt()
          },
          {
            role: 'user',
            content: bundlePrompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new AIAnalysisError('No response from AI model for bundle optimization');
      }

      const optimization = JSON.parse(content);
      return this.parseBundleOptimization(optimization, simulations);
    } catch (error: any) {
      if (error.status === 429) {
        throw new RateLimitError('OpenAI API rate limit exceeded', 60);
      }
      
      throw new AIAnalysisError(`Bundle optimization failed: ${error.message}`);
    }
  }

  /**
   * Build analysis prompt for simulation
   */
  private buildAnalysisPrompt(simulation: SimulationResult): string {
    return `Analyze this HyperEVM transaction simulation:

` +
      `Success: ${simulation.success}
` +
      `Gas Used: ${simulation.gasUsed}
` +
      `Block Type: ${simulation.blockType}
` +
      `${simulation.error ? `Error: ${simulation.error}
` : ''}` +
      `${simulation.revertReason ? `Revert Reason: ${simulation.revertReason}
` : ''}` +
      `${simulation.returnData ? `Return Data: ${simulation.returnData}
` : ''}` +
      `${simulation.hyperCoreData ? `HyperCore Data: ${JSON.stringify(simulation.hyperCoreData, null, 2)}
` : ''}` +
      `\nProvide comprehensive analysis including risk assessment, gas optimization, and security insights.`;
  }

  /**
   * Build bundle optimization prompt
   */
  private buildBundleOptimizationPrompt(simulations: SimulationResult[]): string {
    const bundleInfo = simulations.map((sim, index) => 
      `Transaction ${index}: Success=${sim.success}, Gas=${sim.gasUsed}, BlockType=${sim.blockType}`
    ).join('\n');

    return `Optimize this transaction bundle for HyperEVM:

${bundleInfo}

` +
      `Provide optimization suggestions including:
` +
      `1. Optimal transaction ordering
` +
      `2. Gas savings opportunities
` +
      `3. Block type considerations
` +
      `4. Bundle-specific recommendations`;
  }

  /**
   * Get system prompt for AI analysis
   */
  private getSystemPrompt(): string {
    return `You are an expert blockchain transaction analyzer specializing in HyperEVM.

` +
      `HyperEVM Context:
` +
      `- Dual-block system: Small blocks (2M gas, 1s) and Large blocks (30M gas, 1min)
` +
      `- Cross-layer integration with HyperCore trading system
` +
      `- EIP-1559 fee mechanism with complete fee burning
` +
      `- Precompiled contracts for core interactions
` +
      `\nProvide analysis in JSON format with these fields:
` +
      `{
` +
      `  "riskLevel": "LOW|MEDIUM|HIGH",
` +
      `  "gasOptimization": {
` +
      `    "potentialSavings": "amount in gas",
` +
      `    "techniques": [{"name": "", "description": "", "estimatedSavings": "", "difficulty": "EASY|MEDIUM|HARD"}]
` +
      `  },
` +
      `  "securityWarnings": ["warning1", "warning2"],
` +
      `  "performanceSuggestions": ["suggestion1", "suggestion2"],
` +
      `  "explanation": "detailed analysis",
` +
      `  "confidence": 0.95,
` +
      `  "recommendations": ["action1", "action2"]
` +
      `}`;
  }

  /**
   * Get system prompt for bundle optimization
   */
  private getBundleOptimizationSystemPrompt(): string {
    return `You are an expert at optimizing transaction bundles for HyperEVM.

` +
      `Provide optimization in JSON format:
` +
      `{
` +
      `  "reorderedIndices": [0, 2, 1],
` +
      `  "gasSavings": "estimated savings in gas",
` +
      `  "suggestions": ["suggestion1", "suggestion2"],
` +
      `  "warnings": ["warning1", "warning2"]
` +
      `}`;
  }

  /**
   * Parse AI response into AIInsights
   */
  private parseAIResponse(analysis: any, simulation: SimulationResult): AIInsights {
    return {
      riskLevel: analysis.riskLevel || 'MEDIUM',
      gasOptimization: {
        potentialSavings: analysis.gasOptimization?.potentialSavings || '0',
        techniques: (analysis.gasOptimization?.techniques || []).map((t: any) => ({
          name: t.name || 'Unknown',
          description: t.description || '',
          estimatedSavings: t.estimatedSavings || '0',
          difficulty: t.difficulty || 'MEDIUM',
        })),
      },
      securityWarnings: analysis.securityWarnings || [],
      performanceSuggestions: analysis.performanceSuggestions || [],
      explanation: analysis.explanation || 'Analysis completed',
      confidence: analysis.confidence || 0.8,
      recommendations: analysis.recommendations || [],
    };
  }

  /**
   * Parse bundle optimization response
   */
  private parseBundleOptimization(optimization: any, simulations: SimulationResult[]): BundleOptimization {
    const totalGas = simulations.reduce((sum, sim) => sum + parseInt(sim.gasUsed), 0);
    const gasSaved = parseInt(optimization.gasSavings || '0');
    
    return {
      originalGas: totalGas.toString(),
      optimizedGas: Math.max(0, totalGas - gasSaved).toString(),
      gasSaved: gasSaved.toString(),
      suggestions: optimization.suggestions || [],
      reorderedIndices: optimization.reorderedIndices || simulations.map((_, i) => i),
      warnings: optimization.warnings,
    };
  }
}
