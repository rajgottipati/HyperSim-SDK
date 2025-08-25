"""
AI-powered transaction analysis using OpenAI GPT-4 with AsyncIO.
"""

import asyncio
import json
from typing import Dict, Any, List, Optional
from openai import AsyncOpenAI
from ..types.ai import (
    AIConfig, AIInsights, AnalysisRequest, GasOptimization, 
    OptimizationTechnique, RiskLevel, OptimizationDifficulty
)
from ..types.simulation import SimulationResult, BundleOptimization
from ..types.errors import AIAnalysisError, RateLimitError, ConfigurationError, ValidationError
from ..utils.validators import validate_openai_api_key


class AIAnalyzer:
    """AI analyzer for transaction simulation results using OpenAI."""
    
    def __init__(self, config: AIConfig) -> None:
        """Initialize AI analyzer.
        
        Args:
            config: AI configuration
            
        Raises:
            ConfigurationError: If configuration is invalid
        """
        validate_openai_api_key(config.api_key)
        
        self.config = config
        self.client = AsyncOpenAI(
            api_key=config.api_key,
            timeout=config.timeout
        )
        
        if self.config.debug:
            print(f"[AI Analyzer] Initialized with model: {self.config.model}")
    
    async def analyze_simulation(self, simulation: SimulationResult) -> AIInsights:
        """Analyze simulation result with AI.
        
        Args:
            simulation: Simulation result to analyze
            
        Returns:
            AIInsights: AI analysis insights
            
        Raises:
            AIAnalysisError: If analysis fails
            RateLimitError: If API rate limit is exceeded
        """
        try:
            if self.config.debug:
                print(f"[AI Analyzer] Analyzing simulation: {simulation.success}")
            
            analysis_prompt = self._build_analysis_prompt(simulation)
            
            response = await self._make_openai_request([
                {
                    "role": "system",
                    "content": self._get_system_prompt()
                },
                {
                    "role": "user",
                    "content": analysis_prompt
                }
            ])
            
            content = response.choices[0].message.content
            if not content:
                raise AIAnalysisError("Empty response from AI model")
            
            analysis_data = json.loads(content)
            insights = self._parse_ai_response(analysis_data, simulation)
            
            if self.config.debug:
                print(f"[AI Analyzer] Analysis complete: {insights.risk_level}")
            
            return insights
        
        except json.JSONDecodeError as e:
            raise AIAnalysisError(f"Failed to parse AI response: {e}")
        except Exception as e:
            if "rate limit" in str(e).lower():
                raise RateLimitError("OpenAI API rate limit exceeded", retry_after=60)
            raise AIAnalysisError(f"AI analysis failed: {e}")
    
    async def optimize_bundle(self, simulations: List[SimulationResult]) -> BundleOptimization:
        """Optimize transaction bundle with AI.
        
        Args:
            simulations: List of simulation results
            
        Returns:
            BundleOptimization: Bundle optimization result
            
        Raises:
            AIAnalysisError: If optimization fails
            ValidationError: If input is invalid
        """
        if not simulations:
            raise ValidationError("Simulations list cannot be empty")
        
        try:
            bundle_prompt = self._build_bundle_optimization_prompt(simulations)
            
            response = await self._make_openai_request([
                {
                    "role": "system",
                    "content": self._get_bundle_optimization_system_prompt()
                },
                {
                    "role": "user",
                    "content": bundle_prompt
                }
            ])
            
            content = response.choices[0].message.content
            if not content:
                raise AIAnalysisError("Empty response from AI model")
            
            optimization_data = json.loads(content)
            return self._parse_bundle_optimization(optimization_data, simulations)
        
        except json.JSONDecodeError as e:
            raise AIAnalysisError(f"Failed to parse optimization response: {e}")
        except Exception as e:
            if "rate limit" in str(e).lower():
                raise RateLimitError("OpenAI API rate limit exceeded", retry_after=60)
            raise AIAnalysisError(f"Bundle optimization failed: {e}")
    
    async def analyze_security_risks(self, simulation: SimulationResult) -> Dict[str, Any]:
        """Analyze security risks in simulation.
        
        Args:
            simulation: Simulation to analyze
            
        Returns:
            Dict containing security analysis
        """
        security_prompt = self._build_security_analysis_prompt(simulation)
        
        response = await self._make_openai_request([
            {
                "role": "system",
                "content": self._get_security_analysis_system_prompt()
            },
            {
                "role": "user",
                "content": security_prompt
            }
        ])
        
        content = response.choices[0].message.content
        if not content:
            raise AIAnalysisError("Empty security analysis response")
        
        return json.loads(content)
    
    async def _make_openai_request(self, messages: List[Dict[str, str]]) -> Any:
        """Make request to OpenAI API with retry logic.
        
        Args:
            messages: Messages to send to API
            
        Returns:
            OpenAI response
        """
        for attempt in range(self.config.retry_attempts + 1):
            try:
                return await self.client.chat.completions.create(
                    model=self.config.model,
                    messages=messages,
                    max_tokens=self.config.max_tokens,
                    temperature=self.config.temperature,
                    response_format={"type": "json_object"},
                    timeout=self.config.timeout
                )
            except Exception as e:
                if attempt == self.config.retry_attempts:
                    raise
                
                if "rate limit" in str(e).lower():
                    # Exponential backoff for rate limits
                    delay = min(2 ** attempt, 60)
                    await asyncio.sleep(delay)
                else:
                    # Short delay for other errors
                    await asyncio.sleep(1)
    
    def _build_analysis_prompt(self, simulation: SimulationResult) -> str:
        """Build analysis prompt for simulation."""
        prompt = f"""Analyze this HyperEVM transaction simulation:

Simulation Details:
- Success: {simulation.success}
- Gas Used: {simulation.gas_used}
- Block Type: {simulation.block_type}
- Estimated Block: {simulation.estimated_block}"""
        
        if simulation.error:
            prompt += f"\n- Error: {simulation.error}"
        
        if simulation.revert_reason:
            prompt += f"\n- Revert Reason: {simulation.revert_reason}"
        
        if simulation.return_data:
            prompt += f"\n- Return Data: {simulation.return_data}"
        
        if simulation.hypercore_data:
            prompt += f"\n- HyperCore Data: {json.dumps(simulation.hypercore_data.model_dump(), indent=2)}"
        
        if simulation.events:
            prompt += f"\n- Events Emitted: {len(simulation.events)}"
        
        if simulation.state_changes:
            prompt += f"\n- State Changes: {len(simulation.state_changes)}"
        
        prompt += "\n\nProvide comprehensive analysis including risk assessment, gas optimization, and security insights."
        
        return prompt
    
    def _build_bundle_optimization_prompt(self, simulations: List[SimulationResult]) -> str:
        """Build bundle optimization prompt."""
        prompt = "Optimize this transaction bundle for HyperEVM:\n\n"
        
        for i, sim in enumerate(simulations):
            prompt += f"Transaction {i}:\n"
            prompt += f"- Success: {sim.success}\n"
            prompt += f"- Gas Used: {sim.gas_used}\n"
            prompt += f"- Block Type: {sim.block_type}\n"
            if sim.error:
                prompt += f"- Error: {sim.error}\n"
            prompt += "\n"
        
        total_gas = sum(int(sim.gas_used) for sim in simulations)
        prompt += f"Total Gas: {total_gas}\n\n"
        
        prompt += """Provide optimization suggestions including:
1. Optimal transaction ordering
2. Gas savings opportunities
3. Block type considerations
4. Bundle-specific recommendations"""
        
        return prompt
    
    def _build_security_analysis_prompt(self, simulation: SimulationResult) -> str:
        """Build security analysis prompt."""
        prompt = f"""Perform security analysis for this HyperEVM transaction:

- Success: {simulation.success}
- Gas Used: {simulation.gas_used}"""
        
        if simulation.state_changes:
            prompt += f"\n- State Changes: {len(simulation.state_changes)}"
        
        if simulation.events:
            prompt += f"\n- Events: {len(simulation.events)}"
        
        if simulation.error:
            prompt += f"\n- Error: {simulation.error}"
        
        prompt += "\n\nIdentify potential security risks and vulnerabilities."
        
        return prompt
    
    def _get_system_prompt(self) -> str:
        """Get system prompt for AI analysis."""
        return """You are an expert blockchain transaction analyzer specializing in HyperEVM.

HyperEVM Context:
- Dual-block system: Small blocks (2M gas, 1s) and Large blocks (30M gas, 1min)
- Cross-layer integration with HyperCore trading system
- EIP-1559 fee mechanism with complete fee burning
- Precompiled contracts for core interactions

Provide analysis in JSON format with these fields:
{
  "riskLevel": "LOW|MEDIUM|HIGH",
  "gasOptimization": {
    "potentialSavings": "amount in gas",
    "techniques": [{
      "name": "",
      "description": "",
      "estimatedSavings": "",
      "difficulty": "EASY|MEDIUM|HARD"
    }]
  },
  "securityWarnings": ["warning1", "warning2"],
  "performanceSuggestions": ["suggestion1", "suggestion2"],
  "explanation": "detailed analysis",
  "confidence": 0.95,
  "recommendations": ["action1", "action2"]
}"""
    
    def _get_bundle_optimization_system_prompt(self) -> str:
        """Get system prompt for bundle optimization."""
        return """You are an expert at optimizing transaction bundles for HyperEVM.

Provide optimization in JSON format:
{
  "reorderedIndices": [0, 2, 1],
  "gasSavings": "estimated savings in gas",
  "suggestions": ["suggestion1", "suggestion2"],
  "warnings": ["warning1", "warning2"],
  "confidence": 0.85
}"""
    
    def _get_security_analysis_system_prompt(self) -> str:
        """Get system prompt for security analysis."""
        return """You are a blockchain security expert analyzing HyperEVM transactions.

Provide security analysis in JSON format:
{
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "vulnerabilities": [{
    "name": "",
    "severity": "LOW|MEDIUM|HIGH|CRITICAL",
    "description": "",
    "impact": "",
    "recommendation": ""
  }],
  "warnings": ["warning1", "warning2"],
  "recommendations": ["rec1", "rec2"]
}"""
    
    def _parse_ai_response(self, analysis: Dict[str, Any], simulation: SimulationResult) -> AIInsights:
        """Parse AI response into AIInsights."""
        # Parse gas optimization
        gas_opt_data = analysis.get("gasOptimization", {})
        techniques = []
        
        for tech_data in gas_opt_data.get("techniques", []):
            technique = OptimizationTechnique(
                name=tech_data.get("name", "Unknown"),
                description=tech_data.get("description", ""),
                estimated_savings=tech_data.get("estimatedSavings", "0"),
                difficulty=OptimizationDifficulty(tech_data.get("difficulty", "MEDIUM"))
            )
            techniques.append(technique)
        
        gas_optimization = GasOptimization(
            potential_savings=gas_opt_data.get("potentialSavings", "0"),
            techniques=techniques
        )
        
        # Parse risk level
        try:
            risk_level = RiskLevel(analysis.get("riskLevel", "MEDIUM"))
        except ValueError:
            risk_level = RiskLevel.MEDIUM
        
        return AIInsights(
            risk_level=risk_level,
            gas_optimization=gas_optimization,
            security_warnings=analysis.get("securityWarnings", []),
            performance_suggestions=analysis.get("performanceSuggestions", []),
            explanation=analysis.get("explanation", "Analysis completed"),
            confidence=analysis.get("confidence", 0.8),
            recommendations=analysis.get("recommendations", [])
        )
    
    def _parse_bundle_optimization(self, optimization: Dict[str, Any], simulations: List[SimulationResult]) -> BundleOptimization:
        """Parse bundle optimization response."""
        total_gas = sum(int(sim.gas_used) for sim in simulations)
        gas_saved = int(optimization.get("gasSavings", "0").replace(" gas", "").replace(",", "") or "0")
        
        return BundleOptimization(
            original_gas=str(total_gas),
            optimized_gas=str(max(0, total_gas - gas_saved)),
            gas_saved=str(gas_saved),
            suggestions=optimization.get("suggestions", []),
            reordered_indices=optimization.get("reorderedIndices", list(range(len(simulations)))),
            warnings=optimization.get("warnings"),
            confidence=optimization.get("confidence")
        )
    
    async def close(self) -> None:
        """Close the AI analyzer and cleanup resources."""
        await self.client.close()
        
        if self.config.debug:
            print("[AI Analyzer] Closed")
