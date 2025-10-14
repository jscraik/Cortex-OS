# Implementation Plan: Structured Telemetry Implementation

**Task ID**: `structured-telemetry-implementation`  
**Created**: 2025-01-12  
**Status**: Planning  
**Estimated Effort**: 3-4 days

---

## 0) Task Directory & Baton Resolution

- **Task Slug**: `structured-telemetry-implementation`
- **Task Directory**: `tasks/structured-telemetry-implementation`
- **Baton Path**: `tasks/structured-telemetry-implementation/json/baton.v1.json`

**Created Artifacts**:
- `tasks/structured-telemetry-implementation/implementation-plan.md` (this document)
- `tasks/structured-telemetry-implementation/tdd-plan.md` (comprehensive test plan)
- `tasks/structured-telemetry-implementation/implementation-checklist.md` (actionable checklist)
- `tasks/structured-telemetry-implementation/json/baton.v1.json` (task metadata)

---

## 1) File Tree of Proposed Changes

```
schemas/
├─ agent-event.schema.json                         NEW – JSON Schema for structured agent telemetry
└─ README.md                                       UPDATE – document new telemetry schema entry

tsconfig.base.json                                 UPDATE – add @brainwav/telemetry path mappings
pnpm-lock.yaml                                     UPDATE – workspace lock with new package

packages/telemetry/
├─ AGENTS.md                                       NEW – inherits repo governance for telemetry pkg
├─ README.md                                       NEW – usage notes and privacy guidance
├─ package.json                                    NEW – package metadata for @brainwav/telemetry
├─ project.json                                    NEW – Nx registration
├─ tsconfig.json                                   NEW – library compiler settings
├─ vitest.config.ts                                NEW – local test runner config
├─ src/
│  ├─ index.ts                                     NEW – export surface for emitter & types
│  ├─ emitter.ts                                   NEW – Telemetry class & Bus interface
│  └─ types.ts                                     NEW – AgentEvent / enums definitions
└─ tests/emitter.test.ts                           NEW – redaction & phase helper unit tests

apps/cortex-os/
├─ package.json                                    UPDATE – depend on @brainwav/telemetry
├─ src/a2a.ts                                      UPDATE – register telemetry topic & schema
├─ src/runtime.ts                                  UPDATE – instantiate telemetry emitter & pipe tool events
├─ src/services.ts                                 UPDATE – wire telemetry lifecycle + setter hook
└─ tests/telemetry.integration.test.ts             NEW – ensure run() emits structured events via mock bus

packages/orchestration/
├─ package.json                                    UPDATE – depend on @brainwav/telemetry
├─ src/index.ts                                    UPDATE – re-export telemetry attachment types
├─ src/service.ts                                  UPDATE – facade setTelemetry hook & run lifecycle emits
├─ src/observability/structured-telemetry.ts       NEW – bus → AgentEvent bridge with unsubscribe support
└─ tests/telemetry/structured-telemetry.test.ts    NEW – verify PlanCreated/Routing events map to AgentEvents

tasks/structured-telemetry-implementation/
├─ implementation-plan.md                          NEW – this comprehensive implementation plan
├─ tdd-plan.md                                     NEW – TDD Coach-compliant plan for this feature
├─ implementation-checklist.md                     NEW – actionable task checklist
└─ json/baton.v1.json                              NEW – task metadata and baton handoff
```

---

## 2) Implementation Plan (bite-sized, revertible tasks)

### Task 1 — JSON Schema & Type Foundation
**Goal**: Define vendor-neutral AgentEvent schema and TypeScript types

**Files to touch**:
- `schemas/agent-event.schema.json` (NEW)
- `schemas/README.md` (UPDATE)
- `packages/telemetry/src/types.ts` (NEW)

**Edit steps**:
- Create JSON Schema with required fields: `timestamp`, `agentId`, `phase`, `event`, `correlationId`
- Add optional fields: `labels`, `metrics`, `outcome`
- Define Zod schemas matching JSON Schema structure
- Export AgentEvent interface, EventName and Phase enums

**Implementation Aids**:
```diff
+ // schemas/agent-event.schema.json
+ {
+   "$schema": "http://json-schema.org/draft-07/schema#",
+   "title": "AgentEvent",
+   "type": "object",
+   "required": ["timestamp", "agentId", "phase", "event", "correlationId"],
+   "properties": {
+     "timestamp": { "type": "string", "format": "date-time" },
+     "agentId": { "type": "string" },
+     "phase": { "enum": ["planning", "execution", "completion"] },
+     "event": { "enum": ["run_started", "run_finished", "plan_created", "tool_invoked", "tool_result"] },
+     "correlationId": { "type": "string" },
+     "labels": { "type": "object" },
+     "metrics": { "type": "object" },
+     "outcome": { "type": "object" }
+   }
+ }
```

**Test scaffold**:
```diff
+ // packages/telemetry/tests/types.test.ts
+ import { AgentEventSchema } from '../src/types.js'
+ 
+ it('should validate complete AgentEvent', () => {
+   const validEvent = {
+     timestamp: '2025-01-12T10:00:00Z',
+     agentId: 'cortex-agent-1',
+     phase: 'execution',
+     event: 'tool_invoked',
+     correlationId: 'test-123'
+   }
+   expect(() => AgentEventSchema.parse(validEvent)).not.toThrow()
+ })
```

**Run & verify**: `pnpm test packages/telemetry -- types.test.ts` → expect 1 failing test
**Commit**: `feat(telemetry): add AgentEvent JSON schema and TypeScript types`
**Backout**: `git revert HEAD`

---

### Task 2 — Telemetry Emitter Core Implementation
**Goal**: Implement core Telemetry class with emit() and redaction

**Files to touch**:
- `packages/telemetry/src/emitter.ts` (NEW)
- `packages/telemetry/src/index.ts` (NEW)
- `packages/telemetry/tests/emitter.test.ts` (NEW)

**Edit steps**:
- Define Bus interface with publish(topic: string, data: unknown) method
- Implement Telemetry class constructor accepting Bus and EmitterOpts
- Add emit() method with schema validation and redaction
- Implement phase() helper returning started/finished closures
- Add brAInwav branding to error messages

**Implementation Aids**:
```diff
+ // packages/telemetry/src/emitter.ts
+ export interface Bus {
+   publish(topic: string, data: unknown): void | Promise<void>
+ }
+ 
+ export interface EmitterOpts {
+   topic?: string
+   redaction?: (event: AgentEvent) => AgentEvent
+ }
+ 
+ export class Telemetry {
+   constructor(
+     private bus: Bus,
+     private opts: EmitterOpts = {}
+   ) {}
+ 
+   emit(event: Partial<AgentEvent>): void {
+     // Validate, apply redaction, publish with brAInwav context
+   }
+ 
+   phase(phase: string) {
+     // Return started/finished closures with correlation
+   }
+ }
```

**Test scaffold**:
```diff
+ // packages/telemetry/tests/emitter.test.ts
+ import { Telemetry } from '../src/emitter.js'
+ 
+ it('should emit to default topic', () => {
+   const mockBus = { publish: vi.fn() }
+   const telemetry = new Telemetry(mockBus)
+   telemetry.emit({ event: 'run_started', agentId: 'test' })
+   expect(mockBus.publish).toHaveBeenCalledWith('cortex.a2a.events', expect.any(Object))
+ })
```

**Run & verify**: `pnpm test packages/telemetry` → expect 6 failing tests
**Commit**: `feat(telemetry): implement core Telemetry emitter with redaction`
**Backout**: `git revert HEAD`

---

### Task 3 — Package Setup & Workspace Integration
**Goal**: Create telemetry package infrastructure and workspace wiring

**Files to touch**:
- `packages/telemetry/package.json` (NEW)
- `packages/telemetry/project.json` (NEW)
- `packages/telemetry/tsconfig.json` (NEW)
- `packages/telemetry/vitest.config.ts` (NEW)
- `packages/telemetry/AGENTS.md` (NEW)
- `packages/telemetry/README.md` (NEW)
- `tsconfig.base.json` (UPDATE)

**Edit steps**:
- Create package.json with @brainwav scope, ESM exports, vitest dependency
- Configure Nx project.json with build/test/lint targets
- Set up TypeScript config with composite: true
- Add path mapping to tsconfig.base.json
- Create governance and documentation files

**Implementation Aids**:
```diff
+ // packages/telemetry/package.json
+ {
+   "name": "@brainwav/telemetry",
+   "version": "0.1.0",
+   "type": "module",
+   "exports": {
+     ".": "./src/index.ts",
+     "./types": "./src/types.ts"
+   },
+   "dependencies": {
+     "zod": "^3.22.0"
+   },
+   "devDependencies": {
+     "vitest": "^1.0.0"
+   }
+ }
```

**Run & verify**: `pnpm install && pnpm build:smart` → expect successful workspace resolution
**Commit**: `feat(telemetry): scaffold telemetry package with Nx integration`
**Backout**: `git revert HEAD && git clean -fd packages/telemetry`

---

### Task 4 — A2A Schema Registration
**Goal**: Register telemetry events in A2A system with schema validation

**Files to touch**:
- `apps/cortex-os/src/a2a.ts` (UPDATE)

**Edit steps**:
- Add 'cortex.telemetry.agent.event' to topic ACL
- Define CortexOsTelemetryEventSchema mirroring AgentEvent structure
- Register schema with version 1.0.0 and tags ['telemetry', 'agents']
- Include example payload_ref with brAInwav context

**Implementation Aids**:
```diff
+ // apps/cortex-os/src/a2a.ts
+ import { z } from 'zod'
+ 
+ const topics = [
+   'cortex.a2a.events',
+   'cortex.orchestration.plan',
+   'cortex.tools.mcp',
++  'cortex.telemetry.agent.event'
+ ]
+ 
++ const CortexOsTelemetryEventSchema = z.object({
++   timestamp: z.string(),
++   agentId: z.string(),
++   phase: z.enum(['planning', 'execution', 'completion']),
++   event: z.enum(['run_started', 'run_finished', 'plan_created', 'tool_invoked', 'tool_result']),
++   correlationId: z.string(),
++   labels: z.record(z.unknown()).optional(),
++   metrics: z.record(z.unknown()).optional(),
++   outcome: z.record(z.unknown()).optional()
++ })
+ 
+ export function wireA2A() {
+   // Register schemas
++   registry.registerSchema('cortex.telemetry.agent.event', {
++     schema: CortexOsTelemetryEventSchema,
++     version: '1.0.0',
++     tags: ['telemetry', 'agents'],
++     example: {
++       timestamp: '2025-01-12T10:00:00Z',
++       agentId: 'brAInwav-cortex-agent',
++       phase: 'execution',
++       event: 'tool_invoked',
++       correlationId: 'brAInwav-session-123'
++     }
++   })
+ }
```

**Run & verify**: `pnpm test apps/cortex-os -- a2a` → expect schema registration test to pass
**Commit**: `feat(a2a): register telemetry event schema with brAInwav context`
**Backout**: `git revert HEAD`

---

### Task 5 — Runtime Telemetry Integration
**Goal**: Wire telemetry emitter in runtime with tool event instrumentation

**Files to touch**:
- `apps/cortex-os/src/runtime.ts` (UPDATE)
- `apps/cortex-os/package.json` (UPDATE)

**Edit steps**:
- Add @brainwav/telemetry dependency to package.json
- Import Telemetry and setTelemetryEmitter in runtime
- Create bus adapter wrapping A2A publish
- Instantiate telemetry with custom topic and redaction
- Add tool start/complete envelope instrumentation

**Implementation Aids**:
```diff
+ // apps/cortex-os/src/runtime.ts
+ import { Telemetry } from '@brainwav/telemetry'
+ import { setTelemetryEmitter } from './services.js'
+ 
+ export async function bootRuntime() {
+   await wireA2A()
+   
++  // Create telemetry bus adapter
++  const telemetryBus = {
++    publish: (topic: string, data: unknown) => {
++      wiring.publish(topic, data as Record<string, unknown>)
++    }
++  }
++  
++  // Configure telemetry with brAInwav redaction
++  const telemetry = new Telemetry(telemetryBus, {
++    topic: 'cortex.telemetry.agent.event',
++    redaction: (event) => {
++      const { labels, ...rest } = event
++      return {
++        ...rest,
++        labels: labels ? { ...labels, prompt: '[brAInwav-REDACTED]' } : undefined
++      }
++    }
++  })
++  
++  setTelemetryEmitter(telemetry)
++  
++  // Instrument tool events
++  wiring.subscribe('cortex.tools.mcp', (envelope) => {
++    if (envelope.type === 'tool.start') {
++      telemetry.emit({
++        event: 'tool_invoked',
++        agentId: envelope.agentId || 'brAInwav-cortex',
++        phase: 'execution',
++        correlationId: envelope.correlationId,
++        labels: { tool: envelope.tool, brAInwav: 'tool-invocation' }
++      })
++    }
++  })
+ }
```

**Run & verify**: `pnpm test apps/cortex-os -- runtime` → expect tool instrumentation test to pass
**Commit**: `feat(runtime): integrate telemetry with tool event instrumentation`
**Backout**: `git revert HEAD`

---

### Task 6 — Service Layer Telemetry Wiring
**Goal**: Add telemetry setter hook and facade run lifecycle instrumentation

**Files to touch**:
- `apps/cortex-os/src/services.ts` (UPDATE)

**Edit steps**:
- Import telemetry types and add module-level state
- Implement setTelemetryEmitter() function
- Track currentFacade reference for setter propagation
- Wrap facade run with run_started/run_finished events
- Add error handling with brAInwav context

**Implementation Aids**:
```diff
+ // apps/cortex-os/src/services.ts
+ import type { Telemetry } from '@brainwav/telemetry'
+ 
+ let telemetryEmitter: Telemetry | undefined
+ let currentFacade: OrchestrationFacade | undefined
+ 
++ export function setTelemetryEmitter(emitter: Telemetry) {
++   telemetryEmitter = emitter
++   currentFacade?.setTelemetry?.(emitter)
++ }
+ 
+ export function provideOrchestration() {
+   const facade = new OrchestrationFacade(router, bus)
++  currentFacade = facade
++  
++  if (telemetryEmitter) {
++    facade.setTelemetry?.(telemetryEmitter)
++  }
++  
++  // Wrap run with telemetry
++  const originalRun = facade.run.bind(facade)
++  facade.run = async (task, agents) => {
++    const agentId = agents[0]?.id || 'brAInwav-cortex-orchestrator'
++    const phase = telemetryEmitter?.phase('orchestration-run')
++    
++    try {
++      phase?.started()
++      const result = await originalRun(task, agents)
++      phase?.finished({ status: 'success', brAInwav: 'orchestration-complete' })
++      return result
++    } catch (error) {
++      phase?.finished({ status: 'error', error: error.message, brAInwav: 'orchestration-failed' })
++      throw error
++    }
++  }
+   
+   return facade
+ }
```

**Run & verify**: `pnpm test apps/cortex-os -- services` → expect lifecycle instrumentation test to pass
**Commit**: `feat(services): add telemetry lifecycle instrumentation to orchestration`
**Backout**: `git revert HEAD`

---

### Task 7 — Orchestration Telemetry Bridge
**Goal**: Implement bridge mapping orchestration bus events to AgentEvents

**Files to touch**:
- `packages/orchestration/src/observability/structured-telemetry.ts` (NEW)
- `packages/orchestration/package.json` (UPDATE)

**Edit steps**:
- Create StructuredTelemetryBridge class
- Implement bus event subscription for PlanCreated, PlanUpdated, RoutingFallback
- Map events to appropriate AgentEvent types with brAInwav context
- Add start()/stop() lifecycle with proper cleanup

**Implementation Aids**:
```diff
+ // packages/orchestration/src/observability/structured-telemetry.ts
+ import type { Telemetry } from '@brainwav/telemetry'
+ 
+ export interface StructuredTelemetryOptions {
+   telemetry: Telemetry
+   agentId?: string
+ }
+ 
+ export class StructuredTelemetryBridge {
+   private subscriptions: Array<() => void> = []
+   
+   constructor(
+     private bus: EventBus,
+     private options: StructuredTelemetryOptions
+   ) {}
+   
+   start(): void {
+     // Subscribe to orchestration events
+     this.subscriptions.push(
+       this.bus.subscribe('PlanCreated', (event) => {
+         this.options.telemetry.emit({
+           event: 'plan_created',
+           agentId: this.options.agentId || 'brAInwav-orchestrator',
+           phase: 'planning',
+           correlationId: event.planId,
+           labels: { 
+             planType: event.type,
+             brAInwav: 'plan-creation'
+           }
+         })
+       })
+     )
+   }
+   
+   stop(): Promise<void> {
+     this.subscriptions.forEach(unsub => unsub())
+     this.subscriptions = []
+     return Promise.resolve()
+   }
+ }
```

**Run & verify**: `pnpm test packages/orchestration -- structured-telemetry` → expect 3 failing tests
**Commit**: `feat(orchestration): add structured telemetry bridge for bus events`
**Backout**: `git revert HEAD`

---

### Task 8 — Orchestration Service Integration
**Goal**: Wire telemetry bridge into orchestration facade with setTelemetry hook

**Files to touch**:
- `packages/orchestration/src/service.ts` (UPDATE)
- `packages/orchestration/src/index.ts` (UPDATE)

**Edit steps**:
- Extend OrchestrationFacade interface with setTelemetry method
- Track bridge instance and telemetry state
- Implement bridge lifecycle in facade run method
- Add proper cleanup in shutdown

**Implementation Aids**:
```diff
+ // packages/orchestration/src/service.ts
+ import { StructuredTelemetryBridge } from './observability/structured-telemetry.js'
+ import type { Telemetry } from '@brainwav/telemetry'
+ 
+ export class OrchestrationFacade {
+   private telemetryBridge?: StructuredTelemetryBridge
+   private telemetryEmitter?: Telemetry
+   
++  setTelemetry(telemetry: Telemetry | undefined): void {
++    if (this.telemetryBridge) {
++      await this.telemetryBridge.stop()
++      this.telemetryBridge = undefined
++    }
++    
++    this.telemetryEmitter = telemetry
++    
++    if (telemetry) {
++      this.telemetryBridge = new StructuredTelemetryBridge(this.bus, {
++        telemetry,
++        agentId: 'brAInwav-orchestration-facade'
++      })
++      this.telemetryBridge.start()
++    }
++  }
+   
+   async run(task: Task, agents: Agent[]): Promise<Result> {
+     // Use telemetryEmitter for run-level events
++    const runPhase = this.telemetryEmitter?.phase('orchestration-execution')
++    runPhase?.started()
+     
+     try {
+       const result = await this.router.route(task, agents)
++      runPhase?.finished({ status: 'success', brAInwav: 'orchestration-success' })
+       return result
+     } catch (error) {
++      runPhase?.finished({ status: 'error', error: error.message, brAInwav: 'orchestration-error' })
+       throw error
+     }
+   }
+   
+   async shutdown(): Promise<void> {
++    if (this.telemetryBridge) {
++      await this.telemetryBridge.stop()
++    }
+     await this.router.close()
+   }
+ }
```

**Run & verify**: `pnpm test packages/orchestration` → expect facade integration test to pass
**Commit**: `feat(orchestration): integrate telemetry bridge with facade lifecycle`
**Backout**: `git revert HEAD`

---

### Task 9 — Integration Tests & Contract Validation
**Goal**: Comprehensive integration tests validating end-to-end telemetry flow

**Files to touch**:
- `apps/cortex-os/tests/telemetry.integration.test.ts` (NEW)
- `packages/orchestration/tests/telemetry/structured-telemetry.test.ts` (NEW)

**Edit steps**:
- Create mock A2A bus for integration testing
- Test runtime telemetry wiring with tool events
- Validate orchestration bridge event mapping
- Test redaction functionality end-to-end
- Verify brAInwav branding throughout

**Implementation Aids**:
```diff
+ // apps/cortex-os/tests/telemetry.integration.test.ts
+ import { setTelemetryEmitter } from '../src/services.js'
+ import { Telemetry } from '@brainwav/telemetry'
+ 
+ describe('Runtime Telemetry Integration', () => {
+   it('should emit structured telemetry for orchestration run', async () => {
+     const publishSpy = vi.fn()
+     const mockBus = { publish: publishSpy }
+     const telemetry = new Telemetry(mockBus, {
+       topic: 'cortex.telemetry.agent.event'
+     })
+     
+     setTelemetryEmitter(telemetry)
+     
+     // Trigger orchestration run
+     const facade = provideOrchestration()
+     await facade.run(mockTask, mockAgents)
+     
+     // Verify telemetry events emitted
+     expect(publishSpy).toHaveBeenCalledWith(
+       'cortex.telemetry.agent.event',
+       expect.objectContaining({
+         event: 'run_started',
+         agentId: expect.stringContaining('brAInwav')
+       })
+     )
+   })
+ })
```

**Run & verify**: `pnpm test:smart` → expect integration tests to pass
**Commit**: `test(telemetry): add comprehensive integration test coverage`
**Backout**: `git revert HEAD`

---

### Task 10 — Documentation & Polish
**Goal**: Complete documentation, update README files, and final polish

**Files to touch**:
- `packages/telemetry/README.md` (UPDATE)
- `schemas/README.md` (UPDATE)
- `CHANGELOG.md` (UPDATE)

**Edit steps**:
- Document telemetry package usage with examples
- Add privacy and redaction guidance
- Update schema documentation
- Add changelog entry with brAInwav context
- Final code review and cleanup

**Implementation Aids**:
```diff
+ // packages/telemetry/README.md
+ # @brainwav/telemetry
+ 
+ Structured telemetry system for brAInwav Cortex-OS providing vendor-neutral 
+ agent event emission with privacy-first redaction.
+ 
+ ## Usage
+ 
+ ```typescript
+ import { Telemetry } from '@brainwav/telemetry'
+ 
+ const telemetry = new Telemetry(bus, {
+   topic: 'cortex.telemetry.agent.event',
+   redaction: (event) => ({ ...event, labels: { ...event.labels, prompt: '[brAInwav-REDACTED]' } })
+ })
+ 
+ telemetry.emit({
+   event: 'tool_invoked',
+   agentId: 'brAInwav-agent-1',
+   phase: 'execution'
+ })
+ ```
```

**Run & verify**: `pnpm lint:smart && pnpm test:smart` → expect all quality gates to pass
**Commit**: `docs(telemetry): add comprehensive usage documentation with brAInwav examples`
**Backout**: `git revert HEAD`

---

## 3) Technical Rationale

**Dedicated telemetry package** centralizes structured event emission, enabling reuse across services without duplicating logic and aligning with vendor-neutral schema standards.

**A2A schema registration** ensures telemetry events conform to existing contract governance, so downstream policies can validate and react to real-time signals with proper versioning.

**Telemetry bridge in orchestration** leverages existing orchestration bus events to minimize invasive refactors; events already reflect plan/route decisions, making them natural triggers for structured telemetry.

**Service wrapper instrumentation** keeps runtime-specific context (run IDs, agent IDs) near existing bundle recorder, avoiding modifications deep inside LangGraph code paths while maintaining observability.

**Redaction hook** enforces privacy by design, allowing call sites to strip sensitive labels before publishing while retaining metrics and brAInwav context for compliance.

---

## 4) Dependency Impact

**Internal Dependencies**:
- Adds new internal workspace package `@brainwav/telemetry`
- Updates path mappings in `tsconfig.base.json`
- Updates dependent package manifests (`apps/cortex-os`, `@cortex-os/orchestration`)

**External Dependencies**:
- No new external NPM dependencies beyond existing workspace tooling (Zod already present)
- Leverages existing Vitest testing infrastructure

---

## 5) Risks & Mitigations

| Risk | Mitigation Strategy | Status |
|------|-------------------|--------|
| Misaligned schemas between A2A and TypeScript | Validate CortexOsTelemetryEventSchema against TypeScript types; add integration test ensuring publish succeeds | Planned |
| Event storms / performance overhead | Keep emissions lightweight, avoid synchronous blocking, use async void + error guards | Planned |
| Sensitive data leakage | Redaction defaults remove labels.prompt; review additional labels and document safe usage | Planned |
| Lifecycle leaks | Ensure StructuredTelemetryBridge.stop() is awaited during shutdown to unbind handlers | Planned |

---

## 6) Testing & Validation Strategy (with handrails)

**Case matrix**:
- **Happy path**: Standard telemetry emission with valid AgentEvent data
- **Boundaries**: Edge cases with minimal/maximal data, missing optional fields
- **Error paths**: Schema validation failures, bus publish errors, bridge lifecycle failures
- **Idempotency**: Multiple start/stop cycles, duplicate event emission
- **Privacy**: Redaction functionality with various sensitive data patterns
- **Concurrency**: Multiple telemetry instances, concurrent bridge operations

**Fixtures/mocks**:
- Mock A2A bus with publish spy and error injection
- Mock orchestration events (PlanCreated, RoutingFallback) with test data
- Deterministic timestamp and correlation ID generation

**Determinism**:
- Fixed test timestamps using ISO-8601 format
- Deterministic correlation ID generation for test reproducibility
- Stable mock data builders for consistent test scenarios

**Coverage target**: 95% line coverage, 90% branch coverage
- Commands: `pnpm test:smart -- --coverage`
- Expected threshold: ≥95% for changed lines per brAInwav standards

**Manual QA checklist**:
1. Start Cortex-OS runtime with telemetry enabled
2. Execute orchestration workflow with tool invocations
3. Verify A2A events published to 'cortex.telemetry.agent.event' topic
4. Confirm redaction applied to sensitive data
5. Validate brAInwav branding present in all telemetry outputs

**Artifacts**:
- Test logs stored in `tasks/structured-telemetry-implementation/test-logs/`
- Coverage reports in `tasks/structured-telemetry-implementation/verification/`

---

## 7) Rollout / Migration Notes

**Feature flags**: No feature flags required; instrumentation is additive and non-breaking

**Gradual enablement**: 
1. Deploy with telemetry disabled by default
2. Enable in development environment for validation
3. Production rollout with monitoring

**Monitoring setup**: Ensure monitoring stacks listening to `cortex.telemetry.agent.event` are configured before deployment

**Documentation**: Document new A2A topic for downstream consumers; schedule follow-up to build dashboards leveraging new metrics once events observed

**Post-stabilization cleanup**: No legacy systems to deprecate; this is a new capability

---

## 8) Completion Criteria (definition of done)

- [ ] Code merged with all targeted tests passing
- [ ] Coverage meets package gates (≥95% on changed files per AGENTS.md)
- [ ] Security/lint gates clean (`pnpm security:scan` unaffected)
- [ ] Documentation updated (README, schemas, CHANGELOG)
- [ ] TDD plan committed referencing executed evidence
- [ ] A2A schema registered and validated
- [ ] Integration tests verify end-to-end telemetry flow
- [ ] brAInwav branding consistently applied throughout
- [ ] No mock/placeholder code in production paths
- [ ] Local Memory documentation updated with architectural decisions

---

## Implementation-Ease Extras

### Ready-to-run commands box
```bash
# Setup and validation sequence
pnpm install
pnpm lint:smart
pnpm typecheck:smart  
pnpm test:smart -- --coverage
pnpm --filter @brainwav/telemetry test
pnpm --filter apps/cortex-os test -- telemetry
pnpm --filter @cortex-os/orchestration test -- telemetry
```

### Signature deck
```typescript
// Key interfaces and classes to implement
export interface Bus {
  publish(topic: string, data: unknown): void | Promise<void>
}

export interface EmitterOpts {
  topic?: string
  redaction?: (event: AgentEvent) => AgentEvent
}

export class Telemetry {
  constructor(bus: Bus, opts: EmitterOpts = {})
  emit(event: Partial<AgentEvent>): void
  phase(phase: string): { started(): void, finished(outcome?: Record<string, unknown>): void }
}

export class StructuredTelemetryBridge {
  constructor(bus: EventBus, options: StructuredTelemetryOptions)
  start(): void
  stop(): Promise<void>
}

// Service integration
export function setTelemetryEmitter(emitter: Telemetry): void
```

### Interface map (data flow)
```
AgentEvent → Telemetry.emit() → Bus.publish() → A2A Topic → Downstream Consumers
     ↑              ↑                ↑
Schema Validation   Redaction       brAInwav Context

Orchestration Events → StructuredTelemetryBridge → AgentEvent → Telemetry Pipeline
     ↑
LangGraph Workflow
```

### Acceptance mapping table
| Task | Acceptance Criteria |
|------|-------------------|
| Task 1 | Schema validates sample AgentEvent, TypeScript types exported |
| Task 2 | Telemetry.emit() publishes to bus, redaction works, phase helpers functional |
| Task 3 | Package builds, workspace resolves @brainwav/telemetry |
| Task 4 | A2A schema registered, validation passes |
| Task 5 | Runtime emits tool events via telemetry |
| Task 6 | Service layer wires telemetry with lifecycle events |
| Task 7 | Bridge maps orchestration events to AgentEvents |
| Task 8 | Facade integrates bridge with proper cleanup |
| Task 9 | Integration tests verify end-to-end flow |
| Task 10 | Documentation complete, quality gates pass |

---

Co-authored-by: brAInwav Development Team