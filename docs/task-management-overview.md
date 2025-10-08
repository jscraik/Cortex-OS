# Task Management Overview

**Quick Reference**: For detailed documentation, see [.cortex/docs/task-management-guide.md](../.cortex/docs/task-management-guide.md)

## What is the Task Management System?

The brAInwav Cortex-OS task management system is an enhanced workflow that combines:
- **brAInwav standards** (≤40 lines per function, 90%+ coverage, branding)
- **spec-kit best practices** (priority-driven development, independent testability)
- **TDD workflow** (Red-Green-Refactor cycle)
- **CLI automation** (automated template generation)

## Quick Commands

```bash
# Initialize new task
pnpm cortex-task init "Feature Name" --priority P1

# Create TDD plan
pnpm cortex-task plan task-id

# List all tasks
pnpm cortex-task list

# Check status
pnpm cortex-task status task-id
```

## Priority Levels

- **P0 (Critical)**: Blocking issues, security vulnerabilities
- **P1 (High)**: Core MVP functionality, primary user journeys
- **P2 (Medium)**: Important enhancements, secondary features
- **P3 (Low)**: Nice-to-haves, optimizations

## Workflow Phases

1. **Task Initialization** - Create task structure with `pnpm cortex-task init`
2. **Research** - Investigate technical approaches
3. **Specification** - Define prioritized user stories
4. **Planning** - Create TDD plan with `pnpm cortex-task plan`
5. **Implementation** - Red-Green-Refactor cycle
6. **Verification** - Quality gates and testing
7. **Archive** - Documentation and knowledge storage

## Key Principles

✅ **Independent Testability**: Each user story delivers standalone value  
✅ **Priority-Driven**: Focus on highest-value work first  
✅ **Test-Driven**: Write tests before implementation  
✅ **brAInwav Standards**: All code meets quality requirements  
✅ **Evidence-Based**: No unverified production claims  

## Documentation

- **[Complete Guide](../.cortex/docs/task-management-guide.md)** - Full workflow documentation
- **[Quick Start](../.cortex/QUICKSTART-TASK-MANAGEMENT.md)** - Getting started guide
- **[Templates](../.cortex/templates/)** - Template files and documentation
- **[Implementation Summary](../tasks/spec-kit-integration-summary.md)** - Technical details

## Integration

This system integrates with:
- **GitHub Copilot** - Via `.github/copilot-instructions.md`
- **CODESTYLE.md** - Coding standards enforced in templates
- **AGENTS.md** - Agent workflow alignment
- **Local Memory** - Task insights stored for context
- **MCP/A2A** - Tool and event integration

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-08  
**See Also**: [.cortex/docs/task-management-guide.md](../.cortex/docs/task-management-guide.md)

Co-authored-by: brAInwav Development Team
