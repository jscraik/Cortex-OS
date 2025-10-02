#!/bin/bash

# brAInwav Cortex-OS Coverage Analysis Script
# Validates test coverage thresholds and generates coverage reports

set -euo pipefail

# Configuration
COVERAGE_THRESHOLD=${COVERAGE_THRESHOLD:-80}
COVERAGE_FILE="coverage-results.json"
COVERAGE_REPORT_DIR="coverage"
LCOV_FILE="${COVERAGE_REPORT_DIR}/lcov.info"

echo "🔍 brAInwav Coverage Analysis - Threshold: ${COVERAGE_THRESHOLD}%"

# Check if coverage tools are available
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found. Please install pnpm."
    exit 1
fi

# Function to run coverage and generate report
run_coverage_analysis() {
    echo "📊 Running test coverage analysis..."

    # Run tests with coverage
    if pnpm run test:coverage 2>/dev/null || pnpm run test --coverage 2>/dev/null; then
        echo "✅ Coverage tests completed successfully"
    else
        echo "❌ Coverage tests failed"
        return 1
    fi

    # Extract coverage metrics
    local coverage_percentage=0
    local lines_covered=0
    local lines_total=0
    local functions_covered=0
    local functions_total=0
    local branches_covered=0
    local branches_total=0
    local statements_covered=0
    local statements_total=0

    # Try to extract coverage from different sources
    if [ -f "${COVERAGE_REPORT_DIR}/coverage-summary.json" ]; then
        echo "📈 Reading coverage from coverage-summary.json"
        coverage_percentage=$(jq -r '.total.lines.pct // 0' "${COVERAGE_REPORT_DIR}/coverage-summary.json" 2>/dev/null || echo "0")
        lines_covered=$(jq -r '.total.lines.covered // 0' "${COVERAGE_REPORT_DIR}/coverage-summary.json" 2>/dev/null || echo "0")
        lines_total=$(jq -r '.total.lines.total // 0' "${COVERAGE_REPORT_DIR}/coverage-summary.json" 2>/dev/null || echo "0")
        functions_covered=$(jq -r '.total.functions.covered // 0' "${COVERAGE_REPORT_DIR}/coverage-summary.json" 2>/dev/null || echo "0")
        functions_total=$(jq -r '.total.functions.total // 0' "${COVERAGE_REPORT_DIR}/coverage-summary.json" 2>/dev/null || echo "0")
        branches_covered=$(jq -r '.total.branches.covered // 0' "${COVERAGE_REPORT_DIR}/coverage-summary.json" 2>/dev/null || echo "0")
        branches_total=$(jq -r '.total.branches.total // 0' "${COVERAGE_REPORT_DIR}/coverage-summary.json" 2>/dev/null || echo "0")
        statements_covered=$(jq -r '.total.statements.covered // 0' "${COVERAGE_REPORT_DIR}/coverage-summary.json" 2>/dev/null || echo "0")
        statements_total=$(jq -r '.total.statements.total // 0' "${COVERAGE_REPORT_DIR}/coverage-summary.json" 2>/dev/null || echo "0")
    elif [ -f "coverage.json" ]; then
        echo "📈 Reading coverage from coverage.json"
        coverage_percentage=$(jq -r '.total.lines.pct // 0' coverage.json 2>/dev/null || echo "0")
        lines_covered=$(jq -r '.total.lines.covered // 0' coverage.json 2>/dev/null || echo "0")
        lines_total=$(jq -r '.total.lines.total // 0' coverage.json 2>/dev/null || echo "0")
    else
        echo "⚠️ No standard coverage files found, using default values"
        coverage_percentage=0
    fi

    # Check if threshold is met
    local threshold_met=$(echo "$coverage_percentage >= $COVERAGE_THRESHOLD" | bc -l 2>/dev/null || echo "0")

    # Generate coverage results JSON
    cat > "$COVERAGE_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "threshold": {
    "required": $COVERAGE_THRESHOLD,
    "achieved": $coverage_percentage,
    "passed": $threshold_met
  },
  "metrics": {
    "lines": {
      "covered": $lines_covered,
      "total": $lines_total,
      "percentage": $coverage_percentage
    },
    "functions": {
      "covered": $functions_covered,
      "total": $functions_total,
      "percentage": $(echo "scale=2; $functions_total > 0 ? $functions_covered * 100 / $functions_total : 0" | bc -l 2>/dev/null || echo "0")
    },
    "branches": {
      "covered": $branches_covered,
      "total": $branches_total,
      "percentage": $(echo "scale=2; $branches_total > 0 ? $branches_covered * 100 / $branches_total : 0" | bc -l 2>/dev/null || echo "0")
    },
    "statements": {
      "covered": $statements_covered,
      "total": $statements_total,
      "percentage": $(echo "scale=2; $statements_total > 0 ? $statements_covered * 100 / $statements_total : 0" | bc -l 2>/dev/null || echo "0")
    }
  },
  "files_analyzed": $(find . -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" | grep -v node_modules | grep -v dist | wc -l | tr -d ' '),
  "test_files": $(find . -name "*.test.ts" -o -name "*.test.js" -o -name "*.spec.ts" -o -name "*.spec.js" | grep -v node_modules | wc -l | tr -d ' '),
  "status": "$threshold_met"
}
EOF

    echo "📊 Coverage Results:"
    echo "  - Overall Coverage: ${coverage_percentage}%"
    echo "  - Threshold Required: ${COVERAGE_THRESHOLD}%"
    echo "  - Threshold Met: $([ "$threshold_met" = "1" ] && echo "✅ YES" || echo "❌ NO")"
    echo "  - Lines Covered: ${lines_covered}/${lines_total}"
    echo "  - Functions Covered: ${functions_covered}/${functions_total}"
    echo "  - Branches Covered: ${branches_covered}/${branches_total}"
    echo "  - Statements Covered: ${statements_covered}/${statements_total}"

    if [ "$threshold_met" = "1" ]; then
        echo "✅ Coverage threshold met - brAInwav standards satisfied"
        return 0
    else
        echo "❌ Coverage threshold NOT met - brAInwav standards not satisfied"
        echo "   Required: ${COVERAGE_THRESHOLD}%, Achieved: ${coverage_percentage}%"
        return 1
    fi
}

# Function to check for uncovered critical files
check_critical_files() {
    echo "🔍 Checking coverage for critical files..."

    local critical_files=(
        "src/auth"
        "src/security"
        "src/validation"
        "src/api"
        "src/core"
    )

    local uncovered_critical_files=()

    for pattern in "${critical_files[@]}"; do
        if find "$pattern" -name "*.ts" -o -name "*.js" 2>/dev/null | grep -q .; then
            local uncovered_count=$(find "$pattern" -name "*.ts" -o -name "*.js" | xargs grep -l "@nocover\|skip coverage" 2>/dev/null | wc -l | tr -d ' ' || echo "0")
            if [ "$uncovered_count" -gt 0 ]; then
                uncovered_critical_files+=("$pattern (${uncovered_count} files uncovered)")
            fi
        fi
    done

    if [ ${#uncovered_critical_files[@]} -gt 0 ]; then
        echo "⚠️ Found uncovered critical files:"
        for file in "${uncovered_critical_files[@]}"; do
            echo "  - $file"
        done
        return 1
    else
        echo "✅ No uncovered critical files found"
        return 0
    fi
}

# Function to validate coverage report integrity
validate_coverage_report() {
    echo "🔍 Validating coverage report integrity..."

    if [ ! -f "$COVERAGE_FILE" ]; then
        echo "❌ Coverage results file not found: $COVERAGE_FILE"
        return 1
    fi

    if ! jq empty "$COVERAGE_FILE" 2>/dev/null; then
        echo "❌ Coverage results file is not valid JSON"
        return 1
    fi

    local coverage_percentage=$(jq -r '.threshold.achieved // 0' "$COVERAGE_FILE")
    if ! [[ "$coverage_percentage" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
        echo "❌ Invalid coverage percentage in results file"
        return 1
    fi

    echo "✅ Coverage report integrity validated"
    return 0
}

# Main execution
main() {
    echo "🚀 Starting brAInwav Coverage Analysis..."
    echo "   Working Directory: $(pwd)"
    echo "   Timestamp: $(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"

    # Check prerequisites
    if [ ! -f "package.json" ]; then
        echo "❌ package.json not found. This script must be run from the project root."
        exit 1
    fi

    # Install jq if not available
    if ! command -v jq &> /dev/null; then
        echo "📦 Installing jq for JSON processing..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y jq
        elif command -v yum &> /dev/null; then
            sudo yum install -y jq
        elif command -v brew &> /dev/null; then
            brew install jq
        else
            echo "❌ Cannot install jq. Please install jq manually."
            exit 1
        fi
    fi

    # Install bc if not available
    if ! command -v bc &> /dev/null; then
        echo "📦 Installing bc for mathematical calculations..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y bc
        elif command -v yum &> /dev/null; then
            sudo yum install -y bc
        elif command -v brew &> /dev/null; then
            brew install bc
        else
            echo "⚠️ Cannot install bc. Using integer arithmetic fallback."
        fi
    fi

    # Run coverage analysis
    local coverage_result=0
    if ! run_coverage_analysis; then
        coverage_result=1
    fi

    # Check critical files
    local critical_files_result=0
    if ! check_critical_files; then
        critical_files_result=1
    fi

    # Validate coverage report
    local validation_result=0
    if ! validate_coverage_report; then
        validation_result=1
    fi

    # Generate summary
    echo ""
    echo "📋 Coverage Analysis Summary:"
    echo "  - Coverage Threshold Met: $([ $coverage_result -eq 0 ] && echo "✅ YES" || echo "❌ NO")"
    echo "  - Critical Files Covered: $([ $critical_files_result -eq 0 ] && echo "✅ YES" || echo "❌ NO")"
    echo "  - Report Validated: $([ $validation_result -eq 0 ] && echo "✅ YES" || echo "❌ NO")"
    echo "  - Results File: $COVERAGE_FILE"

    if [ $coverage_result -eq 0 ] && [ $critical_files_result -eq 0 ] && [ $validation_result -eq 0 ]; then
        echo ""
        echo "🎉 All coverage checks passed - brAInwav quality standards met!"
        exit 0
    else
        echo ""
        echo "❌ Some coverage checks failed - brAInwav quality standards not met!"
        exit 1
    fi
}

# Execute main function
main "$@"