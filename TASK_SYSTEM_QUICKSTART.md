# brAInwav Task Management System - Quick Start Guide

**Version**: 1.0.0  
**Last Updated**: 2025-01-09  
**Maintained by**: brAInwav Development Team

---

## ✅ System Status: READY TO USE

The task management system is fully initialized and ready for use!

---

## 🚀 Quick Start: Create Your First Task

### Step 1: Initialize a New Task

```bash
cd /Users/jamiecraik/.Cortex-OS
pnpm cortex-task init "Your Feature Name" --priority P1
```

**Priority Levels**:
- `P0` - Critical (blocking issues, security vulnerabilities)
- `P1` - High (core functionality, primary user journeys)
- `P2` - Medium (important enhancements, secondary features)
- `P3` - Low (nice-to-haves, future optimizations)

**What This Does**:
- ✅ Creates semantic task ID (e.g., `your-feature-name`)
- ✅ Creates git feature branch (e.g., `feat/your-feature-name`)
- ✅ Generates `tasks/your-feature-name-spec.md` (specification)
- ✅ Generates `tasks/your-feature-name.research.md` (research doc)

---

### Step 2: Complete Research Phase

Edit the research document:
```bash
# Open the generated research file
open tasks/your-feature-name.research.md
# or
code tasks/your-feature-name.research.md
```

**Fill in these sections**:
1. **Current State Observations** - Document what exists now
2. **External Standards & References** - Research best practices
3. **Technology Research** - Evaluate options (Option 1, 2, 3...)
4. **Comparative Analysis** - Pros/cons of each option
5. **Recommended Approach** - Your chosen solution with rationale
6. **Constraints & Considerations** - brAInwav-specific requirements
7. **Open Questions** - Unresolved items

---

### Step 3: Define Specification

Edit the specification document:
```bash
open tasks/your-feature-name-spec.md
```

**Fill in these sections**:
1. **Executive Summary** - High-level overview
2. **User Stories** - Prioritized (P0/P1/P2/P3) with:
   - User value (As a/I want/So that)
   - Priority rationale
   - Independent test criteria
   - Acceptance scenarios (Given-When-Then)
3. **Requirements** - Functional and non-functional
4. **Technical Constraints** - Architecture decisions
5. **Success Criteria** - How you'll know it's done

---

### Step 4: Create TDD Plan

```bash
pnpm cortex-task plan your-feature-name
```

**What This Does**:
- ✅ Reads your research and specification
- ✅ Generates `tasks/your-feature-name-tdd-plan.md`
- ✅ Creates implementation checklist structure

**Then customize the plan**:
```bash
open tasks/your-feature-name-tdd-plan.md
```

**Fill in**:
1. Specific test cases based on acceptance criteria
2. Implementation checklist (broken down into phases)
3. Architecture decisions
4. Risks and mitigation strategies

---

### Step 5: Implementation (RED-GREEN-REFACTOR)

**RED Phase - Write Failing Tests**:
```bash
# Create test files
# Write test cases that describe desired behavior
# Run tests - verify ALL are RED (failing)
pnpm test:smart
```

**GREEN Phase - Make Tests Pass**:
```bash
# Implement minimal code to pass each test
# Follow implementation checklist in TDD plan
# Adhere to brAInwav standards:
#   - Named exports only (no 'export default')
#   - Functions ≤40 lines
#   - Async/await exclusively (no .then())
#   - brAInwav branding in all outputs
```

**REFACTOR Phase - Improve Quality**:
```bash
# Improve code quality while keeping tests GREEN
# Extract duplicated logic
# Simplify complex conditionals
# Run tests after each refactor
pnpm test:smart
```

---

### Step 6: Verification

Run all quality gates:
```bash
# Lint and code style
pnpm lint:smart

# Type checking
pnpm typecheck:smart

# All tests pass
pnpm test:smart

# Security scan
pnpm security:scan

# Structure validation
pnpm structure:validate

# Coverage validation (90%+ required)
pnpm test:coverage
```

---

### Step 7: Archive & Documentation

**MANDATORY Updates**:

1. **Update CHANGELOG.md**:
```bash
# Add entry with:
# - What was completed
# - Files/packages changed
# - Breaking changes (if any)
```

2. **Update README.md** (if user-facing changes):
```bash
# - New features documented
# - Installation/setup changes
# - API changes noted
```

3. **Update Website Documentation** (if applicable):
```bash
# website/README.md for user-facing features
```

4. **Store in Local Memory**:
- Document key decisions and lessons learned
- Tag with relevant context for future agents

---

## 📋 Available Commands

### List All Tasks
```bash
pnpm cortex-task list
```

Shows all tasks with priority, status, and completion indicators.

### Show Task Status
```bash
pnpm cortex-task status your-feature-name
```

Shows detailed status for a specific task.

### Create New Task
```bash
pnpm cortex-task init "Feature Name" --priority P1
```

Initialize a new task with specification and research documents.

### Create TDD Plan
```bash
pnpm cortex-task plan your-feature-name
```

Generate TDD plan from research and specification.

---

## 🎯 brAInwav Standards (Non-Negotiable)

### Code Quality
- ✅ **Named Exports Only** - No `export default`
- ✅ **Functions ≤40 Lines** - Split immediately if longer
- ✅ **Async/Await Exclusively** - No `.then()` chains
- ✅ **brAInwav Branding** - Include in all system outputs

### Testing
- ✅ **90%+ Coverage** - Lines, branches, functions, statements
- ✅ **TDD Approach** - Write tests first (RED-GREEN-REFACTOR)
- ✅ **Test Categories** - Unit, integration, e2e, a11y, security

### Accessibility
- ✅ **WCAG 2.2 AA Compliance** - For all UI components
- ✅ **Semantic HTML** - Use correct elements
- ✅ **Keyboard Navigation** - All interactive elements operable
- ✅ **Screen Reader Testing** - Generate jest-axe test cases

### Security
- ✅ **Zero Critical/High Vulnerabilities** - Must pass security scan
- ✅ **No Secrets in Code** - Use environment variables
- ✅ **Input Sanitization** - Validate all inputs

---

## 📚 Example Workflow

### Creating a New OAuth Feature

```bash
# 1. Initialize task
pnpm cortex-task init "OAuth 2.1 Authentication" --priority P1

# Output:
# ✓ Created git branch: feat/oauth-21-authentication
# ✓ Created: tasks/oauth-21-authentication-spec.md
# ✓ Created: tasks/oauth-21-authentication.research.md

# 2. Complete research (manual)
code tasks/oauth-21-authentication.research.md
# - Research OAuth 2.1 spec
# - Evaluate PKCE flow
# - Document security considerations

# 3. Define specification (manual)
code tasks/oauth-21-authentication-spec.md
# - Write user stories
# - Define acceptance criteria
# - Document requirements

# 4. Create TDD plan
pnpm cortex-task plan oauth-21-authentication

# 5. Implement (RED-GREEN-REFACTOR)
# Write tests first...
pnpm test:smart  # All RED

# Implement code...
pnpm test:smart  # All GREEN

# Refactor...
pnpm test:smart  # Still GREEN

# 6. Verify quality gates
pnpm lint:smart && pnpm test:smart && pnpm security:scan

# 7. Update documentation
# - CHANGELOG.md
# - README.md
# - Store insights in local memory

# 8. Create PR
git add .
git commit -m "feat(auth): implement OAuth 2.1 with PKCE flow

Co-authored-by: brAInwav Development Team"
git push origin feat/oauth-21-authentication
```

---

## 🔍 Check Current Tasks

```bash
# List all tasks
pnpm cortex-task list

# Output example:
# brAInwav Cortex-OS Tasks
# 
# Total Tasks: 2
#
# P1 oauth-21-authentication
#    Status: In Progress
#    Research: ✓  Plan: ✓
#
# P2 user-profile-enhancement
#    Status: Planning
#    Research: ✓  Plan: ○
```

---

## 🆘 Troubleshooting

### "Task already exists!"
**Solution**: Use a different task name or check status:
```bash
pnpm cortex-task status existing-task-name
```

### "Research document not found"
**Solution**: Complete research phase first by editing the research file.

### "Quality gates failing"
**Solution**: 
1. Run specific gate to see errors
2. Fix violations based on error messages
3. Ensure brAInwav standards met

### "Git branch already exists"
**Solution**:
```bash
# Check current branch
git branch

# If branch exists elsewhere
git checkout existing-branch-name

# If you want a fresh start
git branch -D existing-branch-name
# Then re-run pnpm cortex-task init
```

---

## 📖 Additional Resources

- **Full Guide**: `.cortex/docs/task-management-guide.md`
- **Templates**: `.cortex/templates/`
- **GitHub Copilot Instructions**: `.github/copilot-instructions.md`
- **Coding Standards**: `CODESTYLE.md`
- **AI Rules**: `.cortex/rules/RULES_OF_AI.md`

---

## 🎉 You're Ready!

The task management system is fully operational. Start by creating your first task:

```bash
pnpm cortex-task init "My First Feature" --priority P2
```

Follow the phases, maintain brAInwav standards, and enjoy the structured workflow!

---

**Maintained by**: brAInwav Development Team  
**Co-authored-by**: brAInwav Development Team
