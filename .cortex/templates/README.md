# brAInwav Cortex-OS Templates

This directory contains templates for the enhanced task management workflow combining brAInwav standards with spec-kit-inspired best practices.

## Templates

### 1. constitution-template.md
**Purpose**: Defines foundational principles governing all brAInwav Cortex-OS development.

**When to Use**: Reference when creating new features or making architectural decisions.

**Key Sections**:
- Core Principles (Production Standards, TDD, Accessibility, etc.)
- Development Workflow (6 phases)
- Quality Standards
- Feature Development Standards (Priority-based user stories)
- Compliance & Governance

---

### 2. feature-spec-template.md
**Purpose**: Template for creating feature specifications with prioritized user stories.

**When to Use**: Automatically created by `pnpm cortex-task init <feature-name>`

**Key Sections**:
- User Scenarios & Testing (P0/P1/P2/P3 prioritized stories)
- Requirements (Functional & Non-Functional)
- Technical Constraints
- Architecture & Design
- Dependencies
- Implementation Phases

**Features**:
- Priority-based story ordering
- Independent testability requirements
- Given-When-Then acceptance criteria
- brAInwav branding requirements
- WCAG 2.2 AA accessibility checklist

---

### 3. research-template.md
**Purpose**: Template for documenting research findings and technical investigation.

**When to Use**: Automatically created by `pnpm cortex-task init <feature-name>`

**Key Sections**:
- Objective
- Current State Observations
- External Standards & References
- Technology Research (Option 1, 2, 3...)
- Comparative Analysis
- Recommended Approach
- Constraints & Considerations
- Open Questions

**Features**:
- brAInwav-specific context documentation
- Multi-option comparison tables
- License compatibility tracking
- Proof-of-concept findings
- Risk assessment

---

### 4. tdd-plan-template.md (v2.0 - TDD Coach Conformant)
**Purpose**: Template for creating comprehensive test-driven development plans with production-ready quality gates.

**When to Use**: Created by `pnpm cortex-task plan <task-id>` after research and spec are complete.

**Version**: v2.0 (40KB, 1357 lines) - Fully conformant with tdd-coach requirements

**TDD Coach Conformance**:
- ✅ 95/95 Coverage (line AND branch, not just 90%)
- ✅ Mutation Score ≥ 80% (prevents vacuous tests)
- ✅ Flake Rate < 1% (deterministic tests)
- ✅ Operational Readiness Rubric (20 items, ≥95% score required)
- ✅ Advanced Test Types (property-based, fuzz, contract, chaos, load, concurrency)
- ✅ Operational Tests (timeout, retry, graceful shutdown, health, metrics, tracing, logs)
- ✅ Enhanced Security Testing (SQL injection, XSS, secrets handling, SBOM)
- ✅ 2-Minute TDD Cycle (RED → GREEN → REFACTOR → COMMIT)

**Key Sections**:
- TDD Cycle Quick Reference (2-minute cycle, "Before You Code" checklist)
- Quality Gates (95/95 coverage, mutation, flake rate, operational readiness)
- Operational Readiness Rubric (20-point checklist across 5 categories)
- Testing Strategy (14 phases):
  1. Unit Tests
  2. Property-Based Tests (NEW)
  3. Fuzz Tests (NEW)
  4. Integration Tests
  5. Contract Tests (NEW)
  6. End-to-End Tests
  7. Operational Tests (NEW - 10 test types)
  8. Accessibility Tests
  9. Security Tests (ENHANCED)
  10. Performance & Load Tests (ENHANCED)
  11. Chaos & Fault Injection Tests (NEW)
  12. Concurrency Tests (NEW)
  13. Mutation Testing (NEW)
  14. Coverage Tracking & Ratcheting (NEW)
- Implementation Checklist (7 detailed phases, ~150 items)
- Architecture Decisions
- Risk Mitigation
- Performance Considerations
- Rollout Plan (4 phases: Dev → Staging → Canary → Production)
- Monitoring & Observability (RED/USE metrics)
- Rollback Plan

**Features**:
- Comprehensive quality gates for production readiness
- Operational readiness scoring (≥95% required)
- Advanced test types beyond basic unit/integration
- Operational test categories (graceful shutdown, metrics, tracing)
- Security testing (injection prevention, secrets handling)
- Performance & reliability SLOs
- Complete deployment workflow
- brAInwav Constitution compliance tracking

**References**:
- `packages/tdd-coach/docs/tdd-planning-guide.md` (source requirements)
- `packages/tdd-coach/docs/tdd-quick-references-card.md` (TDD discipline)
- `tasks/tdd-template-conformance-analysis.md` (gap analysis)
- `tasks/tdd-template-v2-update-summary.md` (update details)

---

## Usage

### Automated Template Usage

The `cortex-task` CLI automatically populates templates with task-specific information:

```bash
# Initialize task (creates spec + research from templates)
pnpm cortex-task init "Feature Name" --priority P1

# Create TDD plan (creates plan from template)
pnpm cortex-task plan task-id
```

### Manual Template Customization

If you need to create custom variants:

1. Copy template to new location
2. Modify sections as needed
3. Update placeholder variables:
   - `[FEATURE_NAME]` → Actual feature name
   - `[task-id-slug]` → Generated task ID
   - `[YYYY-MM-DD]` → Current date
   - `[P0/P1/P2/P3]` → Priority level

### Template Variables

Templates use these placeholder patterns:

| Variable | Description | Example |
|----------|-------------|---------|
| `[FEATURE_NAME]` | Human-readable feature name | "OAuth Authentication" |
| `[task-id-slug]` | Kebab-case task identifier | "oauth-authentication" |
| `[YYYY-MM-DD]` | ISO date format | "2025-10-08" |
| `[P0/P1/P2/P3]` | Priority level | "P1" |
| `[GitHub username or "Unassigned"]` | Assignee | "@username" |

---

## brAInwav Standards Enforcement

All templates enforce brAInwav Cortex-OS standards:

✅ **Production Standards**: No mock/placeholder claims  
✅ **Test-Driven Development**: Red-Green-Refactor mandatory  
✅ **Accessibility First**: WCAG 2.2 AA compliance required  
✅ **Code Quality**: Named exports, ≤40 lines per function, async/await  
✅ **Branding**: brAInwav included in all outputs and errors  
✅ **Security**: Quality gates, no secrets in code  

---

## Template Maintenance

### Version Control

Templates are version-controlled in `.cortex/templates/` to ensure:
- Consistency across all tasks
- Traceable changes to workflow standards
- Easy updates to all future tasks

### Updating Templates

When updating templates:

1. Make changes to template files in `.cortex/templates/`
2. Document rationale in commit message
3. Update version in Constitution if workflow changes
4. Announce changes to team
5. Existing tasks **not** automatically updated (manual migration if needed)

### Adding New Templates

To add a new template:

1. Create template in `.cortex/templates/[name]-template.md`
2. Define placeholder variables using `[VARIABLE_NAME]` pattern
3. Update `scripts/cortex-task.mjs` if CLI automation needed
4. Document in this README
5. Update `.cortex/docs/task-management-guide.md`

---

## Related Documentation

- **Task Management Guide**: `.cortex/docs/task-management-guide.md` - Complete workflow guide
- **GitHub Copilot Instructions**: `.github/copilot-instructions.md` - AI agent workflow
- **CODESTYLE.md**: Technical standards and coding conventions
- **RULES_OF_AI.md**: Ethical AI framework
- **AGENTS.md**: Agent personas and behaviors

---

## Examples

### Example Task Files Generated from Templates

```
tasks/
├── oauth-authentication-spec.md           # From: feature-spec-template.md
├── oauth-authentication.research.md       # From: research-template.md
└── oauth-authentication-tdd-plan.md       # From: tdd-plan-template.md
```

### Example Template Substitution

**Template** (feature-spec-template.md):
```markdown
# Feature Specification: [FEATURE_NAME]
**Task ID**: `[task-id-slug]`
**Created**: [YYYY-MM-DD]
**Priority**: [P0/P1/P2/P3]
```

**Generated** (oauth-authentication-spec.md):
```markdown
# Feature Specification: OAuth Authentication
**Task ID**: `oauth-authentication`
**Created**: 2025-10-08
**Priority**: P1
```

---

## Support

For questions or issues with templates:

1. Check `.cortex/docs/task-management-guide.md` for workflow guidance
2. Review `scripts/cortex-task.mjs` for CLI implementation details
3. Consult brAInwav Constitution for standards clarification
4. Ask in team channels or create GitHub issue

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-08  
**Maintained by**: brAInwav Development Team

Co-authored-by: brAInwav Development Team
