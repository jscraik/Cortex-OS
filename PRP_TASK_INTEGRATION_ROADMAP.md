# PRP Runner ↔ Task Management Integration Roadmap

**Version**: 1.0.0  
**Last Updated**: 2025-01-09  
**Maintained by**: brAInwav Development Team

---

## 🎯 Vision

Combine PRP Runner's quality gate enforcement (G0-G7) with Task Management's development workflow guidance (Phases 0-5) to create a comprehensive, production-ready development system ensuring quality from ideation through deployment.

---

## 📊 Integration Phases Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    INTEGRATION ROADMAP                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ Phase 1: SHORT-TERM (Alignment) - COMPLETE              │
│     • Shared validation package                            │
│     • Template alignment with PRP budgets                  │
│     • Evidence cross-referencing                           │
│     • Integration adapters                                 │
│                                                             │
│  ⏳ Phase 2: MEDIUM-TERM (Integration) - PLANNED            │
│     • Unified CLI (cortex-workflow)                        │
│     • Shared enforcement profile                           │
│     • Evidence dashboard                                   │
│     • Automatic gate→phase transitions                     │
│                                                             │
│  🔮 Phase 3: LONG-TERM (Unification) - FUTURE               │
│     • Formalized task-management package                   │
│     • Workflow orchestration engine                        │
│     • AI-assisted workflow execution                       │
│     • Plugin system for custom gates/phases                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Phase 1: Short-term (Alignment) - COMPLETE

**Status**: ✅ **IMPLEMENTED**  
**Completion Date**: 2025-01-30

### Goals
- Eliminate duplicate validation logic
- Create single source of truth for quality standards
- Enable evidence cross-referencing between systems
- Align template requirements with PRP budgets

### Deliverables

#### 1. Shared Validation Package (`@cortex-os/workflow-common`)
**Location**: `packages/workflow-common/`

**Features**:
- ✅ Coverage validation (`validateCoverage()`)
- ✅ Performance validation (`validatePerformance()`)
- ✅ Security validation (`validateSecurity()`)
- ✅ Accessibility validation (`validateAccessibility()`)
- ✅ Evidence tracking structures
- ✅ 100% test coverage
- ✅ brAInwav branding throughout

**Usage**:
```typescript
import { 
  validateCoverage, 
  validatePerformance,
  validateSecurity,
  validateAccessibility 
} from '@cortex-os/workflow-common';

// Used by PRP G4 Verification Gate
const coverageResult = validateCoverage(actualCoverage, requiredCoverage);

// Used by Task Management Phase 4 Verification
const securityResult = validateSecurity(vulnerabilities, requirements);
```

#### 2. Integration Adapters
**Location**: `packages/prp-runner/src/integrations/task-management-adapter.ts`

**Functions**:
- ✅ `blueprintToConstitution()` - Converts PRP G0 blueprint → Task constitution
- ✅ `enforcementProfileToQualityRequirements()` - Maps profile → quality gates
- ✅ `extractCoverageRequirements()` - Extract coverage from profile
- ✅ `extractPerformanceBudget()` - Extract performance from profile
- ✅ `extractAccessibilityRequirements()` - Extract a11y from profile
- ✅ `getDefaultSecurityRequirements()` - brAInwav security standards

#### 3. Updated Templates
**Location**: `.cortex/templates/`

**Changes**:
- ✅ `tdd-plan-template.md` - Added "PRP Gate Alignment" section
- ✅ References enforcement profile budgets
- ✅ Cross-references to specific PRP gates (G2, G4, G6)
- ✅ Success criteria aligned with gate requirements

#### 4. Evidence Tracking
**Structure**:
```typescript
interface EvidenceIndex {
  entries: Array<{
    gateId: 'G0' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7';
    taskPhase: 0 | 1 | 2 | 3 | 4 | 5;
    evidenceIds: string[];
    artifacts: string[];
    timestamp: string;
  }>;
}
```

### Benefits Achieved
- ✅ **Code Reuse**: ~200 lines of duplicate validation logic eliminated
- ✅ **Consistency**: 100% identical validation across both systems
- ✅ **Quality**: Single source of truth for brAInwav standards
- ✅ **Traceability**: Cross-referenced evidence between gates and phases

### Metrics
- **Test Coverage**: 100% for shared validation
- **Branding**: "brAInwav" in all outputs
- **Documentation**: Comprehensive inline and package docs
- **Type Safety**: Full TypeScript coverage

---

## ⏳ Phase 2: Medium-term (Integration) - PLANNED

**Status**: 🔜 **NOT YET STARTED**  
**Target**: Q2 2025 (Estimated)

### Goals
- Create unified developer experience
- Automate gate→phase transitions
- Visualize workflow progress
- Enable profile-driven template generation

### Planned Deliverables

#### 1. Unified CLI (`cortex-workflow`)

**Command Structure**:
```bash
# Initialize feature with both PRP and Task Management
pnpm cortex-workflow init "Feature Name" --priority P1

# What it does:
# 1. Creates PRP blueprint (G0)
# 2. Requests product owner approval
# 3. Auto-creates task constitution from blueprint
# 4. Initializes git branch
# 5. Sets up both PRP state and task tracking

# Run complete workflow
pnpm cortex-workflow run feature-name

# Executes:
# G0: Ideation → Blueprint validation → Product owner approval
# Phase 0-1: Init → Constitution creation, research setup
# G1: Architecture → Policy check → Architect approval
# Phase 1: Research → Investigation with policy constraints
# G2: Test Plan → Budget validation → QA lead approval
# Phase 2: Planning → TDD plan with aligned budgets
# Phase 3: Implementation → RED-GREEN-REFACTOR
# G3: Code Review → Automated checks → Peer review
# G4: Verification → Coverage/security/perf validation
# Phase 4: Verification → Quality gates
# G5: Triage → Issue management
# G6: Release Readiness → Pre-deployment checks
# Phase 5: Archive → Documentation updates
# G7: Release → Deployment approval
```

**Architecture**:
```typescript
// packages/workflow-orchestrator/src/unified-cli.ts

interface WorkflowStep {
  id: string;
  type: 'gate' | 'phase';
  execute: () => Promise<StepResult>;
  onSuccess?: string[];  // Next step IDs
  onFailure?: string[];  // Fallback step IDs
}

class UnifiedWorkflow {
  async run(featureName: string, options: WorkflowOptions) {
    // Orchestrates both PRP gates and task phases
    // Automatic transitions based on gate approvals
    // Progress tracking and evidence collection
  }
}
```

#### 2. Shared Enforcement Profile

**Concept**:
- Single `enforcement-profile.yml` file drives both systems
- Task templates auto-populate from profile
- Profile changes automatically update all affected workflows

**Example Profile**:
```yaml
# enforcement-profile.yml
branding: brAInwav
version: 1.0.0

budgets:
  coverage:
    lines: 95
    branches: 95
    functions: 95
    statements: 95
  performance:
    lcp: 2500  # ms
    tbt: 300   # ms
    fcp: 1800  # ms
    tti: 3800  # ms
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
    packageBoundaries: true
    namingConventions:
      - kebab-case for files
      - camelCase for variables
      - PascalCase for types
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
  G3: code-reviewer
  G6: release-manager
  G7: release-manager
```

**CLI Commands**:
```bash
# View current profile
pnpm cortex-workflow profile show

# Update profile budgets
pnpm cortex-workflow profile set coverage.lines 98

# Validate profile
pnpm cortex-workflow profile validate

# Apply profile to existing tasks
pnpm cortex-workflow profile apply --all
```

#### 3. Evidence Dashboard

**Web UI Concept**:
```
┌─────────────────────────────────────────────────────────┐
│  brAInwav Workflow Dashboard - Feature: OAuth 2.1       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  STRATEGY PHASE                                         │
│  ┌─────────────┬─────────────┬─────────────┐          │
│  │ G0: Ideation│ Phase 0: Init│ Phase 1: Res│          │
│  │     ✅      │      ✅      │      ✅     │          │
│  └─────────────┴─────────────┴─────────────┘          │
│                                                         │
│  BUILD PHASE                                            │
│  ┌─────────────┬─────────────┬─────────────┐          │
│  │G1: Architect│ G2: TestPlan│ Phase 2: Plan│          │
│  │     ✅      │      ✅      │      ✅     │          │
│  └─────────────┴─────────────┴─────────────┘          │
│  ┌─────────────┬─────────────┐                         │
│  │Phase 3: Impl│ G3: CodeRev │                         │
│  │     🔄      │      ⏳     │                         │
│  └─────────────┴─────────────┘                         │
│                                                         │
│  RELEASE PHASE                                          │
│  ┌─────────────┬─────────────┬─────────────┐          │
│  │G4: Verify   │ Phase 4: Ver│ G5: Triage  │          │
│  │     ⏳      │      ⏳     │      ⏳     │          │
│  └─────────────┴─────────────┴─────────────┘          │
│  ┌─────────────┬─────────────┬─────────────┐          │
│  │G6: Release  │ Phase 5: Arc│ G7: Release │          │
│  │  Readiness  │   hive      │             │          │
│  │     ○       │      ○      │      ○      │          │
│  └─────────────┴─────────────┴─────────────┘          │
│                                                         │
│  QUALITY METRICS                                        │
│  Coverage: 96% ✅  Performance: LCP 2.1s ✅             │
│  Security: 0 Critical ✅  A11y: 92/100 ✅               │
│                                                         │
│  EVIDENCE TRAIL (12 artifacts)                          │
│  • G0 Blueprint Validation                              │
│  • Phase 0 Constitution                                 │
│  • Phase 1 Research Document                            │
│  • ... [view all]                                       │
└─────────────────────────────────────────────────────────┘
```

**Features**:
- Real-time workflow progress visualization
- Quality metrics from both systems
- Evidence artifact browser
- Gate approval status
- Phase completion indicators
- Timeline view of workflow execution

**Technical Stack**:
```typescript
// packages/workflow-dashboard/src/
// - React + TypeScript UI
// - WebSocket for real-time updates
// - Integration with workflow-common
// - Evidence indexing and search
```

### Benefits Expected
- 🎯 **Unified UX**: Single command for complete workflow
- ⚡ **Automation**: Gate approvals trigger phase transitions
- 📊 **Visibility**: Real-time progress and quality metrics
- 🔄 **Consistency**: Profile-driven template generation

### Technical Requirements
- [ ] Create `packages/workflow-orchestrator` package
- [ ] Implement CLI with Commander.js or Yargs
- [ ] Build workflow state machine
- [ ] Create enforcement profile schema (Zod)
- [ ] Implement dashboard React app
- [ ] WebSocket integration for real-time updates
- [ ] Update all documentation

---

## 🔮 Phase 3: Long-term (Unification) - FUTURE

**Status**: 💡 **CONCEPTUAL**  
**Target**: Q3-Q4 2025 (Estimated)

### Goals
- Complete architectural unification
- Enable extensibility and customization
- AI-assisted workflow execution
- Industry-standard workflow engine

### Planned Deliverables

#### 1. Formalized Task Management Package

**Migration**:
```bash
# Move from:
scripts/cortex-task.mjs

# To:
packages/task-management/
├── src/
│   ├── cli/              # CLI commands
│   ├── templates/        # Template management
│   ├── validators/       # Template validation
│   ├── integrations/     # PRP integration
│   └── index.ts          # Public API
├── tests/
├── package.json
└── README.md
```

**API**:
```typescript
// Programmatic API (not just CLI)
import { TaskManager } from '@cortex-os/task-management';

const manager = new TaskManager({
  templatesDir: '.cortex/templates',
  tasksDir: 'tasks',
  enforcementProfile: './enforcement-profile.yml'
});

await manager.init('Feature Name', { priority: 'P1' });
await manager.research('feature-name');
await manager.plan('feature-name');
await manager.verify('feature-name');
```

**Benefits**:
- Proper Nx integration
- Unit testable
- Reusable in other tools
- Versioned releases

#### 2. Workflow Orchestration Engine

**Generic Engine Concept**:
```typescript
// packages/workflow-engine/src/

interface WorkflowDefinition {
  id: string;
  name: string;
  steps: WorkflowStep[];
  transitions: TransitionRule[];
  variables: Record<string, unknown>;
}

interface WorkflowStep {
  id: string;
  name: string;
  type: 'automated' | 'manual' | 'approval';
  executor: StepExecutor;
  validators?: Validator[];
  evidence?: EvidenceCollector;
}

interface TransitionRule {
  from: string;
  to: string;
  condition?: (context: WorkflowContext) => boolean;
  actions?: Action[];
}

class WorkflowEngine {
  async execute(definition: WorkflowDefinition): Promise<WorkflowResult> {
    // Generic execution engine
    // State machine implementation
    // Event emission for observability
    // Persistence and recovery
  }
}
```

**Workflow Definitions**:
```yaml
# workflows/brainwav-feature-workflow.yml
id: brainwav-feature
name: brAInwav Feature Development Workflow
version: 1.0.0

steps:
  - id: g0
    name: G0 Ideation
    type: approval
    executor: prp-runner/g0-ideation
    approver: product-owner
    
  - id: phase0
    name: Phase 0 Task Init
    type: automated
    executor: task-management/init
    
  - id: g1
    name: G1 Architecture
    type: approval
    executor: prp-runner/g1-architecture
    approver: architect
    
  # ... etc

transitions:
  - from: g0
    to: phase0
    condition: gate.status === 'approved'
    
  - from: phase0
    to: g1
    condition: task.constitution.exists
    
  # ... etc
```

**Plugin System**:
```typescript
// Custom gate plugin
export class CustomSecurityGate implements GatePlugin {
  id = 'custom-security';
  name = 'Custom Security Gate';
  
  async execute(context: GateContext): Promise<GateResult> {
    // Custom security checks
  }
}

// Register plugin
engine.registerGate(new CustomSecurityGate());
```

**Benefits**:
- Company-specific workflow adaptations
- Industry-standard practices
- Extensible architecture
- Configuration-driven workflows

#### 3. AI-Assisted Workflow Execution

**ASBR Agent Integration**:
```typescript
// packages/workflow-ai-assistant/src/

interface WorkflowAssistant {
  // Analyze current workflow state
  analyzeProgress(workflowId: string): Promise<ProgressAnalysis>;
  
  // Suggest next actions
  suggestNextSteps(workflowId: string): Promise<Suggestion[]>;
  
  // Automated evidence collection
  collectEvidence(stepId: string): Promise<Evidence[]>;
  
  // Intelligent gate approval
  recommendApproval(gateId: string): Promise<ApprovalRecommendation>;
  
  // Generate documentation
  generateDocumentation(workflowId: string): Promise<Documentation>;
}
```

**Use Cases**:

1. **Automated Evidence Collection**
```typescript
// AI agent automatically gathers evidence during workflow
const agent = new WorkflowAssistant();

// During G4 Verification
const evidence = await agent.collectEvidence('g4-verification');
// Returns: test results, coverage reports, security scans, etc.
```

2. **Intelligent Gate Approval Suggestions**
```typescript
// AI analyzes all automated checks and provides recommendation
const recommendation = await agent.recommendApproval('g2-test-plan');

console.log(recommendation);
// {
//   decision: 'approve',
//   confidence: 0.95,
//   rationale: 'All automated checks passed. Coverage targets met (96/95). Performance budgets satisfied. Test categories complete.',
//   concerns: [],
//   evidence: [...]
// }
```

3. **Progress Analysis**
```typescript
// AI provides insights on workflow health
const analysis = await agent.analyzeProgress('oauth-feature');

console.log(analysis);
// {
//   status: 'on-track',
//   completionPercentage: 65,
//   estimatedTimeRemaining: '2 days',
//   blockers: [],
//   recommendations: [
//     'Consider scheduling G6 release readiness review',
//     'Update CHANGELOG.md in preparation for Phase 5'
//   ]
// }
```

4. **Automated Documentation**
```typescript
// AI generates comprehensive documentation from workflow evidence
const docs = await agent.generateDocumentation('oauth-feature');

// Generates:
// - Implementation summary
// - Decision log
// - Quality metrics report
// - Evidence index
// - Release notes draft
```

**AI Models Integration**:
- Use LangGraph for workflow analysis
- Integration with brAInwav memory system
- Context from all gates and phases
- Learning from historical workflows

**Benefits**:
- Reduced cognitive load on developers
- Faster approval decisions
- Automated documentation generation
- Workflow optimization insights
- Historical pattern learning

### Technical Requirements
- [ ] Migrate cortex-task to proper package
- [ ] Design generic workflow engine
- [ ] Implement plugin system
- [ ] Create workflow definition schema
- [ ] Integrate ASBR agents
- [ ] Build AI recommendation system
- [ ] Training data collection
- [ ] Extensive testing and validation

---

## 📈 Success Metrics

### Phase 1 (Achieved)
- ✅ **Code Duplication**: Reduced by ~200 lines
- ✅ **Validation Consistency**: 100% identical across systems
- ✅ **Test Coverage**: 100% for shared validators
- ✅ **Developer Satisfaction**: Template alignment complete

### Phase 2 (Targets)
- 🎯 **Time to Init**: <30 seconds for complete workflow setup
- 🎯 **Automation**: 80% of gate→phase transitions automated
- 🎯 **Visibility**: Real-time dashboard for all active workflows
- 🎯 **Profile Adoption**: 100% of templates driven by profile

### Phase 3 (Aspirational)
- 🌟 **Extensibility**: 5+ custom gate plugins created
- 🌟 **AI Accuracy**: 90%+ approval recommendation accuracy
- 🌟 **Documentation**: 100% automated evidence documentation
- 🌟 **Adoption**: Industry-wide workflow standard

---

## 🛣️ Implementation Timeline

```
2025 Q1: ✅ Phase 1 Complete
├── Jan: Shared validation package
├── Jan: Integration adapters
└── Jan: Template updates

2025 Q2: ⏳ Phase 2 Planned
├── Feb-Mar: Unified CLI design & implementation
├── Mar-Apr: Shared enforcement profile system
└── Apr-May: Evidence dashboard (MVP)

2025 Q3-Q4: 🔮 Phase 3 Conceptual
├── Jun-Jul: Task management package formalization
├── Aug-Sep: Workflow orchestration engine
└── Oct-Dec: AI-assisted workflow (beta)

2026 Q1: 🚀 Full Integration
└── Production-ready unified system
```

---

## 💡 Decision Points

### Should We Proceed with Phase 2?

**Pros**:
- ✅ Unified developer experience
- ✅ Reduced context switching
- ✅ Automated workflows
- ✅ Better visibility
- ✅ Profile-driven consistency

**Cons**:
- ⚠️ Significant development effort (~6-8 weeks)
- ⚠️ Learning curve for unified CLI
- ⚠️ Migration effort for existing workflows
- ⚠️ Maintenance of larger system

**Questions to Consider**:
1. Is the current dual-system approach working well enough?
2. How many developers would benefit from unified workflow?
3. What's the priority vs. other roadmap items?
4. Do we have resources for dashboard development?
5. Is AI-assisted workflow (Phase 3) a priority?

### Alternative Approaches

**Option A: Minimal Integration (Status Quo)**
- Keep Phase 1 only
- Maintain separate CLIs
- Manual coordination between systems
- **Effort**: 0 (already done)

**Option B: Phase 2 without Dashboard**
- Unified CLI only
- Shared enforcement profile
- No visual dashboard
- **Effort**: ~4 weeks

**Option C: Full Phase 2**
- Everything as planned
- **Effort**: ~8 weeks

**Option D: Skip to Phase 3**
- Formalize packages first
- Build proper architecture
- Add CLI/dashboard later
- **Effort**: ~12 weeks

---

## 📚 References

- **Phase 1 Implementation**: `tasks/prp-runner-task-management-integration-phase1-complete.md`
- **Original Analysis**: `tasks/task-management-prp-runner-integration-CORRECTED.md`
- **Workflow Common Package**: `packages/workflow-common/README.md`
- **PRP Runner**: `packages/prp-runner/README.md`
- **Task Management Guide**: `.cortex/docs/task-management-guide.md`

---

## 🤝 Contributing

If implementing Phase 2 or 3:

1. Create implementation TDD plan
2. Get stakeholder approval
3. Follow brAInwav standards
4. Maintain 95%+ test coverage
5. Update all documentation
6. Create evidence trail

---

**Maintained by**: brAInwav Development Team  
**Co-authored-by**: brAInwav Development Team  
**Status**: Living Document - Updated as phases progress
