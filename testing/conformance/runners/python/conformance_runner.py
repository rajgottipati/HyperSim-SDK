#!/usr/bin/env python3

import json
import time
import psutil
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import asyncio

# Import the HyperSim SDK
sys.path.append(os.path.join(os.path.dirname(__file__), '../../python'))
from hypersim_sdk import HyperSimSDK
from hypersim_sdk.exceptions import HyperSimError

@dataclass
class TestResult:
    test_id: str
    description: str
    success: bool
    execution_time_ms: float
    memory_usage_mb: float
    result: Optional[Dict[str, Any]] = None
    error: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

class ConformanceTestRunner:
    def __init__(self):
        self.sdk = HyperSimSDK({
            'hyperCore': {
                'url': os.getenv('HYPERCORE_URL', 'https://api.hypersim.io/hypercore'),
                'apiKey': os.getenv('HYPERCORE_API_KEY', 'test_key_123')
            },
            'hyperEVM': {
                'url': os.getenv('HYPEREVM_URL', 'https://api.hypersim.io/hyperevm'),
                'apiKey': os.getenv('HYPEREVM_API_KEY', 'test_key_456')
            }
        })
        self.results: List[TestResult] = []
        self.process = psutil.Process()
        
        # Load test specifications
        base_path = Path(__file__).parent.parent.parent
        with open(base_path / 'specifications' / 'master_test_spec.json') as f:
            self.master_spec = json.load(f)
        with open(base_path / 'test_data' / 'simulation_inputs.json') as f:
            self.test_data = json.load(f)
        with open(base_path / 'test_data' / 'expected_outputs.json') as f:
            self.expected_outputs = json.load(f)
    
    async def run_test(self, test_case: Dict[str, Any]) -> TestResult:
        start_time = time.time()
        initial_memory = self.process.memory_info().rss / 1024 / 1024  # MB
        
        try:
            result = None
            test_name = test_case.get('name')
            
            if test_name == 'sdk_initialization':
                result = await self.test_sdk_initialization(test_case)
            elif test_name == 'simulate_transaction':
                result = await self.test_transaction_simulation(test_case)
            elif test_name == 'analyze_transaction':
                result = await self.test_ai_analysis(test_case)
            elif test_name == 'handle_invalid_input':
                result = await self.test_error_handling(test_case)
            else:
                raise ValueError(f"Unknown test case: {test_name}")
            
            end_time = time.time()
            final_memory = self.process.memory_info().rss / 1024 / 1024  # MB
            
            return TestResult(
                test_id=test_case['id'],
                description=test_case['description'],
                success=True,
                execution_time_ms=(end_time - start_time) * 1000,
                memory_usage_mb=final_memory - initial_memory,
                result=result,
                metadata={
                    'language': 'python',
                    'timestamp': int(time.time() * 1000),
                    'sdk_version': '1.0.0'
                }
            )
            
        except Exception as error:
            end_time = time.time()
            final_memory = self.process.memory_info().rss / 1024 / 1024  # MB
            
            return TestResult(
                test_id=test_case['id'],
                description=test_case['description'],
                success=False,
                execution_time_ms=(end_time - start_time) * 1000,
                memory_usage_mb=final_memory - initial_memory,
                error={
                    'message': str(error),
                    'type': type(error).__name__
                },
                metadata={
                    'language': 'python',
                    'timestamp': int(time.time() * 1000),
                    'sdk_version': '1.0.0'
                }
            )
    
    async def test_sdk_initialization(self, test_case: Dict[str, Any]) -> Dict[str, Any]:
        config = test_case['input']['config']
        sdk = HyperSimSDK(config)
        
        return {
            'success': True,
            'sdk_initialized': True,
            'clients_ready': True,
            'plugins_loaded': len(config.get('plugins', []))
        }
    
    async def test_transaction_simulation(self, test_case: Dict[str, Any]) -> Dict[str, Any]:
        input_data = test_case['input']
        transaction = input_data['transaction']
        network = input_data['network']
        block_number = input_data['blockNumber']
        
        result = await self.sdk.simulation.simulate({
            'transaction': transaction,
            'network': network,
            'blockNumber': block_number
        })
        
        return {
            'success': True,
            'gasUsed': result.get('gasUsed'),
            'status': result.get('status'),
            'logs': result.get('logs', []),
            'returnValue': result.get('returnValue', '0x'),
            'balanceChanges': result.get('balanceChanges', [])
        }
    
    async def test_ai_analysis(self, test_case: Dict[str, Any]) -> Dict[str, Any]:
        input_data = test_case['input']
        transaction = input_data['transaction']
        analysis_type = input_data['analysisType']
        
        result = await self.sdk.ai.analyze({
            'transaction': transaction,
            'type': analysis_type
        })
        
        return {
            'success': True,
            'analysis': {
                'riskScore': result.get('riskScore'),
                'classification': result.get('classification'),
                'insights': result.get('insights', [])
            }
        }
    
    async def test_error_handling(self, test_case: Dict[str, Any]) -> Dict[str, Any]:
        try:
            await self.sdk.simulation.simulate(test_case['input'])
            raise Exception('Expected error but operation succeeded')
        except HyperSimError as error:
            return {
                'success': False,
                'error': {
                    'code': getattr(error, 'code', 'UNKNOWN_ERROR'),
                    'message': str(error),
                    'details': getattr(error, 'details', {})
                }
            }
    
    async def run_all_tests(self) -> List[TestResult]:
        print('Running Python conformance tests...')
        
        for category in self.master_spec['test_categories'].values():
            for operation in category['operations']:
                for test_case in operation['test_cases']:
                    print(f"Running test: {test_case['id']} - {test_case['description']}")
                    test_case_with_name = {**test_case, 'name': operation['name']}
                    result = await self.run_test(test_case_with_name)
                    self.results.append(result)
        
        return self.results
    
    def generate_report(self) -> Dict[str, Any]:
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r.success)
        failed_tests = total_tests - passed_tests
        average_execution_time = sum(r.execution_time_ms for r in self.results) / total_tests if total_tests > 0 else 0
        total_memory_usage = sum(r.memory_usage_mb for r in self.results)
        
        return {
            'summary': {
                'language': 'python',
                'total_tests': total_tests,
                'passed': passed_tests,
                'failed': failed_tests,
                'success_rate': (passed_tests / total_tests) * 100 if total_tests > 0 else 0,
                'average_execution_time_ms': average_execution_time,
                'total_memory_usage_mb': total_memory_usage,
                'timestamp': int(time.time() * 1000)
            },
            'detailed_results': [asdict(result) for result in self.results],
            'performance_metrics': {
                'execution_times': [
                    {
                        'test_id': r.test_id,
                        'execution_time_ms': r.execution_time_ms
                    } for r in self.results
                ],
                'memory_usage': [
                    {
                        'test_id': r.test_id,
                        'memory_usage_mb': r.memory_usage_mb
                    } for r in self.results
                ]
            }
        }

if __name__ == '__main__':
    async def main():
        runner = ConformanceTestRunner()
        await runner.run_all_tests()
        report = runner.generate_report()
        
        # Save report
        output_path = Path(__file__).parent.parent.parent / 'reports' / 'python-results.json'
        output_path.parent.mkdir(exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"Report saved to: {output_path}")
        print(f"Tests passed: {report['summary']['passed']}/{report['summary']['total_tests']}")
        print(f"Success rate: {report['summary']['success_rate']:.1f}%")
    
    asyncio.run(main())
