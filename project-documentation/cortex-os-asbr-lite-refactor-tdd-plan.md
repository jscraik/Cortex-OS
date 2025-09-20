# Cortex-OS ASBR-Lite Refactor TDD Checklist

## Executive Summary

**Project Status**: 75% Complete | **Risk Level**: Medium | **Estimated Completion**: 2 weeks

### Quick Status Dashboard

```
✅ Complete (7/9)    ⚠️ In Progress (1/9)    ❌ Not Started (1/9)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[████████████████████████████░░░░░░░░░░] 75%
```

### Critical Path Items

1. **🔴 BLOCKER**: A2A Transport Upgrade - Blocks production deployment
2. **🟡 HIGH**: CI Gates Passing - Blocks merge to main
3. **🟡 HIGH**: Cleanup & Removal - Technical debt accumulation

---

## Phase 1: Foundation (✅ COMPLETE)

### ✅ Workstream 0: Environment Setup

**Status**: Complete | **Owner**: Platform Team | **Completed**: 2025-09-15

```bash
# Verification Commands
export CORTEX_OS_TMP=/tmp/cortex-test
pnpm test tests/setup.global.ts
pnpm test tests/a2a/nats-smoke.test.ts
```

### ✅ Workstream 1: Runtime Bootstrap

**Status**: Complete | **Owner**: Core Team | **Completed**: 2025-09-16

```bash
# Verification Commands
pnpm test apps/cortex-os/tests/runtime.bootstrap.integration.test.ts
curl -s http://localhost:8080/health | jq .
```

### ✅ Workstream 2: Auth & Config

**Status**: Complete | **Owner**: Security Team | **Completed**: 2025-09-17

```bash
# Verification Commands
pnpm test apps/cortex-os/tests/security/auth.test.ts
ls -la ~/.cortex-os/config/
```

---

## Phase 2: Core Services (✅ COMPLETE)

### ✅ Workstream 3: Event System

**Status**: Phase 1 Complete | **Owner**: Platform Team | **Completed**: 2025-09-18

```bash
# Verification Commands
pnpm test tests/events/sse.test.ts
tail -f ~/.cortex-os/state/events/ledger.ndjson
```

**Remaining Tasks** (Low Priority):

- [ ] Wire OTEL spans/exporters
- [ ] Add distributed tracing context

### ✅ Workstream 4: Persistence Layer

**Status**: Complete | **Owner**: Data Team | **Completed**: 2025-09-19

```bash
# Verification Commands
pnpm test apps/cortex-os/tests/persistence/
ls -la ~/.cortex-os/data/
```

### ✅ Workstream 5: API Harmonization

**Status**: Complete | **Owner**: API Team | **Completed**: 2025-09-19

```bash
# Verification Commands
pnpm test apps/cortex-os/tests/http/api.test.ts
curl -X GET http://localhost:8080/v1/tasks
```

---

## Phase 3: Integration (✅ COMPLETE)

### ✅ Workstream 6: SDK Alignment

**Status**: Complete | **Owner**: SDK Team | **Completed**: 2025-09-20

```bash
# Verification Commands
pnpm test packages/asbr-sdk/tests/live-runtime.test.ts
```

### ✅ Workstream 7: Policy Router

**Status**: Complete | **Owner**: Governance Team | **Completed**: 2025-09-20

```bash
# Verification Commands
pnpm test libs/asbr-policy/tests/
pnpm test apps/cortex-os/tests/policy/enforcement.test.ts
```

---

## Phase 4: Production Readiness (❌ BLOCKED)

### ⚠️ Workstream 8: A2A Transport Upgrade

**Status**: Not Started | **Owner**: Infrastructure Team | **Target**: Week of 2025-09-23
**Risk**: 🔴 HIGH - Blocks production deployment

#### Immediate Actions Required

```bash
# Day 1: Setup & Failing Tests
mkdir -p apps/cortex-os/tests/transport
cat > apps/cortex-os/tests/transport/nats.integration.test.ts << 'EOF'
import { GenericContainer } from 'testcontainers';
import { connect } from 'nats';

describe('A2A Transport', () => {
  it('publishes and consumes cortex.* events', async () => {
    // Test implementation
  });
});
EOF

# Day 2: Infrastructure Setup
pnpm add nats @testcontainers/nats
cp packages/asbr/src/bus/nats-config.ts apps/cortex-os/src/transport/

# Day 3: Integration
# Update EventManager to use NATS instead of in-process
# Add DLQ and outbox pattern implementation

# Day 4: Testing & Verification
CORTEX_TRANSPORT=nats pnpm test:integration
```

#### Acceptance Criteria

- [ ] NATS container starts in CI
- [ ] Events flow through NATS with < 100ms latency
- [ ] DLQ captures failed messages
- [ ] Outbox pattern ensures delivery
- [ ] Schema registry validates messages
- [ ] Performance: 1000 msg/sec throughput

#### Risk Mitigation

- **Fallback**: Keep in-process bus as feature flag option
- **Gradual Rollout**: Use environment variable to toggle transport
- **Monitoring**: Add metrics before switching

### ❌ Workstream 9: Cleanup & Removal

**Status**: Not Started | **Owner**: All Teams | **Target**: Week of 2025-09-30
**Risk**: 🟡 MEDIUM - Technical debt accumulation

#### Task Breakdown by Team

**Platform Team** (2 days)

```bash
# Remove legacy runtime
rm -rf packages/asbr/src/runtime/
rm -rf packages/asbr/src/server/
git grep -l "packages/asbr" | xargs sed -i 's|packages/asbr|libs/|g'
```

**All Teams** (1 day each)

```bash
# Audit unused packages
find apps/cortex-os/packages -type d -maxdepth 1 | while read dir; do
  echo "Checking $dir..."
  grep -r "from '$dir'" apps/ || echo "UNUSED: $dir"
done

# Update dependencies
pnpm update --interactive --latest
pnpm audit --fix
pnpm dedupe
```

**Documentation Team** (3 days)

```bash
# Update all docs
find . -name "*.md" -exec grep -l "packages/asbr" {} \; | xargs update
cat > .cortex/readiness.yml << EOF
apps/cortex-os:
  status: production
  coverage: 85%
  checklist: 100%
EOF
```

---

## CI/CD Gates & Quality Assurance

### 🟡 Current CI Status

```bash
# Run these NOW to establish baseline
pnpm biome:staged          # Status: ❓ Unknown
pnpm lint:smart            # Status: ❌ Failing (known issues)
pnpm test:smart            # Status: ❓ Unknown
pnpm typecheck:smart       # Status: ❓ Unknown
pnpm build:smart           # Status: ❓ Unknown
```

### Required for Merge

```bash
#!/bin/bash
# ci-gate.sh - Run before ANY merge
set -e

echo "Running CI Gates..."
pnpm biome:staged
pnpm lint:smart
pnpm test:smart
pnpm typecheck:smart
pnpm build:smart

echo "✅ All gates passed!"
```

### Test Coverage Requirements

- Unit Tests: > 80% coverage
- Integration Tests: All critical paths covered
- E2E Tests: Happy path + error scenarios
- Performance Tests: < 100ms p95 latency

---

## Definition of Done Checklist

### Technical Requirements

- [ ] All workstreams complete (9/9)
- [ ] Zero dependency on `packages/asbr` runtime
- [ ] All tests run against live runtime (no mocks)
- [ ] CI gates green
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] Documentation complete

### Business Requirements

- [ ] Product sign-off received
- [ ] Migration guide published
- [ ] Rollback plan documented
- [ ] Monitoring dashboards created
- [ ] Runbook updated
- [ ] Team trained on new system

### Launch Criteria

- [ ] Feature flags configured
- [ ] Gradual rollout plan approved
- [ ] On-call schedule updated
- [ ] Incident response tested
- [ ] Customer communication sent

---

## Risk Register & Mitigation

| Risk | Probability | Impact | Mitigation | Owner |
|------|------------|--------|------------|--------|
| A2A Transport delays | High | High | Keep in-process fallback | Infra |
| Legacy code dependencies | Medium | High | Gradual migration | Platform |
| Performance regression | Low | High | Benchmark before/after | Perf |
| Data loss during migration | Low | Critical | Backup & rollback plan | Data |
| Team knowledge gaps | Medium | Medium | Pair programming sessions | Leads |

---

## Weekly Status Meeting Agenda

### Week of 2025-09-23

1. **A2A Transport Kickoff** (30 min)
   - Review design proposal
   - Assign implementation tasks
   - Set daily check-ins

2. **CI Gate Issues** (15 min)
   - Review failing tests
   - Assign fixes to teams
   - Set deadline for green CI

3. **Cleanup Planning** (15 min)
   - Review package audit results
   - Assign removal tasks
   - Schedule doc updates

### Success Metrics for Week

- [ ] A2A transport failing tests written
- [ ] CI gates analysis complete
- [ ] Cleanup tasks assigned

---

## Quick Reference Commands

```bash
# Full Test Suite
pnpm test:all

# Focused Testing
CORTEX_SMART_FOCUS=@cortex-os/orchestration pnpm test:smart

# Runtime Testing
curl -X POST http://localhost:8080/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"name":"test","type":"validation"}'

# Event Stream Testing  
curl -N http://localhost:8080/v1/events?stream=sse

# Persistence Verification
find ~/.cortex-os -type f -name "*.json" | head -20 | xargs jq .

# Clean Restart Test
rm -rf ~/.cortex-os && pnpm start:runtime && pnpm test:integration
```

---

## Appendix: Architecture Decisions

### ADR-001: NATS for A2A Transport

- **Decision**: Use NATS with JetStream for reliable delivery
- **Rationale**: Production-proven, supports DLQ/outbox patterns
- **Alternatives**: Kafka (too heavy), Redis Streams (less mature)

### ADR-002: File-based Persistence

- **Decision**: JSON files with atomic writes
- **Rationale**: Simple, debuggable, sufficient for current scale
- **Trade-offs**: Will need DB migration at 10K+ entities

### ADR-003: Optimistic Locking via Digests

- **Decision**: Use SHA-256 digests for conflict detection
- **Rationale**: Simple, stateless, works across restarts
- **Implementation**: ETag headers on all mutations

---

## Contact & Escalation

**Project Lead**: [Team Lead Name]
**Slack Channel**: #cortex-os-refactor
**Escalation Path**: Team Lead → Engineering Manager → CTO

**Daily Standup**: 10:00 AM
**Weekly Review**: Friday 2:00 PM
**Blockers**: Flag immediately in Slack

---

*Last Updated: 2025-09-20 | Next Review: 2025-09-23*
