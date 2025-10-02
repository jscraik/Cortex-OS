# Principled TDD Plan - Cortex-OS & Cortex-Py Refactor

## brAInwav Development Standards - October 2025

**Version**: 1.0  
**Target**: 95/95 coverage, 80% mutation score, ≥95% operational readiness  
**Approach**: Test-first, incremental, evidence-based

---

## Executive Summary

This plan structures the upgrade and refactor of `apps/cortex-os` (Node/TypeScript) and `apps/cortex-py` (Python) using strict Test-Driven Development. All changes follow the brAInwav quality gates and CODESTYLE.md conventions.

**Key Principles**:

- Write failing test → minimal implementation → refactor → commit
- ≤50 lines per change with accompanying tests
- No code without evidence (file/line references, diffs)
- Quality gates enforced at every PR

## Immediate Next Actions (October 2 – October 3, 2025)

- **Thursday, October 2, 2025**:
  - Run `pnpm install --frozen-lockfile` and `uv sync` to align Node and Python workspaces before TDD iterations start.
  - Inventory existing automation by running `just scout "quality_gate" scripts/ci` and log findings in `reports/baseline/notes-2025-10-02.md`.
  - Confirm owner availability and schedule Phase 0 kickoff blocks with DevOps, the Lead Engineer, and the TDD Coach Maintainer.
- **Friday, October 3, 2025**:
  - Add pending/failing tests in `tests/quality-gates/gate-enforcement.test.ts`, `tests/tdd-coach/integration.test.ts`, and `apps/cortex-py/tests/test_tdd_coach_plugin.py` so Monday starts red.
  - Pre-create placeholder artifacts (`reports/baseline/quality_gate.json`, `reports/baseline/ops-readiness.json`) with TODO markers to unblock week 1 drops.
  - Validate governance guard ahead of new files via `just verify changed.txt` (expect non-zero exit until gates finalize).

---

## Phase 0: Foundation & Baseline [Week 1]

### 0.1 Quality Gate Infrastructure

**Goal**: Establish automated quality enforcement

**Tasks**:

- [x] Create `.eng/quality_gate.json` with brAInwav thresholds (tracked alongside Structure Guard allowlist updates)
- [x] Add CI workflow from TDD guide (`scripts/ci/enforce-gates.mjs`)
- [x] Implement operational readiness script (`scripts/ci/ops-readiness.sh`)
- [ ] Configure coverage ratcheting (start at current baseline, auto-increment)

**Tests**:

```typescript
// tests/quality-gates/gate-enforcement.test.ts
describe('Quality Gate Enforcement', () => {
  it('should fail PR when coverage < 95%', async () => {
    const result = await enforceGates({ coverage: { line: 94 } });
    expect(result.passed).toBe(false);
    expect(result.violations).toContain('Line coverage');
  });
  
  it('should pass with all gates met', async () => {
    const result = await enforceGates(VALID_METRICS);
    expect(result.passed).toBe(true);
  });
});
```

**Evidence**: PR with CI logs showing gate execution

**Notes**:
- Quality gate contract committed at `.eng/quality_gate.json`
- Vitest enforcement tests live at `tests/quality-gates/gate-enforcement.test.ts`

**Owner**: DevOps + TDD Coach Lead  
**Duration**: 3 days  
**Dependencies**: None

---

### 0.2 Current State Assessment

**Goal**: Generate baseline metrics and identify hotspots

**Tasks**:

- [x] Run coverage analysis on both codebases *(baseline harness ready; populate with real coverage data during CI run)*
- [x] Generate code structure maps (codemaps)
- [x] Execute package audit on high-risk modules *(ingest JSON export into baseline report)*
- [x] Document current flake rate and test durations *(baseline JSON includes `flakeRate`/`testRuns` fields)*

**Tests**:

```python
# tests/assessment/baseline_test.py
def test_coverage_baseline_recorded():
    """Ensure we capture current coverage for ratcheting"""
    baseline = get_coverage_baseline()
    assert baseline['line'] >= 0
    assert baseline['branch'] >= 0
    assert baseline['packages'] is not None
```

**Evidence**: Baseline report JSON files in `reports/baseline/`

**Owner**: Lead Engineer  
**Duration**: 2 days  
**Dependencies**: 0.1 complete

---

### 0.3 TDD Coach Integration

**Goal**: Embed TDD Coach in development workflow

**Tasks** (Node):

- [ ] Add `packages/tdd-coach` as dev dependency
- [ ] Create Vitest hook (`tests/tdd-setup.ts`)
- [ ] Configure watch mode: `tdd-coach validate --watch`
- [ ] Add pre-commit hook in `.husky/pre-commit`

**Tasks** (Python):

- [ ] Create Pytest plugin (`tools/python/tdd_coach_plugin.py`)
- [ ] Configure `pytest.ini` to load plugin
- [ ] Add pre-commit hook to run `make tdd-validate`

**Tests**:

```typescript
// tests/tdd-coach/integration.test.ts
describe('TDD Coach Integration', () => {
  it('should block commit without test', async () => {
    const result = await runPreCommit(['src/new-file.ts']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('No test file found');
  });
});
```

**Evidence**: Failed commit attempt without test + successful commit with test

**Owner**: TDD Coach Maintainer  
**Duration**: 2 days  
**Dependencies**: 0.1 complete

---

### Week 1 Execution Breakdown (October 6 – October 10, 2025)

[Inference] Kickoff is assumed for Monday, October 6, 2025; adjust the calendar if the actual start date shifts.

- **Monday, October 6, 2025**:
  - Reconcile the committed `.eng/quality_gate.json` with CODESTYLE thresholds and snapshot results in `reports/baseline/quality_gate.json`.
  - Author the red-first assertion in `tests/quality-gates/gate-enforcement.test.ts` before scaffolding `scripts/ci/enforce-gates.mjs`.
  - Run `pnpm lint:smart --dry-run` to surface structural violations tied to the quality gate contract.
- **Tuesday, October 7, 2025**:
  - Implement the minimal `scripts/ci/enforce-gates.mjs` logic required to satisfy the new Vitest assertions.
  - Draft `scripts/ci/ops-readiness.sh` with guard clauses that intentionally exit non-zero until readiness checks land.
  - Capture operational readiness metrics in `reports/baseline/ops-readiness.json` alongside coverage artifacts.
- **Wednesday, October 8, 2025**:
  - Enable coverage ratcheting thresholds in `.eng/quality_gate.json` and extend `tests/quality-gates/gate-enforcement.test.ts` to verify the guardrails.
  - Generate baseline coverage via `pnpm test:smart -- --coverage` and persist JSON outputs under `reports/baseline/`.
  - Wire the Node Vitest watch hook in `tests/tdd-setup.ts` (red state until `packages/tdd-coach` is linked).
- **Thursday, October 9, 2025**:
  - Link `packages/tdd-coach` into the workspace (`"tdd-coach": "workspace:*"` in `apps/cortex-os/package.json`) and register the `.husky/pre-commit` hook.
  - Create the Pytest plugin skeleton at `tools/python/tdd_coach_plugin.py` and a failing companion test in `apps/cortex-py/tests/test_tdd_coach_plugin.py`.
  - Verify watch flows end-to-end via `tdd-coach validate --watch` and `make tdd-validate`.
- **Friday, October 10, 2025**:
  - Document the executed baselines in `docs/development/baseline-metrics.md` with links to `reports/baseline/` artifacts.
  - Capture the sprint retro in `tasks/week-01-retro-2025-10-10.md`.
  - Run `just verify changed.txt` to ensure governance alignment before merging.

---

## Phase 1: Memory System Consolidation [Weeks 2-3]

### 1.1 Remove Legacy Memory Adapters

**Goal**: Centralize memory operations through unified REST API

**Tasks** (Node):

- [ ] Identify all direct DB calls in `packages/memories/src/**`
- [ ] Write failing tests for REST-based memory operations
- [ ] Implement `LocalMemoryAdapter` using REST client
- [ ] Remove legacy `PostgresAdapter` and `VectorAdapter`

**Tasks** (Python):

- [ ] Remove `cortex_mcp/adapters/memory_adapter.py` direct DB logic
- [ ] Proxy all operations to Node memory-core REST API
- [ ] Write contract tests validating HTTP responses

**Tests**:

```typescript
// tests/memory/adapter-migration.test.ts
describe('Memory Adapter Migration', () => {
  it('should reject direct database connections', async () => {
    const adapter = new MemoryAdapter();
    await expect(adapter.directDBQuery('SELECT...')).rejects.toThrow(
      'Direct DB access deprecated'
    );
  });
  
  it('should route all operations through REST API', async () => {
    const adapter = new LocalMemoryAdapter();
    const spy = vi.spyOn(adapter.restClient, 'post');
    await adapter.store({ content: 'test' });
    expect(spy).toHaveBeenCalledWith('/memories/store', expect.any(Object));
  });
});
```

**Evidence**:

- `pnpm baseline:collect` aggregates coverage/codemap/audit/flake data into `reports/baseline/`
- Companion documentation: `docs/development/baseline-metrics.md`

- Zero database imports in adapter files
- 100% test coverage on REST client paths
- Performance benchmarks showing < 10ms latency overhead

**Owner**: Memory System Lead  
**Duration**: 5 days  
**Dependencies**: 0.2 (baseline established)

---

### 1.2 MCP Server Consolidation

**Goal**: Single Node MCP hub, Python clients via HTTP

**Tasks**:

- [ ] Write failing test: Python MCP call → Node MCP server
- [ ] Remove `packages/cortex-mcp/cortex_fastmcp_server_v2.py`
- [ ] Create Python MCP HTTP client with retry/circuit breaker
- [ ] Add cross-language integration tests

**Tests**:

```python
# tests/mcp/cross_language_test.py
@pytest.mark.integration
async def test_python_to_node_mcp_flow():
    """Ensure Python can call Node MCP tools"""
    client = PythonMCPClient(base_url=NODE_MCP_URL)
    result = await client.call_tool(
        'memory_search',
        {'query': 'test', 'limit': 5}
    )
    assert result['status'] == 'success'
    assert len(result['memories']) <= 5
```

**Evidence**:

- Zero Python MCP server processes running
- Latency tests showing P95 < 50ms for cross-language calls
- Circuit breaker activates after 5 failures

**Owner**: MCP Integration Team  
**Duration**: 4 days  
**Dependencies**: 1.1 complete

---

### 1.3 Memory Schema Multimodal Support

**Goal**: Extend memory to accept images, audio, video

**Tasks**:

- [ ] Add `modality` enum to Prisma schema
- [ ] Write tests for storing each modality type
- [ ] Update REST endpoints: `/embed/multimodal`
- [ ] Add file type validation with tests

**Tests**:

```typescript
// tests/memory/multimodal.test.ts
describe('Multimodal Memory', () => {
  it('should store image with correct modality', async () => {
    const memory = await memoryCore.store({
      content: imageBuffer,
      modality: 'image',
      metadata: { format: 'png' }
    });
    expect(memory.modality).toBe('image');
  });
  
  it('should reject unsupported file types', async () => {
    await expect(
      memoryCore.store({ content: exeBuffer, modality: 'image' })
    ).rejects.toThrow('Unsupported file type');
  });
});
```

**Evidence**:

- Prisma migration file
- Test coverage showing edge cases (corrupt files, size limits)

**Owner**: Memory Core Team  
**Duration**: 3 days  
**Dependencies**: 1.1 complete

---

## Phase 2: Agent Toolkit & Tool Resolution [Week 4]

### 2.1 Tool Path Resolver

**Goal**: Deterministic tool discovery with fallback hierarchy

**Tasks**:

- [ ] Implement `provideToolPath()` with precedence:
  1. `$AGENT_TOOLKIT_TOOLS_DIR`
  2. `$CORTEX_HOME/tools/agent-toolkit`
  3. `$HOME/.Cortex-OS/tools/agent-toolkit`
  4. Repository defaults
- [ ] Mirror logic in Python
- [ ] Write property-based tests for path resolution

**Tests**:

```typescript
// tests/toolkit/path-resolution.test.ts
describe('Tool Path Resolution', () => {
  it('should prioritize env var over defaults', () => {
    process.env.AGENT_TOOLKIT_TOOLS_DIR = '/custom/path';
    const path = provideToolPath('codemod');
    expect(path).toBe('/custom/path/codemod');
  });
  
  it.prop([fc.string(), fc.string()])('should handle arbitrary paths', 
    (dir, tool) => {
      const path = provideToolPath(tool, { baseDir: dir });
      expect(path).toContain(tool);
    }
  );
});
```

**Evidence**:

- Passing property tests with 1000+ generated scenarios
- Documentation showing precedence rules

**Owner**: Agent Toolkit Lead  
**Duration**: 2 days  
**Dependencies**: None

---

### 2.2 MCP Tool Registration

**Goal**: Register toolkit tools as MCP-callable with validation

**Tasks**:

- [ ] Register tools: `agent_toolkit_search`, `multi_search`, `codemod`, `validate`, `codemap`
- [ ] Return 400 for unknown tools
- [ ] Emit A2A events: `tool.execution.started`, `tool.execution.completed`
- [ ] Enforce token budgets and circuit breakers

**Tests**:

```typescript
// tests/toolkit/mcp-registration.test.ts
describe('MCP Tool Registration', () => {
  it('should reject unknown tool requests', async () => {
    const response = await mcpServer.callTool('nonexistent_tool', {});
    expect(response.status).toBe(400);
    expect(response.error).toContain('Unknown tool');
  });
  
  it('should emit A2A events on tool execution', async () => {
    const eventSpy = vi.spyOn(a2aEmitter, 'emit');
    await mcpServer.callTool('codemod', { pattern: '*.ts' });
    expect(eventSpy).toHaveBeenCalledWith(
      'tool.execution.started',
      expect.objectContaining({ tool: 'codemod' })
    );
  });
  
  it('should trip circuit breaker after 5 failures', async () => {
    for (let i = 0; i < 5; i++) {
      await mcpServer.callTool('failing_tool', {});
    }
    const result = await mcpServer.callTool('failing_tool', {});
    expect(result.error).toContain('Circuit breaker open');
  });
});
```

**Evidence**:

- 100% branch coverage on error paths
- Load test showing circuit breaker prevents cascading failures

**Owner**: MCP Registry Team  
**Duration**: 3 days  
**Dependencies**: 2.1 complete

---

## Phase 3: Multimodal AI & Hybrid Search [Week 5]

### 3.1 Multimodal Embedding Service

**Goal**: Integrate CLIP/Gemini for image/audio embeddings

**Tasks** (Python):

- [ ] Add MLX CLIP model to `cortex_py/models/`
- [ ] Create `/embed/multimodal` endpoint
- [ ] Write tests for each modality with edge cases
- [ ] Add timeout and memory limits

**Tests**:

```python
# tests/embeddings/multimodal_test.py
@pytest.mark.parametrize('modality', ['image', 'audio', 'text'])
async def test_multimodal_embeddings(modality: str):
    """Test embeddings for all supported modalities"""
    data = load_test_data(modality)
    embedding = await embed_service.embed(data, modality=modality)
    assert embedding.shape == (1, 512)  # CLIP output dim
    assert not np.isnan(embedding).any()

@pytest.mark.timeout(5)
async def test_embedding_timeout():
    """Ensure embeddings respect timeout"""
    with pytest.raises(TimeoutError):
        await embed_service.embed(LARGE_IMAGE, timeout=1.0)
```

**Evidence**:

- Latency metrics: P95 < 100ms for images, < 200ms for audio
- Memory usage stays < 2GB under load

**Owner**: ML Infrastructure Team  
**Duration**: 4 days  
**Dependencies**: 1.3 complete

---

### 3.2 Hybrid Search Implementation

**Goal**: Rank results across text, image, audio modalities

**Tasks**:

- [ ] Implement composite scoring: `semantic_score * 0.6 + keyword_score * 0.4`
- [ ] Add modality-specific weighting
- [ ] Return metadata indicating source (STM/LTM/remote)
- [ ] Write performance tests with large datasets

**Tests**:

```typescript
// tests/search/hybrid-search.test.ts
describe('Hybrid Search', () => {
  it('should blend semantic and keyword scores', async () => {
    const results = await search.hybrid('neural networks', {
      weights: { semantic: 0.7, keyword: 0.3 }
    });
    // Verify results contain both exact matches and semantic neighbors
    expect(results.some(r => r.content.includes('neural networks'))).toBe(true);
    expect(results.some(r => r.similarity > 0.8)).toBe(true);
  });
  
  it('should handle 10k+ memory search in <250ms', async () => {
    const start = performance.now();
    await search.hybrid('test', { limit: 100 });
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(250);
  });
});
```

**Evidence**:

- k6 load test results with 10k memories
- A/B test showing 20% relevance improvement over pure semantic

**Owner**: Search Team  
**Duration**: 3 days  
**Dependencies**: 3.1 complete

---

## Phase 4: Autonomous Agents & Reasoning [Week 6]

### 4.1 Planning Module with CoT/ToT

**Goal**: Multi-step task decomposition with reasoning traces

**Tasks**:

- [ ] Implement chain-of-thought planning
- [ ] Add tree-of-thought for complex tasks (>3 steps)
- [ ] Store reasoning traces in memory
- [ ] Write tests simulating multi-step workflows

**Tests**:

```typescript
// tests/agents/planning.test.ts
describe('Agent Planning Module', () => {
  it('should generate subtasks for complex goals', async () => {
    const plan = await planner.plan({
      goal: 'Refactor authentication system',
      context: { codebase: 'cortex-os' }
    });
    expect(plan.steps.length).toBeGreaterThan(2);
    expect(plan.reasoning).toBeDefined();
  });
  
  it('should use ToT for ambiguous goals', async () => {
    const plan = await planner.plan({
      goal: 'Improve system performance',
      strategy: 'tree-of-thought'
    });
    expect(plan.alternatives.length).toBeGreaterThan(1);
  });
});
```

**Evidence**:

- Plan quality evaluation: 80%+ of subtasks executable
- Reasoning traces stored with request IDs for debugging

**Owner**: Agents Team  
**Duration**: 4 days  
**Dependencies**: 1.2 (MCP hub ready)

---

### 4.2 Self-Reflection Loop

**Goal**: Agents critique and refine outputs

**Tasks**:

- [ ] Add reflection module that analyzes agent outputs
- [ ] Store feedback in memory with `reflection` tag
- [ ] Implement retry logic using reflection insights
- [ ] Test failure→reflection→success loops

**Tests**:

```python
# tests/agents/reflection_test.py
async def test_reflection_improves_output():
    """Verify reflection leads to better results"""
    # First attempt (intentionally flawed)
    initial = await agent.generate_code({'task': 'sort list'})
    reflection = await agent.reflect(initial)
    
    # Second attempt with reflection
    improved = await agent.generate_code({
        'task': 'sort list',
        'feedback': reflection
    })
    
    assert improved.quality_score > initial.quality_score
    assert 'improved' in reflection.changes
```

**Evidence**:

- A/B test: 35% fewer errors with reflection enabled
- Avg iterations to success: 1.8 vs 2.5 without reflection

**Owner**: Agents Team  
**Duration**: 3 days  
**Dependencies**: 4.1 complete

---

## Phase 5: Operational Readiness [Week 7]

### 5.1 Health, Readiness, Liveness Endpoints

**Goal**: Kubernetes-compatible health checks

**Tasks**:

- [ ] Implement `/health`, `/ready`, `/live` in both apps
- [ ] Add dependency health checks (DB, Redis, MCP)
- [ ] Write tests for degraded states
- [ ] Document expected response formats

**Tests**:

```typescript
// tests/ops/health-endpoints.test.ts
describe('Health Endpoints', () => {
  it('should return 503 when DB unavailable', async () => {
    await db.disconnect();
    const response = await request(app).get('/ready');
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      status: 'unavailable',
      dependencies: { database: 'down' }
    });
  });
  
  it('should pass liveness check even when degraded', async () => {
    await redis.disconnect();
    const response = await request(app).get('/live');
    expect(response.status).toBe(200); // Still alive, just degraded
  });
});
```

**Evidence**:

- K8s readiness probe successfully delays traffic during startup
- Liveness probe triggers restart on true failure

**Owner**: DevOps + Platform Team  
**Duration**: 2 days  
**Dependencies**: None

---

### 5.2 Graceful Shutdown

**Goal**: Zero dropped requests during deployments

**Tasks**:

- [ ] Implement SIGTERM handler with connection draining
- [ ] Add 30-second graceful shutdown timeout
- [ ] Write tests simulating in-flight requests during shutdown
- [ ] Verify with rolling deployment

**Tests**:

```typescript
// tests/ops/shutdown.test.ts
describe('Graceful Shutdown', () => {
  it('should complete in-flight requests', async () => {
    const requests = Array(10).fill(null).map(() => 
      request(app).get('/long-running')
    );
    
    setTimeout(() => process.emit('SIGTERM'), 100);
    
    const results = await Promise.all(requests);
    expect(results.every(r => r.status === 200)).toBe(true);
  });
  
  it('should reject new requests after SIGTERM', async () => {
    process.emit('SIGTERM');
    await delay(100);
    const response = await request(app).get('/test');
    expect(response.status).toBe(503);
  });
});
```

**Evidence**:

- Zero 5xx errors during canary deployment
- Connection drain completes in < 20s on average

**Owner**: Platform Team  
**Duration**: 2 days  
**Dependencies**: 5.1 complete

---

### 5.3 Observability Triad (Logs, Metrics, Traces)

**Goal**: Comprehensive telemetry with OpenTelemetry

**Tasks**:

- [ ] Add structured logging with request IDs
- [ ] Instrument RED metrics (Rate, Errors, Duration)
- [ ] Create trace spans around I/O operations
- [ ] Configure Grafana dashboards

**Tests**:

```typescript
// tests/ops/observability.test.ts
describe('Observability', () => {
  it('should emit metrics for all endpoints', async () => {
    const metrics = collectMetrics();
    await request(app).get('/test');
    expect(metrics).toContainEqual({
      name: 'http_requests_total',
      labels: { method: 'GET', path: '/test' }
    });
  });
  
  it('should create trace spans with proper context', async () => {
    const tracer = new InMemoryTracer();
    await tracer.trace('db-query', async () => {
      await db.query('SELECT 1');
    });
    expect(tracer.spans).toHaveLength(1);
    expect(tracer.spans[0].attributes).toHaveProperty('db.system');
  });
});
```

**Evidence**:

- Grafana dashboard showing P50/P95/P99 latencies
- Distributed traces linking Node→Python→DB calls

**Owner**: Observability Team  
**Duration**: 3 days  
**Dependencies**: None

---

## Phase 6: Security & Compliance [Week 8]

### 6.1 Input Validation & Injection Prevention

**Goal**: Zero injection vulnerabilities

**Tasks**:

- [ ] Add Zod schemas for all API endpoints
- [ ] Parameterized queries only (Prisma enforces this)
- [ ] Write fuzzing tests for parsers
- [ ] Add XSS prevention in webui

**Tests**:

```typescript
// tests/security/injection.test.ts
describe('Injection Prevention', () => {
  it('should reject SQL injection attempts', async () => {
    const malicious = "'; DROP TABLE users; --";
    const response = await request(app)
      .post('/api/search')
      .send({ query: malicious });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid input');
  });
  
  it('should sanitize XSS in markdown', () => {
    const html = renderMarkdown('<script>alert("xss")</script>');
    expect(html).not.toContain('<script>');
  });
});
```

**Evidence**:

- Semgrep scan shows zero high/critical findings
- Fuzz testing with 10k inputs, zero crashes

**Owner**: Security Team  
**Duration**: 3 days  
**Dependencies**: None

---

### 6.2 SBOM Generation & Dependency Audit

**Goal**: Supply chain security compliance

**Tasks**:

- [ ] Add `@cyclonedx/bom` for Node packages
- [ ] Generate Python SBOM with `syft`
- [ ] Automate vulnerability scanning in CI
- [ ] Document license compliance

**Tests**:

```typescript
// tests/security/sbom.test.ts
describe('SBOM Generation', () => {
  it('should generate valid CycloneDX SBOM', async () => {
    const sbom = await generateSBOM();
    expect(sbom.bomFormat).toBe('CycloneDX');
    expect(sbom.components.length).toBeGreaterThan(50);
  });
  
  it('should detect vulnerabilities in dependencies', async () => {
    const vulns = await scanDependencies();
    expect(vulns.critical).toBe(0);
    expect(vulns.high).toBe(0);
  });
});
```

**Evidence**:

- SBOM files in `sbom/formats/cyclonedx/`
- CI blocks PRs with critical vulnerabilities

**Owner**: Security + DevOps  
**Duration**: 2 days  
**Dependencies**: None

---

## Phase 7: Performance & Sustainability [Week 9]

### 7.1 Performance Baseline & SLO Definition

**Goal**: Establish P95 < 250ms, error rate < 0.5%

**Tasks**:

- [ ] Run k6 load tests on all endpoints
- [ ] Document current P50/P95/P99 latencies
- [ ] Set SLO budgets and alerting thresholds
- [ ] Create Grafana SLO dashboard

**Tests**:

```javascript
// tests/performance/load.test.js (k6)
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<250'],
    http_req_failed: ['rate<0.005'],
  },
};

export default function() {
  const res = http.get('http://localhost:3000/api/memories');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 250,
  });
}
```

**Evidence**:

- k6 results showing 99.5%+ success rate under load
- SLO dashboard linked in runbook

**Owner**: Performance Team  
**Duration**: 3 days  
**Dependencies**: None

---

### 7.2 Energy Efficiency Monitoring

**Goal**: Track and optimize carbon footprint

**Tasks**:

- [ ] Integrate Scaphandre for energy metrics
- [ ] Expose `/metrics/energy` endpoint
- [ ] Set sustainability threshold: <100W avg power
- [ ] Add low-power mode for MLX inference

**Tests**:

```python
# tests/sustainability/energy_test.py
def test_energy_metrics_exposed():
    """Ensure energy data is available"""
    response = client.get('/metrics/energy')
    assert response.status_code == 200
    data = response.json()
    assert 'power_watts' in data
    assert data['power_watts'] > 0

def test_low_power_mode_reduces_consumption():
    """Verify low-power mode decreases energy usage"""
    baseline = get_average_power(duration=60)
    
    enable_low_power_mode()
    low_power = get_average_power(duration=60)
    
    assert low_power < baseline * 0.7  # 30% reduction
```

**Evidence**:

- Energy dashboard showing <100W average
- Low-power mode tested on M4 Mac

**Owner**: Sustainability Lead  
**Duration**: 2 days  
**Dependencies**: 7.1 complete

---

## Phase 8: Coverage & Mutation Testing [Week 10]

### 8.1 Achieve 95/95 Coverage

**Goal**: Line and branch coverage ≥95%

**Tasks**:

- [ ] Run coverage analysis per package
- [ ] Generate missing test matrix
- [ ] Write tests for uncovered branches
- [ ] Ratchet coverage thresholds in CI

**Tests**:

```typescript
// tests/coverage/ratchet.test.ts
describe('Coverage Ratcheting', () => {
  it('should enforce 95% line coverage', async () => {
    const coverage = await getCoverageReport();
    const packages = Object.values(coverage.packages);
    packages.forEach(pkg => {
      expect(pkg.lines.pct).toBeGreaterThanOrEqual(95);
    });
  });
});
```

**Evidence**:

- Coverage badge showing 95%+ on README
- Zero uncovered critical paths

**Owner**: All Teams (coordinated)  
**Duration**: 5 days  
**Dependencies**: Phases 1-7 complete

---

### 8.2 Mutation Testing Integration

**Goal**: Mutation score ≥80%

**Tasks**:

- [ ] Integrate Stryker (Node) and mutmut (Python)
- [ ] Run mutation testing on critical modules
- [ ] Fix vacuous tests identified by mutations
- [ ] Add mutation score to quality gate

**Tests**:

```typescript
// Example: Mutation testing reveals weak assertion
// Before (killed by mutation):
it('should validate input', () => {
  const result = validate(input);
  expect(result).toBeDefined(); // Too weak!
});

// After (survives mutation):
it('should validate input', () => {
  const result = validate(input);
  expect(result.valid).toBe(true);
  expect(result.errors).toHaveLength(0);
});
```

**Evidence**:

- Stryker HTML report showing 80%+ mutation score
- CI blocks PRs with <80% mutation score

**Owner**: Quality Engineering  
**Duration**: 3 days  
**Dependencies**: 8.1 complete

---

## Phase 9: Continuous Improvement [Ongoing]

### 9.1 Flake Elimination

**Goal**: Flake rate < 1%

**Tasks**:

- [ ] Track flake rate per test file
- [ ] Replace sleep() with clock injection
- [ ] Add deterministic seeds for random tests
- [ ] Quarantine flaky tests until fixed

**Tests**:

```typescript
// tests/reliability/flake-detection.test.ts
describe('Flake Detection', () => {
  it('should run test 100 times without failure', async () => {
    const results = await runTestNTimes('memory-search.test.ts', 100);
    const failures = results.filter(r => !r.passed);
    expect(failures.length).toBe(0);
  });
});
```

**Evidence**:

- CI metrics showing <1% flake rate over 30 days
- No sleep() calls in test codebase

**Owner**: Test Infrastructure Team  
**Duration**: Ongoing  
**Dependencies**: None

---

### 9.2 Documentation & Runbooks

**Goal**: Operational knowledge captured

**Tasks**:

- [ ] Document all runbooks in `docs/runbooks/`
- [ ] Create incident response playbooks
- [ ] Generate API documentation from code
- [ ] Add architecture decision records (ADRs)

**Tests**:

```typescript
// tests/docs/runbook-validation.test.ts
describe('Runbook Validation', () => {
  it('should have runbook for each service', () => {
    const services = listServices();
    services.forEach(service => {
      const runbook = `docs/runbooks/${service}.md`;
      expect(fs.existsSync(runbook)).toBe(true);
    });
  });
});
```

**Evidence**:

- Runbooks covering 100% of services
- ADRs documenting major architectural decisions

**Owner**: Documentation Team  
**Duration**: Ongoing  
**Dependencies**: None

---

## Success Metrics

**Quality Gates** (all must pass):

- ✅ Line coverage ≥95%, branch coverage ≥95%
- ✅ Mutation score ≥80%
- ✅ Flake rate <1%
- ✅ Zero critical/high vulnerabilities
- ✅ Operational readiness ≥95%
- ✅ P95 latency <250ms
- ✅ Error rate <0.5%

**Evidence Requirements**:

- Machine-readable audit reports (SARIF/JSON)
- Coverage/mutation metrics with CI logs
- Load test results with SLO compliance
- Security scan reports
- SBOM files

**Timeline**: 10 weeks to full production readiness

**Rollback Plan**: Each phase can be reverted independently via feature flags

---

## Appendix A: CODESTYLE.md Compliance Checklist

- [ ] Functions ≤40 lines
- [ ] Named exports only (no default exports)
- [ ] Explicit types at API boundaries
- [ ] `camelCase` for vars/functions, `PascalCase` for types
- [ ] `kebab-case` for files/directories
- [ ] Python uses `snake_case`
- [ ] Conventional Commits enforced
- [ ] No hard-coded secrets
- [ ] WCAG 2.2 AA accessibility
- [ ] All async operations have timeout
- [ ] MLX integrations are real (no mocks in prod)

---

## Appendix B: Quick Start Commands

```bash
# Initial setup
make tdd-setup
pnpm install --frozen-lockfile

# Development workflow
tdd-coach validate --watch
make test-unit
make test-integration

# Pre-commit
make tdd-validate
make lint

# CI pipeline
make tdd-status
make coverage-report
make mutation-test
make security-scan
scripts/ci/enforce-gates.js
```

---

## Appendix C: References

- [TDD Planning Guide](/.Cortex-OS/packages/tdd-coach/docs/tdd-planning-guide.md)
- [CODESTYLE.md](/CODESTYLE.md)
- [brAInwav Quality Gates](/.eng/quality_gate.json)
- [Operational Readiness Rubric](/.eng/ops-readiness-rubric.md)
- [MCP Protocol Spec](https://spec.modelcontextprotocol.io)
- [A2A Event Schemas](/.cortex/schemas/events/)

---

**Prepared by**: TDD Planning Team  
**Last Updated**: October 2025  
**Status**: Ready for Implementation
