# HyperSim SDK Cross-Language Conformance Testing

This comprehensive testing system validates API consistency and performance across all HyperSim SDK implementations.

## 🎯 Overview

The conformance testing system provides:

- **API Consistency Validation**: Ensures identical behavior across TypeScript, Python, Rust, Go, and Java SDKs
- **Performance Benchmarking**: Compares execution times, memory usage, and throughput
- **Error Handling Verification**: Validates consistent error codes and messages
- **WebSocket Streaming Tests**: Tests real-time functionality across languages
- **Cross-Language Integration**: Validates inter-language communication
- **Automated Reporting**: Generates detailed HTML dashboards and JSON reports
- **CI/CD Integration**: Automated testing in GitHub Actions

## 🏗️ Architecture

```
testing/conformance/
├── specifications/          # Master test specifications
│   ├── master_test_spec.json
│   └── api_operations.json
├── test_data/              # Shared test inputs and expected outputs
│   ├── simulation_inputs.json
│   ├── expected_outputs.json
│   ├── performance_benchmarks.json
│   └── websocket_messages.json
├── runners/                # Language-specific test runners
│   ├── typescript/
│   ├── python/
│   ├── rust/
│   ├── go/
│   └── java/
├── integration/            # Cross-language integration tests
├── reports/               # Generated test reports
├── scripts/               # Utility scripts
└── ci/                   # CI/CD configurations
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (for TypeScript)
- Python 3.11+ (for Python)
- Rust 1.70+ (for Rust)
- Go 1.21+ (for Go)
- Java 11+ and Maven (for Java)

### Running All Tests

```bash
# Make the main script executable
chmod +x testing/conformance/scripts/run_all_tests.sh

# Run complete conformance test suite
./testing/conformance/scripts/run_all_tests.sh

# Run specific languages only
./testing/conformance/scripts/run_all_tests.sh --language typescript --language python

# Skip integration tests
./testing/conformance/scripts/run_all_tests.sh --skip-integration
```

### Running Individual Language Tests

#### TypeScript
```bash
cd testing/conformance/runners/typescript
npm install
npm test
```

#### Python
```bash
cd testing/conformance/runners/python
pip install pytest pytest-asyncio psutil
python conformance_runner.py
```

#### Rust
```bash
cd testing/conformance/runners/rust
cargo run --release
```

#### Go
```bash
cd testing/conformance/runners/go
go mod tidy
go run main.go
```

#### Java
```bash
cd testing/conformance/runners/java
mvn clean compile exec:java -Dexec.mainClass="io.hypersim.conformance.ConformanceTestRunner"
```

## 📊 Test Categories

### 1. Core SDK Tests
- SDK initialization with various configurations
- Plugin system loading and configuration
- Client connection establishment

### 2. Simulation Tests
- Basic transaction simulation
- Complex multi-hop transactions
- Contract deployment simulation
- Gas estimation accuracy

### 3. AI Analysis Tests
- Transaction risk analysis
- Pattern recognition
- Classification accuracy
- Performance under load

### 4. WebSocket Tests
- Connection establishment
- Subscription management
- Real-time data streaming
- Error handling and reconnection

### 5. Error Handling Tests
- Invalid input handling
- Network timeout scenarios
- Rate limiting responses
- Consistent error codes

### 6. Performance Tests
- Execution time benchmarks
- Memory usage analysis
- Concurrent operation handling
- Throughput measurements

### 7. Integration Tests
- TypeScript ↔ Go HTTP communication
- Python ↔ Rust WebSocket streaming
- Java ↔ TypeScript REST API calls
- Cross-language data consistency

## 📈 Reports and Analysis

### Generated Reports

1. **conformance-report.json**: Complete conformance analysis
2. **integration-report.json**: Cross-language integration results
3. **{language}-results.json**: Individual language test results
4. **conformance-dashboard.html**: Interactive HTML dashboard

### Key Metrics

- **API Conformance Rate**: Percentage of tests with identical results across languages
- **Performance Variance**: Standard deviation in execution times
- **Success Rate**: Percentage of tests passing per language
- **Memory Efficiency**: Memory usage comparison
- **Error Consistency**: Percentage of errors with matching codes

### Viewing Reports

```bash
# Generate HTML dashboard
python testing/conformance/scripts/generate_html_report.py --reports-dir ./reports

# Open in browser
open testing/conformance/reports/conformance-dashboard.html
```

## 🔧 Configuration

### Environment Variables

```bash
export HYPERCORE_URL="https://api.hypersim.io/hypercore"
export HYPERCORE_API_KEY="your_api_key"
export HYPEREVM_URL="https://api.hypersim.io/hyperevm"
export HYPEREVM_API_KEY="your_api_key"
```

### Test Configuration

Edit `specifications/master_test_spec.json` to:
- Add new test scenarios
- Modify performance thresholds
- Update expected results
- Configure error scenarios

## 🚀 CI/CD Integration

### GitHub Actions

The conformance tests run automatically on:
- Every push to `main` and `develop`
- All pull requests
- Daily at 2 AM UTC
- Manual workflow dispatch

### Integration Steps

1. Copy `ci/github-actions.yml` to `.github/workflows/conformance.yml`
2. Set up repository secrets for API keys
3. Configure GitHub Pages for report deployment
4. Set up status badges and notifications

### Manual Workflow Triggers

```bash
# Trigger via GitHub CLI
gh workflow run conformance.yml -f languages="typescript,python" -f skip_integration=true
```

## 📝 Adding New Tests

### 1. Update Test Specifications

Add new test cases to `specifications/master_test_spec.json`:

```json
{
  "id": "new_test_001",
  "description": "Test new feature",
  "input": { /* test input */ },
  "expected_output": { /* expected result */ },
  "performance_threshold_ms": 1000
}
```

### 2. Update Test Data

Add corresponding test data to `test_data/` files.

### 3. Implement in Runners

Add test implementation to each language runner:

- TypeScript: `runners/typescript/src/ConformanceTestRunner.ts`
- Python: `runners/python/conformance_runner.py`
- Rust: `runners/rust/src/main.rs`
- Go: `runners/go/main.go`
- Java: `runners/java/src/main/java/.../ConformanceTestRunner.java`

### 4. Update Expected Results

Add expected results to `test_data/expected_outputs.json`.

## 🐛 Troubleshooting

### Common Issues

1. **Missing Dependencies**
   ```bash
   ./scripts/run_all_tests.sh  # Checks and reports missing tools
   ```

2. **Test Failures**
   - Check language-specific logs in `reports/`
   - Verify API endpoints are accessible
   - Ensure all environment variables are set

3. **Performance Issues**
   - Adjust timeouts in test specifications
   - Check system resources
   - Review performance thresholds

4. **Report Generation Failures**
   - Ensure Python dependencies are installed
   - Check report directory permissions
   - Verify JSON report files exist

### Debug Mode

```bash
# Run with verbose output
python scripts/compare_results.py --verbose

# Generate reports with debug info
python scripts/generate_html_report.py --verbose
```

## 📊 Performance Expectations

### Benchmark Targets

| Operation | Max Time | Max Memory | Acceptable Variance |
|-----------|----------|------------|-------------------|
| SDK Init | 100ms | 50MB | 20% |
| Simple Simulation | 500ms | 100MB | 30% |
| AI Analysis | 2000ms | 300MB | 50% |
| WebSocket Connect | 1000ms | 50MB | 25% |

### Success Criteria

- **API Conformance Rate**: ≥95% for production readiness
- **Language Success Rate**: ≥95% per language
- **Performance Variance**: ≤30% across languages
- **Integration Tests**: 100% success rate

## 🤝 Contributing

1. **Adding Language Support**:
   - Create new runner directory
   - Implement conformance test runner
   - Add to main test script
   - Update CI/CD configuration

2. **Improving Tests**:
   - Add edge cases to specifications
   - Enhance error scenarios
   - Improve performance benchmarks
   - Add integration test scenarios

3. **Reporting Enhancements**:
   - Add new visualizations
   - Improve dashboard UI
   - Add performance trending
   - Enhance failure analysis

## 📄 License

This conformance testing system is part of the HyperSim SDK project and follows the same license terms.

---

**🎯 Goal**: Achieve and maintain 100% API parity across all language implementations, demonstrating technical excellence and reliability for the hackathon judges.
