# Task Management System ↔ PRP Runner Integration (CORRECTED)

**Date**: 2025-10-08  
**Status**: Analysis Complete  
**Correction**: PRP = Product Requirement Prompt (not Prompt-Response Processing)

---

## Executive Summary

**CORRECTED UNDERSTANDING**: PRP Runner is a **Product Requirement Prompt** execution system with quality gates (G0-G7) that govern the software development lifecycle. The task management system and PRP Runner are **parallel but complementary** systems that both guide development workflows through structured phases.

---

## What is PRP Runner? (CORRECTED)

### PRP = Product Requirement Prompt

**PRP Runner** is a quality gate orchestration system that enforces governance throughout the SDLC:

```
G0: Ideation & Scope          → Product owner confirmation
G1: Architecture & Spec       → Architect approval, policy alignment  
G2: Test Plan                 → QA lead approval, coverage/perf/a11y
G3: Code Review               → Peer review, automated checks
G4: Verification              → Test execution, coverage validation
G5: Triage                    → Bug prioritization, issue management
G6: Release Readiness         → Pre-deployment validation
G7: Release                   → Deployment approval, rollback plan
```

### Key Components

**Gates (G0-G7)**:
- Each gate has automated checks and human approval specs
- Evidence-based validation (validation, test-result, review, benchmark)
- Enforcement profile defines policies (architecture, governance, budgets)

**Blueprint**:
- Product requirement definition
- Title, description, requirements
- Measurable outcomes

**Enforcement Profile**:
- Architecture policies (package boundaries, naming conventions)
- Governance rules (required checks: test, lint, type-check)
- Budget constraints (coverage, performance, accessibility)

---

## Task Management ↔ PRP Runner: The Real Relationship

### **They Are Parallel Development Workflow Systems**

Both systems guide development through structured phases with quality enforcement:

```
┌─────────────────────────────────────────────────────────────┐
│                    Development Workflows                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PRP RUNNER (Product Requirement Prompt Gates)              │
│  ┌──────────────────────────────────────────────────┐      │
│  │ G0: Ideation → Blueprint validation              │      │
│  │ G1: Architecture → Policy alignment              │      │
│  │ G2: Test Plan → Coverage/perf targets            │      │
│  │ G3: Code Review → Peer review                    │      │
│  │ G4: Verification → Test execution                │      │
│  │ G5: Triage → Issue management                    │      │
│  │ G6: Release Readiness → Pre-deploy checks        │      │
│  │ G7: Release → Deployment approval                │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
│  TASK MANAGEMENT (Feature Development Workflow)             │
│  ┌──────────────────────────────────────────────────┐      │
│  │ Phase 0: Init → Create spec, research, branch    │      │
│  │ Phase 1: Research → Investigation, analysis      │      │
│  │ Phase 2: Planning → TDD plan creation            │      │
│  │ Phase 3: Implementation → RED-GREEN-REFACTOR     │      │
│  │ Phase 4: Verification → Quality gates            │      │
│  │ Phase 5: Archive → Documentation, CHANGELOG      │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Key Differences**

| Aspect | PRP Runner (Gates) | Task Management |
|--------|-------------------|-----------------|
| **Primary Focus** | Quality gate enforcement | Development workflow guidance |
| **Phases** | 8 gates (G0-G7) | 6 phases (0-5) |
| **Validation** | Automated checks + human approval | Template-based + TDD Coach |
| **Evidence** | Evidence artifacts per gate | Research docs, TDD plans |
| **Approvals** | Product owner, architect, QA lead | Self-directed with quality gates |
| **Scope** | Full SDLC (ideation → release) | Feature development (research → deploy) |
| **Enforcement** | Enforcement profile (policies) | Templates + governance docs |

### **Key Similarities**

Both systems:
- ✅ Enforce structured workflows
- ✅ Require evidence/documentation
- ✅ Validate quality at each phase
- ✅ Support automated checks
- ✅ Integrate with governance layer
- ✅ Ensure production readiness

---

## Integration Opportunities

### 1. **Task Management Templates ↔ PRP Gates**

PRP Runner gates can inform task management templates:

```typescript
// PRP G0 (Ideation) → Task Management Constitution Template
G0 Blueprint:
  - Title: [Feature name]
  - Description: [What and why]
  - Requirements: [Measurable outcomes]
  
Maps to:
  Constitution Template:
    - Vision statement
    - Core principles
    - Success criteria

// PRP G1 (Architecture) → Task Management Research Template  
G1 Architecture Policy:
  - Package boundaries
  - Naming conventions
  - Import rules
  
Maps to:
  Research Template:
    - Architectural investigation
    - Pattern analysis
    - Boundary validation

// PRP G2 (Test Plan) → Task Management TDD Plan Template
G2 Test Plan:
  - Coverage targets (lines/branches)
  - Performance budgets (LCP/TBT)
  - A11y score requirements
  
Maps to:
  TDD Plan Template v2.0:
    - 95/95 coverage requirements
    - Performance SLOs
    - Accessibility testing (WCAG 2.2 AA)
```

### 2. **Automated Checks Alignment**

Both systems can share validation logic:

```typescript
// PRP Runner automated checks
class BlueprintValidationCheck implements AutomatedCheck {
  // Validates blueprint has title, description, requirements
}

// Task Management validation (via cortex-task CLI)
function validateConstitution(constitution: string) {
  // Validates constitution has vision, principles, success criteria
}

// Potential shared validation layer:
interface ValidationCheck {
  name: string;
  execute(context: Context): ValidationResult;
}

// Both systems use the same checks:
- Blueprint validation ≈ Constitution validation
- Architecture policy check ≈ Research boundary check
- Test plan validation ≈ TDD plan conformance check
```

### 3. **Evidence Collection**

PRP Runner's evidence model can enhance task management:

```typescript
// PRP Runner evidence types
type EvidenceType = 'validation' | 'test-result' | 'review' | 'benchmark';

interface Evidence {
  id: string;
  type: EvidenceType;
  source: string;
  content: string;
  timestamp: string;
  phase: 'strategy' | 'build' | 'release';
  commitSha: string;
}

// Task Management could adopt similar evidence tracking:
tasks/
  feature-name-spec.md          → Evidence: validation (strategy phase)
  feature-name.research.md      → Evidence: validation (strategy phase)
  feature-name-tdd-plan.md      → Evidence: test-result (build phase)
  feature-name-implementation/  → Evidence: review (build phase)
  feature-name-benchmark.json   → Evidence: benchmark (release phase)
```

### 4. **Quality Gate Integration**

Task management quality gates align with PRP gates:

```bash
# PRP Runner Gate Flow
G0: Ideation → Blueprint validated
G1: Architecture → Policy checked
G2: Test Plan → Coverage targets set
G3: Code Review → Peer reviewed
G4: Verification → Tests executed ✅
G5: Triage → Issues managed
G6: Release Readiness → Pre-deploy checked
G7: Release → Deployed

# Task Management Phase Flow
Phase 0: Init → Spec/research created
Phase 1: Research → Investigation complete
Phase 2: Planning → TDD plan created
Phase 3: Implementation → Code written (TDD)
Phase 4: Verification → Quality gates passed ✅
Phase 5: Archive → Documentation updated

# Integration point: Phase 4 ≈ G4
Both validate:
  - Test coverage (95/95 vs budgets.coverageLines/Branches)
  - Quality checks (lint, type-check, security)
  - Performance benchmarks
```

---

## Potential Unified Workflow

### Combining PRP Gates + Task Management

```
Feature Development Workflow (Combined):

┌─────────────────────────────────────────────────────────────┐
│ STRATEGY PHASE                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [PRP G0: Ideation]                                          │
│   → Blueprint validation                                    │
│   → Product owner approval                                  │
│                                                             │
│ [Task Mgmt Phase 0: Init]                                   │
│   → pnpm cortex-task init "Feature" --priority P1           │
│   → Creates: spec, research, git branch                     │
│                                                             │
│ [PRP G1: Architecture]                                      │
│   → Architecture policy check                               │
│   → Architect approval                                      │
│                                                             │
│ [Task Mgmt Phase 1: Research]                               │
│   → Investigate architecture patterns                       │
│   → Document findings in research.md                        │
│                                                             │
│ [PRP G2: Test Plan]                                         │
│   → Coverage targets validation                             │
│   → QA lead approval                                        │
│                                                             │
│ [Task Mgmt Phase 2: Planning]                               │
│   → pnpm cortex-task plan feature-name                      │
│   → TDD plan with 95/95 coverage (aligns with G2 budgets)  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ BUILD PHASE                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [Task Mgmt Phase 3: Implementation]                         │
│   → RED-GREEN-REFACTOR cycles                               │
│   → Write tests first, implement, refactor                  │
│                                                             │
│ [PRP G3: Code Review]                                       │
│   → Automated checks (lint, type-check)                     │
│   → Peer review                                             │
│                                                             │
│ [Task Mgmt Phase 4: Verification]                           │
│   → pnpm lint:smart && pnpm test:smart                      │
│   → Quality gates validation                                │
│                                                             │
│ [PRP G4: Verification]                                      │
│   → Test execution                                          │
│   → Coverage validation (vs G2 budgets)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ RELEASE PHASE                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [PRP G5: Triage]                                            │
│   → Issue prioritization                                    │
│   → Bug management                                          │
│                                                             │
│ [PRP G6: Release Readiness]                                 │
│   → Pre-deployment checks                                   │
│   → Performance validation                                  │
│   → Security scan                                           │
│                                                             │
│ [Task Mgmt Phase 5: Archive]                                │
│   → Update CHANGELOG.md                                     │
│   → Update README.md                                        │
│   → Archive TDD plan                                        │
│                                                             │
│ [PRP G7: Release]                                           │
│   → Deployment approval                                     │
│   → Rollback plan                                           │
│   → Production deployment                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Architectural Integration

### Current State

```
packages/
├── prp-runner/              # Quality gate orchestration (G0-G7)
│   ├── src/gates/           # Gate implementations
│   │   ├── g0-ideation.ts
│   │   ├── g1-architecture.ts
│   │   ├── g2-test-plan.ts
│   │   ├── g3-code-review.ts
│   │   ├── g4-verification.ts
│   │   ├── g5-triage.ts
│   │   ├── g6-release-readiness.ts
│   │   └── g7-release.ts
│   └── src/enforcement/     # Enforcement profiles
│
├── agent-toolkit/           # Development tools (used by both)
├── tdd-coach/               # Quality enforcement (used by both)
└── [other packages]

.cortex/
├── templates/               # Task management templates
│   ├── constitution-template.md
│   ├── feature-spec-template.md
│   ├── research-template.md
│   └── tdd-plan-template.md
└── rules/
    └── RULES_OF_AI.md

scripts/
└── cortex-task.mjs          # Task management CLI
```

### Potential Integration Architecture

```
packages/
├── prp-runner/              # PRP gate orchestration
│   ├── src/gates/           # G0-G7 implementations
│   └── src/integrations/    # NEW: Integration adapters
│       └── task-management-adapter.ts
│
├── task-management/         # NEW: Formalized package
│   ├── src/
│   │   ├── cli/             # cortex-task CLI
│   │   ├── templates/       # Move from .cortex/templates
│   │   ├── validators/      # Template validation
│   │   └── integrations/    
│   │       └── prp-gate-adapter.ts
│   └── package.json
│
└── workflow-common/         # NEW: Shared workflow primitives
    ├── src/
    │   ├── evidence.ts      # Shared evidence types
    │   ├── validation.ts    # Shared validation logic
    │   └── gates.ts         # Gate abstraction
    └── package.json
```

---

## Concrete Integration Examples

### Example 1: Shared Coverage Validation

```typescript
// workflow-common/src/validation.ts
export interface CoverageRequirements {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}

export function validateCoverage(
  actual: CoverageRequirements,
  required: CoverageRequirements
): ValidationResult {
  const failures = [];
  if (actual.lines < required.lines) failures.push('Line coverage insufficient');
  if (actual.branches < required.branches) failures.push('Branch coverage insufficient');
  // ...
  return { passed: failures.length === 0, failures };
}

// PRP G4 uses it:
import { validateCoverage } from '@cortex-os/workflow-common';

class CoverageValidationCheck implements AutomatedCheck {
  async execute(context: GateContext) {
    const result = validateCoverage(actual, {
      lines: context.enforcementProfile.budgets.coverageLines,
      branches: context.enforcementProfile.budgets.coverageBranches,
      // ...
    });
    return { status: result.passed ? 'pass' : 'fail', ... };
  }
}

// Task Management Phase 4 uses it:
import { validateCoverage } from '@cortex-os/workflow-common';

function verifyQualityGates() {
  const coverageReport = readCoverageReport();
  const result = validateCoverage(coverageReport, {
    lines: 95,
    branches: 95,
    functions: 95,
    statements: 95,
  });
  if (!result.passed) throw new Error(`Quality gate failed: ${result.failures}`);
}
```

### Example 2: Blueprint → Constitution Mapping

```typescript
// task-management/src/integrations/prp-gate-adapter.ts
export function blueprintToConstitution(blueprint: Blueprint): ConstitutionTemplate {
  return {
    vision: blueprint.description,
    principles: blueprint.requirements.map(req => ({
      statement: req,
      rationale: 'Derived from product requirement',
    })),
    successCriteria: blueprint.requirements.map(req => ({
      criterion: req,
      measurement: 'TBD - Define in research phase',
    })),
    branding: 'brAInwav',
  };
}

// Usage in cortex-task CLI:
import { blueprintToConstitution } from './integrations/prp-gate-adapter';

async function initTask(featureName: string, blueprint?: Blueprint) {
  let constitution;
  
  if (blueprint) {
    // If PRP G0 blueprint exists, use it to seed constitution
    constitution = blueprintToConstitution(blueprint);
  } else {
    // Otherwise use empty template
    constitution = loadConstitutionTemplate();
  }
  
  await writeFile('tasks/feature-constitution.md', constitution);
}
```

### Example 3: Evidence Tracking Integration

```typescript
// PRP Runner collects evidence at each gate
const g2Evidence = {
  id: nanoid(),
  type: 'validation',
  source: 'g2-test-plan',
  content: JSON.stringify({ coverageTargets, issues }),
  timestamp: new Date().toISOString(),
  phase: 'build',
  commitSha: context.repoInfo.commitSha,
};

// Task Management could reference PRP evidence:
// tasks/feature-name-tdd-plan.md

---
## Evidence Trail

- **PRP G2 Validation**: [Link to G2 evidence artifact]
  - Coverage targets validated: 95/95
  - Performance budgets set: LCP <2500ms, TBT <300ms
  - Accessibility score required: >90
  
- **Research Phase**: tasks/feature-name.research.md
  - Architectural investigation complete
  - Pattern analysis documented
  
- **TDD Plan Conformance**: Validated by tdd-coach
  - 14 test phases defined
  - Operational readiness rubric included
  - Quality gates specified
---
```

---

## Benefits of Integration

### 1. **Eliminate Redundancy**

**Currently**:
- PRP G2 validates coverage targets in enforcement profile
- Task Management TDD template specifies 95/95 coverage
- → Two separate definitions of the same requirement

**Integrated**:
- Single source of truth for coverage requirements
- PRP enforcement profile defines budgets
- Task Management templates reference PRP budgets
- → Consistent requirements across both systems

### 2. **Enhanced Traceability**

**Currently**:
- PRP evidence artifacts isolated
- Task management artifacts separate
- → Difficult to trace feature from ideation to deployment

**Integrated**:
- Unified evidence trail across gates and phases
- Each task references PRP gate approvals
- Each PRP gate links to task artifacts
- → Complete audit trail

### 3. **Automated Workflow Orchestration**

**Currently**:
- Manual coordination between PRP gates and task phases
- Developer tracks both workflows separately

**Integrated**:
```bash
# Single command drives both systems:
$ pnpm cortex-workflow run feature-name

Executes:
  1. PRP G0: Ideation (blueprint validation)
  2. Task Init (create spec/research from blueprint)
  3. PRP G1: Architecture (policy check)
  4. Task Research (investigate with policy constraints)
  5. PRP G2: Test Plan (coverage budgets)
  6. Task Planning (TDD plan with budgets)
  7. Task Implementation (RED-GREEN-REFACTOR)
  8. PRP G3: Code Review (automated checks)
  9. PRP G4: Verification (test execution)
  10. Task Verification (quality gates)
  11. PRP G5-G7: Release flow
  12. Task Archive (documentation)
```

### 4. **Consistent Quality Standards**

Both systems enforce the same standards:
- ✅ Coverage: 95/95 (lines/branches)
- ✅ Security: Zero Critical/High vulnerabilities
- ✅ Performance: Defined SLOs
- ✅ Accessibility: WCAG 2.2 AA
- ✅ Branding: brAInwav throughout

---

## Recommendations

### Short-term (Alignment)

1. **Align Template Requirements with PRP Budgets**
   - Update TDD plan template to reference PRP enforcement profile
   - Make coverage targets configurable from enforcement profile
   - Link architecture research to G1 policy checks

2. **Share Validation Logic**
   - Extract common validation into `@cortex-os/workflow-common`
   - Both systems use same coverage, performance, security validators
   - Reduce duplication, increase consistency

3. **Cross-Reference Evidence**
   - Task management artifacts link to PRP gate approvals
   - PRP evidence references task management docs
   - Create unified evidence index

### Medium-term (Integration)

1. **Unified CLI**
   - `pnpm cortex-workflow` combines both systems
   - Single command orchestrates PRP gates + task phases
   - Automatic gate approval triggers next task phase

2. **Shared Enforcement Profile**
   - Task management reads from PRP enforcement profile
   - Templates auto-populate from profile budgets
   - Changes to profile propagate to templates

3. **Evidence Dashboard**
   - Visual representation of workflow progress
   - Shows PRP gate status + task phase completion
   - Unified quality metrics

### Long-term (Unification)

1. **Formalize Task Management as Package**
   - Move from scripts/ to packages/task-management
   - Proper package with dependencies, tests, docs
   - Integrate with Nx build system

2. **Workflow Orchestration Engine**
   - Generic workflow engine supporting both PRP gates and task phases
   - Configurable workflows (company-specific adaptations)
   - Plugin system for custom gates/phases

3. **AI-Assisted Workflow**
   - Use ASBR agents to guide workflow execution
   - Automated evidence collection and analysis
   - Intelligent gate approval suggestions

---

## Conclusion

### Corrected Understanding

**PRP Runner** = Product Requirement Prompt quality gate system (G0-G7)  
**Task Management** = Feature development workflow system (Phases 0-5)

**Relationship**: Parallel, complementary systems that both guide development with quality enforcement

### Integration Opportunity

Strong alignment between:
- PRP G0 (Ideation) ↔ Task Phase 0-1 (Init, Research)
- PRP G1 (Architecture) ↔ Task Phase 1 (Research)
- PRP G2 (Test Plan) ↔ Task Phase 2 (Planning)
- PRP G3-G4 (Review, Verification) ↔ Task Phase 4 (Verification)
- PRP G5-G7 (Triage, Release) ↔ Task Phase 5 (Archive)

### Recommendation

**Integrate gradually**:
1. Start with shared validation logic (coverage, security)
2. Align template requirements with PRP budgets
3. Cross-reference evidence across systems
4. Eventually: Unified workflow orchestration CLI

**Value Proposition**:
> Combining PRP Runner's quality gate enforcement with Task Management's development workflow guidance creates a comprehensive, production-ready development system that ensures quality from ideation through deployment.

---

**Maintained by**: brAInwav Development Team  
**Version**: 2.0.0 (Corrected)  
**Date**: 2025-10-08

Co-authored-by: brAInwav Development Team
