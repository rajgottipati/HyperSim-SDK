/**
 * AI-powered transaction analyzer for HyperSim SDK
 * Provides intelligent insights and recommendations for transactions
 */

import { HyperEVMTransaction } from '../types/hyperevm.js';
import { AIAnalysisResult, SimulateResult } from '../types/common.js';
import { AIError, ValidationError } from '../core/errors.js';

/**
 * AI analyzer configuration
 */
interface AIAnalyzerConfig {
  enabled: boolean;
  apiKey?: string;
  baseURL?: string;
  model?: string;
  timeout?: number;
}

/**
 * AI-powered transaction analyzer
 */
export class AIAnalyzer {
  private config: AIAnalyzerConfig;
  private requestCount = 0;
  private lastRequest = 0;

  constructor(config: AIAnalyzerConfig) {
    this.config = {
      baseURL: 'https://api.openai.com/v1',
      model: 'gpt-4',
      timeout: 30000,
      ...config
    };
  }

  /**
   * Analyze transaction with AI insights
   */
  public async analyzeTransaction(
    transaction: HyperEVMTransaction,
    simulationResult?: SimulateResult
  ): Promise<AIAnalysisResult> {
    if (!this.config.enabled) {
      return this.generateBasicAnalysis(transaction, simulationResult);
    }

    if (!this.config.apiKey) {
      throw new AIError(
        'AI analysis enabled but no API key provided',
        'openai',
        this.config.model
      );
    }

    try {
      // Rate limiting
      await this.enforceRateLimit();
      
      // Generate AI analysis
      const analysis = await this.generateAIAnalysis(transaction, simulationResult);
      
      this.requestCount++;
      this.lastRequest = Date.now();
      
      return analysis;
    } catch (error) {
      if (error instanceof AIError) {
        throw error;
      }
      
      // Fallback to basic analysis if AI fails
      console.warn('AI analysis failed, using basic analysis:', error);
      return this.generateBasicAnalysis(transaction, simulationResult);
    }
  }

  /**
   * Generate analysis using AI
   */
  private async generateAIAnalysis(
    transaction: HyperEVMTransaction,
    simulationResult?: SimulateResult
  ): Promise<AIAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(transaction, simulationResult);
    
    try {
      const response = await this.callOpenAI(prompt);
      return this.parseAIResponse(response);
    } catch (error) {
      throw new AIError(
        `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'openai',
        this.config.model,
        { originalError: error }
      );
    }
  }

  /**
   * Build analysis prompt for AI
   */
  private buildAnalysisPrompt(
    transaction: HyperEVMTransaction,
    simulationResult?: SimulateResult
  ): string {
    let prompt = `Analyze this HyperEVM blockchain transaction and provide insights:

`;
    
    prompt += `Transaction Details:
`;
    prompt += `- From: ${transaction.from}
`;
    prompt += `- To: ${transaction.to || 'Contract Creation'}
`;
    prompt += `- Value: ${transaction.value || '0'} wei
`;
    prompt += `- Gas Limit: ${transaction.gas || 'Not set'}
`;
    prompt += `- Gas Price: ${transaction.gasPrice || 'Not set'} wei
`;
    prompt += `- Data: ${transaction.data ? `${transaction.data.slice(0, 50)}...` : 'None'}

`;
    
    if (simulationResult) {
      prompt += `Simulation Results:
`;
      prompt += `- Success: ${simulationResult.success}
`;
      prompt += `- Gas Used: ${simulationResult.gasUsed}
`;
      prompt += `- Estimated Cost: ${simulationResult.estimatedCost}
`;
      if (simulationResult.error) {
        prompt += `- Error: ${simulationResult.error}
`;
      }
      prompt += `
`;
    }
    
    prompt += `Please provide analysis in the following areas:
`;
    prompt += `1. Gas optimization opportunities
`;
    prompt += `2. Risk assessment (security, financial, technical)
`;
    prompt += `3. Transaction purpose and pattern analysis
`;
    prompt += `4. Recommendations for improvement
`;
    prompt += `5. HyperEVM-specific considerations (dual-block architecture)

`;
    
    prompt += `Format your response as JSON with the following structure:
`;
    prompt += `{
`;
    prompt += `  "optimization": "string",
`;
    prompt += `  "riskAssessment": {
`;
    prompt += `    "level": "low|medium|high",
`;
    prompt += `    "factors": ["string"]
`;
    prompt += `  },
`;
    prompt += `  "gasOptimization": {
`;
    prompt += `    "currentGas": number,
`;
    prompt += `    "optimizedGas": number,
`;
    prompt += `    "suggestions": ["string"]
`;
    prompt += `  },
`;
    prompt += `  "recommendations": ["string"]
`;
    prompt += `}`;
    
    return prompt;
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: 1000,
          temperature: 0.3
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AIError(
          `OpenAI API error: ${response.status} ${response.statusText}`,
          'openai',
          this.config.model,
          { status: response.status, errorData }
        );
      }
      
      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new AIError('Invalid response format from OpenAI', 'openai', this.config.model);
      }
      
      return data.choices[0].message.content;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new AIError('AI request timeout', 'openai', this.config.model);
      }
      throw error;
    }
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(response: string): AIAnalysisResult {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.validateAndNormalizeResponse(parsed);
      }
      
      // Fallback to text parsing
      return this.parseTextResponse(response);
    } catch (error) {
      console.warn('Failed to parse AI response, using fallback:', error);
      return this.parseTextResponse(response);
    }
  }

  /**
   * Validate and normalize AI response
   */
  private validateAndNormalizeResponse(parsed: any): AIAnalysisResult {
    return {
      optimization: parsed.optimization || 'No optimization suggestions available',
      riskAssessment: {
        level: this.validateRiskLevel(parsed.riskAssessment?.level) || 'medium',
        factors: Array.isArray(parsed.riskAssessment?.factors) 
          ? parsed.riskAssessment.factors 
          : ['Analysis pending']
      },
      gasOptimization: {
        currentGas: parsed.gasOptimization?.currentGas || 0,
        optimizedGas: parsed.gasOptimization?.optimizedGas,
        suggestions: Array.isArray(parsed.gasOptimization?.suggestions)
          ? parsed.gasOptimization.suggestions
          : ['Use gas estimation for optimal limits']
      },
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : ['Review transaction parameters before execution']
    };
  }

  /**
   * Parse text response as fallback
   */
  private parseTextResponse(response: string): AIAnalysisResult {
    return {
      optimization: response,
      riskAssessment: {
        level: 'medium',
        factors: ['AI analysis in text format']
      },
      gasOptimization: {
        currentGas: 0,
        suggestions: ['Review gas settings']
      },
      recommendations: [response]
    };
  }

  /**
   * Validate risk level
   */
  private validateRiskLevel(level: any): 'low' | 'medium' | 'high' | null {
    if (typeof level === 'string') {
      const normalized = level.toLowerCase();
      if (['low', 'medium', 'high'].includes(normalized)) {
        return normalized as 'low' | 'medium' | 'high';
      }
    }
    return null;
  }

  /**
   * Generate basic analysis without AI
   */
  private generateBasicAnalysis(
    transaction: HyperEVMTransaction,
    simulationResult?: SimulateResult
  ): AIAnalysisResult {
    const recommendations: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    const riskFactors: string[] = [];
    
    // Basic risk assessment
    if (transaction.value && BigInt(transaction.value) > BigInt(10) ** BigInt(20)) { // > 100 HYPE
      riskLevel = 'high';
      riskFactors.push('Large value transfer');
      recommendations.push('Verify recipient address carefully');
    }
    
    if (transaction.data && transaction.data !== '0x') {
      riskLevel = riskLevel === 'high' ? 'high' : 'medium';
      riskFactors.push('Contract interaction');
      recommendations.push('Review contract function being called');
    }
    
    if (!transaction.gas) {
      riskFactors.push('No gas limit specified');
      recommendations.push('Set appropriate gas limit to avoid transaction failure');
    }
    
    if (simulationResult && !simulationResult.success) {
      riskLevel = 'high';
      riskFactors.push('Simulation failed');
      recommendations.push('Review transaction parameters - simulation indicates failure');
    }
    
    // Gas optimization suggestions
    const gasOptimization: AIAnalysisResult['gasOptimization'] = {
      currentGas: Number(transaction.gas || 0),
      suggestions: []
    };
    
    if (simulationResult && transaction.gas) {
      const currentGas = Number(transaction.gas);
      const usedGas = simulationResult.gasUsed;
      
      if (currentGas > usedGas * 1.5) {
        gasOptimization.optimizedGas = Math.ceil(usedGas * 1.1);
        gasOptimization.suggestions.push(`Reduce gas limit from ${currentGas} to ${gasOptimization.optimizedGas}`);
      }
    }
    
    if (gasOptimization.suggestions.length === 0) {
      gasOptimization.suggestions.push('Use simulation to optimize gas usage');
    }
    
    return {
      optimization: 'Basic optimization analysis completed. Consider enabling AI for detailed insights.',
      riskAssessment: {
        level: riskLevel,
        factors: riskFactors.length > 0 ? riskFactors : ['Standard transaction structure']
      },
      gasOptimization,
      recommendations: recommendations.length > 0 
        ? recommendations 
        : ['Transaction appears standard - proceed with normal caution']
    };
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const timeSinceLastRequest = Date.now() - this.lastRequest;
    const minInterval = 1000; // 1 second between requests
    
    if (timeSinceLastRequest < minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, minInterval - timeSinceLastRequest)
      );
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<AIAnalyzerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): AIAnalyzerConfig {
    // Return config without sensitive data
    return {
      ...this.config,
      apiKey: this.config.apiKey ? '[REDACTED]' : undefined
    } as AIAnalyzerConfig;
  }

  /**
   * Check if AI is enabled and configured
   */
  public isEnabled(): boolean {
    return this.config.enabled && !!this.config.apiKey;
  }

  /**
   * Get usage statistics
   */
  public getUsageStats(): {
    requestCount: number;
    lastRequest: number;
    enabled: boolean;
  } {
    return {
      requestCount: this.requestCount,
      lastRequest: this.lastRequest,
      enabled: this.isEnabled()
    };
  }
}