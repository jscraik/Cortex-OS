# TDD Planning Guide - Real-Time Production Gates

**brAInwav Development Standards**

This guide defines the comprehensive Test-Driven Development planning methodology for achieving 95/95 coverage with real-time execution and production readiness enforcement.

## Table of Contents

1. [Quality Gates Definition](#quality-gates-definition)
2. [Operational Readiness Rubric](#operational-readiness-rubric)
3. [TDD Execution Plan](#tdd-execution-plan)
4. [Real-Time Behavior Requirements](#real-time-behavior-requirements)
5. [Quality Gate Contract](#quality-gate-contract)
6. [CI Pipeline Implementation](#ci-pipeline-implementation)
7. [Package-Level "Done" Criteria](#package-level-done-criteria)
8. [Common Failure Modes](#common-failure-modes)
9. [Fast Start Checklist](#fast-start-checklist)

## Quality Gates Definition

### Precise Gate Criteria (CI Enforceable)

All gates must be enforced automatically in CI/CD pipelines:

- **Coverage**:
  - Line coverage ≥ 95% AND branch coverage ≥ 95% on changed code
  - Overall repo baseline can be lower but must ratchet up continuously
- **Mutation Score**: ≥ 80% (prevents vacuous tests that don't validate logic)
- **Pass Rate**: 100% on main branch; PRs must be green before merge
- **Flake Rate**: < 1% (tracked over last N runs with statistical significance)
- **Operational Readiness Score**: ≥ 95% across comprehensive rubric
- **Security**:
  - 0 Critical/High vulnerabilities allowed
  - Secrets scan must be clean
  - SBOM generation and validation required
- **Performance SLO (pre-prod)**:
  - P95 latency and error rate under expected load
  - Must meet targets with 10% headroom
- **Reliability SLOs**:
  - Graceful shutdown proven
  - Retry budgets respected
  - No unbounded queues
  - Backpressure verified

## Operational Readiness Rubric

Score each item 0, 0.5, or 1. Gate requires ≥95% (19/20 points minimum).

### Infrastructure & Health (Items 1-4)

1. **Health, readiness, liveness endpoints** - Kubernetes-compatible endpoints
2. **Config via env/flags** - Environment variables, CLI flags, sane defaults, schema validation
3. **Secrets from vault** - Never hardcoded in code or logs, proper secret management
4. **Timeouts on all network and DB calls** - No indefinite hangs, configurable timeouts

### Resilience & Reliability (Items 5-8)

5. **Retries with jitter + circuit breaker** - Exponential backoff, failure isolation
6. **Idempotency for external effects** - Safe retry mechanisms, idempotency keys
7. **Well-structured logs** - Request IDs, user/session IDs, structured format
8. **Metrics coverage** - Key counters, gauges, histograms; RED/USE methodology

### Observability & Operations (Items 9-12)

9. **Distributed tracing** - Spans around I/O and business operations
10. **Dashboards + alerts tied to SLOs** - Actionable alerts, SLO-based monitoring
11. **Graceful shutdown** - SIGTERM handling, connection draining
12. **Resource limits** - Memory/CPU monitoring, OOM protection, resource quotas

### Deployment & Security (Items 13-16)

13. **Migrations tested** - Both forward and rollback scenarios validated
14. **Rollback/canary strategy** - Documented and scriptable deployment strategies
15. **SBOM & signatures** - Software Bill of Materials, artifact signing, supply chain security
16. **Chaos/fault injection** - Timeout testing, 5xx responses, partial failure scenarios

### Environment & Process (Items 17-20)

17. **Staging ≈ prod parity** - Ephemeral environments for PRs, production-like staging
18. **Runbooks** - Oncall procedures, incident playbooks, paging policies
19. **Data privacy** - PII handling, retention policies, GDPR compliance
20. **Dependency audit** - Clean vulnerability scans, update policies defined

**Score Calculation**: `achieved_points / 20 ≥ 0.95`

## TDD Execution Plan

Execute iteratively per package following strict TDD discipline:

### Step 1 — Extract Behaviors

- Enumerate all user-visible behaviors and system invariants
- Convert to acceptance criteria with measurable outcomes
- Add comprehensive edge cases:
  - Time zone shifts, DST transitions, leap seconds
  - Empty inputs, huge inputs, malformed data
  - Duplicate messages, retry scenarios
  - Network partitions and split-brain scenarios
  - Resource exhaustion conditions

### Step 2 — Write Failing Tests First

Write tests in this order, ensuring all fail initially:

#### Core Testing Layers

- **Unit tests**: Pure logic, boundary conditions, error paths
- **Property-based tests**: Parsers, serializers, numeric operations, data transformations
- **Fuzz tests**: Input validation, protocol handling, API gateways
- **Contract tests**: Service APIs (both consumer and provider sides)
- **Integration tests**: Ephemeral environments (Docker Compose/K8s namespaces)
- **E2E tests**: Happy path scenarios AND rollback/recovery paths

#### Test Quality Requirements

- Each test must have clear, specific assertions
- Tests must be deterministic and repeatable
- No test dependencies or ordering requirements
- Proper test isolation with setup/teardown

### Step 3 — Add Operational Tests

Critical for production readiness:

#### System Behavior Tests

- **Timeout enforcement**: Assert all operations respect configured timeouts
- **Retry logic**: Verify exponential backoff and circuit breaker behavior
- **Idempotency**: Ensure duplicate operations are safe
- **Graceful shutdown**: Test SIGTERM handling and connection draining
- **Health checks**: Validate endpoint responses under various conditions
- **Metrics emission**: Assert correct metrics are published
- **Trace spans**: Verify distributed tracing context creation
- **Log fields**: Ensure required structured log fields are present

#### Operational Validation

- **Snapshot/golden tests**: Lock down log formats and metric names to prevent drift
- **Resource monitoring**: Memory usage, CPU consumption, file handles
- **Backpressure**: Queue depth limits, load shedding behavior

### Step 4 — Performance & Reliability

#### Load Testing

- **Framework selection**: k6, Locust, JMH, Go bench, or language-appropriate tools
- **Realistic data**: Use production-like datasets and traffic patterns
- **SLO targeting**: P95 latency < X ms, error rate < Y%, throughput targets
- **Sustained load**: Test performance degradation over time

#### Fault Injection Testing

- **Network conditions**: Use Toxiproxy or similar for latency, packet drops, partial failures
- **Backpressure verification**: Prove circuit breakers and load shedding work
- **Concurrency testing**: Race detectors, randomized schedulers where available
- **Resource exhaustion**: Memory pressure, CPU starvation, disk full scenarios

### Step 5 — Security Testing

#### Authentication & Authorization

- **Role-based access**: Test all roles and permission boundaries
- **Denial paths**: Verify unauthorized requests are properly rejected
- **Session management**: Token validation, expiration, revocation

#### Input Validation & Injection Prevention

- **SQL injection**: Parameterized queries, ORM safety
- **XSS prevention**: Input sanitization, output encoding
- **Command injection**: Shell command safety, path traversal prevention
- **Secrets handling**: Never logged, proper encryption at rest

#### Dependency Security

- **Vulnerability scanning**: Automated dependency audits
- **Supply chain**: SBOM generation, signature verification
- **License compliance**: Open source license validation

### Step 6 — Coverage & Mutation Testing

#### Coverage Requirements

- **Branch coverage**: Prefer over line coverage for conditional logic
- **Path coverage**: Critical decision trees fully exercised
- **Integration coverage**: Cross-module interaction paths

#### Mutation Testing Implementation

- **Logic validation**: Ensure tests catch subtle bugs
- **Assertion quality**: Verify tests actually validate expected behavior
- **Edge case coverage**: Mutation testing reveals gaps in boundary testing

### Step 7 — Flake Elimination

#### Time Management

- **No sleep() calls**: Use time control and monotonic clocks
- **Clock injection**: Tests control time advancement
- **Deadline propagation**: Timeout context flows through all operations

#### Test Isolation

- **Deterministic seeds**: Reproducible random behavior
- **No global state**: Proper test isolation and cleanup
- **Resource cleanup**: Files, connections, processes properly closed

### Step 8 — Coverage Ratcheting

#### Legacy Package Strategy

- **Baseline establishment**: Current coverage as starting point
- **Incremental improvement**: Auto-ratchet 1-2% per week of green builds
- **Gate progression**: Gradually increase thresholds until target reached
- **Quality over speed**: Ensure each increment adds genuine test value

## Real-Time Behavior Requirements

### Critical Implementation Patterns

#### Clock and Time Management

- **Monotonic clocks**: Inject controllable time sources, no system clock dependencies
- **Deadline propagation**: Timeout context flows across all async boundaries
- **No sleep-based logic**: Use event-driven patterns, not polling delays

#### Backpressure and Load Management

- **Bounded queues**: Enforce strict queue size limits
- **Intentional shedding**: Drop or shed load with proper client notification
- **Prove under load**: Fault injection tests validate backpressure behavior

#### Resource Management

- **Idempotency keys**: External effects must be safely retryable
- **Resource budgets**: Memory/CPU caps with monitoring and enforcement
- **No unbounded growth**: Prove steady-state behavior under sustained load
- **Cancellation propagation**: Context cancellation flows through all operations

## Quality Gate Contract

Create `/eng/quality_gate.json` in repository root:

```json
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
  }
}
```

## CI Pipeline Implementation

### Minimal CI Skeleton

```yaml
name: brAInwav-quality-gates
on: [pull_request, push]

jobs:
  quality-enforcement:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for change analysis
      
      - name: Setup Environment
        run: ./scripts/ci/setup-environment.sh
      
      - name: Build & Unit Tests
        run: |
          ./scripts/ci/build.sh
          ./scripts/ci/unit-tests.sh
        env:
          BRAINWAV_ENV: ci
      
      - name: Coverage Analysis
        run: ./scripts/ci/coverage.sh --json out/coverage.json
      
      - name: Mutation Testing
        run: ./scripts/ci/mutation.sh --json out/mutation.json
        if: github.event_name == 'pull_request'
      
      - name: Security & Static Analysis
        run: |
          ./scripts/ci/security-scan.sh --sarif out/security.sarif
          ./scripts/ci/static-analysis.sh --sarif out/static.sarif
      
      - name: Operational Readiness Assessment
        run: ./scripts/ci/ops-readiness.sh --json out/ops-readiness.json
      
      - name: Performance Testing
        run: ./scripts/ci/performance.sh --json out/performance.json
        if: github.base_ref == 'main'
      
      - name: brAInwav AI Audit (Scoped)
        run: ./scripts/ci/ai-audit.sh --inputs out/* --sarif out/ai.sarif --json out/ai.json
        env:
          BRAINWAV_AI_SCOPE: changed-files-only
      
      - name: Merge Analysis Results
        run: ./scripts/ci/merge-sarif.sh out/*.sarif > out/consolidated.sarif
      
      - name: Enforce Quality Gates
        run: ./scripts/ci/enforce-gates.js --contract .eng/quality_gate.json --inputs out/
        env:
          BRAINWAV_STRICT_MODE: true
      
      - name: Upload SARIF Results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: out/consolidated.sarif
        if: always()
      
      - name: Update PR with Results
        uses: actions/github-script@v7
        with:
          script: |
            const results = require('./out/quality-summary.json');
            const body = `## brAInwav Quality Gates Results
            
            **Coverage**: ${results.coverage.line}% line, ${results.coverage.branch}% branch
            **Mutation Score**: ${results.mutation.score}%
            **Security**: ${results.security.critical} critical, ${results.security.high} high
            **Ops Readiness**: ${results.ops_readiness.score}%
            **Performance**: P95 ${results.performance.p95_latency}ms
            
            ${results.gates_passed ? '✅ All gates passed' : '❌ Quality gates failed'}
            `;
            
            // Update or create PR comment
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number
            });
            
            const existing = comments.find(c => c.body && c.body.includes('brAInwav Quality Gates Results'));
            if (existing) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existing.id,
                body
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body
              });
            }
        if: github.event_name == 'pull_request'
```

## Package-Level "Done" Criteria

Each package is considered complete when it achieves:

### Automated Evidence

- **Machine-readable audit report**: SARIF/JSON format with specific findings and actionable recommendations
- **Missing Test Matrix**: Zero high-priority gaps identified
- **Coverage metrics**: ≥95% line & branch, ≥80% mutation score with evidence
- **Security validation**: Clean vulnerability scan, secrets detection, SBOM generated

### Operational Readiness

- **Ops readiness score**: ≥95% with documented evidence for each criterion
- **Monitoring**: Dashboards and alerts configured and tested
- **Load testing**: Performance SLOs met under realistic load with 10% headroom
- **Fault testing**: Resilience proven under adverse conditions

### Integration Validation

- **Contract testing**: All API contracts validated with real implementations
- **End-to-end flows**: Critical user journeys tested in ephemeral environments
- **Rollback procedures**: Deployment and rollback strategies proven

### CI/CD Integration

- **Gate enforcement**: All quality gates enforced on every PR
- **Automated testing**: Full test suite runs in CI with proper reporting
- **Continuous monitoring**: Production monitoring validates ongoing compliance

## Common Failure Modes

### Anti-Patterns to Avoid

#### Development Process Issues

- **Whole-repo prompting**: Blows token limits and invites hallucination. Use RAG + tight scopes instead
- **No evidence requirement**: If there's no file/line reference or concrete diff, treat as suggestion only
- **Big-bang refactors**: Split into ≤50-line diffs with accompanying tests
- **Coverage theater**: Without mutation testing and branch coverage, 95% line coverage can be meaningless

#### Technical Debt Accumulation

- **Flaky test tolerance**: Flake rate gate forces immediate fixes or responsible skipping
- **Placeholder proliferation**: Strict detection prevents "TODO-driven development"
- **Mock overuse**: Real implementations with proper test doubles, not permanent mocks
- **Configuration drift**: Schema validation and environment parity prevent inconsistencies

#### Quality Assurance Failures

- **Mutation testing avoidance**: Leads to tests that pass but don't validate logic
- **Integration gaps**: Unit tests pass but system-level flows fail
- **Performance afterthoughts**: Load testing as release blocker instead of development practice
- **Security as checkbox**: Vulnerability scanning without threat modeling

### Recovery Strategies

#### Process Recovery

- **Scope reduction**: Focus on single package/component until patterns established
- **Evidence documentation**: Every claim must have file/line evidence or concrete diff
- **Incremental delivery**: 50-line changes with tests, not 500-line refactors
- **Quality metrics**: Real-time dashboard showing coverage, mutation, flake rates

#### Technical Recovery

- **Test-first discipline**: Never write production code without failing test
- **Mutation testing**: Implement early to catch vacuous tests
- **Operational testing**: Infrastructure and resilience tests alongside business logic
- **Continuous validation**: Gates enforce quality on every commit, not just releases

## Fast Start Checklist

### Initial Setup (Week 1)

1. **Quality gate contract**: Add `/eng/quality_gate.json` with brAInwav standards
2. **Baseline assessment**: Generate code map + current coverage, feed to architecture scan
3. **Hotspot identification**: Run package audit on top 3 highest-risk packages
4. **CI integration**: Basic pipeline with coverage and mutation testing

### Foundation Building (Week 2-3)

5. **Missing test matrix**: Convert gaps into TDD tasks with specific acceptance criteria
6. **Operational tests**: Add infrastructure, health check, and resilience testing
7. **Security integration**: Vulnerability scanning, secrets detection, SBOM generation
8. **Performance baseline**: Establish load testing and SLO measurement

### Production Readiness (Week 4+)

9. **Gate enforcement**: Ratcheting thresholds with automatic quality improvements
10. **Fault injection**: Chaos testing and failure scenario validation
11. **End-to-end validation**: Complete user journey testing in ephemeral environments
12. **Monitoring integration**: Dashboards, alerts, and observability tied to SLOs

### Continuous Improvement

13. **Coverage ratcheting**: Automatic threshold increases based on green build streaks
14. **Flake elimination**: Zero-tolerance policy with immediate fix requirements
15. **Performance monitoring**: Continuous SLO validation with automated regression detection
16. **Security updates**: Automated dependency updates with compatibility testing

## Implementation Scripts

### Quality Gate Enforcement Script

```javascript
#!/usr/bin/env node
// scripts/ci/enforce-gates.js

import fs from 'node:fs';
import path from 'node:path';

const CONTRACT_FILE = '.eng/quality_gate.json';
const METRICS_DIR = 'out';

class QualityGateEnforcer {
  constructor(contractPath, metricsDir) {
    this.contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    this.metricsDir = metricsDir;
    this.violations = [];
  }

  async enforce() {
    console.log('[brAInwav] Enforcing quality gates...');
    
    await this.checkCoverage();
    await this.checkSecurity();
    await this.checkPerformance();
    await this.checkOpsReadiness();
    await this.checkReliability();
    
    if (this.violations.length > 0) {
      console.error('[brAInwav] Quality gate violations:');
      this.violations.forEach(v => console.error(`  ❌ ${v}`));
      process.exit(1);
    }
    
    console.log('[brAInwav] ✅ All quality gates passed');
  }

  async checkCoverage() {
    const coverage = JSON.parse(fs.readFileSync(path.join(this.metricsDir, 'coverage.json'), 'utf8'));
    const mutation = JSON.parse(fs.readFileSync(path.join(this.metricsDir, 'mutation.json'), 'utf8'));
    
    if (coverage.line < this.contract.coverage.line) {
      this.violations.push(`Line coverage ${coverage.line}% < required ${this.contract.coverage.line}%`);
    }
    
    if (coverage.branch < this.contract.coverage.branch) {
      this.violations.push(`Branch coverage ${coverage.branch}% < required ${this.contract.coverage.branch}%`);
    }
    
    if (mutation.score < this.contract.coverage.mutation_score) {
      this.violations.push(`Mutation score ${mutation.score}% < required ${this.contract.coverage.mutation_score}%`);
    }
  }

  async checkSecurity() {
    const security = JSON.parse(fs.readFileSync(path.join(this.metricsDir, 'security.json'), 'utf8'));
    
    if (security.critical > this.contract.security.max_critical) {
      this.violations.push(`Critical vulnerabilities: ${security.critical} > allowed ${this.contract.security.max_critical}`);
    }
    
    if (security.high > this.contract.security.max_high) {
      this.violations.push(`High vulnerabilities: ${security.high} > allowed ${this.contract.security.max_high}`);
    }
  }

  async checkPerformance() {
    const perf = JSON.parse(fs.readFileSync(path.join(this.metricsDir, 'performance.json'), 'utf8'));
    
    if (perf.p95_latency > this.contract.performance.p95_latency_ms_max) {
      this.violations.push(`P95 latency ${perf.p95_latency}ms > max ${this.contract.performance.p95_latency_ms_max}ms`);
    }
    
    if (perf.error_rate > this.contract.performance.error_rate_pct_max) {
      this.violations.push(`Error rate ${perf.error_rate}% > max ${this.contract.performance.error_rate_pct_max}%`);
    }
  }

  async checkOpsReadiness() {
    const ops = JSON.parse(fs.readFileSync(path.join(this.metricsDir, 'ops-readiness.json'), 'utf8'));
    
    if (ops.score < this.contract.ops_readiness_min) {
      this.violations.push(`Ops readiness ${ops.score} < required ${this.contract.ops_readiness_min}`);
    }
  }

  async checkReliability() {
    const reliability = JSON.parse(fs.readFileSync(path.join(this.metricsDir, 'reliability.json'), 'utf8'));
    
    if (!reliability.graceful_shutdown_verified) {
      this.violations.push('Graceful shutdown not verified');
    }
    
    if (!reliability.circuit_breaker_tested) {
      this.violations.push('Circuit breaker behavior not tested');
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const contractPath = process.argv[2] || CONTRACT_FILE;
  const metricsDir = process.argv[3] || METRICS_DIR;
  
  const enforcer = new QualityGateEnforcer(contractPath, metricsDir);
  enforcer.enforce().catch(err => {
    console.error('[brAInwav] Quality gate enforcement failed:', err);
    process.exit(1);
  });
}
```

### Operational Readiness Assessment Script

```bash
#!/bin/bash
# scripts/ci/ops-readiness.sh

set -euo pipefail

OUTPUT_FILE="${1:-out/ops-readiness.json}"
SCORE=0
TOTAL=20

echo "[brAInwav] Assessing operational readiness..."

# Initialize JSON output
cat > "$OUTPUT_FILE" << EOF
{
  "score": 0,
  "max_score": $TOTAL,
  "percentage": 0,
  "criteria": [],
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "brainwav_compliance": true
}
EOF

# Function to check criterion
check_criterion() {
  local name="$1"
  local command="$2"
  local weight="${3:-1}"
  
  echo "Checking: $name"
  if eval "$command" >/dev/null 2>&1; then
    echo "  ✅ Pass ($weight point)"
    SCORE=$((SCORE + weight))
    STATUS="pass"
  else
    echo "  ❌ Fail"
    STATUS="fail"
  fi
  
  # Update JSON with criterion result
  jq --arg name "$name" --arg status "$STATUS" --argjson weight "$weight" \
    '.criteria += [{"name": $name, "status": $status, "weight": $weight}]' \
    "$OUTPUT_FILE" > "${OUTPUT_FILE}.tmp" && mv "${OUTPUT_FILE}.tmp" "$OUTPUT_FILE"
}

# Criterion 1: Health endpoints
check_criterion "Health endpoints" "grep -r '/health\|/ready\|/live' src/ || find . -name '*health*' -type f | head -1"

# Criterion 2: Configuration
check_criterion "Environment configuration" "find . -name '*.env*' -o -name 'config.*' | head -1"

# Criterion 3: Secrets management
check_criterion "Secrets management" "grep -r 'process.env\|vault\|secret' src/ | grep -v 'hardcoded\|password.*='"

# Criterion 4: Timeouts
check_criterion "Network timeouts" "grep -r 'timeout\|deadline' src/ | head -1"

# Criterion 5: Retries and circuit breakers
check_criterion "Retry logic" "grep -r 'retry\|circuit.*breaker\|exponential.*backoff' src/ | head -1"

# Criterion 6: Idempotency
check_criterion "Idempotency" "grep -r 'idempotent\|idempotency.*key' src/ | head -1"

# Criterion 7: Structured logging
check_criterion "Structured logging" "grep -r 'request.*id\|correlation.*id\|trace.*id' src/ | head -1"

# Criterion 8: Metrics
check_criterion "Metrics collection" "grep -r 'prometheus\|metric\|counter\|gauge\|histogram' src/ | head -1"

# Criterion 9: Tracing
check_criterion "Distributed tracing" "grep -r 'trace\|span\|opentelemetry' src/ | head -1"

# Criterion 10: Dashboards and alerts
check_criterion "Monitoring setup" "find . -name '*dashboard*' -o -name '*alert*' -o -name 'grafana*' | head -1"

# Criterion 11: Graceful shutdown
check_criterion "Graceful shutdown" "grep -r 'SIGTERM\|graceful.*shutdown\|server.close' src/ | head -1"

# Criterion 12: Resource limits
check_criterion "Resource monitoring" "grep -r 'memory.*limit\|cpu.*limit\|resource' src/ | head -1"

# Criterion 13: Database migrations
check_criterion "Migration testing" "find . -name '*migration*' -o -name 'prisma' -o -name 'migrate*' | head -1"

# Criterion 14: Deployment strategy
check_criterion "Deployment strategy" "find . -name '*deploy*' -o -name 'kubernetes*' -o -name 'docker*' | head -1"

# Criterion 15: Supply chain security
check_criterion "SBOM and signatures" "find . -name 'SBOM*' -o -name '*signature*' | head -1 || npm audit --audit-level=high"

# Criterion 16: Chaos testing
check_criterion "Fault injection" "grep -r 'chaos\|fault.*inject\|toxiproxy' . | head -1"

# Criterion 17: Environment parity
check_criterion "Environment parity" "find . -name '*staging*' -o -name '*prod*' -o -name 'docker-compose*' | head -1"

# Criterion 18: Runbooks
check_criterion "Operational runbooks" "find . -name '*runbook*' -o -name '*playbook*' -o -name 'docs/*ops*' | head -1"

# Criterion 19: Data privacy
check_criterion "Data privacy" "grep -r 'GDPR\|PII\|privacy\|retention' src/ docs/ | head -1"

# Criterion 20: Dependency management
check_criterion "Dependency audit" "npm audit --audit-level=moderate || yarn audit || pnpm audit"

# Calculate final score
PERCENTAGE=$(echo "scale=2; $SCORE * 100 / $TOTAL" | bc)

# Update final JSON
jq --argjson score "$SCORE" --argjson percentage "$PERCENTAGE" \
  '.score = $score | .percentage = $percentage' \
  "$OUTPUT_FILE" > "${OUTPUT_FILE}.tmp" && mv "${OUTPUT_FILE}.tmp" "$OUTPUT_FILE"

echo "[brAInwav] Operational readiness: $SCORE/$TOTAL ($PERCENTAGE%)"

if (( $(echo "$PERCENTAGE >= 95" | bc -l) )); then
  echo "[brAInwav] ✅ Operational readiness gate passed"
  exit 0
else
  echo "[brAInwav] ❌ Operational readiness gate failed (need ≥95%)"
  exit 1
fi
```

## Integration with TDD Coach

This planning guide integrates with the existing [`TDDCoach`](/packages/tdd-coach/src/TDDCoach.ts) system by:

### Enhanced State Machine

- Quality gates enforced at each TDD state transition
- Operational readiness validation before GREEN→REFACTOR transitions
- Performance regression prevention in REFACTOR state

### Contextual Coaching Integration

- Planning guidance based on current package maturity
- Adaptive intervention levels for quality gate violations
- Progress tracking across operational readiness criteria

### Universal Test Reporter Enhancement

- Integration with mutation testing frameworks
- Operational test detection and reporting
- Performance test result aggregation

### CLI Command Extensions

```bash
# Enhanced TDD Coach commands
tdd-coach validate --quality-gates
tdd-coach status --ops-readiness
tdd-coach plan --package <package-name>
tdd-coach assess --operational-criteria
```

These commands leverage the planning methodology defined in this guide to provide comprehensive TDD enforcement with production readiness validation.

## Conclusion

This TDD planning methodology ensures that brAInwav development achieves not just high test coverage, but genuine production readiness with real-time performance characteristics. The combination of strict quality gates, operational readiness criteria, and comprehensive automation creates a development process that delivers reliable, secure, and performant software.

By following this guide, development teams can achieve the demanding 95/95 coverage targets while building systems that operate reliably in production environments with minimal operational overhead.
