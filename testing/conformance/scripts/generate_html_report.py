#!/usr/bin/env python3

import json
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
import argparse
import base64

class ConformanceReportGenerator:
    def __init__(self, reports_dir: str, output_dir: str):
        self.reports_dir = Path(reports_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_html_report(self) -> str:
        """Generate comprehensive HTML report"""
        # Load all available reports
        conformance_report = self._load_json_report('conformance-report.json')
        integration_report = self._load_json_report('integration-report.json')
        language_reports = self._load_language_reports()
        
        html_content = self._generate_html_content(
            conformance_report, integration_report, language_reports
        )
        
        output_file = self.output_dir / 'conformance-dashboard.html'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return str(output_file)
    
    def _load_json_report(self, filename: str) -> Dict[str, Any]:
        """Load JSON report file"""
        report_file = self.reports_dir / filename
        if report_file.exists():
            with open(report_file, 'r') as f:
                return json.load(f)
        return {}
    
    def _load_language_reports(self) -> Dict[str, Dict[str, Any]]:
        """Load individual language reports"""
        languages = ['typescript', 'python', 'rust', 'go', 'java']
        reports = {}
        
        for lang in languages:
            report_file = self.reports_dir / f'{lang}-results.json'
            if report_file.exists():
                with open(report_file, 'r') as f:
                    reports[lang] = json.load(f)
        
        return reports
    
    def _generate_html_content(self, conformance_report: Dict, integration_report: Dict, 
                             language_reports: Dict[str, Dict]) -> str:
        """Generate the complete HTML content"""
        
        html_template = f'''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HyperSim SDK Conformance Dashboard</title>
    <style>
        {self._get_css_styles()}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="header-content">
                <h1><span class="logo">HyperSim SDK</span> Conformance Dashboard</h1>
                <div class="header-meta">
                    <span class="timestamp">Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</span>
                    <span class="version">Report Version: 1.0.0</span>
                </div>
            </div>
        </header>
        
        <main class="main-content">
            {self._generate_executive_summary(conformance_report, integration_report, language_reports)}
            
            {self._generate_conformance_section(conformance_report)}
            
            {self._generate_performance_section(conformance_report, language_reports)}
            
            {self._generate_language_details_section(language_reports)}
            
            {self._generate_integration_section(integration_report)}
            
            {self._generate_detailed_results_section(conformance_report)}
        </main>
        
        <footer class="footer">
            <p>&copy; 2025 HyperSim - Cross-Language SDK Conformance Testing</p>
        </footer>
    </div>
    
    <script>
        {self._get_javascript_code(conformance_report, language_reports)}
    </script>
</body>
</html>
        '''
        
        return html_template
    
    def _get_css_styles(self) -> str:
        """Return CSS styles for the HTML report"""
        return '''
        :root {
            --primary-color: #2563eb;
            --secondary-color: #f1f5f9;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --error-color: #ef4444;
            --text-color: #1f2937;
            --border-color: #e5e7eb;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        .header {
            background: linear-gradient(135deg, var(--primary-color) 0%, #1d4ed8 100%);
            color: white;
            padding: 2rem 0;
            margin-bottom: 2rem;
            border-radius: 0 0 1rem 1rem;
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
        }
        
        .logo {
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: bold;
        }
        
        .header-meta {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 0.25rem;
            font-size: 0.875rem;
            opacity: 0.9;
        }
        
        .card {
            background: white;
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            border: 1px solid var(--border-color);
        }
        
        .card-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: var(--text-color);
            border-bottom: 2px solid var(--secondary-color);
            padding-bottom: 0.5rem;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        
        .summary-item {
            text-align: center;
            padding: 1rem;
            background: var(--secondary-color);
            border-radius: 0.5rem;
        }
        
        .summary-value {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.25rem;
        }
        
        .summary-label {
            font-size: 0.875rem;
            color: #6b7280;
            font-weight: 500;
        }
        
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 0.5rem;
        }
        
        .status-success { background-color: var(--success-color); }
        .status-warning { background-color: var(--warning-color); }
        .status-error { background-color: var(--error-color); }
        
        .language-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1rem;
        }
        
        .language-card {
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            padding: 1rem;
            background: white;
        }
        
        .language-header {
            display: flex;
            align-items: center;
            margin-bottom: 0.75rem;
        }
        
        .language-name {
            font-weight: 600;
            font-size: 1.1rem;
            margin-left: 0.5rem;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
        }
        
        .metric-label {
            color: #6b7280;
            font-size: 0.875rem;
        }
        
        .metric-value {
            font-weight: 500;
        }
        
        .chart-container {
            position: relative;
            height: 300px;
            margin: 1rem 0;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background-color: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            margin: 0.5rem 0;
        }
        
        .progress-fill {
            height: 100%;
            transition: width 0.3s ease;
        }
        
        .tabs {
            display: flex;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 1rem;
        }
        
        .tab {
            padding: 0.75rem 1.5rem;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 0.875rem;
            font-weight: 500;
            color: #6b7280;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }
        
        .tab.active {
            color: var(--primary-color);
            border-bottom-color: var(--primary-color);
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .footer {
            text-align: center;
            padding: 2rem 0;
            border-top: 1px solid var(--border-color);
            margin-top: 2rem;
            color: #6b7280;
            font-size: 0.875rem;
        }
        
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                gap: 1rem;
            }
            
            .header-meta {
                align-items: center;
            }
            
            .summary-grid {
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            }
            
            .language-grid {
                grid-template-columns: 1fr;
            }
        }
        '''
    
    def _generate_executive_summary(self, conformance_report: Dict, integration_report: Dict, 
                                  language_reports: Dict[str, Dict]) -> str:
        """Generate executive summary section"""
        if not conformance_report:
            return '<div class="card"><h2 class="card-title">Executive Summary</h2><p>No conformance data available.</p></div>'
        
        summary = conformance_report.get('summary', {})
        conformance_rate = summary.get('conformance_rate', 0)
        total_tests = summary.get('total_tests', 0)
        matching_tests = summary.get('matching_tests', 0)
        
        # Determine overall status
        if conformance_rate >= 95:
            status_class = 'status-success'
            status_text = 'EXCELLENT'
        elif conformance_rate >= 80:
            status_class = 'status-warning'
            status_text = 'GOOD'
        else:
            status_class = 'status-error'
            status_text = 'NEEDS ATTENTION'
        
        integration_success_rate = integration_report.get('summary', {}).get('success_rate', 0) if integration_report else 0
        
        return f'''
        <div class="card">
            <h2 class="card-title">
                <span class="status-indicator {status_class}"></span>
                Executive Summary - {status_text}
            </h2>
            
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-value" style="color: var(--primary-color);">{conformance_rate:.1f}%</div>
                    <div class="summary-label">API Conformance</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value" style="color: var(--success-color);">{matching_tests}</div>
                    <div class="summary-label">Matching Tests</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value" style="color: var(--text-color);">{len(language_reports)}</div>
                    <div class="summary-label">Languages Tested</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value" style="color: var(--warning-color);">{integration_success_rate:.1f}%</div>
                    <div class="summary-label">Integration Success</div>
                </div>
            </div>
            
            <div style="background: var(--secondary-color); padding: 1rem; border-radius: 0.5rem; margin-top: 1rem;">
                <h3 style="margin-bottom: 0.5rem;">Key Findings</h3>
                <ul style="margin-left: 1.5rem;">
                    <li>Cross-language API consistency: <strong>{conformance_rate:.1f}%</strong></li>
                    <li>Total test scenarios executed: <strong>{total_tests}</strong></li>
                    <li>Languages achieving >95% success rate: <strong>{len([l for l, r in language_reports.items() if r.get('summary', {}).get('success_rate', 0) > 95])}</strong></li>
                    <li>Integration tests passed: <strong>{integration_report.get('summary', {}).get('passed', 0) if integration_report else 0}</strong></li>
                </ul>
            </div>
        </div>
        '''
    
    def _generate_conformance_section(self, conformance_report: Dict) -> str:
        """Generate conformance analysis section"""
        if not conformance_report:
            return ''
        
        summary = conformance_report.get('summary', {})
        performance_analysis = conformance_report.get('performance_analysis', {})
        
        fastest_lang = performance_analysis.get('performance_summary', {}).get('fastest_language', 'N/A')
        most_efficient = performance_analysis.get('performance_summary', {}).get('most_memory_efficient', 'N/A')
        
        return f'''
        <div class="card">
            <h2 class="card-title">Cross-Language Conformance Analysis</h2>
            
            <div class="chart-container">
                <canvas id="conformanceChart"></canvas>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 1.5rem;">
                <div>
                    <h3 style="margin-bottom: 1rem;">Performance Leaders</h3>
                    <div class="metric">
                        <span class="metric-label">Fastest Language:</span>
                        <span class="metric-value">{fastest_lang}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Most Memory Efficient:</span>
                        <span class="metric-value">{most_efficient}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Avg Performance Variance:</span>
                        <span class="metric-value">{summary.get('avg_performance_variance', 0):.1f}%</span>
                    </div>
                </div>
                
                <div>
                    <h3 style="margin-bottom: 1rem;">Test Coverage</h3>
                    <div class="metric">
                        <span class="metric-label">Total Test Scenarios:</span>
                        <span class="metric-value">{summary.get('total_tests', 0)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Consistent Results:</span>
                        <span class="metric-value">{summary.get('matching_tests', 0)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Problematic Tests:</span>
                        <span class="metric-value">{summary.get('problematic_tests_count', 0)}</span>
                    </div>
                </div>
            </div>
        </div>
        '''
    
    def _generate_performance_section(self, conformance_report: Dict, language_reports: Dict) -> str:
        """Generate performance comparison section"""
        return f'''
        <div class="card">
            <h2 class="card-title">Performance Comparison</h2>
            
            <div class="tabs">
                <button class="tab active" onclick="showTab(event, 'speed-tab')">Execution Speed</button>
                <button class="tab" onclick="showTab(event, 'memory-tab')">Memory Usage</button>
                <button class="tab" onclick="showTab(event, 'throughput-tab')">Throughput</button>
            </div>
            
            <div id="speed-tab" class="tab-content active">
                <div class="chart-container">
                    <canvas id="speedChart"></canvas>
                </div>
            </div>
            
            <div id="memory-tab" class="tab-content">
                <div class="chart-container">
                    <canvas id="memoryChart"></canvas>
                </div>
            </div>
            
            <div id="throughput-tab" class="tab-content">
                <div class="chart-container">
                    <canvas id="throughputChart"></canvas>
                </div>
            </div>
        </div>
        '''
    
    def _generate_language_details_section(self, language_reports: Dict) -> str:
        """Generate detailed language-specific results"""
        if not language_reports:
            return ''
        
        language_cards = []
        for lang, report in language_reports.items():
            summary = report.get('summary', {})
            success_rate = summary.get('success_rate', 0)
            
            if success_rate >= 95:
                status_class = 'status-success'
            elif success_rate >= 80:
                status_class = 'status-warning'
            else:
                status_class = 'status-error'
            
            language_cards.append(f'''
                <div class="language-card">
                    <div class="language-header">
                        <span class="status-indicator {status_class}"></span>
                        <span class="language-name">{lang.title()}</span>
                    </div>
                    
                    <div class="metric">
                        <span class="metric-label">Success Rate:</span>
                        <span class="metric-value">{success_rate:.1f}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: {success_rate}%; background-color: {'var(--success-color)' if success_rate >= 95 else 'var(--warning-color)' if success_rate >= 80 else 'var(--error-color)'};"></div>
                    </div>
                    
                    <div class="metric">
                        <span class="metric-label">Tests Passed:</span>
                        <span class="metric-value">{summary.get('passed', 0)}/{summary.get('total_tests', 0)}</span>
                    </div>
                    
                    <div class="metric">
                        <span class="metric-label">Avg Execution Time:</span>
                        <span class="metric-value">{summary.get('average_execution_time_ms', 0):.1f}ms</span>
                    </div>
                    
                    <div class="metric">
                        <span class="metric-label">Memory Usage:</span>
                        <span class="metric-value">{summary.get('total_memory_usage_mb', 0):.1f}MB</span>
                    </div>
                </div>
            ''')
        
        return f'''
        <div class="card">
            <h2 class="card-title">Language-Specific Results</h2>
            <div class="language-grid">
                {' '.join(language_cards)}
            </div>
        </div>
        '''
    
    def _generate_integration_section(self, integration_report: Dict) -> str:
        """Generate integration test results section"""
        if not integration_report:
            return ''
        
        summary = integration_report.get('summary', {})
        test_results = integration_report.get('test_results', [])
        
        results_html = []
        for result in test_results:
            status_icon = '✓' if result.get('success') else '✗'
            status_class = 'status-success' if result.get('success') else 'status-error'
            
            results_html.append(f'''
                <tr>
                    <td><span class="status-indicator {status_class}"></span> {status_icon}</td>
                    <td>{result.get('test_name', 'Unknown')}</td>
                    <td>{result.get('description', 'No description')}</td>
                    <td>{result.get('execution_time_ms', 0):.1f}ms</td>
                </tr>
            ''')
        
        return f'''
        <div class="card">
            <h2 class="card-title">Cross-Language Integration Tests</h2>
            
            <div class="summary-grid" style="margin-bottom: 1.5rem;">
                <div class="summary-item">
                    <div class="summary-value" style="color: var(--success-color);">{summary.get('passed', 0)}</div>
                    <div class="summary-label">Passed</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value" style="color: var(--error-color);">{summary.get('failed', 0)}</div>
                    <div class="summary-label">Failed</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value" style="color: var(--primary-color);">{summary.get('success_rate', 0):.1f}%</div>
                    <div class="summary-label">Success Rate</div>
                </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: var(--secondary-color);">
                    <tr>
                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color);">Status</th>
                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color);">Test</th>
                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color);">Description</th>
                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color);">Time</th>
                    </tr>
                </thead>
                <tbody>
                    {' '.join(results_html)}
                </tbody>
            </table>
        </div>
        '''
    
    def _generate_detailed_results_section(self, conformance_report: Dict) -> str:
        """Generate detailed test results section"""
        if not conformance_report:
            return ''
        
        detailed_comparison = conformance_report.get('detailed_comparison', [])
        
        results_html = []
        for comparison in detailed_comparison[:20]:  # Show top 20 for performance
            status_icon = '✓' if comparison.get('results_match') else '✗'
            status_class = 'status-success' if comparison.get('results_match') else 'status-error'
            
            results_html.append(f'''
                <tr>
                    <td><span class="status-indicator {status_class}"></span> {status_icon}</td>
                    <td>{comparison.get('test_id', 'Unknown')}</td>
                    <td>{', '.join(comparison.get('languages', []))}</td>
                    <td>{comparison.get('performance_variance', 0):.1f}%</td>
                    <td>{len(comparison.get('errors', []))}</td>
                </tr>
            ''')
        
        return f'''
        <div class="card">
            <h2 class="card-title">Detailed Test Comparison Results</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: var(--secondary-color);">
                    <tr>
                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color);">Match</th>
                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color);">Test ID</th>
                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color);">Languages</th>
                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color);">Perf Variance</th>
                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color);">Issues</th>
                    </tr>
                </thead>
                <tbody>
                    {' '.join(results_html)}
                </tbody>
            </table>
            
            <p style="margin-top: 1rem; font-size: 0.875rem; color: #6b7280;">
                Showing first 20 results. See full JSON reports for complete details.
            </p>
        </div>
        '''
    
    def _get_javascript_code(self, conformance_report: Dict, language_reports: Dict) -> str:
        """Generate JavaScript code for interactive charts"""
        # Extract data for charts
        language_names = list(language_reports.keys())
        success_rates = [language_reports[lang].get('summary', {}).get('success_rate', 0) for lang in language_names]
        execution_times = [language_reports[lang].get('summary', {}).get('average_execution_time_ms', 0) for lang in language_names]
        memory_usage = [language_reports[lang].get('summary', {}).get('total_memory_usage_mb', 0) for lang in language_names]
        
        return f'''
        // Chart data
        const languageNames = {json.dumps([lang.title() for lang in language_names])};
        const successRates = {json.dumps(success_rates)};
        const executionTimes = {json.dumps(execution_times)};
        const memoryUsage = {json.dumps(memory_usage)};
        
        // Initialize charts when page loads
        document.addEventListener('DOMContentLoaded', function() {{
            initializeCharts();
        }});
        
        function initializeCharts() {{
            // Conformance Chart
            const conformanceCtx = document.getElementById('conformanceChart');
            if (conformanceCtx) {{
                new Chart(conformanceCtx, {{
                    type: 'bar',
                    data: {{
                        labels: languageNames,
                        datasets: [{{
                            label: 'Success Rate (%)',
                            data: successRates,
                            backgroundColor: successRates.map(rate => 
                                rate >= 95 ? '#10b981' : rate >= 80 ? '#f59e0b' : '#ef4444'
                            ),
                            borderWidth: 1
                        }}]
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {{
                            y: {{
                                beginAtZero: true,
                                max: 100
                            }}
                        }}
                    }}
                }});
            }}
            
            // Speed Chart
            const speedCtx = document.getElementById('speedChart');
            if (speedCtx) {{
                new Chart(speedCtx, {{
                    type: 'line',
                    data: {{
                        labels: languageNames,
                        datasets: [{{
                            label: 'Avg Execution Time (ms)',
                            data: executionTimes,
                            borderColor: '#2563eb',
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            fill: true,
                            tension: 0.4
                        }}]
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {{
                            y: {{
                                beginAtZero: true
                            }}
                        }}
                    }}
                }});
            }}
            
            // Memory Chart
            const memoryCtx = document.getElementById('memoryChart');
            if (memoryCtx) {{
                new Chart(memoryCtx, {{
                    type: 'doughnut',
                    data: {{
                        labels: languageNames,
                        datasets: [{{
                            data: memoryUsage,
                            backgroundColor: [
                                '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'
                            ]
                        }}]
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false
                    }}
                }});
            }}
        }}
        
        function showTab(event, tabId) {{
            // Hide all tab contents
            const tabContents = document.getElementsByClassName('tab-content');
            for (let content of tabContents) {{
                content.classList.remove('active');
            }}
            
            // Remove active class from all tabs
            const tabs = document.getElementsByClassName('tab');
            for (let tab of tabs) {{
                tab.classList.remove('active');
            }}
            
            // Show selected tab content and mark tab as active
            document.getElementById(tabId).classList.add('active');
            event.currentTarget.classList.add('active');
        }}
        '''

def main():
    parser = argparse.ArgumentParser(description='Generate HyperSim SDK conformance HTML report')
    parser.add_argument('--reports-dir', '-r',
                       default='./reports',
                       help='Directory containing test reports')
    parser.add_argument('--output-dir', '-o',
                       default='./reports',
                       help='Output directory for HTML report')
    parser.add_argument('--open', action='store_true',
                       help='Open the report in browser after generation')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.reports_dir):
        print(f"Error: Reports directory '{args.reports_dir}' does not exist")
        sys.exit(1)
    
    generator = ConformanceReportGenerator(args.reports_dir, args.output_dir)
    report_file = generator.generate_html_report()
    
    print(f"\n🎉 HTML conformance report generated: {report_file}")
    
    if args.open:
        import webbrowser
        webbrowser.open(f'file://{os.path.abspath(report_file)}')
        print(f"\n🌍 Report opened in browser")
    
    print(f"\n📊 View the interactive dashboard at: file://{os.path.abspath(report_file)}")

if __name__ == '__main__':
    main()
