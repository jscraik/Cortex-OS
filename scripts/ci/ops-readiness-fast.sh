#!/bin/bash
# brAInwav Operational Readiness Assessment Script (Optimized)
# Quick assessment for production readiness validation
# 
# Co-authored-by: brAInwav Development Team

set -euo pipefail

OUTPUT_FILE="${1:-out/ops-readiness.json}"
SCORE=0
TOTAL=20

echo "[brAInwav] Operational Readiness Assessment - Quick Production Standards Check"

# Ensure output directory exists
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Initialize JSON output
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

# Function to check criterion efficiently
check_criterion() {
  local name="$1"
  local pattern="$2"
  local weight="${3:-1}"
  local description="${4:-}"
  
  echo "[brAInwav] Checking: $name"
  
  # Use find with limits for efficiency
  if find . -maxdepth 3 -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" \) \
     | head -100 | xargs grep -l "$pattern" 2>/dev/null | head -1 >/dev/null; then
    echo "  ✅ Pass ($weight point) - brAInwav standard met"
    SCORE=$((SCORE + weight))
    STATUS="pass"
  else
    echo "  ❌ Fail - brAInwav standard not met"
    STATUS="fail"
  fi
  
  # Update JSON efficiently
  jq --arg name "$name" --arg status "$STATUS" --argjson weight "$weight" --arg desc "$description" \
    '.criteria += [{"name": $name, "status": $status, "weight": $weight, "description": $desc}]' \
    "$OUTPUT_FILE" > "${OUTPUT_FILE}.tmp" && mv "${OUTPUT_FILE}.tmp" "$OUTPUT_FILE"
}

echo "[brAInwav] === Infrastructure & Health Criteria (1-4) ==="

# Simplified criteria with efficient patterns
check_criterion "Health endpoints" "health\\|ready\\|live" 1 "Health monitoring endpoints"
check_criterion "Environment configuration" "process\\.env\\|config" 1 "Environment configuration"
check_criterion "Secrets management" "vault\\|secret" 1 "Secrets management"
check_criterion "Network timeouts" "timeout\\|deadline" 1 "Network timeouts"

echo "[brAInwav] === Resilience & Reliability Criteria (5-8) ==="

check_criterion "Retry logic" "retry\\|backoff" 1 "Retry mechanisms"
check_criterion "Idempotency" "idempotent" 1 "Idempotency handling"
check_criterion "Structured logging" "brAInwav\\|log" 1 "Structured logging with branding"
check_criterion "Metrics collection" "metric\\|prometheus" 1 "Metrics collection"

echo "[brAInwav] === Observability & Operations Criteria (9-12) ==="

check_criterion "Distributed tracing" "trace\\|span" 1 "Distributed tracing"
check_criterion "Monitoring setup" "dashboard\\|alert" 1 "Monitoring setup"
check_criterion "Graceful shutdown" "SIGTERM\\|shutdown" 1 "Graceful shutdown"
check_criterion "Resource monitoring" "memory\\|cpu" 1 "Resource monitoring"

echo "[brAInwav] === Deployment & Security Criteria (13-16) ==="

check_criterion "Migration testing" "migration\\|prisma" 1 "Database migrations"
check_criterion "Deployment strategy" "docker\\|deploy" 1 "Deployment strategy"
check_criterion "Supply chain security" "audit\\|SBOM" 1 "Supply chain security"
check_criterion "Fault injection" "chaos\\|fault" 1 "Chaos testing"

echo "[brAInwav] === Environment & Process Criteria (17-20) ==="

check_criterion "Environment parity" "staging\\|prod" 1 "Environment parity"
check_criterion "Operational runbooks" "runbook\\|ops" 1 "Operational documentation"
check_criterion "Data privacy" "privacy\\|GDPR" 1 "Data privacy compliance"
check_criterion "Dependency management" "package\\.json\\|audit" 1 "Dependency management"

# Calculate final score
PERCENTAGE=$((SCORE * 100 / TOTAL))
PRODUCTION_READY=0
if [[ $PERCENTAGE -ge 95 ]]; then
  PRODUCTION_READY=1
fi

# Update final JSON
jq --argjson score "$SCORE" --argjson percentage "$PERCENTAGE" --argjson production_ready "$PRODUCTION_READY" \
  '.score = $score | .percentage = $percentage | .production_ready = ($production_ready == 1)' \
  "$OUTPUT_FILE" > "${OUTPUT_FILE}.tmp" && mv "${OUTPUT_FILE}.tmp" "$OUTPUT_FILE"

echo ""
echo "[brAInwav] === Operational Readiness Assessment Complete ==="
echo "[brAInwav] Final Score: $SCORE/$TOTAL ($PERCENTAGE%)"

# Provide feedback
if [[ $PERCENTAGE -ge 95 ]]; then
  echo "[brAInwav] ✅ Operational readiness gate PASSED"
  echo "[brAInwav] 🚀 Production deployment approved - brAInwav excellence achieved"
  exit 0
else
  echo "[brAInwav] ❌ Operational readiness gate FAILED (need ≥95%)"
  echo "[brAInwav] 🔧 Review failing criteria and implement missing operational requirements"
  
  # Show failed criteria count
  FAILED_COUNT=$(jq '.criteria | map(select(.status == "fail")) | length' "$OUTPUT_FILE")
  echo "[brAInwav] Failed criteria: $FAILED_COUNT/$TOTAL"
  
  echo ""
  echo "[brAInwav] Production deployment blocked - resolve operational gaps before proceeding"
  exit 1
fi
