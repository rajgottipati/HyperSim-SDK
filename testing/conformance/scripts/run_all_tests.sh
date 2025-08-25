#!/bin/bash

# HyperSim SDK Cross-Language Conformance Test Runner
# This script orchestrates the complete conformance testing process

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORTS_DIR="$BASE_DIR/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}"
    echo "=========================================================================="
    echo "  HyperSim SDK Cross-Language Conformance Testing Suite"
    echo "  Running at: $(date)"
    echo "=========================================================================="
    echo -e "${NC}"
}

print_section() {
    echo -e "\n${YELLOW}▶ $1${NC}"
    echo "--------------------------------------------------------------------------"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_dependencies() {
    print_section "Checking Dependencies"
    
    # Check if required tools are installed
    local missing_tools=()
    
    # Node.js for TypeScript
    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    fi
    
    # Python 3
    if ! command -v python3 &> /dev/null; then
        missing_tools+=("python3")
    fi
    
    # Rust
    if ! command -v cargo &> /dev/null; then
        missing_tools+=("cargo")
    fi
    
    # Go
    if ! command -v go &> /dev/null; then
        missing_tools+=("go")
    fi
    
    # Java
    if ! command -v javac &> /dev/null; then
        missing_tools+=("javac")
    fi
    
    # Maven
    if ! command -v mvn &> /dev/null; then
        missing_tools+=("mvn")
    fi
    
    if [ ${#missing_tools[@]} -eq 0 ]; then
        print_success "All required tools are installed"
    else
        print_error "Missing required tools: ${missing_tools[*]}"
        echo "Please install the missing tools and try again."
        exit 1
    fi
}

setup_environment() {
    print_section "Setting Up Test Environment"
    
    # Create reports directory
    mkdir -p "$REPORTS_DIR"
    print_success "Created reports directory: $REPORTS_DIR"
    
    # Set environment variables for consistent testing
    export HYPERCORE_URL="https://api.hypersim.io/hypercore"
    export HYPERCORE_API_KEY="test_key_123"
    export HYPEREVM_URL="https://api.hypersim.io/hyperevm"
    export HYPEREVM_API_KEY="test_key_456"
    
    print_success "Environment variables configured"
}

run_typescript_tests() {
    print_section "Running TypeScript Conformance Tests"
    
    local ts_runner_dir="$BASE_DIR/runners/typescript"
    
    if [ -d "$ts_runner_dir" ]; then
        cd "$ts_runner_dir"
        
        # Install dependencies
        print_info "Installing TypeScript dependencies..."
        npm install --silent
        
        # Run tests
        print_info "Running TypeScript conformance tests..."
        if npm test --silent > "$REPORTS_DIR/typescript-test-output.log" 2>&1; then
            print_success "TypeScript tests completed"
        else
            print_error "TypeScript tests failed. Check $REPORTS_DIR/typescript-test-output.log"
            return 1
        fi
        
        cd "$BASE_DIR"
    else
        print_error "TypeScript runner directory not found: $ts_runner_dir"
        return 1
    fi
}

run_python_tests() {
    print_section "Running Python Conformance Tests"
    
    local python_runner_dir="$BASE_DIR/runners/python"
    
    if [ -d "$python_runner_dir" ]; then
        cd "$python_runner_dir"
        
        # Install dependencies
        print_info "Installing Python dependencies..."
        pip3 install --quiet pytest pytest-asyncio psutil dataclasses-json
        
        # Run tests
        print_info "Running Python conformance tests..."
        if python3 conformance_runner.py > "$REPORTS_DIR/python-test-output.log" 2>&1; then
            print_success "Python tests completed"
        else
            print_error "Python tests failed. Check $REPORTS_DIR/python-test-output.log"
            return 1
        fi
        
        cd "$BASE_DIR"
    else
        print_error "Python runner directory not found: $python_runner_dir"
        return 1
    fi
}

run_rust_tests() {
    print_section "Running Rust Conformance Tests"
    
    local rust_runner_dir="$BASE_DIR/runners/rust"
    
    if [ -d "$rust_runner_dir" ]; then
        cd "$rust_runner_dir"
        
        # Build and run tests
        print_info "Building and running Rust conformance tests..."
        if cargo run --release > "$REPORTS_DIR/rust-test-output.log" 2>&1; then
            print_success "Rust tests completed"
        else
            print_error "Rust tests failed. Check $REPORTS_DIR/rust-test-output.log"
            return 1
        fi
        
        cd "$BASE_DIR"
    else
        print_error "Rust runner directory not found: $rust_runner_dir"
        return 1
    fi
}

run_go_tests() {
    print_section "Running Go Conformance Tests"
    
    local go_runner_dir="$BASE_DIR/runners/go"
    
    if [ -d "$go_runner_dir" ]; then
        cd "$go_runner_dir"
        
        # Download dependencies and run tests
        print_info "Downloading Go dependencies..."
        go mod tidy
        
        print_info "Running Go conformance tests..."
        if go run main.go > "$REPORTS_DIR/go-test-output.log" 2>&1; then
            print_success "Go tests completed"
        else
            print_error "Go tests failed. Check $REPORTS_DIR/go-test-output.log"
            return 1
        fi
        
        cd "$BASE_DIR"
    else
        print_error "Go runner directory not found: $go_runner_dir"
        return 1
    fi
}

run_java_tests() {
    print_section "Running Java Conformance Tests"
    
    local java_runner_dir="$BASE_DIR/runners/java"
    
    if [ -d "$java_runner_dir" ]; then
        cd "$java_runner_dir"
        
        # Compile and run tests
        print_info "Compiling and running Java conformance tests..."
        if mvn clean compile exec:java -Dexec.mainClass="io.hypersim.conformance.ConformanceTestRunner" -q > "$REPORTS_DIR/java-test-output.log" 2>&1; then
            print_success "Java tests completed"
        else
            print_error "Java tests failed. Check $REPORTS_DIR/java-test-output.log"
            return 1
        fi
        
        cd "$BASE_DIR"
    else
        print_error "Java runner directory not found: $java_runner_dir"
        return 1
    fi
}

run_integration_tests() {
    print_section "Running Cross-Language Integration Tests"
    
    local integration_script="$BASE_DIR/integration/cross_language_tests.py"
    
    if [ -f "$integration_script" ]; then
        print_info "Running cross-language integration tests..."
        if python3 "$integration_script" --output "$REPORTS_DIR/integration-report.json" > "$REPORTS_DIR/integration-test-output.log" 2>&1; then
            print_success "Integration tests completed"
        else
            print_error "Integration tests failed. Check $REPORTS_DIR/integration-test-output.log"
            return 1
        fi
    else
        print_error "Integration test script not found: $integration_script"
        return 1
    fi
}

compare_results() {
    print_section "Comparing Results Across Languages"
    
    local compare_script="$BASE_DIR/scripts/compare_results.py"
    
    if [ -f "$compare_script" ]; then
        print_info "Analyzing cross-language conformance..."
        if python3 "$compare_script" --reports-dir "$REPORTS_DIR" --output "$REPORTS_DIR/conformance-report.json" --verbose; then
            print_success "Results comparison completed"
        else
            print_error "Results comparison failed"
            return 1
        fi
    else
        print_error "Comparison script not found: $compare_script"
        return 1
    fi
}

generate_reports() {
    print_section "Generating HTML Dashboard"
    
    local report_generator="$BASE_DIR/scripts/generate_html_report.py"
    
    if [ -f "$report_generator" ]; then
        print_info "Generating interactive HTML report..."
        if python3 "$report_generator" --reports-dir "$REPORTS_DIR" --output-dir "$REPORTS_DIR"; then
            print_success "HTML dashboard generated"
            
            # Show report location
            local html_report="$REPORTS_DIR/conformance-dashboard.html"
            if [ -f "$html_report" ]; then
                print_info "HTML Report: file://$(realpath "$html_report")"
            fi
        else
            print_error "HTML report generation failed"
            return 1
        fi
    else
        print_error "Report generator not found: $report_generator"
        return 1
    fi
}

archive_results() {
    print_section "Archiving Test Results"
    
    local archive_name="conformance-results-$TIMESTAMP.tar.gz"
    local archive_path="$REPORTS_DIR/$archive_name"
    
    print_info "Creating archive: $archive_name"
    tar -czf "$archive_path" -C "$REPORTS_DIR" \
        *.json *.html *.log 2>/dev/null || true
    
    if [ -f "$archive_path" ]; then
        print_success "Results archived: $archive_path"
    else
        print_error "Failed to create archive"
    fi
}

print_final_summary() {
    print_section "Final Summary"
    
    # Check if conformance report exists and extract key metrics
    local conformance_report="$REPORTS_DIR/conformance-report.json"
    
    if [ -f "$conformance_report" ]; then
        local conformance_rate=$(python3 -c "
try:
    import json
    with open('$conformance_report', 'r') as f:
        data = json.load(f)
    print(f\"{data['summary']['conformance_rate']:.1f}\")
except:
    print('N/A')
")
        
        local total_tests=$(python3 -c "
try:
    import json
    with open('$conformance_report', 'r') as f:
        data = json.load(f)
    print(data['summary']['total_tests'])
except:
    print('N/A')
")
        
        echo
        echo "🎯 CONFORMANCE TESTING COMPLETED"
        echo "═══════════════════════════════════════"
        echo "📊 API Conformance Rate: $conformance_rate%"
        echo "🔢 Total Tests Executed: $total_tests"
        echo "📅 Test Run Timestamp: $TIMESTAMP"
        echo "📁 Reports Directory: $REPORTS_DIR"
        echo
        
        if (( $(echo "$conformance_rate >= 95" | bc -l 2>/dev/null || echo "0") )); then
            print_success "🎉 EXCELLENT: All SDKs demonstrate high conformance!"
        elif (( $(echo "$conformance_rate >= 80" | bc -l 2>/dev/null || echo "0") )); then
            print_info "✅ GOOD: SDKs show good conformance with minor discrepancies."
        else
            print_error "⚠️ WARNING: Conformance issues detected. Review the detailed reports."
        fi
    else
        print_error "Conformance report not found. Some tests may have failed."
    fi
    
    echo
    echo "📋 Available Reports:"
    find "$REPORTS_DIR" -name "*.json" -o -name "*.html" | sort | while read -r file; do
        echo "  • $(basename "$file")"
    done
    echo
}

# Main execution
main() {
    print_header
    
    # Parse command line arguments
    local run_all=true
    local languages=()
    local skip_integration=false
    local skip_reports=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --language|-l)
                languages+=("$2")
                run_all=false
                shift 2
                ;;
            --skip-integration)
                skip_integration=true
                shift
                ;;
            --skip-reports)
                skip_reports=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  -l, --language LANG    Run tests for specific language (typescript, python, rust, go, java)"
                echo "  --skip-integration     Skip cross-language integration tests"
                echo "  --skip-reports         Skip report generation"
                echo "  -h, --help            Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Check dependencies and setup
    check_dependencies
    setup_environment
    
    # Run language-specific tests
    local test_failures=0
    
    if [ "$run_all" = true ]; then
        languages=("typescript" "python" "rust" "go" "java")
    fi
    
    for lang in "${languages[@]}"; do
        case "$lang" in
            typescript)
                run_typescript_tests || ((test_failures++))
                ;;
            python)
                run_python_tests || ((test_failures++))
                ;;
            rust)
                run_rust_tests || ((test_failures++))
                ;;
            go)
                run_go_tests || ((test_failures++))
                ;;
            java)
                run_java_tests || ((test_failures++))
                ;;
            *)
                print_error "Unknown language: $lang"
                ((test_failures++))
                ;;
        esac
    done
    
    # Run integration tests
    if [ "$skip_integration" = false ]; then
        run_integration_tests || ((test_failures++))
    fi
    
    # Compare results and generate reports
    if [ "$skip_reports" = false ]; then
        compare_results || ((test_failures++))
        generate_reports || ((test_failures++))
    fi
    
    # Archive results
    archive_results
    
    # Print summary
    print_final_summary
    
    # Exit with appropriate code
    if [ $test_failures -eq 0 ]; then
        print_success "All tests completed successfully!"
        exit 0
    else
        print_error "$test_failures test suite(s) failed. Check the logs for details."
        exit 1
    fi
}

# Execute main function with all arguments
main "$@"
