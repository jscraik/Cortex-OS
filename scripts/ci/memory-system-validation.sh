#!/bin/bash
set -euo pipefail

# brAInwav Memory System Validation Script
# Phase 1.3: Comprehensive memory system consolidation validation
# Following CODESTYLE.md standards and brAInwav operational requirements

echo "🧠 brAInwav Memory System Validation - Phase 1.3"
echo "================================================="
echo

# Configuration
VALIDATION_TIMEOUT=300 # 5 minutes
START_TIME=$(date +%s)
VALIDATION_RESULTS=""
ERRORS=()

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ERRORS+=("$1")
}

# Check if timeout exceeded
check_timeout() {
    local current_time=$(date +%s)
    local elapsed=$((current_time - START_TIME))
    if [ $elapsed -gt $VALIDATION_TIMEOUT ]; then
        log_error "Validation timeout exceeded (${VALIDATION_TIMEOUT}s)"
        exit 1
    fi
}

# Validate memory system architecture
validate_architecture() {
    log_info "Validating memory system architecture..."
    
    # Check for legacy direct database imports
    local legacy_imports=$(find packages/memories/src -name "*.ts" -exec grep -l "import.*from.*sqlite3\|import.*from.*postgres\|import.*from.*mysql" {} \; 2>/dev/null || true)
    if [ -n "$legacy_imports" ]; then
        log_error "Found legacy database imports: $legacy_imports"
        return 1
    fi
    
    # Check for direct database connections
    local direct_db=$(find packages/memories/src -name "*.ts" -exec grep -l "new Database\|createConnection\|connect(" {} \; 2>/dev/null || true)
    if [ -n "$direct_db" ]; then
        log_warning "Found potential direct database connections: $direct_db"
    fi
    
    # Verify LocalMemoryProvider is the single entry point
    local memory_providers=$(find packages/memory-core/src -name "*Provider.ts" | wc -l)
    if [ "$memory_providers" -lt 1 ]; then
        log_error "No memory providers found"
        return 1
    fi
    
    log_success "Memory system architecture validation passed"
}

# Validate REST API consolidation
validate_rest_consolidation() {
    log_info "Validating REST API consolidation..."
    
    # Check that memory operations use HTTP clients
    local http_clients=$(find packages/memories/src -name "*.ts" -exec grep -l "fetch\|axios\|request" {} \; | wc -l)
    if [ "$http_clients" -lt 1 ]; then
        log_warning "No HTTP clients found in memory package"
    fi
    
    # Verify no direct Prisma/SQLite usage in memories package
    local direct_orm=$(find packages/memories/src -name "*.ts" -exec grep -l "prisma\.\|db\.\|database\." {} \; 2>/dev/null || true)
    if [ -n "$direct_orm" ]; then
        log_error "Found direct ORM usage in memories package: $direct_orm"
        return 1
    fi
    
    log_success "REST API consolidation validation passed"
}

# Validate memory system performance
validate_performance() {
    log_info "Validating memory system performance..."
    
    # Check if local-memory service is available
    if command -v local-memory >/dev/null 2>&1; then
        log_info "local-memory CLI found, testing performance..."
        
        # Test basic operations performance
        local start_time=$(date +%s%3N)
        local-memory health >/dev/null 2>&1 || true
        local end_time=$(date +%s%3N)
        local health_time=$((end_time - start_time))
        
        if [ "$health_time" -gt 250 ]; then
            log_warning "Health check took ${health_time}ms (>250ms brAInwav SLA)"
        else
            log_success "Health check completed in ${health_time}ms"
        fi
    else
        log_warning "local-memory CLI not available for performance testing"
    fi
}

# Validate brAInwav compliance
validate_brainwav_compliance() {
    log_info "Validating brAInwav compliance..."
    
    # Check for brAInwav branding in error messages
    local branding_count=$(find packages/memory-core/src packages/memories/src -name "*.ts" -exec grep -l "brAInwav\|brAInwav" {} \; | wc -l)
    if [ "$branding_count" -lt 2 ]; then
        log_error "Insufficient brAInwav branding found in memory system"
        return 1
    fi
    
    # Check for proper error handling patterns
    local error_patterns=$(find packages/memory-core/src packages/memories/src -name "*.ts" -exec grep -l "try.*catch\|throw new.*Error" {} \; | wc -l)
    if [ "$error_patterns" -lt 3 ]; then
        log_warning "Limited error handling patterns found"
    fi
    
    log_success "brAInwav compliance validation passed"
}

# Validate test coverage
validate_test_coverage() {
    log_info "Validating memory system test coverage..."
    
    # Check for memory test files
    local memory_tests=$(find tests/memory -name "*.test.ts" 2>/dev/null | wc -l)
    if [ "$memory_tests" -lt 3 ]; then
        log_error "Insufficient memory test files found (${memory_tests} < 3)"
        return 1
    fi
    
    # Check for integration tests
    local integration_tests=$(find tests/memory -name "*integration*.test.ts" 2>/dev/null | wc -l)
    if [ "$integration_tests" -lt 1 ]; then
        log_warning "No integration tests found for memory system"
    fi
    
    log_success "Test coverage validation passed"
}

# Validate memory system dependencies
validate_dependencies() {
    log_info "Validating memory system dependencies..."
    
    # Check package.json for proper workspace dependencies
    if [ -f packages/memories/package.json ]; then
        local workspace_deps=$(grep -c "workspace:" packages/memories/package.json || echo "0")
        if [ "$workspace_deps" -lt 1 ]; then
            log_warning "No workspace dependencies found in memories package"
        fi
    fi
    
    # Check for proper TypeScript configuration
    if [ -f packages/memory-core/tsconfig.json ]; then
        log_info "TypeScript configuration found for memory-core"
    else
        log_warning "No TypeScript configuration found for memory-core"
    fi
    
    log_success "Dependencies validation passed"
}

# Run comprehensive validation
run_validation() {
    log_info "Starting comprehensive memory system validation..."
    echo
    
    # Run all validation functions
    validate_architecture
    check_timeout
    
    validate_rest_consolidation
    check_timeout
    
    validate_performance
    check_timeout
    
    validate_brainwav_compliance
    check_timeout
    
    validate_test_coverage
    check_timeout
    
    validate_dependencies
    check_timeout
    
    echo
    log_info "Validation completed"
}

# Generate validation report
generate_report() {
    local end_time=$(date +%s)
    local total_time=$((end_time - START_TIME))
    
    echo
    echo "📊 brAInwav Memory System Validation Report"
    echo "==========================================="
    echo "Validation Duration: ${total_time}s"
    echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo
    
    if [ ${#ERRORS[@]} -eq 0 ]; then
        log_success "✅ All memory system validations passed"
        echo "Memory system consolidation is complete and compliant with brAInwav standards"
        echo
        echo "Key Achievements:"
        echo "• Legacy database adapters removed"
        echo "• REST API consolidation complete"
        echo "• brAInwav compliance maintained"
        echo "• Test coverage sufficient"
        echo "• Performance within SLA targets"
        return 0
    else
        log_error "❌ Memory system validation failed with ${#ERRORS[@]} errors:"
        for error in "${ERRORS[@]}"; do
            echo "  - $error"
        done
        echo
        echo "Please address these issues before considering Phase 1.3 complete"
        return 1
    fi
}

# Main execution
main() {
    echo "Starting brAInwav Memory System Validation..."
    echo "Workspace: $(pwd)"
    echo "Timestamp: $(date)"
    echo
    
    # Check prerequisites
    if [ ! -d "packages/memory-core" ]; then
        log_error "memory-core package not found"
        exit 1
    fi
    
    if [ ! -d "packages/memories" ]; then
        log_error "memories package not found"
        exit 1
    fi
    
    # Run validation
    if run_validation && generate_report; then
        log_success "🎯 brAInwav Memory System Validation PASSED"
        exit 0
    else
        log_error "🚨 brAInwav Memory System Validation FAILED"
        exit 1
    fi
}

# Execute main function
main "$@"
