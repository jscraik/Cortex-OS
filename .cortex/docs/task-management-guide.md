# brAInwav Cortex-OS Task Management Guide

**Version**: 1.0.0  
**Last Updated**: 2025-10-08  
**Maintained by**: brAInwav Development Team

---

## Overview

This guide documents the enhanced task management workflow for brAInwav Cortex-OS, combining our existing agentic development process with spec-kit-inspired best practices for prioritization and independent testability.

---

## Philosophy

The brAInwav task workflow emphasizes:

1. **Priority-Driven Development**: All user stories are prioritized (P0-P3) to focus on highest-value work first
2. **Independent Testability**: Each user story should be independently implementable and testable
3. **Test-Driven Development**: Write tests first, then implement to make them pass (Red-Green-Refactor)
4. **brAInwav Standards**: All outputs include brAInwav branding, meet 90%+ coverage, and pass quality gates
5. **Documentation as Code**: Research, specifications, and plans are living documents stored in version control

---

## Workflow Phases

### Phase 0: Task Initialization

**Goal**: Create task structure with specification and research documents.

**Command**:
```bash
pnpm cortex-task init "Feature Name" --priority P1
```

**What Happens**:
1. Generates semantic task ID slug (e.g., `feature-name`)
2. Creates git feature branch (`feat/feature-name` or `feature/feature-name`)
3. Creates `tasks/[task-id]-spec.md` from template
4. Creates `tasks/[task-id].research.md` from template
5. Initializes task tracking in local memory

**Outputs**:
- `tasks/[task-id]-spec.md` - Feature specification with prioritized user stories
- `tasks/[task-id].research.md` - Research document for technical investigation

---

### Phase 1: Research

**Goal**: Investigate technical approaches, identify constraints, and recommend solutions.

**Manual Steps**:
1. Open `tasks/[task-id].research.md`
2. Document current state observations
3. Research external standards and best practices
4. Evaluate technology options (compare pros/cons)
5. Assess brAInwav compatibility and constraints
6. Run proof-of-concept tests if needed
7. Recommend approach with rationale

**Key Sections to Complete**:
- Current State Observations
- External Standards & References
- Technology Research (Option 1, 2, 3...)
- Comparative Analysis
- Recommended Approach
- Constraints & Considerations
- Open Questions

**brAInwav-Specific Requirements**:
- Document existing MCP/A2A integration points
- Identify reusable patterns in codebase
- Note security and privacy considerations
- Verify license compatibility for new dependencies

---

### Phase 2: Specification

**Goal**: Define prioritized user stories with acceptance criteria.

**Manual Steps**:
1. Open `tasks/[task-id]-spec.md`
2. Write executive summary
3. Define user stories in priority order (P0 > P1 > P2 > P3)
4. For each story:
   - Describe user value (As a/I want/So that)
   - Explain priority rationale
   - Define independent test criteria
   - Write acceptance scenarios (Given-When-Then)
5. Document edge cases and error scenarios
6. Define functional and non-functional requirements
7. Specify technical constraints and architecture

**Priority Definitions**:
- **P0 (Critical)**: Blocking issues, security vulnerabilities, data loss prevention
- **P1 (High)**: Core functionality required for MVP, primary user journeys
- **P2 (Medium)**: Important enhancements, secondary features, quality improvements
- **P3 (Low)**: Nice-to-haves, future optimizations, aesthetic improvements

**Independent Testability**:
Each story should be implementable in isolation and deliver standalone value. Ask:
- Can this story be tested without implementing other stories?
- Does implementing just this story deliver value to users?
- Are dependencies on other stories minimal or eliminated?

---

### Phase 3: Planning (TDD Plan)

**Goal**: Create comprehensive test-driven development plan.

**Command**:
```bash
pnpm cortex-task plan [task-id]
```

**What Happens**:
1. Reads research and specification documents
2. Creates `tasks/[task-id]-tdd-plan.md` from template
3. Initializes implementation checklist structure

**Manual Steps** (After Generation):
1. Open `tasks/[task-id]-tdd-plan.md`
2. Define specific test cases based on acceptance criteria
3. Break down implementation into phases with checkboxes
4. Document architecture decisions
5. Identify risks and mitigation strategies
6. Create detailed implementation checklist

**Testing Strategy** (Write Tests First!):
- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test MCP/A2A boundaries and service interactions
- **E2E Tests**: Test complete user journeys from spec
- **Accessibility Tests**: Validate WCAG 2.2 AA compliance (if UI)
- **Security Tests**: Verify auth, input sanitization, no data leakage
- **Performance Tests**: Validate response time and resource usage

---

### Phase 4: Implementation (Red-Green-Refactor)

**Goal**: Implement feature following TDD principles.

**Sub-Phase 4a: RED (Write Failing Tests)**
1. Create test files for all test suites in plan
2. Write test cases that describe desired behavior
3. Run tests - verify ALL are RED (failing)
4. Get stakeholder approval on test scenarios
5. Commit tests to version control

**Sub-Phase 4b: GREEN (Make Tests Pass)**
1. Implement minimal code to pass each test
2. Follow implementation checklist in TDD plan
3. Adhere to brAInwav standards:
   - Named exports only (no `export default`)
   - Functions ≤40 lines
   - Async/await exclusively (no `.then()`)
   - brAInwav branding in all outputs
4. Run tests frequently - work toward ALL GREEN
5. Don't optimize yet - just make tests pass

**Sub-Phase 4c: REFACTOR (Improve Quality)**
1. Improve code quality while keeping tests GREEN
2. Extract duplicated logic
3. Simplify complex conditionals
4. Add JSDoc comments
5. Optimize performance where needed
6. Run tests after each refactor - ensure still GREEN

**Throughout Implementation**:
- Update implementation checklist as work progresses
- Document architecture decisions
- Commit frequently with conventional commit messages
- Include `Co-authored-by: brAInwav Development Team`

---

### Phase 5: Verification

**Goal**: Validate quality and compliance before merge.

**Quality Gates** (All Must Pass):
```bash
pnpm lint:smart           # Linting and code style
pnpm typecheck:smart      # Type checking
pnpm test:smart           # All tests pass
pnpm security:scan        # Security vulnerability scan
pnpm structure:validate   # Repository structure compliance
```

**Coverage Validation**:
```bash
pnpm test:coverage        # Verify 90%+ coverage maintained
```

**Accessibility Validation** (If UI Components):
```bash
pnpm test --grep "a11y"   # Run accessibility tests
```

**Manual Verification**:
- [ ] All tests GREEN (100% pass rate)
- [ ] No mock/placeholder code in production paths
- [ ] brAInwav branding consistently applied
- [ ] Constitution compliance verified
- [ ] Functions all ≤40 lines
- [ ] Named exports only
- [ ] Documentation complete and accurate

---

### Phase 6: Archive & Documentation

**Goal**: Finalize documentation and store knowledge.

**MANDATORY Updates**:
1. **CHANGELOG.md**: Add entry with:
   - What was completed
   - Files/packages changed
   - Breaking changes (if any)
   - Migration notes (if needed)

2. **README.md**: Update if user-facing changes:
   - New features documented
   - Installation/setup changes
   - API changes noted

3. **Website Documentation** (`website/README.md`): Update for user-facing features

**Local Memory Storage**:
- Store comprehensive task summary
- Document key decisions and lessons learned
- Tag with relevant context for future agents
- Include brAInwav-specific patterns discovered

**Completion Checklist**:
- [ ] CHANGELOG.md updated
- [ ] README.md updated (if applicable)
- [ ] Website docs updated (if user-facing)
- [ ] TDD plan archived/moved to appropriate location
- [ ] Local memory updated with insights
- [ ] Pull request created with detailed description
- [ ] Code review requested

---

### Phase 7: Reality Filter

**Goal**: Ensure all claims are verified and accurate.

**Verification Requirements**:
- [ ] No unverified claims presented as fact
- [ ] All "production-ready" claims backed by evidence
- [ ] Inference/speculation clearly labeled: `[Inference]`, `[Speculation]`, `[Unverified]`
- [ ] Missing information acknowledged rather than guessed
- [ ] If any part is unverified, entire response labeled
- [ ] Claims like "prevents", "guarantees", "fixes", "ensures" are sourced or labeled

**Correction Protocol**:
If directive is broken, acknowledge:
> Correction: I previously made an unverified claim. That was incorrect and should have been labeled [Unverified].

---

## CLI Reference

### Initialize New Task

```bash
pnpm cortex-task init "Feature Name" --priority P1
```

**Options**:
- `--priority`: P0 (critical), P1 (high), P2 (medium), P3 (low)

**Example**:
```bash
pnpm cortex-task init "OAuth 2.1 Authentication" --priority P1
```

---

### Create TDD Plan

```bash
pnpm cortex-task plan <task-id>
```

**Prerequisites**:
- Research document must exist
- Specification must exist

**Example**:
```bash
pnpm cortex-task plan oauth-21-authentication
```

---

### List All Tasks

```bash
pnpm cortex-task list
```

**Output**:
- Shows all tasks with priority, status, and completion indicators
- Indicates which phases are complete (research, plan)

---

### Show Task Status

```bash
pnpm cortex-task status <task-id>
```

**Output**:
- Feature name, priority, status, branch
- Workflow progress (spec/research/plan completion)
- File paths for all task documents

**Example**:
```bash
pnpm cortex-task status oauth-21-authentication
```

---

## File Organization

### Task Files Location

All task files live in the `tasks/` directory:

```
tasks/
├── [task-id]-spec.md           # Feature specification
├── [task-id].research.md       # Research findings
├── [task-id]-tdd-plan.md       # TDD implementation plan
└── ...
```

### Template Files Location

Templates are stored in `.cortex/templates/`:

```
.cortex/templates/
├── constitution-template.md     # brAInwav Constitution
├── feature-spec-template.md     # Feature specification template
├── research-template.md         # Research document template
└── tdd-plan-template.md         # TDD plan template
```

---

## Best Practices

### Writing User Stories

**Good Example** (P1 Story):
```markdown
### User Story 1: Secure Token Exchange (Priority: P1)

**As a** brAInwav Cortex-OS user,  
**I want to** authenticate using OAuth 2.1 PKCE flow,  
**So that** my local memory access is secured without compromising privacy.

**Why This Priority**: Core security requirement for MVP - cannot ship without secure authentication.

**Independent Test Criteria**: Can be fully tested by initiating auth flow and verifying token issuance, which delivers standalone value of secure authentication even without other features.

**Acceptance Scenarios**:
1. **Given** user has valid credentials  
   **When** user initiates OAuth flow  
   **Then** PKCE challenge is generated and stored  
   **And** user is redirected to authorization endpoint

2. **Given** authorization code is received  
   **When** token exchange is requested  
   **Then** access token is issued with 1-hour expiry  
   **And** refresh token is stored securely
```

### Writing Test Cases

**Good Example**:
```typescript
describe('OAuth PKCE Flow', () => {
  it('should generate valid PKCE challenge when initiating auth', async () => {
    // Given: Clean authentication state
    const authService = createAuthService();
    
    // When: User initiates OAuth flow
    const challenge = await authService.generatePKCEChallenge();
    
    // Then: Valid challenge is generated
    expect(challenge.codeVerifier).toHaveLength(128);
    expect(challenge.codeChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge.method).toBe('S256');
  });
  
  it('should reject invalid authorization code with brAInwav error', async () => {
    // Given: Invalid authorization code
    const authService = createAuthService();
    const invalidCode = 'invalid-code-123';
    
    // When: Token exchange is attempted
    const result = authService.exchangeToken(invalidCode);
    
    // Then: Appropriate brAInwav-branded error is thrown
    await expect(result).rejects.toThrow(
      'brAInwav Cortex-OS: Invalid authorization code'
    );
  });
});
```

### Keeping Functions Small

**Bad Example** (>40 lines):
```typescript
// DON'T DO THIS - Too long!
export const processUserRequest = async (request: Request): Promise<Response> => {
  // 50+ lines of mixed concerns
  // Validation, business logic, database access, error handling all mixed
};
```

**Good Example** (≤40 lines, composed):
```typescript
// DO THIS - Composed from smaller functions
export const processUserRequest = async (
  request: Request
): Promise<Response> => {
  const validated = await validateRequest(request); // ≤40 lines
  const result = await executeBusinessLogic(validated); // ≤40 lines
  const persisted = await persistResult(result); // ≤40 lines
  return formatResponse(persisted); // ≤40 lines
};
```

---

## Constitution Reference

The brAInwav Constitution (`.cortex/templates/constitution-template.md`) defines foundational principles:

1. **brAInwav Production Standards**: No mock production claims
2. **Test-Driven Development**: Red-Green-Refactor mandatory
3. **Accessibility First**: WCAG 2.2 AA compliance
4. **Monorepo Integrity**: Nx smart execution, named exports, ≤40 lines
5. **Agent-First Architecture**: MCP/A2A integration
6. **Security by Default**: Quality gates, no secrets in code

All development must comply with Constitution requirements.

---

## Troubleshooting

### Task Already Exists

**Error**: `Task [task-id] already exists!`

**Solution**: Use `pnpm cortex-task status [task-id]` to check existing task, or choose a different task name.

---

### Research Document Not Found

**Error**: `Research document not found`

**Solution**: Complete Phase 1 (Research) before creating TDD plan. Edit `tasks/[task-id].research.md`.

---

### Quality Gates Failing

**Error**: `pnpm lint:smart` or `pnpm test:smart` fails

**Solution**:
1. Run specific gate individually to see errors
2. Fix violations based on error messages
3. Ensure brAInwav standards met:
   - Named exports only
   - Functions ≤40 lines
   - Async/await (no `.then()`)
   - brAInwav branding in outputs

---

### Git Branch Already Exists

**Error**: Branch creation fails

**Solution**: 
1. Check if you're already on the correct branch: `git branch`
2. If branch exists elsewhere: `git checkout [branch-name]`
3. If you want a fresh start: `git branch -D [branch-name]` then re-run `pnpm cortex-task init`

---

## Examples

### Example 1: Complete Workflow

```bash
# Phase 0: Initialize
pnpm cortex-task init "User Profile Management" --priority P1

# Phase 1: Research (manual - edit tasks/user-profile-management.research.md)
# - Document current state
# - Research technology options
# - Recommend approach

# Phase 2: Specification (manual - edit tasks/user-profile-management-spec.md)
# - Write prioritized user stories
# - Define acceptance criteria
# - Document requirements

# Phase 3: Create TDD Plan
pnpm cortex-task plan user-profile-management

# Phase 4: Implementation (manual - follow TDD plan)
# - Write failing tests (RED)
# - Implement to pass (GREEN)
# - Refactor (REFACTOR while staying GREEN)

# Phase 5: Verification
pnpm lint:smart
pnpm typecheck:smart
pnpm test:smart
pnpm security:scan
pnpm structure:validate

# Phase 6: Archive
# - Update CHANGELOG.md
# - Update README.md
# - Store insights in local memory

# Check final status
pnpm cortex-task status user-profile-management
```

---

### Example 2: Listing and Reviewing Tasks

```bash
# List all tasks
pnpm cortex-task list

# Check specific task status
pnpm cortex-task status oauth-authentication

# Review task files
cat tasks/oauth-authentication-spec.md
cat tasks/oauth-authentication.research.md
cat tasks/oauth-authentication-tdd-plan.md
```

---

## Integration with Existing Workflow

This enhanced workflow integrates seamlessly with existing brAInwav processes:

- **GitHub Copilot Instructions**: `.github/copilot-instructions.md` references this workflow
- **CODESTYLE.md**: Technical standards enforced throughout workflow
- **AGENTS.md**: Agent behaviors align with task management principles
- **RULES_OF_AI.md**: Ethical framework governs all development
- **Local Memory**: Task insights stored for agent context
- **MCP Integration**: Task metadata available via MCP tools
- **A2A Events**: Task lifecycle events emitted for orchestration

---

## References

- **brAInwav Constitution**: `.cortex/templates/constitution-template.md`
- **GitHub Copilot Instructions**: `.github/copilot-instructions.md`
- **CODESTYLE.md**: Coding standards and architectural design
- **RULES_OF_AI.md**: Ethical AI framework
- **AGENTS.md**: Agent personas and behaviors
- **spec-kit**: https://github.com/github/spec-kit (inspiration source)

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-08  
**Maintained by**: brAInwav Development Team

Co-authored-by: brAInwav Development Team
