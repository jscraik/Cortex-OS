# Task Folder Structure Alignment Summary

## Problem Identified

The user noticed that agents were not creating properly structured task folders in `~/tasks/[feature-name]/` as specified in the agentic coding workflow documentation.

## Root Cause

There was a **mismatch** between two instruction files:

1. **`.github/copilot-instructions.md`** - Used simpler flat-file naming like `[feature].research.md` and `[feature]-tdd-plan.md`
2. **`.cortex/rules/agentic-coding-workflow.md`** - Expected structured folder organization with `~/tasks/[feature-name]/` containing organized subfolders

## Changes Made

### 1. Created Task Folder Structure Guide
**File**: `.cortex/rules/TASK_FOLDER_STRUCTURE.md`

Comprehensive guide documenting:
- Required folder structure for all tasks
- Phase-by-phase file creation requirements
- Examples of simple and complex task structures
- Common mistakes to avoid
- Integration with local memory
- Compliance requirements

### 2. Updated AGENTS.md
**File**: `AGENTS.md`

- Added reference to Task Folder Structure guide in Governance Pack hierarchy
- Now ranks as item #4 in the governance hierarchy

### 3. Aligned Copilot Instructions
**File**: `.github/copilot-instructions.md`

Major updates to align with AGENTS.md and agentic-coding-workflow.md:

#### Hierarchy of Authority
- Updated to match AGENTS.md structure
- Added Governance Pack references in correct order
- Added Task Folder Structure to hierarchy

#### Project Overview Section
- Added Cortex-OS description from AGENTS.md
- Included allowed interfaces and non-goals
- Maintained brAInwav core principles

#### Workflow Phases
All 7 phases now explicitly reference the task folder structure:

**Phase 0: Tasks**
- Added Task Analysis & Quality Requirements section
- RAID analysis requirements
- Quality gates and guardrails definition

**Phase 1: Research**
- Expanded with semantic code search & reuse analysis
- Discovery phase requirements
- Feasibility studies (PIECES assessments)
- Technical spikes documentation
- PoC evaluation phases
- Batch evaluations & guardrails

**Phase 2: Planning**
- Added high-level architecture requirements
- One-page business case
- Detailed task breakdown
- BDD & TDD planning specifics
- brAInwav requirements (MCP/A2A, security, accessibility, i18n, monitoring)

**Phase 3: Implementation**
- Execute the plan references
- BDD acceptance tests
- Standards adherence details
- Observability & guardrails embedding

**Phase 4: Review, Testing, Validation & Monitoring** (NEW)
- Separated from verification
- HITL integration framework details
- Continuous refactoring approach
- Maintenance mindset

**Phase 5: Verification**
- Detailed quality gates
- Structure & coverage checks
- CI/CD and supply chain checks
- Feedback loop closure

**Phase 6: Monitoring, Iteration & Scaling** (NEW)
- Active monitoring requirements
- Iteration responsiveness
- Model updates & retraining
- Scale & optimize considerations

**Phase 7: Archive**
- Archive artifacts details
- Documentation update requirements
- Record outcomes
- Traceability assurance

#### Section Renumbering
- Fixed duplicate section numbers
- Sections now numbered 1-12 consistently

## Task Folder Structure Requirement

All agents must now create:

```
~/tasks/[feature-name]/
├── research.md
├── implementation-plan.md
├── tdd-plan.md
├── implementation-checklist.md
├── implementation-log.md
├── code-review.md
├── lessons-learned.md
├── SUMMARY.md
├── HITL-feedback.md (if applicable)
├── design/
├── test-logs/
├── verification/
├── validation/
├── refactoring/
└── monitoring/
```

## Files Modified

1. `.cortex/rules/TASK_FOLDER_STRUCTURE.md` (NEW)
2. `AGENTS.md`
3. `.github/copilot-instructions.md`

## Validation

All three files now consistently reference:
- `~/tasks/[feature-name]/` structure
- Phase-by-phase file requirements
- Task Folder Structure guide as authoritative reference
- Same workflow phases (0-7)
- Aligned terminology and requirements

## Next Steps for Agents

When starting any new task:

1. Create `~/tasks/[feature-name]/` directory immediately
2. Follow Task Folder Structure guide phase-by-phase
3. Reference both Agentic Coding Workflow and Task Folder Structure docs
4. Store all artifacts in structured subfolders
5. Never skip required files or phases
6. Create comprehensive SUMMARY.md before archiving

## Compliance

This alignment ensures:
- Consistent agent behavior across all AI models
- Reproducible task execution
- Complete audit trails
- Future agent learning capability
- Governance Pack compliance

---

**Date**: 2025-10-10  
**Maintainer**: brAInwav Development Team  
**Status**: Completed
