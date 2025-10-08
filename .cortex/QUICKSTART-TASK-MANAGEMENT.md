# Enhanced Task Management - Quick Start Guide

## What's New?

Your Cortex-OS repository now has an enhanced task management system combining brAInwav standards with spec-kit-inspired best practices.

## Quick Start

### 1. Create a New Task

```bash
pnpm cortex-task init "Your Feature Name" --priority P1
```

This will:
- Generate a semantic task ID (e.g., `your-feature-name`)
- Create a git feature branch
- Create `tasks/your-feature-name-spec.md` (feature specification)
- Create `tasks/your-feature-name.research.md` (research document)
- Provide next steps guidance

### 2. Complete Research

Edit `tasks/your-feature-name.research.md`:
- Document current state observations
- Research technology options
- Compare approaches (pros/cons)
- Recommend solution with rationale

### 3. Define Specification

Edit `tasks/your-feature-name-spec.md`:
- Write prioritized user stories (P0 = Critical, P1 = High, P2 = Medium, P3 = Low)
- Each story must be **independently testable**
- Define acceptance criteria using Given-When-Then format
- Document requirements and constraints

### 4. Create TDD Plan

```bash
pnpm cortex-task plan your-feature-name
```

This creates `tasks/your-feature-name-tdd-plan.md` with:
- Comprehensive testing strategy
- Implementation checklist (Red-Green-Refactor)
- Quality gate requirements

### 5. Implement Following TDD

- **RED**: Write failing tests first
- **GREEN**: Write minimal code to pass tests
- **REFACTOR**: Improve quality while keeping tests green

### 6. Verify Quality

```bash
pnpm lint:smart
pnpm test:smart
pnpm security:scan
pnpm structure:validate
```

## Available Commands

```bash
# Initialize new task
pnpm cortex-task init "Feature Name" --priority P1

# Create TDD plan
pnpm cortex-task plan task-id

# List all tasks
pnpm cortex-task list

# Show task status
pnpm cortex-task status task-id

# Show help
pnpm cortex-task
```

## Priority Levels

- **P0 (Critical)**: Blocking issues, security vulnerabilities, data loss
- **P1 (High)**: Core MVP functionality, primary user journeys
- **P2 (Medium)**: Important enhancements, secondary features
- **P3 (Low)**: Nice-to-haves, optimizations

## Key Principles

✅ **Independent Testability**: Each user story should deliver standalone value  
✅ **Test-Driven Development**: Write tests first (Red-Green-Refactor)  
✅ **brAInwav Standards**: ≤40 lines per function, named exports, 90%+ coverage  
✅ **Priority-Driven**: Focus on highest-value work first  
✅ **Evidence-Based**: No unverified "production-ready" claims  

## Documentation

- **Complete Guide**: `.cortex/docs/task-management-guide.md`
- **Templates**: `.cortex/templates/` (Constitution, Spec, Research, TDD Plan)
- **Template Docs**: `.cortex/templates/README.md`
- **Implementation Summary**: `tasks/spec-kit-integration-summary.md`

## Example Workflow

```bash
# Step 1: Initialize
pnpm cortex-task init "OAuth Authentication" --priority P1

# Step 2: Research (manual editing)
# Edit: tasks/oauth-authentication.research.md

# Step 3: Specify (manual editing)  
# Edit: tasks/oauth-authentication-spec.md

# Step 4: Plan
pnpm cortex-task plan oauth-authentication

# Step 5: Implement (follow TDD plan)
# Write tests → Make them pass → Refactor

# Step 6: Verify
pnpm lint:smart && pnpm test:smart && pnpm security:scan

# Check status
pnpm cortex-task status oauth-authentication
```

## Integration with Existing Workflow

This system **extends** your existing workflow documented in:
- `.github/copilot-instructions.md` (6-phase agentic workflow)
- `CODESTYLE.md` (coding standards)
- `RULES_OF_AI.md` (ethical framework)
- `AGENTS.md` (agent behaviors)

All templates enforce these existing standards automatically.

## Need Help?

1. Run `pnpm cortex-task` for command help
2. Check `.cortex/docs/task-management-guide.md` for detailed workflow
3. Review `.cortex/templates/README.md` for template documentation
4. See `tasks/spec-kit-integration-summary.md` for implementation details

---

**Maintained by**: brAInwav Development Team  
**Version**: 1.0.0  
**Date**: 2025-10-08

Co-authored-by: brAInwav Development Team
