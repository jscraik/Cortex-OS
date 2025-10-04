# Next Session Plan - Phase 7: Performance & Sustainability

**Date**: 2025-01-04  
**Previous Session**: Phases 3-6 Complete  
**Next Phase**: Phase 7 - Performance & Sustainability  
**Estimated Duration**: 2-3 hours

---

## 🎯 Session Objectives

Establish production-grade performance baselines, SLO definitions, and sustainability monitoring for the Cortex-OS autonomous AI system.

---

## 📋 Phase 7 Scope

### 7.1: Performance Baseline & SLO Definition

**Goal**: Establish P95 < 250ms, error rate < 0.5%

**Tasks**:
- [ ] Run k6 load tests on all endpoints
- [ ] Document current P50/P95/P99 latencies
- [ ] Set SLO budgets and alerting thresholds
- [ ] Create Grafana SLO dashboard
- [ ] Add performance regression tests

**Endpoints to test**:
- POST /embed/multimodal (target: P95 < 200ms)
- GET /health/* (target: P95 < 50ms)
- POST /agents/plan (target: P95 < 2s)
- POST /agents/reflect (target: P95 < 500ms)
- GET /metrics (target: P95 < 100ms)

**Expected deliverables**:
- k6 load test scripts
- Performance baseline report
- SLO dashboard (Grafana)
- Alert rules (Prometheus)
- ~15-20 tests

### 7.2: Energy Efficiency Monitoring

**Goal**: Track and optimize carbon footprint

**Tasks**:
- [ ] Integrate codecarbon for energy tracking
- [ ] Expose /metrics/energy endpoint
- [ ] Set sustainability threshold: <100W avg power
- [ ] Add low-power mode for MLX inference
- [ ] Create energy efficiency dashboard

**Expected deliverables**:
- Energy monitoring integration
- Sustainability metrics endpoint
- Power consumption dashboard
- Low-power mode implementation
- ~10-15 tests

### 7.3: Rate Limiting & Throttling

**Goal**: Prevent resource exhaustion, ensure fair usage

**Tasks**:
- [ ] Implement token bucket rate limiting
- [ ] Add per-endpoint throttling
- [ ] Create rate limit middleware
- [ ] Add 429 Too Many Requests responses
- [ ] Document rate limits in API docs

**Rate limits**:
- /embed/multimodal: 60 req/min per client
- /agents/plan: 10 req/min per client
- /agents/reflect: 20 req/min per client
- /metrics: unlimited (internal only)
- /health/*: unlimited

**Expected deliverables**:
- Rate limiting middleware
- Throttling configuration
- API documentation updates
- ~15-20 tests

---

## 🧪 Testing Strategy

### Performance Tests (k6)
```javascript
// tests/performance/load-multimodal.test.js
export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Steady state
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.005'],
  },
};
```

### Energy Tests (Python)
```python
# tests/sustainability/energy_test.py
def test_energy_monitoring():
    tracker = EmissionsTracker()
    tracker.start()
    # Run inference
    tracker.stop()
    assert tracker.final_emissions < threshold
```

### Rate Limit Tests (pytest)
```python
# tests/performance/rate_limit_test.py
async def test_rate_limit_enforcement():
    for _ in range(61):  # Exceed 60/min limit
        response = await client.post("/embed/multimodal", ...)
    assert response.status_code == 429
```

---

## 📊 Success Criteria

### Performance
- [ ] P95 latency < 250ms for all endpoints
- [ ] P99 latency < 1s for all endpoints
- [ ] Error rate < 0.5% under load
- [ ] 99.5%+ success rate in k6 tests
- [ ] SLO dashboard operational

### Sustainability
- [ ] Average power consumption < 100W
- [ ] CO2 emissions tracked per request
- [ ] Low-power mode reduces energy by 30%+
- [ ] Energy metrics exposed via /metrics/energy

### Rate Limiting
- [ ] All endpoints have configured limits
- [ ] 429 responses include Retry-After header
- [ ] Rate limits documented in API docs
- [ ] Burst allowance configured

### Code Quality
- [ ] 40-50 new tests passing (100%)
- [ ] CODESTYLE.md: 100% compliant
- [ ] brAInwav branding: All metrics and logs
- [ ] Zero technical debt

---

## 🏗️ Files to Create

### Performance
- `tests/performance/load-multimodal.test.js`
- `tests/performance/load-agents.test.js`
- `tests/performance/load-health.test.js`
- `apps/cortex-py/src/performance/slo_tracker.py`
- `apps/cortex-py/src/performance/baseline.py`

### Sustainability
- `apps/cortex-py/src/sustainability/energy_monitor.py`
- `apps/cortex-py/src/sustainability/low_power.py`
- `tests/sustainability/energy_test.py`
- `tests/sustainability/low_power_test.py`

### Rate Limiting
- `apps/cortex-py/src/middleware/rate_limiter.py`
- `apps/cortex-py/src/middleware/throttle.py`
- `tests/middleware/rate_limit_test.py`

### Documentation
- `tasks/phase7-performance-complete.md`
- `docs/performance/SLO-GUIDE.md`
- `docs/performance/ENERGY-MONITORING.md`

---

## 🔄 TDD Workflow

### For Each Sub-Phase:

1. **RED**: Write failing tests
   ```bash
   cd apps/cortex-py
   CORTEX_PY_FAST_TEST=1 pytest tests/performance/test_slo.py -v
   # Should fail with ModuleNotFoundError
   ```

2. **GREEN**: Minimal implementation
   ```python
   # src/performance/slo_tracker.py
   def track_latency(endpoint: str, duration_ms: float):
       # Minimal implementation
       pass
   ```

3. **REFACTOR**: Clean up
   - Add CODESTYLE.md compliance
   - Add brAInwav branding
   - Split functions > 40 lines
   - Add type hints

4. **COMMIT**: Atomic commits
   ```bash
   git add tests/performance/ src/performance/
   git commit -m "feat(performance): phase 7.1 SLO tracking"
   ```

---

## 📈 Expected Metrics

### Test Coverage
- Phase 7.1: 15-20 tests
- Phase 7.2: 10-15 tests
- Phase 7.3: 15-20 tests
- **Total**: 40-50 new tests

### Code Volume
- Performance monitoring: ~400 lines
- Energy tracking: ~300 lines
- Rate limiting: ~350 lines
- Tests: ~600 lines
- **Total**: ~1,650 lines

### Time Estimate
- Phase 7.1: 60-75 minutes
- Phase 7.2: 45-60 minutes
- Phase 7.3: 45-60 minutes
- **Total**: 2.5-3 hours

---

## 🎯 Pre-Session Checklist

Before starting Phase 7:

- [ ] Phase 6 work committed to git
- [ ] Clean working directory (`git status`)
- [ ] All dependencies installed
- [ ] Test suite passing (216/225 tests)
- [ ] Development environment ready
- [ ] k6 installed (`brew install k6`)
- [ ] Prometheus/Grafana running (optional)

---

## 🚀 Quick Start Commands

```bash
# Verify clean state
git status
git log --oneline -5

# Install k6 (if needed)
brew install k6

# Verify test suite
cd apps/cortex-py
CORTEX_PY_FAST_TEST=1 pytest tests/ -v

# Start Phase 7.1
mkdir -p tests/performance
touch tests/performance/test_slo_baseline.py
# Write RED tests...
```

---

## 📊 Integration with Existing Work

Phase 7 builds on completed phases:

**Phase 6 (Observability)**: 
- Use existing Prometheus metrics for SLO tracking
- Extend /metrics endpoint with performance data

**Phase 5 (Operational)**:
- Health checks inform SLO error budgets
- Graceful shutdown prevents latency spikes

**Phase 4 (Agents)**:
- Planning latency tracked separately
- Reflection quality vs. performance tradeoffs

**Phase 3 (Multimodal)**:
- Embedding latency benchmarks
- Hybrid search performance optimization

---

## 💡 Success Tips

1. **Start with baselines**: Run k6 tests on current system first
2. **Incremental SLOs**: Set achievable targets, then tighten
3. **Energy in fast mode**: Use fast test mode to measure baseline
4. **Rate limits realistic**: Based on actual load patterns
5. **Monitor continuously**: Keep Prometheus running during tests

---

## 📝 Documentation Updates

Update these files after Phase 7:

- [ ] DEPLOYMENT.md - Add SLO configuration
- [ ] README.md - Document rate limits
- [ ] tasks/cortex-os-&-cortex-py-tdd-plan.md - Mark Phase 7 complete
- [ ] CHANGELOG.md - Phase 7 features

---

**Status**: Ready to start  
**Previous Achievement**: 9 phases, 216 tests, ~10,000 lines  
**Next Milestone**: Production-grade performance guarantees
