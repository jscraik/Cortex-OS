#!/bin/bash
# brAInwav TDD Quality Gates Developer Setup Script
# Quick setup for developers to start using TDD quality gates
#
# Co-authored-by: brAInwav Development Team

set -euo pipefail

echo "[brAInwav] TDD Quality Gates Developer Setup"
echo "[brAInwav] Setting up comprehensive production readiness environment..."

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to install pre-commit hooks
setup_precommit() {
  echo "[brAInwav] Setting up pre-commit hooks for quality gates..."
  
  if ! command_exists pre-commit; then
    echo "[brAInwav] Installing pre-commit..."
    if command_exists pip; then
      pip install pre-commit
    elif command_exists brew; then
      brew install pre-commit
    else
      echo "[brAInwav] ⚠️  Please install pre-commit manually: https://pre-commit.com/"
      return 1
    fi
  fi
  
  # Install our custom brAInwav pre-commit hooks
  if [ -f ".pre-commit-brainwav-tdd.yaml" ]; then
    echo "[brAInwav] Installing brAInwav TDD quality gate hooks..."
    pre-commit install --config .pre-commit-brainwav-tdd.yaml
    echo "[brAInwav] ✅ Pre-commit hooks installed successfully"
  else
    echo "[brAInwav] ⚠️  Pre-commit config not found: .pre-commit-brainwav-tdd.yaml"
  fi
}

# Function to verify TDD Coach installation
setup_tdd_coach() {
  echo "[brAInwav] Setting up TDD Coach..."
  
  if [ -d "packages/tdd-coach" ]; then
    cd packages/tdd-coach
    echo "[brAInwav] Building TDD Coach..."
    pnpm install
    pnpm build
    
    # Test TDD Coach
    echo "[brAInwav] Testing TDD Coach installation..."
    if node dist/cli/tdd-coach.js --help >/dev/null 2>&1; then
      echo "[brAInwav] ✅ TDD Coach ready for brAInwav quality enforcement"
    else
      echo "[brAInwav] ❌ TDD Coach build failed"
      exit 1
    fi
    
    cd ../..
  else
    echo "[brAInwav] ⚠️  TDD Coach package not found: packages/tdd-coach"
  fi
}

# Function to create quality gate contract if missing
setup_quality_contract() {
  echo "[brAInwav] Setting up quality gate contract..."
  
  if [ ! -f ".eng/quality_gate.json" ]; then
    echo "[brAInwav] Creating quality gate contract..."
    mkdir -p .eng
    cat > .eng/quality_gate.json << 'EOF'
{
  "coverage": {
    "line": 95,
    "branch": 95,
    "changed_code_only": true,
    "mutation_score": 80
  },
  "tests": {
    "flake_rate_max_percent": 1,
    "required_pass": true,
    "timeout_seconds": 300
  },
  "security": {
    "max_high": 0,
    "max_critical": 0,
    "secrets_scan_required": true,
    "sbom_required": true
  },
  "ops_readiness_min": 0.95,
  "performance": {
    "p95_latency_ms_max": 250,
    "error_rate_pct_max": 0.5,
    "throughput_min_rps": 100
  },
  "reliability": {
    "graceful_shutdown_max_seconds": 30,
    "retry_budget_max_percent": 10,
    "circuit_breaker_required": true
  },
  "brainwav": {
    "brand_compliance_required": true,
    "documentation_standards": true,
    "commit_message_branding": true,
    "system_log_branding": true
  }
}
EOF
    echo "[brAInwav] ✅ Quality gate contract created: .eng/quality_gate.json"
  else
    echo "[brAInwav] ✅ Quality gate contract already exists"
  fi
}

# Function to verify script dependencies
check_dependencies() {
  echo "[brAInwav] Checking dependencies..."
  
  local missing_deps=()
  
  if ! command_exists pnpm; then
    missing_deps+=("pnpm")
  fi
  
  if ! command_exists node; then
    missing_deps+=("node")
  fi
  
  if ! command_exists jq; then
    missing_deps+=("jq")
  fi
  
  if [ ${#missing_deps[@]} -gt 0 ]; then
    echo "[brAInwav] ⚠️  Missing dependencies: ${missing_deps[*]}"
    echo "[brAInwav] Please install missing dependencies and re-run this script"
    exit 1
  fi
  
  echo "[brAInwav] ✅ All dependencies available"
}

# Function to test the setup
test_setup() {
  echo "[brAInwav] Testing TDD quality gates setup..."
  
  # Test operational readiness assessment
  if [ -x "scripts/ci/ops-readiness-fast.sh" ]; then
    echo "[brAInwav] Testing operational readiness assessment..."
    mkdir -p out
    bash scripts/ci/ops-readiness-fast.sh out/test-ops-readiness.json >/dev/null 2>&1 || true
    if [ -f "out/test-ops-readiness.json" ]; then
      score=$(jq '.percentage' out/test-ops-readiness.json 2>/dev/null || echo "0")
      echo "[brAInwav] Current operational readiness: ${score}%"
      rm -f out/test-ops-readiness.json
    fi
  fi
  
  # Test quality gate enforcement
  if [ -x "scripts/ci/enforce-gates.mjs" ] && [ -f ".eng/quality_gate.json" ]; then
    echo "[brAInwav] Testing quality gate enforcement..."
    mkdir -p out
    node scripts/ci/enforce-gates.mjs .eng/quality_gate.json out >/dev/null 2>&1 || true
    if [ -f "out/quality-gate-report.json" ]; then
      gates_passed=$(jq '.gates_passed' out/quality-gate-report.json 2>/dev/null || echo "false")
      echo "[brAInwav] Quality gates currently: ${gates_passed}"
      rm -f out/quality-gate-report.json out/quality-summary.json
    fi
  fi
  
  echo "[brAInwav] ✅ Setup testing complete"
}

# Function to show usage instructions
show_usage() {
  echo ""
  echo "[brAInwav] === TDD Quality Gates Usage ==="
  echo ""
  echo "Available Make targets:"
  echo "  make tdd-quality-gates    # Run complete quality assessment"
  echo "  make tdd-ops-readiness    # Check operational readiness (95% required)"
  echo "  make tdd-plan PKG=name    # Generate TDD plan for package"
  echo "  make tdd-enforce          # Enforce TDD practices with quality gates"
  echo "  make tdd-status          # Check current TDD status"
  echo ""
  echo "TDD Coach CLI commands:"
  echo "  tdd-coach status --ops-readiness     # Status with operational assessment"
  echo "  tdd-coach validate --quality-gates   # Validate with gate enforcement"
  echo "  tdd-coach plan --package <name>      # Generate comprehensive TDD plan"
  echo "  tdd-coach assess --operational-criteria  # Run 20-point assessment"
  echo ""
  echo "Local development:"
  echo "  git commit     # Pre-commit hooks will run quality checks"
  echo "  pre-commit run --all-files    # Run all hooks manually"
  echo ""
  echo "Documentation:"
  echo "  packages/tdd-coach/docs/tdd-planning-guide.md  # Complete methodology"
  echo "  .eng/quality_gate.json                         # Quality gate contract"
  echo "  TDD_IMPLEMENTATION_SUMMARY.md                  # Implementation overview"
  echo ""
}

# Main execution
main() {
  echo "[brAInwav] Starting developer setup for TDD quality gates..."
  echo ""
  
  check_dependencies
  setup_quality_contract
  setup_tdd_coach
  setup_precommit
  test_setup
  
  echo ""
  echo "[brAInwav] ✅ TDD Quality Gates Developer Setup Complete!"
  echo "[brAInwav] 🚀 Ready for production-grade development with brAInwav standards"
  
  show_usage
}

# Run main function
main "$@"
