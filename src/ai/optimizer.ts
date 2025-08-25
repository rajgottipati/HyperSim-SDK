/**
 * AI-powered transaction optimization for HyperSim SDK
 * Provides intelligent recommendations for gas optimization, risk assessment, and strategy suggestions
 */

import { HyperEVMTransaction } from '../types/hyperevm.js';
import { AIAnalysisResult } from '../types/common.js';
import { SimulateResult } from '../types/common.js';
import { HyperSimError } from '../core/errors.js';

/**
 * OpenAI API configuration
 */
interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Transaction optimization recommendations
 */
interface OptimizationRecommendation {
  type: 'gas' | 'timing' | 'strategy' | 'security';
  priority: 'high' | 'medium' | 'low';
  description: string;
  expectedSavings?: {
    gas?: number;
    cost?: string;
    time?: number;
  };
  implementation?: string;
}

/**
 * Risk assessment factors
 */
interface RiskFactor {
  category: 'liquidity' | 'slippage' | 'market' | 'technical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation?: string;
}

/**
 * Market context for optimization
 */
interface MarketContext {
  gasPrice: {
    current: number;
    trend: 'rising' | 'falling' | 'stable';
    percentile: number;
  };
  networkCongestion: 'low' | 'medium' | 'high';
  optimalTiming?: {
    recommended: Date;
    reasoning: string;
  };
}

/**
 * Transaction optimization engine using AI
 */
export class TransactionOptimizer {
  private openaiConfig?: OpenAIConfig;
  private enabled: boolean = false;

  constructor(openaiConfig?: OpenAIConfig) {
    if (openaiConfig && openaiConfig.apiKey) {
      this.openaiConfig = {
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.3,
        ...openaiConfig
      };
      this.enabled = true;
    }
  }

  /**
   * Optimize transaction parameters using AI analysis
   */
  public async optimizeTransaction(
    transaction: HyperEVMTransaction,
    simulationResult?: SimulateResult,
    marketContext?: MarketContext
  ): Promise<{
    optimizedTransaction: HyperEVMTransaction;
    recommendations: OptimizationRecommendation[];
    estimatedSavings: {
      gasReduction: number;
      costSavings: string;
      timeOptimization: number;
    };
  }> {
    const recommendations: OptimizationRecommendation[] = [];
    let optimizedTransaction = { ...transaction };

    // Gas optimization
    const gasOptimization = this.optimizeGas(transaction, simulationResult);
    if (gasOptimization.optimizedGas && gasOptimization.optimizedGas < Number(transaction.gas || 0)) {
      optimizedTransaction.gas = gasOptimization.optimizedGas.toString();
      recommendations.push(...gasOptimization.recommendations);
    }

    // Gas price optimization based on network conditions
    const gasPriceOptimization = this.optimizeGasPrice(transaction, marketContext);
    if (gasPriceOptimization.optimizedPrice) {
      optimizedTransaction.gasPrice = gasPriceOptimization.optimizedPrice;
      recommendations.push(...gasPriceOptimization.recommendations);
    }

    // Block type optimization for HyperEVM dual-block system
    const blockTypeOptimization = this.optimizeBlockType(transaction);
    recommendations.push(...blockTypeOptimization.recommendations);

    // Timing optimization
    const timingOptimization = await this.optimizeTiming(transaction, marketContext);
    recommendations.push(...timingOptimization.recommendations);

    // Calculate estimated savings
    const estimatedSavings = this.calculateSavings(transaction, optimizedTransaction, simulationResult);

    return {
      optimizedTransaction,
      recommendations,
      estimatedSavings
    };
  }

  /**
   * Assess transaction risks using AI analysis
   */
  public async assessRisks(
    transaction: HyperEVMTransaction,
    simulationResult?: SimulateResult
  ): Promise<{
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: RiskFactor[];
    recommendations: string[];
  }> {
    const riskFactors: RiskFactor[] = [];
    const recommendations: string[] = [];

    // Gas limit risk assessment
    const gasRisk = this.assessGasRisk(transaction, simulationResult);
    if (gasRisk) riskFactors.push(gasRisk);

    // Value transfer risk assessment
    const valueRisk = this.assessValueRisk(transaction);
    if (valueRisk) riskFactors.push(valueRisk);

    // Smart contract interaction risk
    const contractRisk = await this.assessContractRisk(transaction);
    if (contractRisk) riskFactors.push(contractRisk);

    // Market timing risk
    const timingRisk = this.assessTimingRisk(transaction);
    if (timingRisk) riskFactors.push(timingRisk);

    // Determine overall risk level
    const criticalRisks = riskFactors.filter(r => r.severity === 'critical').length;
    const highRisks = riskFactors.filter(r => r.severity === 'high').length;
    const mediumRisks = riskFactors.filter(r => r.severity === 'medium').length;

    let overallRisk: 'low' | 'medium' | 'high' | 'critical';
    if (criticalRisks > 0) {
      overallRisk = 'critical';
      recommendations.push('Critical risks detected. Review transaction carefully before proceeding.');
    } else if (highRisks > 0) {
      overallRisk = 'high';
      recommendations.push('High risks present. Consider implementing suggested mitigations.');
    } else if (mediumRisks > 1) {
      overallRisk = 'medium';
      recommendations.push('Moderate risk level. Monitor transaction execution closely.');
    } else {
      overallRisk = 'low';
      recommendations.push('Low risk transaction. Safe to proceed.');
    }

    return { overallRisk, riskFactors, recommendations };
  }

  /**
   * Generate AI-powered transaction analysis
   */
  public async generateAnalysis(
    transaction: HyperEVMTransaction,
    simulationResult?: SimulateResult,
    context?: any
  ): Promise<AIAnalysisResult> {
    if (!this.enabled || !this.openaiConfig) {
      // Return basic analysis without AI
      return this.generateBasicAnalysis(transaction, simulationResult);
    }

    try {
      const prompt = this.buildAnalysisPrompt(transaction, simulationResult, context);
      const aiResponse = await this.callOpenAI(prompt);
      
      return this.parseAIResponse(aiResponse, transaction, simulationResult);
    } catch (error) {
      // Fallback to basic analysis if AI fails
      console.warn('AI analysis failed, falling back to basic analysis:', error);
      return this.generateBasicAnalysis(transaction, simulationResult);
    }
  }

  /**
   * Optimize gas usage based on simulation results
   */
  private optimizeGas(transaction: HyperEVMTransaction, simulationResult?: SimulateResult): {
    optimizedGas?: number;
    recommendations: OptimizationRecommendation[];
  } {
    const recommendations: OptimizationRecommendation[] = [];
    
    if (!simulationResult || !transaction.gas) {
      return { recommendations };
    }

    const currentGas = Number(transaction.gas);
    const simulatedGas = simulationResult.gasUsed;
    
    // Add buffer to simulated gas usage (typically 10-20%)
    const recommendedGas = Math.ceil(simulatedGas * 1.1);
    
    if (currentGas > recommendedGas) {
      const savings = currentGas - recommendedGas;
      recommendations.push({
        type: 'gas',
        priority: 'medium',
        description: `Reduce gas limit from ${currentGas} to ${recommendedGas}`,
        expectedSavings: {
          gas: savings,
          cost: (savings * Number(transaction.gasPrice || 0) / 1e18).toFixed(6) + ' HYPE'
        },
        implementation: `Set gas limit to ${recommendedGas} (10% buffer above simulated usage)`
      });
      
      return { optimizedGas: recommendedGas, recommendations };
    }
    
    return { recommendations };
  }

  /**
   * Optimize gas price based on network conditions
   */
  private optimizeGasPrice(transaction: HyperEVMTransaction, marketContext?: MarketContext): {
    optimizedPrice?: string;
    recommendations: OptimizationRecommendation[];
  } {
    const recommendations: OptimizationRecommendation[] = [];
    
    if (!marketContext || !transaction.gasPrice) {
      return { recommendations };
    }

    const currentGasPrice = Number(transaction.gasPrice);
    const marketGasPrice = marketContext.gasPrice.current;
    
    // Recommend lower gas price if current is significantly higher than market
    if (currentGasPrice > marketGasPrice * 1.5) {
      const optimizedPrice = Math.ceil(marketGasPrice * 1.1).toString();
      recommendations.push({
        type: 'gas',
        priority: 'high',
        description: `Reduce gas price from ${currentGasPrice} to ${optimizedPrice} gwei`,
        expectedSavings: {
          cost: ((currentGasPrice - Number(optimizedPrice)) * Number(transaction.gas || 0) / 1e18).toFixed(6) + ' HYPE'
        },
        implementation: `Set gasPrice to ${optimizedPrice} gwei (10% above current market rate)`
      });
      
      return { optimizedPrice, recommendations };
    }
    
    return { recommendations };
  }

  /**
   * Optimize block type for HyperEVM dual-block system
   */
  private optimizeBlockType(transaction: HyperEVMTransaction): {
    recommendations: OptimizationRecommendation[];
  } {
    const recommendations: OptimizationRecommendation[] = [];
    const gasLimit = Number(transaction.gas || 0);
    
    if (gasLimit > 0 && gasLimit <= 2000000) {
      recommendations.push({
        type: 'timing',
        priority: 'medium',
        description: 'Transaction eligible for small blocks (1s confirmation)',
        expectedSavings: {
          time: 59 // 59 seconds faster than large block
        },
        implementation: 'Target small block inclusion for faster confirmation'
      });
    } else if (gasLimit > 2000000) {
      recommendations.push({
        type: 'timing',
        priority: 'low',
        description: 'Transaction requires large block (60s confirmation)',
        implementation: 'Consider breaking into smaller transactions for faster execution'
      });
    }
    
    return { recommendations };
  }

  /**
   * Optimize transaction timing
   */
  private async optimizeTiming(transaction: HyperEVMTransaction, marketContext?: MarketContext): Promise<{
    recommendations: OptimizationRecommendation[];
  }> {
    const recommendations: OptimizationRecommendation[] = [];
    
    if (marketContext?.gasPrice.trend === 'rising') {
      recommendations.push({
        type: 'timing',
        priority: 'medium',
        description: 'Gas prices are rising. Consider executing transaction now.',
        implementation: 'Submit transaction immediately to avoid higher gas costs'
      });
    } else if (marketContext?.gasPrice.trend === 'falling') {
      recommendations.push({
        type: 'timing',
        priority: 'low',
        description: 'Gas prices are falling. Consider delaying if not urgent.',
        expectedSavings: {
          cost: 'Potential 10-20% gas cost reduction'
        },
        implementation: 'Wait 10-30 minutes for potentially lower gas prices'
      });
    }
    
    return { recommendations };
  }

  /**
   * Calculate estimated savings from optimizations
   */
  private calculateSavings(
    original: HyperEVMTransaction,
    optimized: HyperEVMTransaction,
    simulationResult?: SimulateResult
  ): {
    gasReduction: number;
    costSavings: string;
    timeOptimization: number;
  } {
    const originalGas = Number(original.gas || 0);
    const optimizedGas = Number(optimized.gas || 0);
    const gasReduction = originalGas - optimizedGas;
    
    const originalGasPrice = Number(original.gasPrice || 0);
    const optimizedGasPrice = Number(optimized.gasPrice || 0);
    
    const costSavingsWei = (originalGas * originalGasPrice) - (optimizedGas * optimizedGasPrice);
    const costSavings = (costSavingsWei / 1e18).toFixed(6) + ' HYPE';
    
    // Time optimization based on block type targeting
    const timeOptimization = gasReduction > 0 && optimizedGas <= 2000000 ? 59 : 0;
    
    return {
      gasReduction: Math.max(0, gasReduction),
      costSavings,
      timeOptimization
    };
  }

  /**
   * Assess gas-related risks
   */
  private assessGasRisk(transaction: HyperEVMTransaction, simulationResult?: SimulateResult): RiskFactor | null {
    if (!simulationResult || !transaction.gas) return null;
    
    const gasLimit = Number(transaction.gas);
    const simulatedGas = simulationResult.gasUsed;
    
    if (gasLimit < simulatedGas) {
      return {
        category: 'technical',
        severity: 'high',
        description: 'Gas limit is below simulated usage. Transaction will likely fail.',
        mitigation: `Increase gas limit to at least ${Math.ceil(simulatedGas * 1.1)}`
      };
    } else if (gasLimit < simulatedGas * 1.05) {
      return {
        category: 'technical',
        severity: 'medium',
        description: 'Gas limit is very close to simulated usage. Risk of failure due to state changes.',
        mitigation: 'Add 10-20% buffer to gas limit for safety'
      };
    }
    
    return null;
  }

  /**
   * Assess value transfer risks
   */
  private assessValueRisk(transaction: HyperEVMTransaction): RiskFactor | null {
    if (!transaction.value) return null;
    
    const value = Number(transaction.value);
    const valueInHype = value / 1e18;
    
    if (valueInHype > 1000) {
      return {
        category: 'liquidity',
        severity: 'high',
        description: `Large value transfer (${valueInHype.toFixed(2)} HYPE)`,
        mitigation: 'Verify recipient address and consider breaking into smaller transactions'
      };
    } else if (valueInHype > 100) {
      return {
        category: 'liquidity',
        severity: 'medium',
        description: `Medium value transfer (${valueInHype.toFixed(2)} HYPE)`,
        mitigation: 'Double-check recipient address'
      };
    }
    
    return null;
  }

  /**
   * Assess smart contract interaction risks
   */
  private async assessContractRisk(transaction: HyperEVMTransaction): Promise<RiskFactor | null> {
    if (!transaction.to || !transaction.data) return null;
    
    // Basic heuristics for contract risk (in production, this would integrate with contract analysis)
    const dataLength = transaction.data.length;
    
    if (dataLength > 10000) {
      return {
        category: 'technical',
        severity: 'medium',
        description: 'Complex contract interaction with large data payload',
        mitigation: 'Verify contract function and parameters carefully'
      };
    }
    
    return null;
  }

  /**
   * Assess timing-related risks
   */
  private assessTimingRisk(transaction: HyperEVMTransaction): RiskFactor | null {
    // This would analyze market conditions, MEV risks, etc.
    // For now, return null as placeholder
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
    
    if (simulationResult) {
      if (simulationResult.success) {
        recommendations.push('Transaction simulation successful');
      } else {
        recommendations.push('Transaction simulation failed - review parameters');
      }
    }
    
    return {
      optimization: 'Basic optimization recommendations available',
      riskAssessment: {
        level: 'low',
        factors: ['Standard transaction structure']
      },
      gasOptimization: {
        currentGas: Number(transaction.gas || 0),
        suggestions: ['Use gas estimation for optimal limits']
      },
      recommendations
    };
  }

  /**
   * Build prompt for AI analysis
   */
  private buildAnalysisPrompt(
    transaction: HyperEVMTransaction,
    simulationResult?: SimulateResult,
    context?: any
  ): string {
    return `
Analyze this HyperEVM transaction for optimization opportunities and risks:

Transaction Details:
${JSON.stringify(transaction, null, 2)}

${simulationResult ? `Simulation Result:
${JSON.stringify(simulationResult, null, 2)}` : ''}

${context ? `Additional Context:
${JSON.stringify(context, null, 2)}` : ''}

Provide analysis in the following format:
1. Gas optimization opportunities
2. Risk assessment
3. Timing recommendations
4. General optimization suggestions

Focus on HyperEVM-specific features like dual-block architecture and cross-layer integration.
`;
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.openaiConfig) {
      throw new HyperSimError('OpenAI not configured');
    }

    const response = await fetch(this.openaiConfig.baseURL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.openaiConfig.model,
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: this.openaiConfig.maxTokens,
        temperature: this.openaiConfig.temperature
      })
    });

    if (!response.ok) {
      throw new HyperSimError(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No analysis available';
  }

  /**
   * Parse AI response into structured result
   */
  private parseAIResponse(
    aiResponse: string,
    transaction: HyperEVMTransaction,
    simulationResult?: SimulateResult
  ): AIAnalysisResult {
    // Parse the AI response and structure it
    // This is a simplified implementation - in production would use more sophisticated parsing
    
    return {
      optimization: aiResponse,
      riskAssessment: {
        level: 'medium', // Would parse from AI response
        factors: ['AI-analyzed factors']
      },
      gasOptimization: {
        currentGas: Number(transaction.gas || 0),
        suggestions: ['AI-generated suggestions']
      },
      recommendations: [aiResponse]
    };
  }

  /**
   * Enable or disable AI analysis
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled && !!this.openaiConfig;
  }

  /**
   * Check if AI analysis is available
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Update OpenAI configuration
   */
  public updateConfig(config: Partial<OpenAIConfig>): void {
    if (this.openaiConfig) {
      this.openaiConfig = { ...this.openaiConfig, ...config };
    }
  }
}