#!/bin/bash
# Cortex-WebUI TDD Quick Start Scripts
# Execute these scripts to bootstrap TDD infrastructure

set -euo pipefail

REPO_ROOT="/Users/jamiecraik/.Cortex-OS/apps/cortex-webui"
cd "$REPO_ROOT"

echo "🚀 Cortex-WebUI TDD Infrastructure Setup"
echo "========================================"

# ============================================================================
# Script 1: Initialize Quality Gate Infrastructure
# ============================================================================
initialize_quality_gates() {
  echo "📋 Step 1: Creating quality gate configuration..."
  
  mkdir -p .eng scripts/ci
  
  # Create quality gate contract
  cat > .eng/quality_gate.json << 'EOF'
{
  "coverage": {
    "line": 95,
    "branch": 95,
    "changed_code_only": false,
    "mutation_score": 80
  },
  "tests": {
    "flake_rate_max_percent": 1,
    "required_pass": true,
    "timeout_seconds": 600
  },
  "security": {
    "max_high": 0,
    "max_critical": 0,
    "secrets_scan_required": true,
    "sbom_required": true
  },
  "ops_readiness_min": 0.95,
  "performance": {
    "p95_latency_ms_max": 500,
    "error_rate_pct_max": 0.5,
    "throughput_min_rps": 50
  },
  "reliability": {
    "graceful_shutdown_max_seconds": 30,
    "retry_budget_max_percent": 10,
    "circuit_breaker_required": true
  }
}
EOF
  
  echo "✅ Quality gate contract created at .eng/quality_gate.json"
}

# ============================================================================
# Script 2: Configure Test Infrastructure
# ============================================================================
setup_test_infrastructure() {
  echo "📦 Step 2: Setting up test infrastructure..."
  
  # Install testing dependencies
  pnpm add -D vitest @vitest/coverage-v8 @vitest/ui \
                @stryker-mutator/core @stryker-mutator/typescript-checker \
                @playwright/test supertest @types/supertest \
                msw whatwg-fetch
  
  echo "✅ Test infrastructure configured"
}

# ============================================================================
# Main Execution
# ============================================================================
main() {
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "  Cortex-WebUI TDD Infrastructure Setup"
  echo "  Following brAInwav Development Standards"
  echo "════════════════════════════════════════════════════════════"
  echo ""
  
  initialize_quality_gates
  setup_test_infrastructure
  
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "  ✅ TDD Infrastructure Setup Complete!"
  echo "════════════════════════════════════════════════════════════"
  echo ""
  echo "Next steps:"
  echo "  1. Run 'pnpm install' to install new test dependencies"
  echo "  2. Run 'pnpm test:unit' to run unit tests"
  echo "  3. Run 'pnpm test:coverage' to check coverage"
  echo "  4. Review the TDD Implementation Plan"
  echo ""
}

# Run the setup
main "$@"
