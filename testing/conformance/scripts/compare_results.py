#!/usr/bin/env python3

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import statistics
import argparse
from datetime import datetime

@dataclass
class ComparisonResult:
    test_id: str
    languages: List[str]
    results_match: bool
    performance_variance: float
    errors: List[str]
    details: Dict[str, Any]

@dataclass
class LanguageReport:
    language: str
    success_rate: float
    avg_execution_time: float
    total_memory_usage: float
    test_results: List[Dict[str, Any]]

class CrossLanguageComparator:
    def __init__(self, reports_dir: str):
        self.reports_dir = Path(reports_dir)
        self.languages = ['typescript', 'python', 'rust', 'go', 'java']
        self.reports: Dict[str, Dict[str, Any]] = {}
        self.comparison_results: List[ComparisonResult] = []
    
    def load_reports(self) -> bool:
        """Load all language test reports"""
        missing_reports = []
        
        for language in self.languages:
            report_file = self.reports_dir / f'{language}-results.json'
            if report_file.exists():
                with open(report_file, 'r') as f:
                    self.reports[language] = json.load(f)
                print(f"✓ Loaded {language} report")
            else:
                missing_reports.append(language)
                print(f"✗ Missing {language} report at {report_file}")
        
        if missing_reports:
            print(f"\nWarning: Missing reports for: {', '.join(missing_reports)}")
            print("Continuing with available reports...\n")
        
        return len(self.reports) > 1
    
    def compare_test_results(self) -> List[ComparisonResult]:
        """Compare test results across all languages"""
        if not self.reports:
            return []
        
        # Get all unique test IDs
        all_test_ids = set()
        for report in self.reports.values():
            for result in report['detailed_results']:
                all_test_ids.add(result['test_id'])
        
        comparison_results = []
        
        for test_id in all_test_ids:
            comparison = self._compare_single_test(test_id)
            comparison_results.append(comparison)
        
        return comparison_results
    
    def _compare_single_test(self, test_id: str) -> ComparisonResult:
        """Compare a single test across all languages"""
        test_results = {}
        execution_times = []
        memory_usages = []
        languages_with_results = []
        errors = []
        
        # Collect results for this test from all languages
        for language, report in self.reports.items():
            test_result = self._find_test_result(report['detailed_results'], test_id)
            if test_result:
                test_results[language] = test_result
                execution_times.append(test_result['execution_time_ms'])
                memory_usages.append(test_result['memory_usage_mb'])
                languages_with_results.append(language)
            else:
                errors.append(f"Test {test_id} not found in {language} results")
        
        if len(languages_with_results) < 2:
            return ComparisonResult(
                test_id=test_id,
                languages=languages_with_results,
                results_match=False,
                performance_variance=100.0,
                errors=errors + [f"Insufficient results for comparison (only {len(languages_with_results)} languages)"],
                details={}
            )
        
        # Check result consistency
        results_match = self._check_results_consistency(test_results)
        
        # Calculate performance variance
        performance_variance = 0.0
        if len(execution_times) > 1:
            performance_variance = (statistics.stdev(execution_times) / statistics.mean(execution_times)) * 100
        
        return ComparisonResult(
            test_id=test_id,
            languages=languages_with_results,
            results_match=results_match,
            performance_variance=performance_variance,
            errors=errors,
            details={
                'execution_times': dict(zip(languages_with_results, execution_times)),
                'memory_usages': dict(zip(languages_with_results, memory_usages)),
                'results': test_results
            }
        )
    
    def _find_test_result(self, results: List[Dict], test_id: str) -> Optional[Dict]:
        """Find a specific test result by ID"""
        for result in results:
            if result['test_id'] == test_id:
                return result
        return None
    
    def _check_results_consistency(self, test_results: Dict[str, Dict]) -> bool:
        """Check if test results are consistent across languages"""
        if len(test_results) < 2:
            return False
        
        # Get the first result as reference
        reference_lang = next(iter(test_results.keys()))
        reference_result = test_results[reference_lang]
        
        reference_success = reference_result['success']
        reference_data = reference_result.get('result')
        
        # Compare with all other results
        for language, result in test_results.items():
            if language == reference_lang:
                continue
            
            # Check success status consistency
            if result['success'] != reference_success:
                return False
            
            # If test failed, compare error codes
            if not reference_success:
                ref_error_code = self._extract_error_code(reference_result)
                curr_error_code = self._extract_error_code(result)
                if ref_error_code != curr_error_code:
                    return False
            else:
                # For successful tests, compare key result fields
                if not self._compare_result_data(reference_data, result.get('result')):
                    return False
        
        return True
    
    def _extract_error_code(self, result: Dict) -> str:
        """Extract error code from test result"""
        if result.get('error'):
            return result['error'].get('code', 'UNKNOWN')
        if result.get('result', {}).get('error'):
            return result['result']['error'].get('code', 'UNKNOWN')
        return 'NO_ERROR'
    
    def _compare_result_data(self, data1: Any, data2: Any) -> bool:
        """Compare result data structures (simplified comparison)"""
        if data1 is None or data2 is None:
            return data1 == data2
        
        if isinstance(data1, dict) and isinstance(data2, dict):
            # Compare key result fields
            key_fields = ['success', 'status', 'gasUsed', 'riskScore', 'classification']
            for field in key_fields:
                if field in data1 and field in data2:
                    if data1[field] != data2[field]:
                        return False
        
        return True
    
    def analyze_performance(self) -> Dict[str, Any]:
        """Analyze performance across languages"""
        performance_analysis = {
            'language_rankings': {},
            'performance_summary': {},
            'variance_analysis': {}
        }
        
        # Calculate average performance per language
        for language, report in self.reports.items():
            summary = report['summary']
            performance_analysis['language_rankings'][language] = {
                'avg_execution_time': summary['average_execution_time_ms'],
                'success_rate': summary['success_rate'],
                'total_memory_usage': summary['total_memory_usage_mb']
            }
        
        # Rank languages by performance
        sorted_by_speed = sorted(
            performance_analysis['language_rankings'].items(),
            key=lambda x: x[1]['avg_execution_time']
        )
        
        sorted_by_memory = sorted(
            performance_analysis['language_rankings'].items(),
            key=lambda x: x[1]['total_memory_usage']
        )
        
        performance_analysis['performance_summary'] = {
            'fastest_language': sorted_by_speed[0][0],
            'slowest_language': sorted_by_speed[-1][0],
            'most_memory_efficient': sorted_by_memory[0][0],
            'least_memory_efficient': sorted_by_memory[-1][0],
            'speed_ranking': [lang for lang, _ in sorted_by_speed],
            'memory_ranking': [lang for lang, _ in sorted_by_memory]
        }
        
        return performance_analysis
    
    def generate_conformance_report(self) -> Dict[str, Any]:
        """Generate comprehensive conformance report"""
        comparison_results = self.compare_test_results()
        performance_analysis = self.analyze_performance()
        
        total_tests = len(comparison_results)
        matching_tests = len([r for r in comparison_results if r.results_match])
        conformance_rate = (matching_tests / total_tests) * 100 if total_tests > 0 else 0
        
        # Calculate average performance variance
        variances = [r.performance_variance for r in comparison_results if r.performance_variance < 100]
        avg_performance_variance = statistics.mean(variances) if variances else 100.0
        
        # Identify problematic tests
        problematic_tests = [
            {
                'test_id': r.test_id,
                'issues': r.errors,
                'variance': r.performance_variance
            }
            for r in comparison_results 
            if not r.results_match or r.performance_variance > 50
        ]
        
        report = {
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'languages_tested': list(self.reports.keys()),
                'total_languages': len(self.reports),
                'report_version': '1.0.0'
            },
            'summary': {
                'total_tests': total_tests,
                'matching_tests': matching_tests,
                'conformance_rate': conformance_rate,
                'avg_performance_variance': avg_performance_variance,
                'problematic_tests_count': len(problematic_tests)
            },
            'detailed_comparison': [
                {
                    'test_id': r.test_id,
                    'languages': r.languages,
                    'results_match': r.results_match,
                    'performance_variance': r.performance_variance,
                    'errors': r.errors
                }
                for r in comparison_results
            ],
            'performance_analysis': performance_analysis,
            'problematic_tests': problematic_tests,
            'language_reports': {
                lang: {
                    'success_rate': report['summary']['success_rate'],
                    'total_tests': report['summary']['total_tests'],
                    'passed': report['summary']['passed'],
                    'failed': report['summary']['failed']
                }
                for lang, report in self.reports.items()
            }
        }
        
        return report
    
    def print_summary(self, report: Dict[str, Any]) -> None:
        """Print a human-readable summary"""
        print("\n" + "=" * 80)
        print("HYPERSIM SDK CROSS-LANGUAGE CONFORMANCE REPORT")
        print("=" * 80)
        
        metadata = report['metadata']
        summary = report['summary']
        
        print(f"\nGenerated: {metadata['generated_at']}")
        print(f"Languages Tested: {', '.join(metadata['languages_tested'])}")
        print(f"Total Languages: {metadata['total_languages']}")
        
        print("\n" + "-" * 50)
        print("CONFORMANCE SUMMARY")
        print("-" * 50)
        
        print(f"Total Tests: {summary['total_tests']}")
        print(f"Matching Tests: {summary['matching_tests']}")
        print(f"Conformance Rate: {summary['conformance_rate']:.1f}%")
        print(f"Avg Performance Variance: {summary['avg_performance_variance']:.1f}%")
        print(f"Problematic Tests: {summary['problematic_tests_count']}")
        
        # Performance rankings
        perf = report['performance_analysis']['performance_summary']
        print("\n" + "-" * 50)
        print("PERFORMANCE ANALYSIS")
        print("-" * 50)
        print(f"Fastest Language: {perf['fastest_language']}")
        print(f"Most Memory Efficient: {perf['most_memory_efficient']}")
        print(f"Speed Ranking: {' > '.join(perf['speed_ranking'])}")
        print(f"Memory Ranking: {' > '.join(perf['memory_ranking'])}")
        
        # Language-specific results
        print("\n" + "-" * 50)
        print("LANGUAGE-SPECIFIC RESULTS")
        print("-" * 50)
        
        for language, lang_report in report['language_reports'].items():
            success_rate = lang_report['success_rate']
            status = "✓" if success_rate >= 95 else "⚠" if success_rate >= 80 else "✗"
            print(f"{status} {language.upper():10s}: {lang_report['passed']:2d}/{lang_report['total_tests']:2d} tests ({success_rate:5.1f}%)")
        
        # Problematic tests
        if summary['problematic_tests_count'] > 0:
            print("\n" + "-" * 50)
            print("PROBLEMATIC TESTS")
            print("-" * 50)
            
            for test in report['problematic_tests'][:10]:  # Show top 10
                print(f"• {test['test_id']} (variance: {test['variance']:.1f}%)")
                for issue in test['issues'][:3]:  # Show top 3 issues
                    print(f"  - {issue}")
        
        print("\n" + "=" * 80)
        
        # Final verdict
        if summary['conformance_rate'] >= 95:
            print("🎉 EXCELLENT: All SDKs demonstrate high conformance!")
        elif summary['conformance_rate'] >= 80:
            print("✅ GOOD: SDKs show good conformance with minor discrepancies.")
        elif summary['conformance_rate'] >= 60:
            print("⚠️  WARNING: Significant conformance issues detected.")
        else:
            print("❌ CRITICAL: Major conformance problems require immediate attention.")
        
        print("=" * 80)

def main():
    parser = argparse.ArgumentParser(description='Compare HyperSim SDK conformance across languages')
    parser.add_argument('--reports-dir', '-r', 
                       default='./reports',
                       help='Directory containing language test reports')
    parser.add_argument('--output', '-o',
                       default='./reports/conformance-report.json',
                       help='Output file for conformance report')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose output')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.reports_dir):
        print(f"Error: Reports directory '{args.reports_dir}' does not exist")
        sys.exit(1)
    
    comparator = CrossLanguageComparator(args.reports_dir)
    
    print("Loading language test reports...")
    if not comparator.load_reports():
        print("Error: Failed to load sufficient reports for comparison")
        sys.exit(1)
    
    print("\nComparing test results across languages...")
    report = comparator.generate_conformance_report()
    
    # Save report
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\nConformance report saved to: {args.output}")
    
    # Print summary
    comparator.print_summary(report)
    
    # Exit with appropriate code
    conformance_rate = report['summary']['conformance_rate']
    if conformance_rate < 80:
        sys.exit(1)  # Fail if conformance is below 80%

if __name__ == '__main__':
    main()
