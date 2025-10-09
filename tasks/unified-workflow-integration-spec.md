# Feature Specification: Unified Workflow Integration (PRP Runner + Task Management)

**Task ID**: `unified-workflow-integration`  
**Feature Branch**: `feature/unified-workflow-integration`  
**Created**: 2025-01-09  
**Status**: Draft  
**Priority**: P1  
**Assignee**: Unassigned

**User Request**: 
> Integrate PRP Runner (quality gates G0-G7) with Task Management system (development phases 0-5) to create a unified developer experience with single CLI, shared enforcement profiles, and visual workflow dashboard.

---

## Executive Summary

This feature implements Phase 2 (Medium-term Integration) of the PRP Runner ↔ Task Management roadmap, creating a unified `cortex-workflow` CLI that orchestrates both quality gates and development phases in a single workflow. Developers will use one command to initialize features, automatically progress through gates and phases, leverage shared enforcement profiles for consistent quality standards, and visualize progress through a real-time dashboard.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1: Initialize Feature with Unified Workflow (Priority: P1)

**As a** brAInwav developer,  
**I want to** initialize a new feature using a single command that sets up both PRP gates and task management,  
**So that** I don't have to manually coordinate between two separate systems.

**Why This Priority**: Core MVP functionality - developers need a streamlined initialization process to adopt the unified workflow.

**Independent Test Criteria**: 
Can be fully tested by running `pnpm cortex-workflow init "Feature Name" --priority P1`, verifying that it creates PRP blueprint, task constitution, git branch, and initializes both state tracking systems. This delivers immediate value by reducing setup time from ~5 minutes to ~30 seconds.

**Acceptance Scenarios**:

1. **Given** developer is on main branch with clean working directory  
   **When** developer runs `pnpm cortex-workflow init "OAuth 2.1 Authentication" --priority P1`  
   **Then** system creates PRP G0 blueprint with title, description, and requirements  
   **And** system creates task constitution derived from blueprint  
   **And** git feature branch `feat/oauth-21-authentication` is created  
   **And** both PRP state and task tracking are initialized  
   **And** success message includes brAInwav branding

2. **Given** developer is not on main branch  
   **When** developer runs `pnpm cortex-workflow init "Feature Name"`  
   **Then** system displays warning with brAInwav branding  
   **And** prompts for confirmation to continue  
   **And** proceeds only if user confirms with 'y'

3. **Given** feature already exists  
   **When** developer runs `pnpm cortex-workflow init` with duplicate name  
   **Then** system displays error "brAInwav Cortex-OS: Feature already exists"  
   **And** suggests using `pnpm cortex-workflow status` to check existing feature  
   **And** exits with non-zero code

**brAInwav Branding Requirements**:
- CLI banner: "brAInwav Cortex-OS Unified Workflow"
- All success messages: "brAInwav: [action] completed successfully"
- All error messages: "brAInwav Cortex-OS: [error description]"
- Progress indicators: Include brAInwav logo or identifier

---

### User Story 2: Execute Complete Workflow with Auto-Transitions (Priority: P1)

**As a** brAInwav developer,  
**I want to** run the complete workflow from ideation to release with automatic gate-to-phase transitions,  
**So that** I can focus on development instead of manually progressing through each step.

**Why This Priority**: Core automation value proposition - eliminates manual coordination overhead and ensures no steps are missed.

**Independent Test Criteria**: 
Can be fully tested by running `pnpm cortex-workflow run feature-name`, verifying gates execute in sequence (G0→G1→G2→...→G7), phases execute at appropriate transitions, and workflow completes successfully. Delivers standalone value of orchestrated quality enforcement.

**Acceptance Scenarios**:

1. **Given** feature has been initialized with valid blueprint  
   **When** developer runs `pnpm cortex-workflow run oauth-authentication`  
   **Then** G0 Ideation gate executes with blueprint validation  
   **And** if G0 passes, Phase 0 (Init) executes creating constitution  
   **And** G1 Architecture gate executes with policy checks  
   **And** if G1 passes, Phase 1 (Research) is ready for manual completion  
   **And** progress is displayed with brAInwav-branded status messages  
   **And** workflow state is persisted after each step

2. **Given** workflow is in progress at Phase 2  
   **When** developer runs `pnpm cortex-workflow run feature-name --resume`  
   **Then** system resumes from last completed step  
   **And** displays "brAInwav: Resuming from [step]"  
   **And** continues workflow execution  
   **And** skips already-completed steps

3. **Given** gate requires human approval (G0, G1, G2)  
   **When** automated checks complete successfully  
   **Then** system requests approval from designated role (product-owner, architect, qa-lead)  
   **And** waits for approval or rejection  
   **And** if approved, automatically triggers next phase/gate  
   **And** if rejected, workflow pauses with brAInwav-branded message

4. **Given** automated check fails at any gate  
   **When** gate execution completes  
   **Then** workflow pauses with detailed error including brAInwav branding  
   **And** provides actionable next steps  
   **And** allows developer to fix issues and retry  
   **And** state is saved for resumption

**brAInwav Branding Requirements**:
- Workflow progress: "brAInwav Workflow: [X/Y steps complete]"
- Gate status: "brAInwav [Gate ID]: [status]"
- Phase status: "brAInwav Phase [N]: [status]"
- Completion message: "brAInwav Cortex-OS: Workflow completed successfully"

---

### User Story 3: Manage Enforcement Profile (Priority: P1)

**As a** brAInwav architect,  
**I want to** define quality standards in a central enforcement profile,  
**So that** all workflows automatically use consistent coverage, performance, security, and accessibility requirements.

**Why This Priority**: Critical for maintaining quality consistency - single source of truth prevents configuration drift across features.

**Independent Test Criteria**: 
Can be fully tested by creating/modifying `enforcement-profile.yml`, running `pnpm cortex-workflow profile validate`, and verifying that new workflows inherit profile settings. Delivers standalone value of centralized quality governance.

**Acceptance Scenarios**:

1. **Given** no enforcement profile exists  
   **When** developer runs `pnpm cortex-workflow profile init`  
   **Then** system creates `enforcement-profile.yml` with brAInwav defaults  
   **And** includes coverage (95/95), performance (LCP 2500ms), security (0 critical), accessibility (WCAG 2.2 AA)  
   **And** displays "brAInwav: Enforcement profile created with default standards"

2. **Given** enforcement profile exists  
   **When** architect runs `pnpm cortex-workflow profile set coverage.lines 98`  
   **Then** profile is updated with new value  
   **And** validation confirms change is valid  
   **And** displays "brAInwav: Coverage target updated to 98%"  
   **And** warns if change affects existing workflows

3. **Given** enforcement profile with custom values  
   **When** developer runs `pnpm cortex-workflow profile show`  
   **Then** displays formatted profile with brAInwav branding  
   **And** shows coverage, performance, security, accessibility budgets  
   **And** indicates which values differ from brAInwav defaults  
   **And** includes validation status

4. **Given** invalid enforcement profile  
   **When** system runs `pnpm cortex-workflow profile validate`  
   **Then** identifies all validation errors  
   **And** displays "brAInwav: Profile validation failed"  
   **And** lists specific issues (e.g., "coverage.lines must be > 0")  
   **And** suggests corrections

**Dependencies**: 
- Requires `@cortex-os/workflow-common` for validation types
- Requires PRP Runner enforcement profile schema

**brAInwav Branding Requirements**:
- Profile header: "brAInwav Cortex-OS Enforcement Profile v[version]"
- Default branding field: `branding: brAInwav`
- All profile commands prefixed with "brAInwav:"

---

### User Story 4: Visualize Workflow Progress (Priority: P2)

**As a** brAInwav developer,  
**I want to** see real-time visual representation of workflow progress across gates and phases,  
**So that** I can understand current status, blockers, and quality metrics at a glance.

**Why This Priority**: Important enhancement for developer experience - visual feedback improves awareness but not critical for basic functionality.

**Independent Test Criteria**: 
Can be fully tested by running workflow and accessing dashboard at `http://localhost:8080/workflow/[feature-name]`, verifying gate status, phase completion, quality metrics display, and evidence artifacts are shown. Delivers standalone value of workflow visibility.

**Acceptance Scenarios**:

1. **Given** workflow is in progress  
   **When** developer opens dashboard at `http://localhost:8080/workflow/oauth-authentication`  
   **Then** displays workflow timeline with gates and phases  
   **And** shows completion status (✅ complete, 🔄 in-progress, ⏳ pending, ○ not started)  
   **And** displays quality metrics (coverage, performance, security, accessibility)  
   **And** includes brAInwav branding in header and footer

2. **Given** quality gate fails  
   **When** developer views dashboard  
   **Then** failed gate is highlighted in red  
   **And** displays failure reason and actionable next steps  
   **And** shows link to evidence artifacts  
   **And** includes brAInwav-branded retry button

3. **Given** workflow requires human approval  
   **When** approver views dashboard  
   **Then** approval request is prominently displayed  
   **And** shows automated check results  
   **And** provides "Approve" and "Reject" buttons with brAInwav branding  
   **And** displays approval rationale input field

4. **Given** multiple workflows are active  
   **When** developer views workflow list at `http://localhost:8080/workflows`  
   **Then** displays all workflows with status summary  
   **And** shows priority, current step, and overall progress percentage  
   **And** allows filtering by status, priority, assignee  
   **And** includes brAInwav branding

**brAInwav Branding Requirements**:
- Dashboard title: "brAInwav Cortex-OS Workflow Dashboard"
- Footer: "Powered by brAInwav Cortex-OS"
- All status messages branded
- Logo/icon in header

---

### User Story 5: Query Workflow Status from CLI (Priority: P2)

**As a** brAInwav developer,  
**I want to** check workflow status and progress from the command line,  
**So that** I can quickly understand state without opening a web dashboard.

**Why This Priority**: Important for CLI-focused developers - complements dashboard but not required for basic workflow operation.

**Independent Test Criteria**: 
Can be fully tested by running `pnpm cortex-workflow status feature-name`, verifying it displays current gate/phase, quality metrics, next steps, and evidence trail. Delivers standalone value of quick status checks.

**Acceptance Scenarios**:

1. **Given** workflow exists and is in progress  
   **When** developer runs `pnpm cortex-workflow status oauth-authentication`  
   **Then** displays feature name, priority, current step  
   **And** shows completed gates/phases with timestamps  
   **And** shows pending/in-progress steps  
   **And** displays quality metrics (coverage %, security findings, etc.)  
   **And** includes brAInwav branding in output

2. **Given** workflow is blocked on approval  
   **When** developer runs `pnpm cortex-workflow status feature-name`  
   **Then** displays "brAInwav: Waiting for [role] approval at [Gate ID]"  
   **And** shows which automated checks passed/failed  
   **And** provides contact for approver  
   **And** suggests next actions

3. **Given** workflow completed successfully  
   **When** developer runs `pnpm cortex-workflow status feature-name`  
   **Then** displays "brAInwav: Workflow completed - Ready for release"  
   **And** shows all gates/phases with ✅  
   **And** displays final quality metrics summary  
   **And** links to evidence artifacts

**brAInwav Branding Requirements**:
- Status header: "brAInwav Workflow Status: [feature-name]"
- All status messages prefixed with "brAInwav:"

---

### User Story 6: Apply Profile to Existing Workflows (Priority: P3)

**As a** brAInwav architect,  
**I want to** apply updated enforcement profile to existing workflows,  
**So that** quality standard changes propagate to in-progress features.

**Why This Priority**: Nice-to-have - useful for governance but existing workflows can continue with original standards.

**Independent Test Criteria**: 
Can be fully tested by modifying profile, running `pnpm cortex-workflow profile apply --all`, and verifying existing workflows update their quality gates. Delivers value of consistent standards enforcement.

**Acceptance Scenarios**:

1. **Given** enforcement profile is updated  
   **When** architect runs `pnpm cortex-workflow profile apply --all`  
   **Then** system identifies all active workflows  
   **And** updates their quality gate requirements  
   **And** triggers re-validation where applicable  
   **And** displays "brAInwav: Profile applied to [N] workflows"  
   **And** lists any workflows that fail new requirements

2. **Given** profile change is breaking (e.g., coverage 95→98)  
   **When** profile is applied to workflows  
   **Then** system identifies workflows that no longer meet requirements  
   **And** displays warning with brAInwav branding  
   **And** suggests grace period or immediate fix  
   **And** allows selective application

**brAInwav Branding Requirements**:
- Application messages: "brAInwav: Applying profile to workflows..."
- Warning messages: "brAInwav: [N] workflows need attention"

---

### User Story 7: Store Workflow Insights in Local Memory (Priority: P2)

**As a** brAInwav AI agent,  
**I want to** store workflow execution insights, decisions, and patterns in local memory,  
**So that** future workflows can learn from past experiences and provide intelligent recommendations.

**Why This Priority**: Important for future AI-assisted workflow (Phase 3) - builds foundation for intelligent automation but not required for basic workflow operation.

**Independent Test Criteria**: 
Can be fully tested by executing workflow, verifying insights are stored in local memory with proper tagging and importance scores, and querying memory to retrieve relevant past decisions. Delivers standalone value of knowledge retention across workflow executions.

**Acceptance Scenarios**:

1. **Given** workflow completes successfully (all gates passed)  
   **When** workflow finishes  
   **Then** system stores comprehensive summary in local memory  
   **And** includes feature name, priority, gates passed/failed, quality metrics  
   **And** tags with "workflow", "completed", feature tags, gate tags  
   **And** sets importance score based on priority (P0=10, P1=9, P2=7, P3=5)  
   **And** includes brAInwav branding in metadata

2. **Given** gate approval decision is made (approved or rejected)  
   **When** approver provides decision with rationale  
   **Then** system stores decision in local memory  
   **And** includes gate ID, approver role, decision, rationale  
   **And** tags with "approval", "gate-[id]", decision type  
   **And** links to workflow ID for context  
   **And** sets high importance (8/10) for future reference

3. **Given** workflow encounters error or failure  
   **When** gate or phase fails  
   **Then** system stores failure details in local memory  
   **And** includes error message, failed checks, context  
   **And** tags with "failure", "gate-[id]" or "phase-[id]", error type  
   **And** sets importance based on severity  
   **And** enables future troubleshooting and pattern recognition

4. **Given** developer queries for similar past workflows  
   **When** developer runs `pnpm cortex-workflow insights "OAuth authentication"`  
   **Then** system queries local memory for related workflows  
   **And** displays past decisions, approvals, common failures  
   **And** shows quality metrics from similar features  
   **And** includes brAInwav-branded recommendations  
   **And** helps developer learn from past patterns

5. **Given** enforcement profile is updated  
   **When** profile change is applied  
   **Then** system stores profile change event in local memory  
   **And** includes old values, new values, rationale if provided  
   **And** tags with "profile-change", affected budget categories  
   **And** enables audit trail of quality standard evolution

**Memory Storage Schema**:
```typescript
// Workflow completion insight
await memory.store({
  content: `brAInwav Workflow Completed: ${featureName}
    Priority: ${priority}
    Gates: ${passedGates.join(', ')} passed
    Quality: Coverage ${coverage}%, Security ${securityFindings} findings
    Duration: ${duration}ms`,
  importance: priorityToImportance(priority),
  tags: ['workflow', 'completed', featureName, ...gateTags],
  domain: 'workflow-execution',
  metadata: {
    branding: 'brAInwav',
    workflowId: workflow.id,
    featureName,
    priority,
    qualityMetrics: { coverage, security, performance, accessibility }
  }
});

// Gate approval decision
await memory.store({
  content: `brAInwav Gate Approval: ${gateId}
    Approver: ${approver} (${role})
    Decision: ${decision}
    Rationale: ${rationale}`,
  importance: 8,
  tags: ['approval', `gate-${gateId}`, decision, role],
  domain: 'workflow-approvals',
  metadata: {
    branding: 'brAInwav',
    workflowId: workflow.id,
    gateId,
    approver,
    role,
    decision
  }
});
```

**Dependencies**: 
- Requires `@cortex-os/memories` or `@cortex-os/memory-core`
- Requires local memory service running at `LOCAL_MEMORY_BASE_URL`
- Environment variables: `MEMORIES_SHORT_STORE`, `MEMORIES_EMBEDDER`

**brAInwav Branding Requirements**:
- All memory content prefixed with "brAInwav"
- Metadata includes `branding: 'brAInwav'` field
- Query results display "brAInwav Workflow Insights"

---

### Edge Cases & Error Scenarios

#### Edge Case 1: Network Failure During Workflow Execution
**Given** workflow is executing and requires external service (approval system, dashboard)  
**When** network connection is lost mid-execution  
**Then** system persists current state to local storage  
**And** displays "brAInwav: Network error - workflow state saved"  
**And** allows resumption when connection restored  
**And** no data loss occurs

#### Edge Case 2: Concurrent Modifications to Enforcement Profile
**Given** two architects modify enforcement profile simultaneously  
**When** both attempt to save changes  
**Then** second save detects conflict  
**And** displays "brAInwav: Profile conflict detected"  
**And** shows diff between versions  
**And** requires manual resolution before proceeding

#### Edge Case 3: Gate Timeout
**Given** gate requires human approval with 24-hour timeout  
**When** timeout expires without approval  
**Then** workflow is marked as "stalled"  
**And** sends notification to approver and developer  
**And** displays "brAInwav: Approval timeout - workflow paused"  
**And** allows developer to request extension or cancel

#### Edge Case 4: Invalid Workflow State
**Given** workflow state file becomes corrupted  
**When** developer attempts to run or resume workflow  
**Then** system detects invalid state  
**And** displays "brAInwav: Workflow state corrupted"  
**And** offers to reinitialize from last valid checkpoint  
**And** creates backup of corrupted state for debugging

#### Edge Case 5: Dashboard Port Already in Use
**Given** port 8080 is already occupied  
**When** dashboard attempts to start  
**Then** system tries alternative ports (8081, 8082, etc.)  
**And** displays "brAInwav: Dashboard running on port [N]"  
**And** updates workflow state with actual dashboard URL  
**And** logs port selection

#### Edge Case 6: Local Memory Service Unavailable
**Given** local memory REST API is not running at `LOCAL_MEMORY_BASE_URL`  
**When** workflow attempts to store insights  
**Then** system logs warning "brAInwav: Local memory unavailable - insights not stored"  
**And** continues workflow execution without failing  
**And** queues insights for retry when service becomes available  
**And** displays note in workflow status about missing memory integration

#### Edge Case 7: Memory Storage Quota Exceeded
**Given** local memory storage is approaching capacity  
**When** workflow attempts to store insights  
**Then** system checks available storage before writing  
**And** if quota exceeded, displays "brAInwav: Memory quota exceeded - archiving old insights"  
**And** automatically archives/compresses old workflow memories  
**And** stores new insights successfully  
**And** logs storage management action

---

## Requirements *(mandatory)*

### Functional Requirements

1. **[FR-001]** Unified CLI must orchestrate both PRP gates (G0-G7) and task phases (0-5)
   - **Rationale**: Core value proposition of integration
   - **Validation**: Run complete workflow, verify all gates and phases execute in correct order

2. **[FR-002]** Enforcement profile must be single source of truth for quality standards
   - **Rationale**: Eliminates configuration duplication and drift
   - **Validation**: Modify profile, verify changes reflected in all new workflows

3. **[FR-003]** Workflow state must be persisted after each step completion
   - **Rationale**: Enables resumption after failure or interruption
   - **Validation**: Kill process mid-workflow, resume successfully from last step

4. **[FR-004]** Automatic gate→phase transitions based on approval status
   - **Rationale**: Reduces manual coordination overhead
   - **Validation**: Gate approval automatically triggers next phase without user intervention

5. **[FR-005]** Dashboard must provide real-time workflow progress visualization
   - **Rationale**: Improves developer awareness and reduces status-check overhead
   - **Validation**: Update workflow state, verify dashboard reflects change within 1 second

6. **[FR-006]** brAInwav branding included in:
   - CLI output (banners, status messages, errors)
   - Dashboard header, footer, and status indicators
   - Enforcement profile metadata
   - Workflow state artifacts
   - Evidence collection metadata

### Non-Functional Requirements

#### Performance
- **[NFR-P-001]** Workflow initialization must complete within 30 seconds
  - Target: ≤ 10 seconds for typical feature setup
  
- **[NFR-P-002]** Gate execution must complete within 2 minutes for automated checks
  - Excludes human approval wait time
  
- **[NFR-P-003]** Dashboard must load initial view within 500ms
  - Target: ≤ 200ms for 95th percentile
  
- **[NFR-P-004]** Profile validation must complete within 100ms

#### Security
- **[NFR-S-001]** Must pass `pnpm security:scan` with zero high-severity findings
- **[NFR-S-002]** Workflow state must not contain secrets or credentials
- **[NFR-S-003]** Dashboard must authenticate users via existing auth system
- **[NFR-S-004]** Approval actions must be cryptographically signed
- **[NFR-S-005]** Enforcement profile changes must be auditable (git history)

#### Accessibility (WCAG 2.2 AA)
- **[NFR-A-001]** Dashboard must be fully keyboard-navigable
- **[NFR-A-002]** All interactive elements minimum 44x44 CSS pixels
- **[NFR-A-003]** Color contrast ratios meet AA standards (4.5:1 for text)
- **[NFR-A-004]** Screen reader compatible (verified with jest-axe)
- **[NFR-A-005]** Workflow status indicators use icon + text (not color alone)

#### Testing
- **[NFR-T-001]** 90%+ test coverage maintained across all new packages
- **[NFR-T-002]** Integration tests for complete workflow execution (G0→G7)
- **[NFR-T-003]** Unit tests for all CLI commands
- **[NFR-T-004]** End-to-end tests for dashboard functionality
- **[NFR-T-005]** Property-based tests for workflow state machine

#### Observability
- **[NFR-O-001]** OpenTelemetry spans for each gate/phase execution
- **[NFR-O-002]** Structured logging with brAInwav context for all operations
- **[NFR-O-003]** Prometheus metrics for workflow execution times
- **[NFR-O-004]** Error tracking with full workflow context
- **[NFR-O-005]** Audit trail for all enforcement profile changes

---

## Technical Constraints

### Must Use
- Named exports only (no `export default`)
- Async/await exclusively (no `.then()` chains)
- Functions ≤ 40 lines (split if longer)
- Zod schemas for enforcement profile validation
- brAInwav branding in all outputs
- TypeScript strict mode enabled
- ESM modules (not CommonJS)

### Must Avoid
- Polling for state changes (use event-driven architecture)
- Blocking the CLI during long operations (use async progress updates)
- Hard-coded configuration (use enforcement profile)
- Direct file system manipulation (use workflow-common abstractions)
- Secrets in code or configuration files

### Integration Points
- **MCP Tools**: None (CLI-based, not MCP-exposed in Phase 2)
- **A2A Events**: Emit workflow lifecycle events (started, gate-completed, phase-completed, failed, completed)
- **Databases**: 
  - Local SQLite for workflow state persistence
  - Local Memory (via `@cortex-os/memories`) for insights and decisions
- **External APIs**: 
  - Dashboard API (REST)
  - Local Memory REST API (`http://localhost:3002`)
  - Approval system (future)
- **Existing Packages**: 
  - `@cortex-os/workflow-common` (validation)
  - `@cortex-os/prp-runner` (gates G0-G7)
  - `@cortex-os/memories` (memory integration)
  - Current `scripts/cortex-task.mjs` logic (to be refactored)

---

## Architecture & Design

### System Components
```
┌─────────────────────────────────────────────────────────────┐
│                  Unified Workflow System                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CLI Layer (packages/workflow-orchestrator/src/cli/)        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  cortex-workflow                                     │   │
│  │    ├─ init     (initialize feature)                 │   │
│  │    ├─ run      (execute workflow)                   │   │
│  │    ├─ status   (check progress)                     │   │
│  │    ├─ resume   (continue from pause)                │   │
│  │    ├─ profile  (manage enforcement)                 │   │
│  │    └─ insights (query local memory)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  Orchestration Layer (src/orchestrator/)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  WorkflowEngine (state machine)                      │   │
│  │    ├─ executeWorkflow()                             │   │
│  │    ├─ handleGateTransition()                        │   │
│  │    ├─ handlePhaseTransition()                       │   │
│  │    ├─ persistState()                                │   │
│  │    └─ storeInsights() → Local Memory                │   │
│  └─────────────────────────────────────────────────────┘   │
│                    ↓               ↓                        │
│  Integration Layer (src/integrations/)                      │
│  ┌──────────────────────┐  ┌────────────────────────────┐  │
│  │  PRP Gate Runner     │  │  Task Phase Executor       │  │
│  │  (G0-G7)             │  │  (Phases 0-5)              │  │
│  └──────────────────────┘  └────────────────────────────┘  │
│                    ↓               ↓                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  @cortex-os/workflow-common (shared validation)     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Memory Layer (src/memory/)                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LocalMemoryClient                                   │   │
│  │    ├─ storeWorkflowInsight()                        │   │
│  │    ├─ storeApprovalDecision()                       │   │
│  │    ├─ storeFailureContext()                         │   │
│  │    ├─ queryRelatedWorkflows()                       │   │
│  │    └─ getRecommendations()                          │   │
│  │                                                       │   │
│  │  → REST API: http://localhost:3002                  │   │
│  │  → @cortex-os/memories integration                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Dashboard Layer (packages/workflow-dashboard/)             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  React UI + WebSocket                                │   │
│  │    ├─ WorkflowTimeline Component                    │   │
│  │    ├─ QualityMetrics Component                      │   │
│  │    ├─ EvidenceViewer Component                      │   │
│  │    ├─ ApprovalActions Component                     │   │
│  │    └─ InsightsPanel Component (memory-powered)      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Persistence Layer (src/persistence/)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SQLite Database (workflow state)                    │   │
│  │    ├─ workflows (state storage)                     │   │
│  │    ├─ gates (execution history)                     │   │
│  │    ├─ phases (execution history)                    │   │
│  │    └─ evidence (artifact tracking)                  │   │
│  │                                                       │   │
│  │  Local Memory (insights & decisions)                 │   │
│  │    ├─ workflow completions                          │   │
│  │    ├─ approval decisions                            │   │
│  │    ├─ failure patterns                              │   │
│  │    └─ quality metrics history                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Model

**Enforcement Profile** (YAML):
```yaml
branding: brAInwav
version: 1.0.0

budgets:
  coverage:
    lines: 95
    branches: 95
    functions: 95
    statements: 95
  performance:
    lcp: 2500
    tbt: 300
  accessibility:
    score: 90
    wcagLevel: AA
    wcagVersion: "2.2"
  security:
    maxCritical: 0
    maxHigh: 0
    maxMedium: 5

policies:
  architecture:
    maxFunctionLines: 40
    exportStyle: named-only
  governance:
    requiredChecks:
      - lint
      - type-check
      - test
      - security-scan

approvers:
  G0: product-owner
  G1: architect
  G2: qa-lead
```

**Workflow State** (TypeScript):
```typescript
export interface WorkflowState {
  id: string;
  featureName: string;
  taskId: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'active' | 'paused' | 'completed' | 'failed';
  currentStep: string;
  
  prpState: {
    blueprint: Blueprint;
    gates: Record<GateId, GateResult>;
    approvals: HumanApproval[];
  };
  
  taskState: {
    constitution: ConstitutionTemplate;
    phases: Record<PhaseId, PhaseResult>;
    artifacts: string[];
  };
  
  enforcementProfile: EnforcementProfile;
  
  metadata: {
    createdAt: string;
    updatedAt: string;
    gitBranch: string;
    branding: 'brAInwav';
  };
}

export interface WorkflowStep {
  id: string;
  type: 'gate' | 'phase';
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  evidence: string[];
}
```

### API Contracts

**CLI Commands**:
```typescript
// init command
export const initCommandSchema = z.object({
  featureName: z.string().min(3).max(100),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P2'),
  profile: z.string().optional(), // Path to custom profile
});

// run command
export const runCommandSchema = z.object({
  taskId: z.string(),
  resume: z.boolean().default(false),
  skipApprovals: z.boolean().default(false), // For testing
  dryRun: z.boolean().default(false),
});

// profile command
export const profileCommandSchema = z.object({
  action: z.enum(['init', 'show', 'set', 'validate', 'apply']),
  key: z.string().optional(), // For 'set' action
  value: z.union([z.string(), z.number()]).optional(),
  all: z.boolean().default(false), // For 'apply' action
});
```

**Dashboard API**:
```typescript
// GET /api/workflows
export interface WorkflowListResponse {
  workflows: Array<{
    id: string;
    featureName: string;
    status: WorkflowState['status'];
    progress: number; // 0-100
    currentStep: string;
  }>;
  branding: 'brAInwav';
}

// GET /api/workflows/:id
export interface WorkflowDetailResponse {
  workflow: WorkflowState;
  timeline: WorkflowStep[];
  qualityMetrics: {
    coverage: number;
    security: { critical: number; high: number; };
    performance: { lcp: number; tbt: number; };
    accessibility: number;
  };
  branding: 'brAInwav';
}

// POST /api/workflows/:id/approve
export interface ApprovalRequest {
  gateId: GateId;
  actor: string;
  decision: 'approved' | 'rejected';
  rationale: string;
}
```

---

## Dependencies

### Internal Dependencies (Cortex-OS packages)
- `@cortex-os/workflow-common@workspace:*` - Shared validation logic
- `@cortex-os/prp-runner@workspace:*` - PRP gates G0-G7
- `@cortex-os/kernel@workspace:*` - Core types and utilities
- `@cortex-os/a2a@workspace:*` - Event emission for lifecycle events
- `@cortex-os/memories@workspace:*` - Local memory integration for workflow insights
- `@cortex-os/memory-core@workspace:*` - Core memory abstractions (new standard)

### External Dependencies (npm/pypi)
- `commander@^12.0.0` - CLI framework (MIT license)
- `zod@^3.22.0` - Schema validation (MIT license)
- `yaml@^2.3.0` - YAML parsing for enforcement profile (ISC license)
- `better-sqlite3@^9.4.0` - SQLite database (MIT license)
- `express@^4.18.0` - Dashboard API server (MIT license)
- `ws@^8.16.0` - WebSocket for real-time updates (MIT license)
- `react@^18.2.0` - Dashboard UI (MIT license)
- `react-dom@^18.2.0` - Dashboard UI (MIT license)
- `chalk@^5.3.0` - Terminal colors (MIT license)
- `ora@^8.0.0` - CLI spinners (MIT license)

### Service Dependencies
- **Local Memory API**: `http://localhost:3002` (via `@cortex-os/memories`)
  - Used for: Workflow insights, decision logging, pattern learning
  - Environment: `LOCAL_MEMORY_BASE_URL`, `MEMORIES_SHORT_STORE`, `MEMORIES_EMBEDDER`
- **Dashboard Server**: Embedded Express server (default port 8080)

---

## Implementation Phases

### Phase 1: Foundation & CLI (P1 Stories - Weeks 1-3)
- [ ] Create `packages/workflow-orchestrator` package structure
- [ ] Implement enforcement profile schema and validation
- [ ] Build CLI commands (init, run, status, profile, insights)
- [ ] Implement workflow state machine
- [ ] Create SQLite persistence layer
- [ ] **Integrate local memory client** (`@cortex-os/memories` or `@cortex-os/memory-core`)
- [ ] **Implement memory storage functions** (storeWorkflowInsight, storeApprovalDecision, etc.)
- [ ] Write integration tests for complete workflow (G0→G7)
- [ ] Write tests for memory integration (storage, retrieval, error handling)
- [ ] Unit tests for CLI commands (95%+ coverage)
- [ ] Documentation for CLI usage and memory integration

### Phase 2: Dashboard (P2 Stories - Weeks 4-5)
- [ ] Create `packages/workflow-dashboard` package
- [ ] Build React components (WorkflowTimeline, QualityMetrics, EvidenceViewer, **InsightsPanel**)
- [ ] **InsightsPanel**: Display relevant past workflows from local memory
- [ ] Implement dashboard API with Express
- [ ] Add WebSocket for real-time updates
- [ ] Create approval action UI
- [ ] Accessibility testing (jest-axe, keyboard nav)
- [ ] Dashboard integration tests
- [ ] Documentation for dashboard usage

### Phase 3: Polish & Additional Features (P3 Stories - Week 6)
- [ ] Implement profile apply to existing workflows
- [ ] Add workflow list/search functionality
- [ ] **Enhance memory queries**: Pattern recognition, recommendations
- [ ] Create workflow templates for common patterns
- [ ] Performance optimization (caching, lazy loading)
- [ ] Error recovery and resilience improvements
- [ ] Memory storage quota management
- [ ] Examples and demo workflows
- [ ] Final documentation polish

---

## Success Metrics

### Quantitative
- [ ] 90%+ test coverage achieved across all packages
- [ ] All quality gates passing (lint, typecheck, security scan)
- [ ] Workflow initialization completes in ≤ 10 seconds
- [ ] Dashboard loads in ≤ 200ms (95th percentile)
- [ ] Zero high-severity security findings
- [ ] Integration tests cover all gate→phase transitions
- [ ] CLI commands complete in ≤ 2 seconds for non-workflow operations

### Qualitative
- [ ] Code review approval from @jamiescottcraik
- [ ] Constitution compliance verified
- [ ] brAInwav branding consistently applied throughout
- [ ] Accessibility audit passed (WCAG 2.2 AA)
- [ ] Documentation complete and accurate
- [ ] Developer feedback positive on unified experience
- [ ] No breaking changes to existing PRP Runner or Task Management usage

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| State machine complexity leads to bugs | High | Medium | Extensive property-based testing, formal verification of transitions |
| Dashboard performance issues with many workflows | Medium | Medium | Implement pagination, lazy loading, and caching |
| Breaking changes to existing workflows | High | Low | Maintain backward compatibility, provide migration guide |
| WebSocket connection reliability | Medium | Medium | Implement fallback to polling, connection retry logic |
| Enforcement profile conflicts in multi-user scenarios | Medium | High | Git-based versioning, conflict detection and resolution UI |
| CLI UX too complex for new users | Medium | High | Comprehensive help text, examples, interactive prompts |
| Long-running workflows timeout or fail | High | Medium | Checkpointing, resumption logic, retry mechanisms |
| Approval system not integrated with existing auth | Medium | Low | Phase 1 uses manual approval (console prompt), Phase 2+ integrates auth |

---

## Open Questions

1. **Approval System Integration**: Should Phase 2 integrate with existing brAInwav auth system, or use simple console prompts?
   - **Decision needed by**: Week 2 of implementation
   - **Options**: 
     - Simple console prompts (faster, less secure)
     - OAuth integration (slower, more secure)
     - Hybrid: console for local, OAuth for dashboard
   - **Impact**: Affects dashboard implementation timeline

2. **Workflow State Storage**: SQLite local file or remote database?
   - **Decision needed by**: Week 1
   - **Options**:
     - SQLite local (simpler, no dependencies)
     - PostgreSQL remote (better for multi-user, requires infra)
   - **Impact**: Multi-user collaboration capability

3. **Dashboard Hosting**: Embedded server or separate deployment?
   - **Decision needed by**: Week 3
   - **Options**:
     - Embedded in CLI (simple, port conflicts possible)
     - Separate service (complex, better for teams)
   - **Impact**: Deployment and maintenance overhead

4. **Backward Compatibility**: Support existing cortex-task and prp-runner CLIs?
   - **Decision needed by**: Week 1
   - **Options**:
     - Deprecate old CLIs immediately
     - Maintain both for 1-2 releases
     - Keep both indefinitely
   - **Impact**: Maintenance burden and migration effort

5. **Evidence Storage**: File system or database?
   - **Decision needed by**: Week 2
   - **Options**:
     - File system (tasks/ directory, current approach)
     - Database BLOBs (centralized, queryable)
     - Hybrid (metadata in DB, files on disk)
   - **Impact**: Evidence querying and dashboard performance

---

## Compliance Checklist

- [ ] Follows brAInwav Constitution principles
- [ ] Adheres to CODESTYLE.md standards (≤40 lines, named exports, async/await)
- [ ] RULES_OF_AI.md ethical guidelines respected
- [ ] No mock production claims (no Math.random(), no fake data)
- [ ] brAInwav branding included throughout (CLI, dashboard, profiles, memory)
- [ ] WCAG 2.2 AA accessibility requirements met (dashboard)
- [ ] Security requirements satisfied (no secrets, auth for approvals)
- [ ] Test-driven development approach (tests written first)
- [ ] **Local memory integration implemented** (workflow insights, decisions, patterns)
- [ ] Evidence trail complete and auditable
- [ ] Environment variables documented (`LOCAL_MEMORY_BASE_URL`, `MEMORIES_SHORT_STORE`, etc.)

---

## Appendix

### References
- [PRP Task Integration Roadmap](../PRP_TASK_INTEGRATION_ROADMAP.md)
- [Phase 1 Implementation Summary](../tasks/prp-runner-task-management-integration-phase1-complete.md)
- [Original Analysis](../tasks/task-management-prp-runner-integration-CORRECTED.md)
- [Workflow Common Package](../packages/workflow-common/README.md)
- [Task Management Guide](../.cortex/docs/task-management-guide.md)

### Glossary
- **PRP**: Product Requirement Prompt - quality gate system (G0-G7)
- **Task Management**: Development workflow system (Phases 0-5)
- **Enforcement Profile**: YAML file defining quality standards (coverage, performance, security, accessibility)
- **Gate**: PRP quality checkpoint requiring automated checks + optional human approval
- **Phase**: Task management development stage (Init, Research, Planning, Implementation, Verification, Archive)
- **Evidence**: Artifacts proving quality requirements met (test results, coverage reports, etc.)
- **MCP**: Model Context Protocol
- **A2A**: Agent-to-Agent communication
- **WCAG**: Web Content Accessibility Guidelines

---

**Version**: 1.0  
**Last Updated**: 2025-01-09  
**Maintained by**: brAInwav Development Team

Co-authored-by: brAInwav Development Team
