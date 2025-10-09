# TDD Plan: Unified Workflow Integration (PRP Runner + Task Management)

**Task ID**: `unified-workflow-integration`  
**Created**: 2025-01-09  
**Status**: Draft  
**Estimated Effort**: 6 weeks (3 sprints)  
**PRP Integration**: Implements execution engine for G0-G7 gates + Phases 0-5

---

## Task Summary

Implement Phase 2 (Medium-term Integration) of the PRP Runner ↔ Task Management roadmap by creating a unified `cortex-workflow` CLI that orchestrates both quality gates (G0-G7) and development phases (0-5) in a single workflow. This includes a workflow state machine with SQLite persistence, enforcement profile system, local memory integration for insights, and real-time dashboard with WebSocket updates. The implementation follows TDD principles with property-based state machine testing and comprehensive accessibility validation.

---

## PRP Gate Alignment

> **Integration Note**: This task implements the workflow execution engine that runs PRP gates G0-G7 and coordinates them with task management phases 0-5.

### Enforcement Profile Reference
- **Source**: `enforcement-profile.yml` at repository root (Zod validated)
- **Coverage Targets**: From PRP G2 (Test Plan gate)
  - Lines: 95% (from `enforcementProfile.budgets.coverageLines`)
  - Branches: 95% (from `enforcementProfile.budgets.coverageBranches`)
  - Functions: 95% (brAInwav standard)
  - Statements: 95% (brAInwav standard)
- **Performance Budgets**: From PRP G2/G6
  - LCP: 2500ms (from `enforcementProfile.budgets.performanceLCP`)
  - TBT: 300ms (from `enforcementProfile.budgets.performanceTBT`)
- **Accessibility Target**: From PRP G2
  - Score: 90 (from `enforcementProfile.budgets.a11yScore`)
  - WCAG Level: AA (brAInwav standard)
  - WCAG Version: 2.2 (brAInwav standard)
- **Security**: brAInwav Zero-Tolerance Policy
  - Critical: 0
  - High: 0
  - Medium: ≤5

### Gate Cross-References
- **G0 (Ideation)**: Blueprint created by `init` command → `tasks/<slug>/prp-blueprint.md`
- **G1 (Architecture)**: Policy compliance validated by workflow engine
- **G2 (Test Plan)**: This TDD plan + enforcement profile = test planning
- **G3 (Code Review)**: Automated checks (lint, type, security) in CI
- **G4 (Verification)**: Quality gates execute through workflow engine
- **G5-G7 (Release)**: Dashboard approval workflow + deployment gates
- **Evidence Trail**: All steps logged to SQLite + local memory

---

## Scope & Goals

### In Scope
- ✅ **CLI commands**: `init`, `run`, `status`, `profile`, `insights`
- ✅ **Workflow orchestrator**: State machine with G0→G7 and Phases 0→5
- ✅ **Enforcement profile**: YAML-based quality standards (Zod validated)
- ✅ **SQLite persistence**: Workflow state, gates, phases, evidence
- ✅ **Local memory integration**: Store insights, decisions, patterns
- ✅ **Dashboard**: React UI with Timeline, Metrics, Evidence, Approvals, Insights
- ✅ **WebSocket updates**: Real-time workflow progress
- ✅ **PRP adapter**: Integration with `@cortex-os/prp-runner` gates
- ✅ **Task executor**: Phases 0-5 execution logic
- ✅ **A2A events**: Lifecycle event emission (started, completed, failed)
- ✅ **brAInwav branding**: All outputs, errors, dashboard, state metadata
- ✅ **WCAG 2.2 AA**: Dashboard accessibility compliance
- ✅ **Property-based tests**: State machine invariants
- ✅ **OpenTelemetry**: Spans, metrics, structured logs

### Out of Scope
- ❌ MCP adapters for workflow (Phase 3 / AI-assisted workflow)
- ❌ Advanced auth integration (Phase 2 uses HMAC-signed local tokens)
- ❌ Multi-user real-time collaboration (single-developer workflow for now)
- ❌ Workflow templates library (future enhancement)
- ❌ Pattern mining / ML recommendations (Phase 3)

### Success Criteria
1. All tests pass (100% green) with 95%+ coverage
2. Quality gates pass: `pnpm lint:smart && pnpm test:smart && pnpm security:scan`
3. Property-based tests verify state machine invariants
4. Dashboard passes `jest-axe` accessibility tests
5. Complete workflow G0→G7 executes in integration tests
6. Local memory stores insights (failures graceful if unavailable)
7. No secrets in state; redacted fields enforced
8. brAInwav branding in CLI, dashboard, profiles, memory metadata
9. Evidence artifacts persisted and queryable
10. Resume from checkpoint works correctly
11. Enforcement profile validates and diffs from defaults
12. Dashboard loads <200ms (95th percentile)

---

## Prerequisites & Dependencies

### Required Research
- [x] Research document completed: `tasks/unified-workflow-integration.research.md`
- [x] Spec document completed: `tasks/unified-workflow-integration-spec.md`
- [x] PRP Runner integration analyzed
- [x] Task management flow documented
- [x] Local memory API contract verified
- [ ] Dashboard UX mockups reviewed (optional)

### Internal Dependencies
- **Package**: `@cortex-os/workflow-common@workspace:*` - Shared validation types (Phase 1 complete)
- **Package**: `@cortex-os/prp-runner@workspace:*` - PRP gates G0-G7 execution
- **Package**: `@cortex-os/kernel@workspace:*` - Core types, utilities
- **Package**: `@cortex-os/a2a@workspace:*` - Event emission
- **Package**: `@cortex-os/memories@workspace:*` - Local memory integration
- **Package**: `@cortex-os/memory-core@workspace:*` - Core memory abstractions

### External Dependencies
- **Library**: `commander@^12.0.0` - CLI framework - License: MIT
- **Library**: `zod@^3.22.0` - Schema validation - License: MIT
- **Library**: `yaml@^2.3.0` - YAML parsing - License: ISC
- **Library**: `better-sqlite3@^9.4.0` - SQLite - License: MIT
- **Library**: `express@^4.18.0` - Dashboard API - License: MIT
- **Library**: `ws@^8.16.0` - WebSocket - License: MIT
- **Library**: `react@^18.2.0` - Dashboard UI - License: MIT
- **Library**: `react-dom@^18.2.0` - Dashboard UI - License: MIT
- **Library**: `chalk@^5.3.0` - Terminal colors - License: MIT
- **Library**: `ora@^8.0.0` - CLI spinners - License: MIT
- **Library**: `fast-check@^3.0.0` - Property-based testing - License: MIT
- **Library**: `jest-axe@^9.0.0` - Accessibility testing - License: MIT
- **Service**: Local Memory REST API at `http://localhost:3002` (optional, graceful fallback)

### Environment Setup
```bash
# Install dependencies
pnpm install

# Environment variables (optional for development)
export LOCAL_MEMORY_BASE_URL=http://localhost:3002
export MEMORIES_SHORT_STORE=sqlite
export MEMORIES_EMBEDDER=mlx
export WORKFLOW_DASHBOARD_PORT=8080

# Database setup
# SQLite database auto-created on first run at .workflow/state.db

# Verify setup
pnpm cortex-workflow --version
```

---

## Test Strategy

### Test Pyramid

```
         ╱╲
        ╱  ╲
       ╱ E2E ╲          5% - Full workflow G0→G7 (1-2 scenarios)
      ╱──────╲
     ╱ Integr.╲         25% - CLI commands, API contracts, WS
    ╱──────────╲
   ╱    Unit    ╲       70% - Functions, schemas, adapters
  ╱──────────────╲
```

### Testing Phases

#### Phase 0: Test Infrastructure Setup (Week 1, Day 1)
**Goal**: Establish testing foundation before writing implementation

**Tasks**:
1. Configure Vitest for packages/workflow-orchestrator
2. Configure Vitest for packages/workflow-dashboard
3. Set up test databases (SQLite in-memory for tests)
4. Create test helpers and fixtures
5. Configure coverage thresholds (95%+ lines/branches)

**Tests** (Write these FIRST - they will be RED):
```typescript
// tests/workflow-orchestrator/setup.test.ts
describe('Test Infrastructure', () => {
  it('should load Vitest configuration', () => {
    expect(true).toBe(true); // Meta-test
  });
  
  it('should connect to in-memory SQLite', async () => {
    const db = await createTestDatabase();
    expect(db).toBeDefined();
  });
  
  it('should provide test fixtures', () => {
    const mockWorkflow = createMockWorkflow();
    expect(mockWorkflow.id).toBeDefined();
  });
});
```

---

#### Phase 1: Schema & Type Tests (Week 1, Days 2-3)

**Tests** (Write FIRST - RED):

```typescript
// packages/workflow-common/src/__tests__/enforcementProfile.test.ts
import { describe, it, expect } from 'vitest';
import { enforcementProfileSchema, defaults, diffFromDefaults } from '../schemas/enforcementProfile.js';

describe('EnforcementProfile Schema', () => {
  describe('Zod Validation', () => {
    it('should validate complete profile with brAInwav branding', () => {
      const profile = {
        branding: 'brAInwav',
        version: '1.0.0',
        budgets: {
          coverage: { lines: 95, branches: 95, functions: 95, statements: 95 },
          performance: { lcp: 2500, tbt: 300 },
          accessibility: { score: 90, wcagLevel: 'AA', wcagVersion: '2.2' },
          security: { maxCritical: 0, maxHigh: 0, maxMedium: 5 }
        },
        policies: {
          architecture: { maxFunctionLines: 40, exportStyle: 'named-only' },
          governance: { requiredChecks: ['lint', 'type-check', 'test', 'security-scan'] }
        },
        approvers: { G0: 'product-owner', G1: 'architect', G2: 'qa-lead' }
      };
      
      const result = enforcementProfileSchema.parse(profile);
      expect(result.branding).toBe('brAInwav');
    });
    
    it('should reject profile without brAInwav branding', () => {
      const profile = { branding: 'Other', version: '1.0.0', budgets: {} };
      expect(() => enforcementProfileSchema.parse(profile)).toThrow();
    });
    
    it('should reject invalid coverage values (must be > 0)', () => {
      const profile = { ...defaults(), budgets: { coverage: { lines: -1 } } };
      expect(() => enforcementProfileSchema.parse(profile)).toThrow();
    });
    
    it('should reject coverage values > 100', () => {
      const profile = { ...defaults(), budgets: { coverage: { lines: 101 } } };
      expect(() => enforcementProfileSchema.parse(profile)).toThrow();
    });
  });
  
  describe('Defaults Builder', () => {
    it('should provide brAInwav default profile', () => {
      const profile = defaults();
      expect(profile.branding).toBe('brAInwav');
      expect(profile.budgets.coverage.lines).toBe(95);
      expect(profile.budgets.security.maxCritical).toBe(0);
    });
  });
  
  describe('Diff Utility', () => {
    it('should show diff from defaults', () => {
      const custom = { ...defaults(), budgets: { ...defaults().budgets, coverage: { ...defaults().budgets.coverage, lines: 98 } } };
      const diff = diffFromDefaults(custom);
      expect(diff).toContain('coverage.lines: 95 → 98');
    });
    
    it('should return empty array when no diffs', () => {
      const diff = diffFromDefaults(defaults());
      expect(diff).toHaveLength(0);
    });
  });
});
```

```typescript
// packages/workflow-common/src/__tests__/types.test.ts
import { describe, it, expect, expectTypeOf } from 'vitest';
import type { WorkflowState, GateId, PhaseId } from '../types.js';

describe('Workflow Types', () => {
  it('should enforce GateId union type', () => {
    const validGates: GateId[] = ['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'];
    expect(validGates).toHaveLength(8);
    
    // Type-level test
    expectTypeOf<GateId>().toEqualTypeOf<'G0'|'G1'|'G2'|'G3'|'G4'|'G5'|'G6'|'G7'>();
  });
  
  it('should enforce PhaseId number literals', () => {
    const validPhases: PhaseId[] = [0, 1, 2, 3, 4, 5];
    expect(validPhases).toHaveLength(6);
    
    expectTypeOf<PhaseId>().toEqualTypeOf<0|1|2|3|4|5>();
  });
  
  it('should enforce WorkflowState structure with brAInwav metadata', () => {
    const state: WorkflowState = {
      id: 'wf-123',
      featureName: 'OAuth 2.1',
      taskId: 'oauth-21-authentication',
      priority: 'P1',
      status: 'active',
      currentStep: 'G0',
      prpState: { gates: {}, approvals: [] },
      taskState: { phases: {}, artifacts: [] },
      enforcementProfile: defaults(),
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        gitBranch: 'feat/oauth-21-authentication',
        branding: 'brAInwav'
      }
    };
    
    expect(state.metadata.branding).toBe('brAInwav');
  });
});
```

**Implementation** (Make tests GREEN):
1. Create `packages/workflow-common/src/schemas/enforcementProfile.ts`
2. Create `packages/workflow-common/src/types.ts`
3. Implement Zod schema with brAInwav branding validation
4. Implement `defaults()` and `diffFromDefaults()` utilities

---

#### Phase 2: Persistence Layer Tests (Week 1, Days 4-5)

**Tests** (Write FIRST - RED):

```typescript
// packages/workflow-orchestrator/src/persistence/__tests__/sqlite.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase, getWorkflow, saveWorkflow, saveStep, upsertMetrics, close } from '../sqlite.js';
import type { WorkflowState } from '@cortex-os/workflow-common';

describe('SQLite Persistence', () => {
  let db: ReturnType<typeof createDatabase>;
  
  beforeEach(async () => {
    db = createDatabase(':memory:'); // In-memory for tests
  });
  
  afterEach(async () => {
    await close(db);
  });
  
  describe('Database Creation', () => {
    it('should create workflows table with correct schema', async () => {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('workflows');
      expect(tableNames).toContain('gates');
      expect(tableNames).toContain('phases');
      expect(tableNames).toContain('evidence');
    });
    
    it('should include branding column in metadata', async () => {
      const workflow: WorkflowState = createTestWorkflow({ branding: 'brAInwav' });
      await saveWorkflow(db, workflow);
      const loaded = await getWorkflow(db, workflow.id);
      expect(loaded.metadata.branding).toBe('brAInwav');
    });
  });
  
  describe('Workflow CRUD', () => {
    it('should save and retrieve workflow by ID', async () => {
      const workflow = createTestWorkflow();
      await saveWorkflow(db, workflow);
      const loaded = await getWorkflow(db, workflow.id);
      expect(loaded).toEqual(workflow);
    });
    
    it('should update existing workflow', async () => {
      const workflow = createTestWorkflow();
      await saveWorkflow(db, workflow);
      workflow.status = 'completed';
      await saveWorkflow(db, workflow);
      const loaded = await getWorkflow(db, workflow.id);
      expect(loaded.status).toBe('completed');
    });
    
    it('should return null for non-existent workflow', async () => {
      const loaded = await getWorkflow(db, 'non-existent');
      expect(loaded).toBeNull();
    });
    
    it('should NOT store secrets in state', async () => {
      const workflow = createTestWorkflow();
      workflow.metadata.secrets = { apiKey: 'secret-123' }; // Attempt to store secret
      await saveWorkflow(db, workflow);
      const loaded = await getWorkflow(db, workflow.id);
      expect(loaded.metadata.secrets).toBeUndefined(); // Redacted by design
    });
  });
  
  describe('Step Persistence', () => {
    it('should save gate step with evidence', async () => {
      const workflow = createTestWorkflow();
      await saveWorkflow(db, workflow);
      const step = {
        workflowId: workflow.id,
        type: 'gate' as const,
        stepId: 'G0',
        status: 'completed' as const,
        evidence: ['tasks/oauth-21/prp-blueprint.md'],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };
      await saveStep(db, step);
      
      const steps = db.prepare('SELECT * FROM gates WHERE workflowId = ?').all(workflow.id);
      expect(steps).toHaveLength(1);
      expect(steps[0].stepId).toBe('G0');
    });
    
    it('should save phase step with artifacts', async () => {
      const workflow = createTestWorkflow();
      await saveWorkflow(db, workflow);
      const step = {
        workflowId: workflow.id,
        type: 'phase' as const,
        stepId: '0',
        status: 'completed' as const,
        evidence: ['tasks/oauth-21/constitution.md'],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };
      await saveStep(db, step);
      
      const steps = db.prepare('SELECT * FROM phases WHERE workflowId = ?').all(workflow.id);
      expect(steps).toHaveLength(1);
    });
  });
  
  describe('Metrics Storage', () => {
    it('should upsert quality metrics', async () => {
      const workflow = createTestWorkflow();
      await saveWorkflow(db, workflow);
      await upsertMetrics(db, workflow.id, {
        coverage: 96,
        security: { critical: 0, high: 0, medium: 2 },
        performance: { lcp: 2100, tbt: 250 },
        accessibility: 92
      });
      
      const metrics = db.prepare('SELECT * FROM metrics WHERE workflowId = ?').get(workflow.id);
      expect(metrics.coverage).toBe(96);
    });
  });
});
```

**Implementation** (Make tests GREEN):
1. Create `packages/workflow-orchestrator/src/persistence/migrations/001_init.sql`
2. Implement `sqlite.ts` with small repo functions (each ≤40 lines)
3. Add secret redaction logic in save functions
4. Implement async façades via `queueMicrotask`

---

#### Phase 3: Workflow Engine State Machine Tests (Week 2, Days 1-3)

**Tests** (Write FIRST - RED):

```typescript
// packages/workflow-orchestrator/src/orchestrator/__tests__/WorkflowEngine.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeWorkflow } from '../WorkflowEngine.js';
import type { WorkflowState } from '@cortex-os/workflow-common';

describe('WorkflowEngine', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });
  
  describe('executeWorkflow - Happy Path', () => {
    it('should execute complete workflow G0→G7', async () => {
      const result = await executeWorkflow({
        taskId: 'oauth-21-authentication',
        skipApprovals: true // For testing
      });
      
      expect(result.status).toBe('completed');
      expect(result.completedGates).toEqual(['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']);
      expect(result.completedPhases).toEqual([0, 1, 2, 3, 4, 5]);
    });
    
    it('should emit brAInwav-branded lifecycle events', async () => {
      const eventSpy = vi.spyOn(a2a, 'emit');
      await executeWorkflow({ taskId: 'test-feature', skipApprovals: true });
      
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'workflow-started',
        metadata: expect.objectContaining({ branding: 'brAInwav' })
      }));
      
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'workflow-completed',
        metadata: expect.objectContaining({ branding: 'brAInwav' })
      }));
    });
    
    it('should store workflow state after each step', async () => {
      const saveSpy = vi.spyOn(persistence, 'saveWorkflow');
      await executeWorkflow({ taskId: 'test-feature', skipApprovals: true });
      
      // Should save after each gate + phase (8 gates + 6 phases = 14 saves minimum)
      expect(saveSpy).toHaveBeenCalledTimes(expect.any(Number));
      expect(saveSpy.mock.calls.length).toBeGreaterThanOrEqual(14);
    });
  });
  
  describe('executeWorkflow - Gate Transitions', () => {
    it('should transition G0 → Phase 0 on approval', async () => {
      const transitions = [];
      vi.spyOn(engine, 'handleTransition').mockImplementation((from, to) => {
        transitions.push({ from, to });
      });
      
      await executeWorkflow({ taskId: 'test', skipApprovals: true });
      
      expect(transitions).toContainEqual({ from: 'G0', to: 'phase-0' });
    });
    
    it('should pause at G0 if approval required (non-skip mode)', async () => {
      const result = await executeWorkflow({ 
        taskId: 'test', 
        skipApprovals: false // Real approval flow
      });
      
      expect(result.status).toBe('paused');
      expect(result.currentStep).toBe('G0');
      expect(result.waitingFor).toBe('product-owner approval');
    });
    
    it('should not proceed to Phase 0 if G0 fails', async () => {
      vi.spyOn(prpAdapter, 'runGate').mockResolvedValueOnce({
        status: 'failed',
        reason: 'Blueprint validation failed'
      });
      
      const result = await executeWorkflow({ taskId: 'test', skipApprovals: true });
      
      expect(result.status).toBe('failed');
      expect(result.currentStep).toBe('G0');
      expect(result.completedPhases).not.toContain(0);
    });
  });
  
  describe('executeWorkflow - Resume', () => {
    it('should resume from last checkpoint', async () => {
      // Run until Phase 2, then stop
      const state1 = await executeWorkflow({ 
        taskId: 'test', 
        stopAt: 'phase-2',
        skipApprovals: true 
      });
      
      expect(state1.currentStep).toBe('phase-2');
      
      // Resume
      const state2 = await executeWorkflow({ 
        taskId: 'test', 
        resume: true,
        skipApprovals: true 
      });
      
      expect(state2.status).toBe('completed');
      expect(state2.skippedSteps).toContain('G0');
      expect(state2.skippedSteps).toContain('phase-0');
    });
    
    it('should display brAInwav resume message', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      await executeWorkflow({ taskId: 'test', resume: true, skipApprovals: true });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('brAInwav: Resuming from')
      );
    });
  });
  
  describe('executeWorkflow - Error Handling', () => {
    it('should gracefully handle gate execution errors', async () => {
      vi.spyOn(prpAdapter, 'runGate').mockRejectedValueOnce(
        new Error('Network timeout')
      );
      
      const result = await executeWorkflow({ taskId: 'test', skipApprovals: true });
      
      expect(result.status).toBe('failed');
      expect(result.error).toContain('brAInwav: Gate execution failed');
      expect(result.error).toContain('Network timeout');
    });
    
    it('should persist state before throwing on critical errors', async () => {
      const saveSpy = vi.spyOn(persistence, 'saveWorkflow');
      vi.spyOn(prpAdapter, 'runGate').mockRejectedValueOnce(
        new Error('Critical failure')
      );
      
      await expect(
        executeWorkflow({ taskId: 'test', skipApprovals: true })
      ).rejects.toThrow();
      
      expect(saveSpy).toHaveBeenCalled(); // State saved before error
    });
  });
  
  describe('executeWorkflow - Dry Run', () => {
    it('should simulate transitions without side effects', async () => {
      const saveSpy = vi.spyOn(persistence, 'saveWorkflow');
      const eventSpy = vi.spyOn(a2a, 'emit');
      
      const result = await executeWorkflow({ 
        taskId: 'test', 
        dryRun: true,
        skipApprovals: true 
      });
      
      expect(result.status).toBe('completed');
      expect(saveSpy).not.toHaveBeenCalled();
      expect(eventSpy).not.toHaveBeenCalled();
    });
  });
});
```

**Property-Based Tests**:

```typescript
// packages/workflow-orchestrator/src/orchestrator/__tests__/stateMachine.property.test.ts
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { WorkflowEngine } from '../WorkflowEngine.js';

describe('WorkflowEngine - Property-Based Tests', () => {
  it('should maintain invariant: steps strictly advance (never backwards)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7')),
        async (gateSequence) => {
          const engine = new WorkflowEngine();
          let lastStepIndex = -1;
          
          for (const gate of gateSequence) {
            const stepIndex = parseInt(gate.replace('G', ''));
            if (stepIndex < lastStepIndex) {
              // Should throw or skip, never go backwards
              await expect(engine.advanceTo(gate)).rejects.toThrow();
            }
            lastStepIndex = Math.max(lastStepIndex, stepIndex);
          }
        }
      )
    );
  });
  
  it('should maintain invariant: cannot approve already-approved gate', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('G0', 'G1', 'G2'),
        async (gateId) => {
          const engine = new WorkflowEngine();
          await engine.approveGate(gateId, { actor: 'test', decision: 'approved' });
          
          // Second approval should throw
          await expect(
            engine.approveGate(gateId, { actor: 'test2', decision: 'approved' })
          ).rejects.toThrow(/already approved/i);
        }
      )
    );
  });
  
  it('should maintain invariant: resume is idempotent', () => {
    fc.assert(
      fc.property(
        fc.record({
          taskId: fc.string(),
          stopAt: fc.constantFrom('G2', 'phase-3', 'G5')
        }),
        async ({ taskId, stopAt }) => {
          // Run to checkpoint
          const state1 = await executeWorkflow({ taskId, stopAt, skipApprovals: true });
          
          // Resume twice
          const state2 = await executeWorkflow({ taskId, resume: true, skipApprovals: true });
          const state3 = await executeWorkflow({ taskId, resume: true, skipApprovals: true });
          
          // Second resume should be no-op (idempotent)
          expect(state2).toEqual(state3);
        }
      )
    );
  });
});
```

**Implementation** (Make tests GREEN):
1. Create `WorkflowEngine.ts` with state machine logic
2. Implement `executeWorkflow()`, `handleGateTransition()`, `handlePhaseTransition()`
3. Add checkpoint persistence after each step
4. Implement A2A event emission
5. Add resume logic with idempotency

---

#### Phase 4: CLI Command Tests (Week 2, Days 4-5)

**Tests** (Write FIRST - RED):

```typescript
// tests/workflow-orchestrator/init.command.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs/promises';

describe('cortex-workflow init', () => {
  beforeEach(async () => {
    // Clean test environment
    await fs.rm('./tasks/test-feature', { recursive: true, force: true });
  });
  
  it('should create PRP blueprint and task constitution', async () => {
    const output = execSync('pnpm cortex-workflow init "Test Feature" --priority P1', {
      encoding: 'utf-8'
    });
    
    expect(output).toContain('brAInwav Cortex-OS');
    expect(output).toContain('✓ Created: tasks/test-feature/prp-blueprint.md');
    expect(output).toContain('✓ Created: tasks/test-feature/constitution.md');
    
    const blueprint = await fs.readFile('tasks/test-feature/prp-blueprint.md', 'utf-8');
    expect(blueprint).toContain('Test Feature');
    
    const constitution = await fs.readFile('tasks/test-feature/constitution.md', 'utf-8');
    expect(constitution).toContain('brAInwav');
  });
  
  it('should create git feature branch', async () => {
    execSync('pnpm cortex-workflow init "Test Feature" --priority P1');
    
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    expect(branch).toBe('feat/test-feature');
  });
  
  it('should reject duplicate task ID', async () => {
    execSync('pnpm cortex-workflow init "Test Feature" --priority P1');
    
    expect(() => {
      execSync('pnpm cortex-workflow init "Test Feature" --priority P1');
    }).toThrow(/already exists/i);
  });
  
  it('should display brAInwav banner', async () => {
    const output = execSync('pnpm cortex-workflow init "Test" --priority P2', {
      encoding: 'utf-8'
    });
    
    expect(output).toMatch(/brAInwav Cortex-OS Unified Workflow/i);
  });
});
```

```typescript
// tests/workflow-orchestrator/profile.command.test.ts
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs/promises';

describe('cortex-workflow profile', () => {
  describe('profile init', () => {
    it('should create enforcement-profile.yml with brAInwav defaults', async () => {
      execSync('pnpm cortex-workflow profile init');
      
      const profile = await fs.readFile('enforcement-profile.yml', 'utf-8');
      expect(profile).toContain('branding: brAInwav');
      expect(profile).toContain('coverageLines: 95');
      expect(profile).toContain('maxCritical: 0');
    });
  });
  
  describe('profile show', () => {
    it('should display profile with brAInwav branding', () => {
      const output = execSync('pnpm cortex-workflow profile show', { encoding: 'utf-8' });
      
      expect(output).toContain('brAInwav Cortex-OS Enforcement Profile');
      expect(output).toContain('Coverage: 95%');
      expect(output).toContain('Security: 0 critical, 0 high');
    });
  });
  
  describe('profile set', () => {
    it('should update coverage target', async () => {
      execSync('pnpm cortex-workflow profile set coverage.lines 98');
      
      const profile = await fs.readFile('enforcement-profile.yml', 'utf-8');
      expect(profile).toContain('coverageLines: 98');
    });
    
    it('should display brAInwav confirmation', () => {
      const output = execSync('pnpm cortex-workflow profile set coverage.lines 98', {
        encoding: 'utf-8'
      });
      
      expect(output).toContain('brAInwav: Coverage target updated to 98%');
    });
  });
  
  describe('profile validate', () => {
    it('should pass valid profile', () => {
      const output = execSync('pnpm cortex-workflow profile validate', { encoding: 'utf-8' });
      expect(output).toContain('brAInwav: Profile validation passed');
    });
    
    it('should fail invalid profile with branded error', async () => {
      // Manually corrupt profile
      await fs.writeFile('enforcement-profile.yml', 'branding: Wrong\nversion: 1.0.0');
      
      expect(() => {
        execSync('pnpm cortex-workflow profile validate');
      }).toThrow();
      
      const output = execSync('pnpm cortex-workflow profile validate 2>&1 || true', {
        encoding: 'utf-8'
      });
      
      expect(output).toContain('brAInwav: Profile validation failed');
      expect(output).toContain('branding must be "brAInwav"');
    });
  });
});
```

**Implementation** (Make tests GREEN):
1. Create CLI commands in `packages/workflow-orchestrator/src/cli/commands/`
2. Implement `commander` command definitions
3. Add brAInwav banner and branding utilities
4. Wire commands to orchestrator and persistence layers

---

#### Phase 5: Local Memory Integration Tests (Week 3, Days 1-2)

**Tests** (Write FIRST - RED):

```typescript
// packages/workflow-orchestrator/src/memory/__tests__/LocalMemoryClient.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalMemoryClient } from '../LocalMemoryClient.js';

describe('LocalMemoryClient', () => {
  let client: LocalMemoryClient;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  
  beforeEach(() => {
    client = new LocalMemoryClient({ baseUrl: 'http://localhost:3002' });
    fetchSpy = vi.spyOn(global, 'fetch');
  });
  
  describe('storeWorkflowInsight', () => {
    it('should store completion insight with brAInwav branding', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'mem-123' })
      });
      
      await client.storeWorkflowInsight({
        workflowId: 'wf-123',
        featureName: 'OAuth 2.1',
        priority: 'P1',
        status: 'completed',
        qualityMetrics: { coverage: 96, security: { critical: 0 } }
      });
      
      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:3002/memories',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('brAInwav Workflow Completed')
        })
      );
      
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.metadata.branding).toBe('brAInwav');
      expect(body.tags).toContain('workflow');
      expect(body.tags).toContain('completed');
    });
    
    it('should set importance based on priority', async () => {
      fetchSpy.mockResolvedValue({ ok: true, json: async () => ({}) });
      
      await client.storeWorkflowInsight({ priority: 'P0', status: 'completed' });
      let body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.importance).toBe(10); // P0 = highest
      
      await client.storeWorkflowInsight({ priority: 'P3', status: 'completed' });
      body = JSON.parse(fetchSpy.mock.calls[1][1].body);
      expect(body.importance).toBe(5); // P3 = lower
    });
  });
  
  describe('storeApprovalDecision', () => {
    it('should store approval with high importance', async () => {
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      
      await client.storeApprovalDecision({
        workflowId: 'wf-123',
        gateId: 'G0',
        approver: 'alice',
        role: 'product-owner',
        decision: 'approved',
        rationale: 'Aligns with product strategy'
      });
      
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.importance).toBe(8);
      expect(body.content).toContain('brAInwav Gate Approval');
      expect(body.tags).toContain('approval');
      expect(body.tags).toContain('gate-G0');
    });
  });
  
  describe('queryRelatedWorkflows', () => {
    it('should query by feature name', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { id: 'mem-1', content: 'OAuth workflow completed', score: 0.95 }
          ]
        })
      });
      
      const results = await client.queryRelatedWorkflows('OAuth authentication');
      
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/memories/search?q=OAuth+authentication')
      );
      expect(results).toHaveLength(1);
    });
  });
  
  describe('Error Handling', () => {
    it('should gracefully handle service unavailable', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      
      // Should not throw, just log warning
      await expect(
        client.storeWorkflowInsight({ status: 'completed' })
      ).resolves.not.toThrow();
      
      // Should queue for retry
      expect(client.getPendingInsights()).toHaveLength(1);
    });
    
    it('should log brAInwav-branded warning when unavailable', async () => {
      const consoleSpy = vi.spyOn(console, 'warn');
      fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      
      await client.storeWorkflowInsight({ status: 'completed' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('brAInwav: Local memory unavailable')
      );
    });
  });
});
```

**Implementation** (Make tests GREEN):
1. Create `LocalMemoryClient.ts` with REST API wrapper
2. Implement retry queue for failed stores
3. Add brAInwav branding to all memory content
4. Implement importance scoring based on priority

---

#### Phase 6: Dashboard Tests (Week 3, Days 3-5)

**Tests** (Write FIRST - RED):

```typescript
// tests/workflow-dashboard/api.workflows.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from '../../packages/workflow-dashboard/src/server/index.js';

describe('Dashboard API', () => {
  let server;
  let app;
  
  beforeAll(async () => {
    app = createServer({ port: 0 }); // Random port
    server = await app.listen();
  });
  
  afterAll(async () => {
    await server.close();
  });
  
  describe('GET /api/workflows', () => {
    it('should return workflow list with brAInwav branding', async () => {
      const response = await request(app).get('/api/workflows');
      
      expect(response.status).toBe(200);
      expect(response.body.branding).toBe('brAInwav');
      expect(response.body.workflows).toBeInstanceOf(Array);
    });
    
    it('should include progress percentage', async () => {
      const response = await request(app).get('/api/workflows');
      const workflow = response.body.workflows[0];
      
      expect(workflow.progress).toBeGreaterThanOrEqual(0);
      expect(workflow.progress).toBeLessThanOrEqual(100);
    });
  });
  
  describe('GET /api/workflows/:id', () => {
    it('should return workflow detail with quality metrics', async () => {
      const response = await request(app).get('/api/workflows/wf-test-123');
      
      expect(response.status).toBe(200);
      expect(response.body.workflow).toBeDefined();
      expect(response.body.qualityMetrics).toMatchObject({
        coverage: expect.any(Number),
        security: expect.objectContaining({ critical: expect.any(Number) }),
        performance: expect.objectContaining({ lcp: expect.any(Number) }),
        accessibility: expect.any(Number)
      });
      expect(response.body.branding).toBe('brAInwav');
    });
    
    it('should return 404 for non-existent workflow', async () => {
      const response = await request(app).get('/api/workflows/non-existent');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('brAInwav');
    });
  });
  
  describe('POST /api/workflows/:id/approve', () => {
    it('should accept approval request', async () => {
      const response = await request(app)
        .post('/api/workflows/wf-test-123/approve')
        .send({
          gateId: 'G0',
          actor: 'alice',
          decision: 'approved',
          rationale: 'Looks good'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('brAInwav');
    });
    
    it('should validate approval request schema', async () => {
      const response = await request(app)
        .post('/api/workflows/wf-test-123/approve')
        .send({ decision: 'invalid' }); // Missing required fields
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('validation');
    });
  });
  
  describe('WebSocket Events', () => {
    it('should push workflow updates via WebSocket', async () => {
      const ws = new WebSocket(`ws://localhost:${server.address().port}`);
      const messages = [];
      
      ws.on('message', (data) => {
        messages.push(JSON.parse(data));
      });
      
      await new Promise(resolve => ws.on('open', resolve));
      
      // Trigger workflow update
      await request(app).post('/api/workflows/wf-test-123/approve').send({
        gateId: 'G0',
        actor: 'test',
        decision: 'approved',
        rationale: 'Test'
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(messages).toContainEqual(
        expect.objectContaining({
          type: 'workflow-updated',
          workflowId: 'wf-test-123',
          metadata: expect.objectContaining({ branding: 'brAInwav' })
        })
      );
    });
  });
});
```

**Accessibility Tests**:

```typescript
// tests/workflow-dashboard/a11y.dashboard.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { WorkflowTimeline } from '../../packages/workflow-dashboard/src/client/components/WorkflowTimeline.js';

expect.extend(toHaveNoViolations);

describe('Dashboard Accessibility', () => {
  describe('WorkflowTimeline', () => {
    it('should have no axe violations', async () => {
      const { container } = render(
        <WorkflowTimeline workflow={createMockWorkflow()} />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
    
    it('should be keyboard navigable', async () => {
      const { getByRole } = render(
        <WorkflowTimeline workflow={createMockWorkflow()} />
      );
      
      const timeline = getByRole('region', { name: /timeline/i });
      expect(timeline).toHaveAttribute('tabindex', '0');
      
      // All interactive elements should be focusable
      const buttons = timeline.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
    
    it('should use icon + text for status (not color alone)', () => {
      const { container } = render(
        <WorkflowTimeline workflow={createMockWorkflow()} />
      );
      
      const statusIndicators = container.querySelectorAll('[data-status]');
      statusIndicators.forEach(indicator => {
        // Should have both icon and text
        expect(indicator.querySelector('svg, .icon')).toBeTruthy();
        expect(indicator.textContent.trim()).not.toBe('');
      });
    });
    
    it('should have minimum 44x44 touch targets', () => {
      const { container } = render(
        <WorkflowTimeline workflow={createMockWorkflow()} />
      );
      
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.height).toBeGreaterThanOrEqual(44);
      });
    });
    
    it('should have sufficient color contrast (WCAG AA)', async () => {
      const { container } = render(
        <WorkflowTimeline workflow={createMockWorkflow()} />
      );
      
      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      
      expect(results.violations.filter(v => v.id === 'color-contrast')).toHaveLength(0);
    });
  });
  
  describe('ApprovalActions', () => {
    it('should have accessible labels for approve/reject buttons', () => {
      const { getByLabelText } = render(
        <ApprovalActions gateId="G0" />
      );
      
      expect(getByLabelText(/approve/i)).toBeTruthy();
      expect(getByLabelText(/reject/i)).toBeTruthy();
    });
    
    it('should announce brAInwav context to screen readers', () => {
      const { container } = render(
        <ApprovalActions gateId="G0" />
      );
      
      const announcement = container.querySelector('[aria-live]');
      expect(announcement).toBeTruthy();
      expect(announcement.textContent).toContain('brAInwav');
    });
  });
});
```

**Implementation** (Make tests GREEN):
1. Create Dashboard server with Express
2. Implement React components with accessibility
3. Add WebSocket push for real-time updates
4. Ensure WCAG 2.2 AA compliance

---

## Phase-by-Phase Implementation Checklist

### Week 1: Foundation
- [ ] **Day 1**: Test infrastructure setup
- [ ] **Days 2-3**: Schema & types (Zod + TypeScript)
- [ ] **Days 4-5**: Persistence layer (SQLite + migrations)

### Week 2: Core Engine
- [ ] **Days 1-3**: Workflow engine state machine + property tests
- [ ] **Days 4-5**: CLI commands (init, run, status, profile)

### Week 3: Integration & Dashboard
- [ ] **Days 1-2**: Local memory client + integration
- [ ] **Days 3-5**: Dashboard API + React UI + accessibility

### Weeks 4-5: Dashboard Completion
- [ ] **Week 4**: WebSocket, InsightsPanel, E2E tests
- [ ] **Week 5**: Performance optimization, polish, docs

### Week 6: Final Polish
- [ ] Profile apply to existing workflows
- [ ] Workflow list/search
- [ ] Examples and demos
- [ ] Documentation updates
- [ ] Final security scan and SBOM

---

## Quality Gates (Run After Each Phase)

```bash
# After each implementation phase:
pnpm lint:smart
pnpm typecheck:smart
pnpm test:smart
pnpm security:scan

# Coverage check
pnpm test:coverage
# Must show ≥95% lines/branches

# Accessibility (after dashboard phases)
pnpm test -- a11y.dashboard.test.ts
```

---

## Evidence Artifacts

All tests and implementation will generate these artifacts:

1. **Test Reports**: `coverage/`, `reports/test-results.xml`
2. **Coverage Reports**: `coverage/lcov-report/`, `coverage.xml`
3. **Security Scans**: `reports/security-scan.json`
4. **SBOM**: `sbom/bom.json`
5. **Accessibility Reports**: `reports/a11y-violations.json`
6. **Property Test Results**: `reports/property-test-results.json`

---

## Risks & Mitigation (Updated)

| Risk | Mitigation | Tests |
|------|------------|-------|
| State machine complexity | Property-based tests (fast-check) | `stateMachine.property.test.ts` |
| Gate/phase desync | Integration tests for all transitions | `run.engine.int.test.ts` |
| Memory service unavailable | Retry queue + graceful degradation tests | `LocalMemoryClient.test.ts` |
| Dashboard performance | Pagination, lazy loading, performance tests | Load tests with k6 |
| Secret leakage | Redaction tests in persistence layer | `sqlite.test.ts` |
| Accessibility violations | jest-axe in CI, manual keyboard testing | `a11y.dashboard.test.ts` |

---

## Success Criteria (Final)

- [ ] 95%+ test coverage (lines and branches)
- [ ] All property-based tests pass (1000+ cases per invariant)
- [ ] Zero jest-axe violations in dashboard
- [ ] Security scan clean (0 critical, 0 high)
- [ ] Complete workflow G0→G7 executes in <2 minutes
- [ ] Dashboard loads <200ms (95th percentile)
- [ ] Local memory integration works (graceful if unavailable)
- [ ] brAInwav branding consistent across all outputs
- [ ] Resume from checkpoint works correctly
- [ ] All CLI commands have help text with brAInwav branding
- [ ] Documentation complete (CLI guide, profile schema, dashboard usage)

---

**Maintained by**: brAInwav Development Team  
**Co-authored-by**: brAInwav Development Team  
**Version**: 1.0.0  
**Status**: Ready for Implementation
