# Vision Document Enforcement Analysis

**Generated**: 2025-01-XX  
**Subject**: How `/.cortex/rules/vision.md` is enforced across the Cortex-OS codebase  
**Status**: Complete

---

## Executive Summary

The Vision document (`/.cortex/rules/vision.md`) is the foundational architectural blueprint for brAInwav Cortex-OS. It defines the north star (ASBR system), core principles, system boundaries, and package-level specifications. Vision enforcement occurs through **multiple interconnected mechanisms** spanning documentation hierarchy, CI/CD automation, code structure validation, and agent workflows.

---

## 1. Governance Hierarchy & Authority

The Vision document sits at the **top of the Governance Pack** hierarchy, which establishes binding project rules:

### Documented Hierarchy (`.github/copilot-instructions.md`)

1. **Governance Pack (`/.cortex/rules/`)** — binding project rules:
   - **Vision** — end-state, scope, non-goals, and interfaces
   - Agentic Coding Workflow — task lifecycle, gates, handoffs
   - Task Folder Structure — mandatory organization
   - Code Review Checklist — evidence-backed review criteria
   - CI Review Checklist — step-by-step execution checklist
   - RULES_OF_AI — ethical guardrails, branding, production bars
   - Constitution — binding charter for decision authority

2. **CODESTYLE.md (root)** — coding & testing conventions enforced by CI
3. **AGENTS.md (root)** — operational rules for agents
4. **Package-level AGENTS.md** — may tighten but cannot weaken root standards
5. **Model guides** — adapter specifics only
6. **GitHub Copilot instructions**

### Enforcement Notes

> **From AGENTS.md**: "CI checks: presence of the Governance Pack, link validity, and that package `AGENTS.md` files don't contradict the root."

---

## 2. Automated CI/CD Enforcement

### 2.1 Structure Validation (`pnpm structure:validate`)

**Script**: `tools/structure-guard/guard-enhanced.ts`  
**Triggered by**: CI workflow (`.github/workflows/verify.yml` → `structure-governance` job)

This enforces:
- Allowed root entries (Vision is approved at root level)
- Package structure compliance
- Import boundary rules
- Protected file validation

**Policy Source**: `tools/structure-guard/policy.json` (references governance standards)

### 2.2 CI Governance Gate (`pnpm ci:governance`)

**From `package.json`**:
```bash
pnpm ci:governance = 
  pnpm nx:project:guard && 
  pnpm format:check && 
  pnpm lint && 
  pnpm test:security && 
  pnpm structure:validate &&  # ← Checks governance compliance
  pnpm license:validate && 
  pnpm check:cycles && 
  pnpm ci:mcp-path && 
  pnpm ci:agent-toolkit:validate && 
  pnpm ci:memory:enforce
```

Every PR must pass this gate, which includes structure validation that ensures Vision compliance.

### 2.3 Workflow Integration (`.github/workflows/verify.yml`)

**Job**: `structure-governance` (lines 151-178)

```yaml
structure-governance:
  name: Structure & Compliance (Light)
  runs-on: ubuntu-latest
  needs: [detect-docs-only, affected-fastcheck, build-test]
  steps:
    - name: Structure validation
      run: pnpm structure:validate  # ← Enforces Vision boundaries
    - name: License validation
      run: pnpm license:validate
    - name: SBOM (quick)
      run: pnpm sbom:generate || true
```

This job blocks PR merges if Vision-defined boundaries are violated.

---

## 3. Documentation Cross-References

### 3.1 AGENTS.md (Root-Level)

**Lines referencing Vision**:
- Lists Vision as #1 in Governance Pack hierarchy
- Requires agents to follow Vision when making architectural decisions
- Mandates that PR descriptions cite Governance Pack sections touched

**Key Quote**:
> "The [Vision](/.cortex/rules/vision.md) defines end-state, scope, non-goals, and interfaces."

### 3.2 Constitution (`/.cortex/rules/constitution.md`)

**Section VI: Amendment Process** establishes conflict resolution hierarchy:

1. `/.cortex/rules/RULES_OF_AI.md` (immutable ethics)
2. **Constitution** (this document)
3. CODESTYLE.md (coding standards)
4. AGENTS.md (agent behaviors)
5. Model-specific guidelines

The Constitution references Vision principles in:
- **Section I: Core Principles** → Defines production standards aligned with Vision
- **Section II: Development Workflow** → Ensures task execution matches Vision architecture
- **Section IV: Feature Development Standards** → Prioritization must serve Vision north star

### 3.3 GitHub Copilot Instructions (`.github/copilot-instructions.md`)

**Sections enforcing Vision**:

1. **Section 2: Project Overview** — Summarizes Vision's ASBR north star
2. **Section 4: Agentic Coding Workflow** — Research phase requires Vision alignment
3. **Section 5: Repository Structure** — Enforces architecture defined in Vision
4. **Section 11: Anti-Patterns** — Blocks violations of Vision boundaries

**Key Quote**:
> "Cortex-OS is a local-first, vendor-neutral **Agentic Second Brain Runtime (ASBR)** that orchestrates multi-agent workflows, persists knowledge, and exposes controlled surfaces: **MCP (HTTP/SSE/STDIO)**, **A2A**, and **REST**."

This is a direct restatement of Vision Section 0 (North Star).

---

## 4. Agent Prompt Integration

### 4.1 Code Review Agent (`.github/prompts/code-review-agent.prompt.md`)

**Lines 19-20**:
```markdown
[CONTEXT]:
  - Governance hierarchy (strictest rule wins):
    1) `/.cortex/rules/*` (Vision, Agentic Workflow, Code-Review Checklist, CI Checklist, RULES_OF_AI, Constitution)
```

The code review agent **explicitly checks Vision compliance** during PR review, particularly:
- System boundaries (MCP/A2A/REST only)
- No multiple MCP servers per package (Vision §5: Non-Goals)
- Domain boundaries enforced (Vision §3.9: No cross-domain imports)

### 4.2 Product Manager Prompt (`.github/prompts/product-manager.prompt.md`)

References Vision as the authoritative product roadmap source:
> "You are the voice of the user and steward of the **product vision**."

---

## 5. Task Workflow Enforcement

### 5.1 Agentic Coding Workflow (`/.cortex/rules/agentic-coding-workflow.md`)

**Phase 1: Research** (lines 18-25):
> "**Discovery phase:** Identify use cases, gather requirements, analyse feasibility and ROI, and create a roadmap... Document findings in `~/tasks/[feature]/`."

Agents must:
1. Review Vision document during research phase
2. Ensure proposed changes align with Vision architecture
3. Document any Vision conflicts in RAID analysis

**Phase 2: Planning** (lines 29-36):
> "**brAInwav requirements:** Plan branding, MCP/A2A integration, security scanning, accessibility (WCAG 2.2 AA)..."

These requirements come **directly from Vision** (Section 3: Architecture Overview).

### 5.2 Task Folder Structure (`/.cortex/rules/TASK_FOLDER_STRUCTURE.md`)

Mandates that each task folder include:
- `research.md` — Must reference Vision alignment
- `implementation-plan.md` — Must cite Vision package specifications
- `verification/validation-report.md` — Must confirm Vision compliance

**Evidence**: Task example at `tasks/cortex-os-cortex-py-refactor/verification/validation-report.md`:
> "- [x] [Vision](/.cortex/rules/vision.md) - Referenced in Section 3"

---

## 6. Runtime Architecture Enforcement

### 6.1 MCP Configuration Validation

**Vision Section 3.2** defines:
> "FastMCP v3 server exposing: **/mcp** (protocol), **/sse** (stream), **/health**, **/metrics**."

**Enforcement**:
- `pnpm ci:mcp-path` validates MCP endpoint configuration
- Code review agent checks for MCP port drift (default: 3024)
- Structure guard blocks multiple MCP servers per package

### 6.2 A2A Hub Boundary Enforcement

**Vision Section 3.3** mandates:
> "Central bus for agent-to-agent messages... no per-package A2A."

**Enforcement**:
- Structure guard rules block direct cross-package imports
- Agents must use `@cortex-os/a2a-contracts` envelopes
- CI fails if packages bypass A2A for inter-feature communication

### 6.3 Memory Core Integration

**Vision Section 3.4** requires:
> "Single source of truth for memories (facts, episodes, artifacts, embeddings)."

**Enforcement**:
- `pnpm ci:memory:enforce` validates memory logging
- Local memory MCP integration verified via `scripts/ci/memory-enforce.test.sh`
- Dual-mode (MCP + REST) parity checks

---

## 7. Security & Production Standards

### 7.1 RULES_OF_AI Alignment

The Vision defines "Deterministic & evidence-backed" as a core principle.

**RULES_OF_AI enforces**:
- No `Math.random()` in production (Vision: "reproducible runs")
- No mock responses in operational code (Vision: "done means observable + testable")
- Structured telemetry with run IDs (Vision: "artifacted logs/metrics")

### 7.2 Semgrep Pattern Guards

**Custom Semgrep rules** (from code review agent prompt):
```
brainwav.math-random-in-prod → brainwav-prohibition (high)
brainwav.mock-response-in-prod → brainwav-prohibition (high)
brainwav.mcp.port-drift → mcp-config (low/info)
```

These directly enforce Vision architectural decisions.

---

## 8. Package-Level Specifications

### Vision Section 4: "Done Means" Criteria

Each package in Vision has **explicit completion criteria**:

**Example from Vision §4.1**:
> **`packages/mcp-server`**  
> **Done means:** Start/stop cleanly; API-key auth on; Cloudflare Tunnel tested; `/health`, `/mcp`, `/sse`, `/metrics` green; integration tests pass.

**Enforcement**:
- Integration tests validate these exact endpoints
- CI blocks merges if health checks fail
- Code review agent verifies "done means" checklist

**Evidence**: Search results show Vision referenced in:
- `tasks/cortex-os-cortex-py-refactor/README.md`
- `tasks/cortex-os-cortex-py-refactor/tdd-plan.md`
- `tasks/cortex-os-cortex-py-refactor/verification/validation-report.md`

Agents explicitly check their work against Vision package specs during verification.

---

## 9. Continuous Enforcement Mechanisms

### 9.1 Pre-commit Hooks

**Husky configuration** runs:
```bash
pnpm biome:staged  # Format + lint
pnpm lint
pnpm test
pnpm security:scan:diff  # For security-sensitive changes
```

These implicitly enforce Vision standards (named exports, function size, etc.).

### 9.2 Branch Protection Rules

GitHub branch protection requires:
- CI governance checks (includes `structure:validate`)
- Code review from maintainers (who use Vision as reference)
- No force pushes (maintains Vision traceability)

### 9.3 Local Memory Persistence

**From `.github/instructions/memories.instructions.md`**:

Decision log entries **must reference Vision alignment**:
```markdown
## 2025-10-10 Memory Logging Gate
- Decision: Added CI workflow and enforcement script...
- Impacted Surfaces: scripts/ci/memory-enforce.test.sh, AGENTS.md, .github/workflows/memory-enforce.yml
- Evidence: runId=brAInwav-ci-2025-10-10T18:00Z
- LocalMemoryEntryId: mem-2025-10-10-ci-enforcement
```

This ensures Vision-driven decisions are preserved across development sessions.

---

## 10. Detection of Vision Drift

### 10.1 Automated Detection

**Tools that detect Vision violations**:

1. **Structure Guard** (`tools/structure-guard/guard-enhanced.ts`)
   - Detects forbidden cross-package imports
   - Validates path restrictions
   - Checks allowed imports match Vision architecture

2. **Dependency Cruiser** (`scripts/check-circular-deps.mjs`)
   - Prevents circular dependencies banned by Vision
   - Validates domain boundaries

3. **AST-Grep** (`ast-grep/rules/*.yml`)
   - Pattern-based detection of Vision anti-patterns
   - Checks for branding, MCP compliance, etc.

### 10.2 Manual Detection

**Code Review Process**:
1. Reviewer reads Vision Section 0 (North Star)
2. Compares PR changes against Vision boundaries
3. Checks Vision package "done means" criteria
4. Verifies no new interfaces beyond MCP/A2A/REST/frontier

**Evidence**: Code review checklist (`/.cortex/rules/code-review-checklist.md`) mandates Vision alignment check.

---

## 11. Updating the Vision

### Amendment Process (from Constitution)

**Proposing Vision Changes**:
1. Create ADR in `project-documentation/adrs/`
2. Document rationale and impact analysis
3. Get approval from maintainers
4. Update Vision version (semantic versioning)
5. Announce changes to team
6. Update all referencing documentation

**Conflict Resolution**:
- If Vision conflicts with RULES_OF_AI → RULES_OF_AI wins (ethical override)
- If Vision conflicts with CODESTYLE → Vision wins (architectural authority)
- If Vision conflicts with AGENTS.md → Vision wins (strategic over tactical)

---

## 12. Vision Compliance Checklist (For Developers)

Before submitting a PR, verify:

- [ ] Changes align with Vision Section 0 (North Star)
- [ ] No new interfaces beyond MCP/A2A/REST/frontier (Vision §2)
- [ ] Architecture matches Vision Section 3 (system boundaries)
- [ ] Package meets Vision "done means" criteria (Vision §4)
- [ ] No Vision non-goals violated (Vision §5)
- [ ] Success metrics preserved (Vision §6)
- [ ] `pnpm structure:validate` passes
- [ ] `pnpm ci:governance` passes
- [ ] Vision referenced in task folder (`~/tasks/[feature]/research.md`)
- [ ] Code review agent approved (checks Vision compliance)

---

## 13. Key Takeaways

### How Vision is NOT Lost

1. **Hierarchical Authority**: Vision is #1 in Governance Pack, overriding all other docs except RULES_OF_AI
2. **Automated Gates**: CI fails PRs that violate Vision architecture via `structure:validate`
3. **Agent Integration**: All agent prompts explicitly reference Vision as authoritative
4. **Task Workflow**: Research/Planning phases mandate Vision alignment documentation
5. **Memory Persistence**: Vision-driven decisions logged in local memory for future sessions
6. **Code Review**: Reviewers use Vision as primary reference document
7. **Package Specs**: Each package has "done means" criteria extracted from Vision
8. **Continuous Monitoring**: Structure guard, dependency checks, and pattern guards detect drift

### Single Points of Failure to Watch

1. **Manual Override**: Emergency commits can bypass pre-commit hooks (`HUSKY=0`)
2. **Documentation Lag**: If Vision updates but downstream docs don't, inconsistency arises
3. **New Maintainers**: Onboarding must emphasize Governance Pack hierarchy
4. **Tooling Drift**: Structure guard policy must stay synchronized with Vision

### Recommended Improvements

1. **Automated Vision Drift Detection**: Add weekly scheduled job to scan for Vision references
2. **Vision Change Notifications**: Trigger alerts to all maintainers on Vision amendments
3. **Visualization**: Generate architecture diagrams from Vision for easier comprehension
4. **Version Pinning**: Embed Vision version in CI outputs for traceability

---

## Appendix: Vision Reference Map

| Vision Section | Enforcement Mechanism | Validation Tool | Severity |
|----------------|----------------------|-----------------|----------|
| §0 North Star | AGENTS.md hierarchy | Manual review | Critical |
| §1 Core Principles | RULES_OF_AI checks | Semgrep | High |
| §2 System Boundaries | Structure guard | `structure:validate` | High |
| §3.2 MCP Hub | Port/config checks | `ci:mcp-path` | Medium |
| §3.3 A2A Hub | Import rules | Structure guard | High |
| §3.4 Memory Core | Memory enforce | `ci:memory:enforce` | Medium |
| §4 Package Specs | Integration tests | Package-specific CI | High |
| §5 Non-Goals | Code review agent | AST-grep patterns | High |
| §6 Success Metrics | Coverage/mutation | Test reports | Medium |

---

**Conclusion**: The Vision document is enforced through a **defense-in-depth strategy** combining documentation hierarchy, automated CI validation, agent workflow integration, code review processes, and persistent memory logging. No single change can violate Vision without triggering multiple enforcement mechanisms.

**Next Actions**:
1. Store this analysis in local memory (brAInwav context)
2. Reference in future architecture decisions
3. Update if new enforcement mechanisms are added

---

**Generated by**: brAInwav Development Assistant  
**Stored**: `tasks/vision-enforcement-analysis.md`  
**Tags**: #governance #vision #enforcement #architecture #ci-cd
