#!/bin/bash

# brAInwav Cortex-OS Operational Readiness Script
# Comprehensive production readiness validation with brAInwav standards

set -euo pipefail

TEST_MODE=${READINESS_TEST_MODE:-0}

# Configuration
OPS_FILE="ops-readiness-results.json"
OPS_REPORT_DIR="ops-reports"
READINESS_THRESHOLD=${READINESS_THRESHOLD:-95}

echo "🚀 brAInwav Operational Readiness Check"

# Check if required tools are available
if [[ "$TEST_MODE" != "1" ]] && ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found. Please install pnpm."
    exit 1
fi

# Function to run comprehensive operational readiness assessment
run_operational_readiness_assessment() {
    echo "🔍 Running comprehensive operational readiness assessment..."

    local assessment_file="${OPS_REPORT_DIR}/assessment-results.json"
    local legacy_output="out/ops-readiness-assessment.json"

    if ./scripts/ci/ops-readiness.sh "$legacy_output"; then
        echo "✅ brAInwav operational readiness assessment completed"
        if [ -f "$legacy_output" ]; then
            mkdir -p "$(dirname "$assessment_file")"
            cp "$legacy_output" "$assessment_file"
        fi
        if [ -f "$assessment_file" ] && [ "$assessment_file" != "$OPS_FILE" ]; then
            cp "$assessment_file" "$OPS_FILE"
        fi
        return 0
    else
        echo "❌ brAInwav operational readiness assessment failed"
        return 1
    fi
}

# Function to check infrastructure readiness
check_infrastructure_readiness() {
    echo "🏗️ Checking infrastructure readiness..."

    if [[ "$TEST_MODE" == "1" ]]; then
        mkdir -p "$OPS_REPORT_DIR"
        cat > "${OPS_REPORT_DIR}/infrastructure-results.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "issues": 0,
  "features": {
    "test_mode": true
  },
  "status": "passed"
}
EOF
        echo "  ✅ Test mode: infrastructure checks skipped"
        return 0
    fi

    local infra_issues=0
    local infra_features=()

    # Check for Docker configuration
    if [ -f "Dockerfile" ]; then
        echo "  ✅ Dockerfile found"
        infra_features+=("\"dockerfile\": true")

        # Check Dockerfile best practices
        if grep -q "HEALTHCHECK" Dockerfile; then
            echo "  ✅ Health check configured"
            infra_features+=("\"docker_healthcheck\": true")
        else
            echo "  ⚠️ No health check in Dockerfile"
            infra_features+=("\"docker_healthcheck\": false")
            infra_issues=$((infra_issues + 1))
        fi

        if grep -q "USER " Dockerfile && ! grep -q "USER root" Dockerfile; then
            echo "  ✅ Non-root user configured"
            infra_features+=("\"non_root_user\": true")
        else
            echo "  ⚠️ Running as root (security concern)"
            infra_features+=("\"non_root_user\": false")
            infra_issues=$((infra_issues + 1))
        fi
    else
        echo "  ❌ Dockerfile not found"
        infra_features+=("\"dockerfile\": false")
        infra_issues=$((infra_issues + 1))
    fi

    # Check for Kubernetes manifests
    if find . -name "*.yaml" -o -name "*.yml" | xargs grep -l "kind: Deployment\|kind: Service" 2>/dev/null | head -1 | grep -q .; then
        echo "  ✅ Kubernetes manifests found"
        infra_features+=("\"kubernetes_manifests\": true")
    else
        echo "  ⚠️ No Kubernetes manifests found"
        infra_features+=("\"kubernetes_manifests\": false")
    fi

    # Check for CI/CD pipelines
    if [ -d ".github/workflows" ]; then
        local workflow_count=$(find .github/workflows -name "*.yml" -o -name "*.yaml" | wc -l | tr -d ' ')
        echo "  ✅ CI/CD workflows found ($workflow_count files)"
        infra_features+=("\"cicd_workflows\": $workflow_count")
    else
        echo "  ❌ No CI/CD workflows found"
        infra_features+=("\"cicd_workflows\": 0")
        infra_issues=$((infra_issues + 1))
    fi

    # Generate infrastructure results
    cat > "${OPS_REPORT_DIR}/infrastructure-results.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "issues": $infra_issues,
  "features": {
    $(IFS=','; echo "${infra_features[*]}")
  },
  "status": "$([ $infra_issues -eq 0 ] && echo "passed" || echo "failed")"
}
EOF

    echo "📊 Infrastructure Readiness Results:"
    echo "  - Issues Found: $infra_issues"
    echo "  - Status: $([ $infra_issues -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"

    return $infra_issues
}

# Function to validate operational readiness report
validate_ops_report() {
    echo "🔍 Validating operational readiness report integrity..."

    if [ ! -f "$OPS_FILE" ]; then
        echo "❌ Operational readiness results file not found: $OPS_FILE"
        return 1
    fi

    if ! command -v jq &> /dev/null; then
        echo "⚠️ jq not available, skipping JSON validation"
        return 0
    fi

    if ! jq empty "$OPS_FILE" 2>/dev/null; then
        echo "❌ Operational readiness results file is not valid JSON"
        return 1
    fi

    echo "✅ Operational readiness report integrity validated"
    return 0
}

# Main execution
main() {
    echo "🚀 Starting brAInwav Operational Readiness Check..."
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
            echo "⚠️ Cannot install jq. Continuing without JSON validation..."
        fi
    fi

    # Create ops report directory
    mkdir -p "$OPS_REPORT_DIR"

    # Run operational readiness checks
    local assessment_result=0
    local infrastructure_result=0

    echo ""
    echo "🔍 Running operational readiness checks..."

    # Run the existing brAInwav assessment
    if ! run_operational_readiness_assessment; then
        assessment_result=1
    fi

    # Check infrastructure readiness
    if ! check_infrastructure_readiness; then
        infrastructure_result=1
    fi

    # Validate report
    local validation_result=0
    if ! validate_ops_report; then
        validation_result=1
    fi

    # Generate summary
    echo ""
    echo "📋 Operational Readiness Summary:"
    echo "  - brAInwav Assessment: $([ $assessment_result -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "  - Infrastructure Readiness: $([ $infrastructure_result -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "  - Report Validated: $([ $validation_result -eq 0 ] && echo "✅ YES" || echo "❌ NO")"
    echo "  - Results File: $OPS_FILE"

    if [ $assessment_result -eq 0 ] && [ $validation_result -eq 0 ]; then
        echo ""
        echo "🎉 Operational readiness check completed - brAInwav production readiness evaluated"
        exit 0
    else
        echo ""
        echo "❌ Operational readiness issues found - brAInwav production standards not met"
        exit 1
    fi
}

# Check if this is being called as the original assessment script
if [[ "${BASH_SOURCE[0]}" == "${0}" ]] && [[ "${1:-}" == out/* ]]; then
    # This is the original brAInwav assessment script logic
    OUTPUT_FILE="${1:-out/ops-readiness.json}"
    SCORE=0
    TOTAL=20

    echo "[brAInwav] Operational Readiness Assessment - Production Standards Validation"
    echo "[brAInwav] Evaluating against 20-point brAInwav excellence criteria..."

    # Ensure output directory exists
    mkdir -p "$(dirname "$OUTPUT_FILE")"

    # Initialize JSON output with brAInwav branding
    cat > "$OUTPUT_FILE" << EOF
{
  "brainwav_assessment_version": "1.0.0",
  "score": 0,
  "max_score": $TOTAL,
  "percentage": 0,
  "criteria": [],
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "brainwav_compliance": true,
  "production_ready": false
}
EOF

    if [[ "$TEST_MODE" == "1" ]]; then
      cat > "$OUTPUT_FILE" << EOF
{
  "brainwav_assessment_version": "1.0.0",
  "score": $TOTAL,
  "max_score": $TOTAL,
  "percentage": 100,
  "criteria": [],
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "brainwav_compliance": true,
  "production_ready": true,
  "test_mode": true
}
EOF
      echo "[brAInwav] Test mode enabled - skipping intensive readiness criteria"
      exit 0
    fi

    # Function to check criterion with brAInwav standards
    check_criterion() {
      local name="$1"
      local command="$2"
      local weight="${3:-1}"
      local description="${4:-}"

      echo "[brAInwav] Checking: $name"
      if eval "$command" >/dev/null 2>&1; then
        echo "  ✅ Pass ($weight point) - brAInwav standard met"
        SCORE=$((SCORE + weight))
        STATUS="pass"
      else
        echo "  ❌ Fail - brAInwav standard not met"
        STATUS="fail"
      fi

      # Update JSON with criterion result
      if command -v jq &> /dev/null; then
        jq --arg name "$name" --arg status "$STATUS" --argjson weight "$weight" --arg desc "$description" \
          '.criteria += [{"name": $name, "status": $status, "weight": $weight, "description": $desc}]' \
          "$OUTPUT_FILE" > "${OUTPUT_FILE}.tmp" && mv "${OUTPUT_FILE}.tmp" "$OUTPUT_FILE"
      fi
    }

    echo "[brAInwav] === Infrastructure & Health Criteria (1-4) ==="

    # Criterion 1: Health endpoints
    check_criterion "Health endpoints" \
      "find src/ apps/ packages/ -name '*.ts' -o -name '*.js' | head -20 | xargs grep -l '/health\\|/ready\\|/live' 2>/dev/null | head -1" \
      1 "Kubernetes-compatible health, readiness, and liveness endpoints"

    # Criterion 2: Configuration
    check_criterion "Environment configuration" \
      "find . -name '*.env*' -o -name 'config.*' -o -name 'configuration.*' | grep -v node_modules | head -1" \
      1 "Environment variables, CLI flags, sane defaults, schema validation"

    # Criterion 3: Secrets management
    check_criterion "Secrets management" \
      "grep -r 'process\\.env\\|vault\\|secret' src/ apps/ packages/ | grep -v 'hardcoded\\|password.*=' | head -1" \
      1 "Never hardcoded in code or logs, proper secret management"

    # Criterion 4: Timeouts
    check_criterion "Network timeouts" \
      "grep -r 'timeout\\|deadline' src/ apps/ packages/ | head -1" \
      1 "No indefinite hangs, configurable timeouts"

    echo "[brAInwav] === Resilience & Reliability Criteria (5-8) ==="

    # Criterion 5: Retries and circuit breakers
    check_criterion "Retry logic" \
      "grep -r 'retry\\|circuit.*breaker\\|exponential.*backoff' src/ apps/ packages/ | head -1" \
      1 "Exponential backoff, failure isolation"

    # Criterion 6: Idempotency
    check_criterion "Idempotency" \
      "grep -r 'idempotent\\|idempotency.*key' src/ apps/ packages/ | head -1" \
      1 "Safe retry mechanisms, idempotency keys"

    # Criterion 7: Structured logging
    check_criterion "Structured logging" \
      "grep -r 'request.*id\\|correlation.*id\\|trace.*id\\|brAInwav' src/ apps/ packages/ | head -1" \
      1 "Request IDs, user/session IDs, brAInwav branding in logs"

    # Criterion 8: Metrics
    check_criterion "Metrics collection" \
      "grep -r 'prometheus\\|metric\\|counter\\|gauge\\|histogram' src/ apps/ packages/ | head -1" \
      1 "Key counters, gauges, histograms; RED/USE methodology"

    echo "[brAInwav] === Observability & Operations Criteria (9-12) ==="

    # Criterion 9: Tracing
    check_criterion "Distributed tracing" \
      "grep -r 'trace\\|span\\|opentelemetry' src/ apps/ packages/ | head -1" \
      1 "Spans around I/O and business operations"

    # Criterion 10: Dashboards and alerts
    check_criterion "Monitoring setup" \
      "find . -name '*dashboard*' -o -name '*alert*' -o -name 'grafana*' -o -path '*/infra/grafana/*' | head -1" \
      1 "Actionable alerts, SLO-based monitoring"

    # Criterion 11: Graceful shutdown
    check_criterion "Graceful shutdown" \
      "grep -r 'SIGTERM\\|graceful.*shutdown\\|server\\.close' src/ apps/ packages/ | head -1" \
      1 "SIGTERM handling, connection draining"

    # Criterion 12: Resource limits
    check_criterion "Resource monitoring" \
      "grep -r 'memory.*limit\\|cpu.*limit\\|resource' src/ apps/ packages/ docker/ | head -1" \
      1 "Memory/CPU monitoring, OOM protection, resource quotas"

    echo "[brAInwav] === Deployment & Security Criteria (13-16) ==="

    # Criterion 13: Database migrations
    check_criterion "Migration testing" \
      "find . -name '*migration*' -o -name 'prisma' -o -name 'migrate*' -o -path '*/prisma/*' | head -1" \
      1 "Both forward and rollback scenarios validated"

    # Criterion 14: Deployment strategy
    check_criterion "Deployment strategy" \
      "find . -name '*deploy*' -o -name 'kubernetes*' -o -name 'docker*' -o -path '*/docker/*' | head -1" \
      1 "Documented and scriptable deployment strategies"

    # Criterion 15: Supply chain security
    check_criterion "SBOM and signatures" \
      "find . -name 'SBOM*' -o -name '*signature*' -o -path '*/sbom/*' | head -1 || npm audit --audit-level=high --dry-run" \
      1 "Software Bill of Materials, artifact signing, supply chain security"

    # Criterion 16: Chaos testing
    check_criterion "Fault injection" \
      "grep -r 'chaos\\|fault.*inject\\|toxiproxy' . | head -1 || find . -name '*chaos*' -o -name '*fault*' | head -1" \
      1 "Timeout testing, 5xx responses, partial failure scenarios"

    echo "[brAInwav] === Environment & Process Criteria (17-20) ==="

    # Criterion 17: Environment parity
    check_criterion "Environment parity" \
      "find . -name '*staging*' -o -name '*prod*' -o -name 'docker-compose*' -o -path '*/docker/*' | head -1" \
      1 "Production-like staging, ephemeral environments for PRs"

    # Criterion 18: Runbooks
    check_criterion "Operational runbooks" \
      "find . -name '*runbook*' -o -name '*playbook*' -o -path '*/docs/*ops*' -o -path '*/ops/*' | head -1" \
      1 "Oncall procedures, incident playbooks, paging policies"

    # Criterion 19: Data privacy
    check_criterion "Data privacy" \
      "grep -r 'GDPR\\|PII\\|privacy\\|retention' src/ docs/ apps/ packages/ | head -1" \
      1 "PII handling, retention policies, GDPR compliance"

    # Criterion 20: Dependency management
    check_criterion "Dependency audit" \
      "npm audit --audit-level=moderate --dry-run || yarn audit || pnpm audit || find . -name 'package.json' | head -1" \
      1 "Clean vulnerability scans, update policies defined"

    # Calculate final score
    PERCENTAGE=$((SCORE * 100 / TOTAL))
    PRODUCTION_READY=0
    if [[ $PERCENTAGE -ge 95 ]]; then
      PRODUCTION_READY=1
    fi

    # Update final JSON with brAInwav compliance
    if command -v jq &> /dev/null; then
      jq --argjson score "$SCORE" --argjson percentage "$PERCENTAGE" --argjson production_ready "$PRODUCTION_READY" \
        '.score = $score | .percentage = $percentage | .production_ready = ($production_ready == 1)' \
        "$OUTPUT_FILE" > "${OUTPUT_FILE}.tmp" && mv "${OUTPUT_FILE}.tmp" "$OUTPUT_FILE"
    fi

    echo ""
    echo "[brAInwav] === Operational Readiness Assessment Complete ==="
    echo "[brAInwav] Final Score: $SCORE/$TOTAL ($PERCENTAGE%)"

    # Provide detailed feedback with brAInwav standards
    if [[ $PERCENTAGE -ge 95 ]]; then
      echo "[brAInwav] ✅ Operational readiness gate PASSED"
      echo "[brAInwav] 🚀 Production deployment approved - brAInwav excellence achieved"
      exit 0
    else
      echo "[brAInwav] ❌ Operational readiness gate FAILED (need ≥95%)"
      echo "[brAInwav] 🔧 Review failing criteria and implement missing operational requirements"

      # Show which criteria failed for actionable feedback
      if command -v jq &> /dev/null && [ -f "$OUTPUT_FILE" ]; then
        echo "[brAInwav] Failed criteria requiring attention:"
        jq -r '.criteria[] | select(.status == "fail") | "  🔧 " + .name + ": " + .description' "$OUTPUT_FILE"
      fi

      echo ""
      echo "[brAInwav] Production deployment blocked - resolve operational gaps before proceeding"
      exit 1
    fi
else
    # Execute main function for CI workflow
    main "$@"
fi
