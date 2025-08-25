# Python Conformance Test Runner

This directory contains the Python conformance test runner for the HyperSim SDK.

## Requirements

```bash
pip install pytest pytest-asyncio psutil
```

## Usage

### Run all conformance tests
```bash
python conformance_runner.py
```

### Run with pytest
```bash
pytest test_conformance.py -v
```

### Run performance tests
```bash
python performance_runner.py
```

## Output

Test results are saved to `../../reports/python-results.json` in standardized format for cross-language comparison.

## Environment Variables

- `HYPERCORE_URL`: HyperCore API endpoint
- `HYPERCORE_API_KEY`: HyperCore API key
- `HYPEREVM_URL`: HyperEVM API endpoint
- `HYPEREVM_API_KEY`: HyperEVM API key
