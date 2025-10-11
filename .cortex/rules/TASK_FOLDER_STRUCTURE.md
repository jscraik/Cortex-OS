---
trigger: always_on
alwaysApply: true
---
# Task Folder Structure Guide

**Authoritative Reference for Task Organization**

All tasks must follow this standardized folder structure within `~/tasks/[feature-name]/`:

## Required Structure

```
~/tasks/
└── [feature-name]/              # Use descriptive slugs: copilot-enhancement, brainwav-integration
    ├── research.md              # Research findings, RAID analysis, feasibility studies
    ├── implementation-plan.md   # High-level implementation strategy
    ├── tdd-plan.md             # Test-Driven Development plan with BDD scenarios
    ├── implementation-checklist.md  # Actionable task breakdown with checkboxes
    ├── implementation-log.md    # Progress notes during implementation
    ├── code-review.md          # Review comments and resolutions
    ├── lessons-learned.md      # Key insights and takeaways
    ├── SUMMARY.md              # Final comprehensive task summary (Archive phase)
    ├── HITL-feedback.md        # Human-in-the-loop decisions (if applicable)
    ├── design/                 # Design diagrams, wireframes, architecture
    │   └── *.png, *.svg, *.drawio
    ├── test-logs/              # Test execution results
    │   └── *.log, *.xml, *.json
    ├── verification/           # Quality gate results, coverage reports
    │   ├── coverage-report.html
    │   ├── security-scan.json
    │   └── structure-validation.log
    ├── validation/             # CI/CD deployment validation reports
    │   └── deployment-*.log
    ├── refactoring/            # Refactoring plans and summaries
    │   └── refactor-*.md
    └── monitoring/             # Production monitoring logs and metrics
        └── monitoring-*.json
```

## Phase-by-Phase File Creation

### Phase 0: Task Initialization

1. Create task folder: `~/tasks/[feature-name]/`
2. No files yet - just the directory structure

### Phase 1: Research

**Required files:**

- `research.md` - Complete research findings including:
  - RAID analysis (Risks, Assumptions, Issues, Dependencies)
  - Feasibility studies (PIECES assessments)
  - Technical spikes documentation
  - PoC evaluation results
  - Security and accessibility requirements
  - Existing patterns and integration points

### Phase 2: Planning

**Required files:**

- `implementation-plan.md` - High-level strategy with:
  - SRS (Software Requirements Specification)
  - Architecture overview
  - Technology choices
  - Timeline and dependencies (MoSCoW prioritization)
  
- `tdd-plan.md` - Test-Driven Development plan with:
  - BDD scenarios (Given-When-Then)
  - TDD unit test outlines
  - Test coverage goals
  
- `implementation-checklist.md` - Actionable breakdown:
  - [ ] Task items with checkboxes
  - Module decomposition
  - Pseudocode examples

**Optional subfolders:**

- `design/` - Architecture diagrams, wireframes, integration maps

### Phase 3: Implementation

**Required files:**

- `implementation-log.md` - Real-time progress notes:
  - Completed checklist items
  - Challenges encountered
  - Decisions made
  - Deviations from plan

**Required subfolders:**

- `test-logs/` - Store test execution results as they're created

### Phase 4: Review, Testing, Validation & Monitoring

**Required files:**

- `code-review.md` - Review findings and resolutions
- `HITL-feedback.md` - Human approval decisions (if applicable)

**Required subfolders:**

- `test-logs/` - Comprehensive test results (unit, integration, system, acceptance, a11y, security, performance)
- `validation/` - CI/CD deployment validation reports
- `refactoring/` - Refactoring plans and summaries

### Phase 5: Verification

**Required files:**

- `lessons-learned.md` - Key insights and takeaways

**Required subfolders:**

- `verification/` - Quality gate results:
  - Lint results
  - Test coverage reports
  - Security scan outputs
  - Structure validation logs
  - CI/CD pipeline evidence

### Phase 6: Archive

**Required files:**

- `SUMMARY.md` - Comprehensive final summary including:
  - Research findings and decisions
  - Implementation details and challenges
  - Review comments and resolutions
  - Test outcomes and coverage
  - HITL decisions and rationales
  - Refactoring notes
  - Verification results
  - Monitoring and iteration lessons

**Action:** Flag entire `~/tasks/[feature-name]/` folder as archived

## Examples

### Example 1: Simple Bug Fix

```
~/tasks/fix-mcp-auth-bug/
├── research.md              # Investigation findings
├── implementation-plan.md   # Fix strategy
├── tdd-plan.md             # Test cases
├── implementation-checklist.md
├── implementation-log.md
├── code-review.md
├── test-logs/
│   └── auth-tests.log
├── verification/
│   └── security-scan.json
├── lessons-learned.md
└── SUMMARY.md
```

### Example 2: New Feature with UI

```
~/tasks/dashboard-metrics-widget/
├── research.md
├── implementation-plan.md
├── tdd-plan.md
├── implementation-checklist.md
├── implementation-log.md
├── code-review.md
├── HITL-feedback.md         # Design approval decisions
├── design/
│   ├── wireframe.png
│   ├── architecture.drawio
│   └── component-hierarchy.svg
├── test-logs/
│   ├── unit-tests.xml
│   ├── a11y-tests.json
│   └── integration-tests.log
├── verification/
│   ├── coverage-report.html
│   ├── wcag-validation.json
│   └── security-scan.json
├── refactoring/
│   └── component-split.md
├── lessons-learned.md
└── SUMMARY.md
```

## Agent Responsibilities

### When Starting a New Task

1. Create `~/tasks/[feature-name]/` directory immediately
2. Start with `research.md` in Phase 1
3. Never skip phases or required files
4. Follow the hierarchy of authority (see AGENTS.md)

### During Task Execution

- Update files as you progress through phases
- Keep `implementation-log.md` current with real-time notes
- Create subfolders as needed before adding files to them
- Mark checklist items in `implementation-checklist.md` as completed

### Before Archiving

- Ensure all required files exist and are complete
- Create comprehensive `SUMMARY.md`
- Verify all subfolders contain relevant artifacts
- Flag task folder as archived in local memory

## Common Mistakes to Avoid

❌ **DON'T:**

- Store task files in flat structure at `~/tasks/[feature].md`
- Skip required files (research, plans, checklists, summary)
- Mix multiple tasks in one folder
- Store secrets or PII in task folders
- Archive incomplete task folders

✅ **DO:**

- Create dedicated folder for each task
- Follow phase-by-phase file creation
- Use descriptive folder names (kebab-case slugs)
- Keep folder structure organized
- Document everything for reproducibility

## Integration with Local Memory

After creating/updating task artifacts:

1. Store key decisions in local memory MCP/REST API
2. Tag with task name for retrieval
3. Reference `LocalMemoryEntryId` in relevant task files
4. Ensure persistence across agent sessions

## Compliance

This structure is **mandatory** per:

- `.cortex/rules/agentic-coding-workflow.md`
- `.github/copilot-instructions.md`
- `AGENTS.md` (root)

Deviations require approval per Constitution governance.

---

**Last Updated:** 2025-10-10  
**Maintainer:** brAInwav Development Team
