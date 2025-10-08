# Governance & Package Documentation Updates

**Date**: 2025-10-08  
**Task**: Update AGENTS.md, RULES_OF_AI.md, CODESTYLE.md, agent-toolkit, and tdd-coach  
**Status**: Complete ✅

---

## Overview

Updated all governance documents and package documentation to reflect the enhanced task management system with priority-driven development, independent testability, and CLI automation.

---

## Files Updated

### 1. AGENTS.md

**Section Added**: "Task Management Workflow"

**Key Changes**:
- Added comprehensive task management workflow section
- Documented priority levels (P0-P3)
- Explained 7-phase workflow
- Added independent testability requirements
- Referenced CLI commands and templates
- Linked to complete documentation

**Content Added**:
```markdown
## Task Management Workflow

### Task Initialization
- CLI Command: pnpm cortex-task init "Feature Name" --priority P1
- Automated: Creates git branch, spec, and research documents
- Templates: Uses .cortex/templates/ for consistent structure

### Priority Levels
- P0 (Critical): Blocking issues, security vulnerabilities
- P1 (High): Core MVP functionality
- P2 (Medium): Important enhancements
- P3 (Low): Nice-to-haves

### Workflow Phases (7 phases documented)
### Independent Testability Requirement
### Documentation References
```

---

### 2. .cortex/rules/RULES_OF_AI.md

**Section Updated**: "🔄 Mandatory Agentic Coding Workflow"

**Key Changes**:
- Added "Enhanced Task Management (NEW)" subsection
- Documented CLI automation commands
- Added template descriptions
- Emphasized priority-driven and independent testability
- Referenced complete workflow guide

**Content Added**:
```markdown
### Enhanced Task Management (NEW)

**CLI Automation Available**: Use pnpm cortex-task for streamlined workflow

# Commands documented with examples
# Templates explained
# Priority levels defined
# Independent testability requirement
```

**Phase 0 Enhanced**:
- Added priority-driven development
- Added independent testability requirement
- Listed available templates with descriptions

---

### 3. CODESTYLE.md

**Sections Updated**: 
- Section 10 (TDD Coach)
- Section 11 (Automation & Agent-Toolkit)

**Key Changes**:

**TDD Coach Integration**:
- Added task management workflow integration notes
- Documented automated TDD planning
- Explained priority-aware test requirements

**Agent-Toolkit Integration**:
- Added new subsection "Task Management Workflow Integration"
- Documented CLI tool commands
- Explained template enforcement
- Listed priority-driven development requirements
- Specified quality gates

**Content Added**:
```markdown
### Task Management Workflow Integration

- CLI Tool: pnpm cortex-task automates workflow
  - init, plan, list, status commands
- Templates: .cortex/templates/ enforce brAInwav standards
- Priority-Driven: P0 (Critical) → P3 (Low)
- Independent Testability requirement
- Quality Gates: 90%+ coverage, security, structure
```

---

### 4. packages/agent-toolkit/README.md

**Section Added**: "Task Management Integration (NEW)"

**Key Changes**:
- Added comprehensive task management integration section
- Documented CLI commands for workflow
- Explained priority-driven development
- Listed template-based workflow capabilities
- Showed validation integration examples

**Content Added**:
```markdown
## Task Management Integration (NEW)

Agent Toolkit now integrates with the brAInwav task management workflow:

### CLI Commands
### Priority-Driven Development (P0-P3)
### Template-Based Workflow
### Validation Integration
```

**Integration Points**:
- CLI automation
- Priority validation
- Template compliance checking
- brAInwav branding verification

---

### 5. packages/tdd-coach/README.md

**Section Added**: "Task Management Integration (NEW)"

**Key Changes**:
- Added task management integration at top of README
- Documented automated TDD plan creation
- Explained priority-based TDD planning
- Showed template integration
- Listed workflow phases

**Content Added**:
```markdown
## Task Management Integration (NEW)

TDD Coach now integrates with the enhanced brAInwav task management workflow:

### Automated TDD Plan Creation
- pnpm cortex-task init + plan commands
- Creates comprehensive TDD plans with templates

### Priority-Based TDD Planning
- P0: Immediate coverage, security tests mandatory
- P1: Core functionality, integration tests required
- P2: Feature tests, comprehensive unit tests
- P3: Nice-to-have tests, edge case coverage

### Template Integration
- Works with .cortex/templates/tdd-plan-template.md
- Phase 1: RED (failing tests)
- Phase 2: GREEN (minimal implementation)
- Phase 3: REFACTOR (improve quality)

### Workflow Phases (4-step process)
```

---

## Cross-References Added

All updated documents now cross-reference:

### From AGENTS.md
- → `.cortex/docs/task-management-guide.md`
- → `.cortex/QUICKSTART-TASK-MANAGEMENT.md`
- → `.cortex/templates/`
- → `scripts/cortex-task.mjs`

### From RULES_OF_AI.md
- → `.cortex/docs/task-management-guide.md`
- → `.cortex/templates/`

### From CODESTYLE.md
- → `.cortex/docs/task-management-guide.md`
- → `.cortex/templates/`

### From agent-toolkit/README.md
- → `.cortex/docs/task-management-guide.md`
- → `.cortex/templates/`

### From tdd-coach/README.md
- → `.cortex/docs/task-management-guide.md`
- → `.cortex/templates/tdd-plan-template.md`

---

## Key Concepts Documented

All files now consistently document:

### 1. Priority Levels
- **P0 (Critical)**: Blocking, security, data loss
- **P1 (High)**: Core MVP, primary journeys
- **P2 (Medium)**: Enhancements, secondary features
- **P3 (Low)**: Nice-to-haves, optimizations

### 2. Independent Testability
- Each user story must deliver standalone value
- Stories can be implemented independently
- MVP principle: one story = viable product increment
- Clear acceptance criteria (Given-When-Then)

### 3. CLI Automation
- `pnpm cortex-task init "Feature" --priority P1`
- `pnpm cortex-task plan task-id`
- `pnpm cortex-task list`
- `pnpm cortex-task status task-id`

### 4. Templates
- Constitution (governance principles)
- Feature Spec (prioritized user stories)
- Research (technical investigation)
- TDD Plan (Red-Green-Refactor workflow)

### 5. Workflow Phases
1. Task Initialization
2. Research
3. Specification
4. Planning
5. Implementation
6. Verification
7. Archive

### 6. Quality Gates
- 90%+ test coverage
- Security scanning
- Structure validation
- brAInwav branding
- WCAG 2.2 AA accessibility

---

## Integration Points

### Agent Toolkit Integration
- Validates code against templates
- Can check priority requirements
- Verifies independent testability
- Ensures brAInwav branding
- Enforces quality standards

### TDD Coach Integration
- Generates TDD plans from templates
- Priority-aware test requirements
- Red-Green-Refactor enforcement
- Quality gate validation
- Coverage tracking

### Workflow Integration
- AGENTS.md defines agent behavior
- RULES_OF_AI.md sets governance
- CODESTYLE.md enforces standards
- agent-toolkit validates compliance
- tdd-coach ensures quality

---

## Documentation Hierarchy

```
Governance Documents
├── AGENTS.md (agent behavior, workflow)
│   └── References: task-management-guide.md, templates
├── .cortex/rules/RULES_OF_AI.md (AI governance)
│   └── References: task-management-guide.md, templates
└── CODESTYLE.md (coding standards)
    └── References: task-management-guide.md, templates

Package Documentation
├── packages/agent-toolkit/README.md
│   └── Integration: CLI, templates, validation
└── packages/tdd-coach/README.md
    └── Integration: TDD plans, priorities, templates
```

---

## Benefits

### For Developers
- Clear workflow documented in all governance files
- Consistent priority system across all docs
- Automated workflow reduces manual setup
- Templates ensure quality and compliance

### For AI Agents
- Comprehensive workflow in AGENTS.md and RULES_OF_AI.md
- Clear CLI commands for automation
- Template references for generation
- Validation requirements explicit

### For Tools
- agent-toolkit can validate against templates
- tdd-coach generates compliant TDD plans
- Integration points clearly defined
- Quality gates consistently enforced

### For Governance
- All standards in one place
- Cross-referenced documentation
- Enforcement mechanisms clear
- brAInwav compliance throughout

---

## Compliance Checklist

- [x] AGENTS.md updated with workflow section
- [x] RULES_OF_AI.md updated with CLI automation
- [x] CODESTYLE.md updated with task management integration
- [x] agent-toolkit README updated with integration
- [x] tdd-coach README updated with automation
- [x] All files cross-reference task management docs
- [x] Priority levels consistently documented (P0-P3)
- [x] Independent testability requirement explained
- [x] CLI commands documented in all relevant files
- [x] Templates referenced with descriptions
- [x] brAInwav branding maintained throughout
- [x] Quality gates consistently specified

---

## Next Steps

### Immediate
- ✅ All governance documents updated
- ✅ All package documentation updated
- ⏳ Team review of changes
- ⏳ Update onboarding materials

### Short-term
- Create examples using the workflow
- Record workflow demonstration
- Update training materials
- Validate with real feature development

### Long-term
- Monitor adoption and effectiveness
- Gather feedback for improvements
- Refine templates based on usage
- Expand automation capabilities

---

## Statistics

**Files Updated**: 5
- Governance: 3 (AGENTS.md, RULES_OF_AI.md, CODESTYLE.md)
- Packages: 2 (agent-toolkit, tdd-coach)

**Content Added**: ~3KB total
- AGENTS.md: ~1KB
- RULES_OF_AI.md: ~500 bytes
- CODESTYLE.md: ~800 bytes
- agent-toolkit: ~400 bytes
- tdd-coach: ~600 bytes

**Cross-References**: 10+
**Key Concepts**: 6 (Priority, Testability, CLI, Templates, Phases, Gates)
**Commands Documented**: 4 CLI commands

---

## Validation

All changes:
- ✅ Follow existing document structure
- ✅ Use consistent formatting
- ✅ Include brAInwav branding
- ✅ Cross-reference appropriately
- ✅ Maintain technical accuracy
- ✅ Preserve existing content
- ✅ Add value without duplication

---

**Status**: Complete and Ready for Use ✅  
**Next Action**: Team review and approval

Co-authored-by: brAInwav Development Team
