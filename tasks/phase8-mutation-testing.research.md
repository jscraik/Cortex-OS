# Phase 8: Coverage & Mutation Testing - Research

**Date**: 2025-01-04  
**Phase**: 8 - Coverage & Mutation Testing  
**Status**: Research Phase

---

## Research Objectives

1. Understand mutation testing with mutmut
2. Review current test coverage
3. Identify property-based testing opportunities
4. Plan mutation score targets

---

## 8.1: Coverage Analysis

### Current Coverage Status

**Command**:
```bash
cd apps/cortex-py
CORTEX_PY_FAST_TEST=1 pytest tests/ --cov=src --cov-report=term-missing
```

**Target**: ≥95% line and branch coverage

### Coverage by Module

Expected coverage (based on tests):
- Performance: ~95% (13 tests)
- Sustainability: ~95% (14 tests)
- Middleware: ~95% (13 tests)
- Observability: ~95% (28 tests)
- Operational: ~95% (33 tests)
- Agents: ~95% (39 tests)
- Multimodal: ~92% (105 tests)

**Total Expected**: ~95% overall

---

## 8.2: Mutation Testing

### What is Mutation Testing?

Mutation testing validates test quality by:
1. Introducing small code changes (mutations)
2. Running tests against mutated code
3. Tests should FAIL if mutations change behavior
4. Surviving mutants = weak tests

### mutmut Tool

**Installation**:
```bash
pip install mutmut
```

**Basic Usage**:
```bash
# Run mutation testing
mutmut run

# Show results
mutmut results

# Show specific mutant
mutmut show <id>
```

**Configuration** (.mutmut-config):
```ini
[mutmut]
paths_to_mutate=src/
tests_dir=tests/
runner=pytest
```

### Mutation Operators

Common mutations:
- `==` ↔ `!=`
- `<` ↔ `<=`
- `+` ↔ `-`
- `and` ↔ `or`
- Remove conditionals
- Change constants

### Mutation Score Target

**Industry Standard**: 60-80%
**brAInwav Target**: ≥80%

---

## 8.3: Property-Based Testing

### What is Property-Based Testing?

Instead of specific test cases, define properties that should always hold:

```python
from hypothesis import given, strategies as st

@given(st.integers(), st.integers())
def test_addition_commutative(a, b):
    """Addition should be commutative"""
    assert a + b == b + a
```

### hypothesis Library

**Features**:
- Generates random test data
- Finds edge cases automatically
- Shrinks failing examples
- Reproducible with seeds

**Strategies**:
- `st.integers()` - Random integers
- `st.floats()` - Random floats
- `st.text()` - Random strings
- `st.lists()` - Random lists
- `st.dictionaries()` - Random dicts

### Property Testing Candidates

**Performance Module**:
```python
@given(st.floats(min_value=0, max_value=1000))
def test_latency_always_positive(latency):
    """Latency tracking should handle any positive value"""
    tracker = SLOTracker()
    tracker.track("/endpoint", latency)
    # Should not crash
```

**Rate Limiter**:
```python
@given(st.integers(min_value=1, max_value=1000))
def test_rate_limiter_never_negative(rate):
    """Rate limiter should never have negative tokens"""
    limiter = RateLimiter(rate=rate, per_seconds=60)
    for _ in range(rate + 10):
        limiter.allow_request("client")
    
    remaining = limiter.get_remaining("client")
    assert remaining >= 0
```

**Energy Monitor**:
```python
@given(st.floats(min_value=0, max_value=100))
def test_energy_calculation_non_negative(duration):
    """Energy calculations should always be non-negative"""
    energy = calculate_energy(duration_s=duration)
    assert energy >= 0
```

---

## Implementation Strategy

### Phase 8.1: Coverage to 95%

**Steps**:
1. Run coverage analysis
2. Identify uncovered lines
3. Write targeted tests
4. Verify 95% threshold

**Expected Uncovered**:
- Error handling edge cases
- Rarely-used code paths
- Integration boundaries

### Phase 8.2: Mutation Testing

**Steps**:
1. Configure mutmut
2. Run on critical modules
3. Identify surviving mutants
4. Strengthen tests
5. Achieve ≥80% mutation score

**Critical Modules**:
- Performance SLO tracking
- Rate limiting logic
- Energy calculations

### Phase 8.3: Property-Based Tests

**Steps**:
1. Identify pure functions
2. Define invariants
3. Write property tests
4. Run with hypothesis

**Invariants to Test**:
- Latency ≥ 0
- Error rate between 0-1
- Token bucket tokens ≥ 0
- Energy consumption ≥ 0
- Percentiles in order (P50 ≤ P95 ≤ P99)

---

## Timeline

- Phase 8.1: Coverage (30 minutes)
- Phase 8.2: Mutation Testing (45 minutes)
- Phase 8.3: Property-Based Testing (30 minutes)
- **Total**: ~2 hours

---

## Success Criteria

### Coverage
- [ ] ≥95% line coverage
- [ ] ≥95% branch coverage
- [ ] All modules above threshold

### Mutation Testing
- [ ] ≥80% mutation score on critical modules
- [ ] No surviving mutants in core logic
- [ ] Test suite strengthened

### Property-Based Testing
- [ ] 10+ property tests added
- [ ] Core invariants validated
- [ ] Edge cases discovered and handled

---

## References

- mutmut: https://mutmut.readthedocs.io/
- hypothesis: https://hypothesis.readthedocs.io/
- pytest-cov: https://pytest-cov.readthedocs.io/

---

**Status**: Research complete, ready for implementation  
**Next**: Run coverage analysis baseline
