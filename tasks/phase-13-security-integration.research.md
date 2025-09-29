# Phase 13 – Security & Compliance Integration Research

## Research Objective

Implement the Phase 13 requirements from the LangGraph Integration Plan so that cortex-sec
capabilities are first-class participants in orchestration. Specifically, integrate cortex-sec MCP
tools with kernel allow-lists, extend orchestration planning context with compliance metadata that
influences strategy selection, and ensure security/compliance events propagate through the A2A bus
while agents receive updated security guidance in their prompt templates.

## Source Requirements

- LangGraph Integration Plan, Phase 13 – Security & Compliance Integration (cortex-sec)
  - Register cortex-sec MCP tools (`run_semgrep_scan`, `analyze_vulnerabilities`,
    `get_security_policy`, `validate_compliance`, `check_dependencies`) via kernel tool binding with
    strict allow-lists.
  - Surface compliance metadata in orchestration planning context and dynamically adjust strategies
    when violations or high-risk findings exist.
  - Emit brAInwav-branded security events (`cortex_sec.scan.started`,
    `cortex_sec.vulnerability.found`, `cortex_sec.compliance.violation`,
    `cortex_sec.policy.updated`) via the A2A bus.
  - Update prompt templates so planning/execution phases explicitly consider compliance posture and
    security guardrails.
  - Maintain WCAG 2.2 AA accessibility and brAInwav branding in all new outputs or logs.

## Existing Implementation Mapping

- `packages/cortex-sec/src/mcp/tools.ts`
  - Defines Zod schemas and metadata for the five cortex-sec MCP tools.
  - Not currently registered with kernel tool binding or orchestration surfaces.
- `packages/cortex-sec/src/events/cortex-sec-events.ts`
  - Provides validated creators for security/compliance A2A events.
  - Events are not yet published anywhere inside orchestration or kernel workflows.
- `packages/orchestration/src/mcp/core-adapter.ts`
  - `getDefaultOrchestrationPlanningContext` builds baseline planning metadata (agents, constraints,
    preferences) without security awareness.
- `packages/orchestration/src/mcp/tools.ts`
  - Creates orchestration MCP tools. Planning context currently populated without compliance state or
    risk signals.
- `packages/orchestration/src/types.ts`
  - `PlanningContext` lacks security/compliance fields.
- `packages/orchestration/src/lib/context-manager.ts` & adaptive coordinators
  - Manage context lifecycles; need to ensure compliance state persists and affects decisions.
- `packages/kernel/src/tools/bind-kernel-tools.ts`
  - Constructs kernel tool binding allow-lists but only includes generic bash/filesystem/network
    surfaces.
  - Needs extension to surface cortex-sec tool metadata and enforce allow-lists per requirement.
- `packages/agents/src/lib/prompt-template-manager.ts`
  - Prompt templates currently lack explicit security compliance guidance; must inject new sections
    emphasising cortex-sec checks and guardrails.
- Event bus infrastructure: `packages/orchestration/src/events/orchestration-bus.ts`
  - Handles CloudEvents envelopes. Will need new publish helpers for cortex-sec events with brAInwav
    branding and logging.

## Key Integration Points & Considerations

1. **MCP Tool Registration**
   - Determine central registration site for MCP tools (likely orchestration MCP module or kernel
     tool binder) and ensure cortex-sec tools are exposed with allow-lists.
   - Extend metadata so tools declare compliance category and recommended usage (helps planners).
2. **Planning Context Enhancements**
   - Add `compliance` subtree to `PlanningContext` containing:
     - Applicable standards and last validation timestamp.
     - Outstanding violations with severity.
     - Recommended mitigations and risk score.
   - Update `getDefaultOrchestrationPlanningContext` to initialise compliance metadata (default:
     compliant, empty violations).
   - When a violation occurs, strategy selection should bias toward resilient or strict modes.
3. **Adaptive Strategy Adjustments**
   - Inspect `strategy-selector` and coordinator modules to incorporate compliance risk when choosing
     strategies.
   - Ensure fallback to safer strategies if violations exist or risk score is high.
4. **A2A Event Emission**
   - Use `createCortexSecEvent` helpers to publish events at key lifecycle points (start,
     vulnerability, violation, policy update).
   - Route through existing event bus with brAInwav-branded logging/audit.
5. **Prompt Template Updates**
   - Embed compliance guidance in system/planning prompts with explicit instructions to run
     cortex-sec tools when risk is elevated.
   - Provide placeholders to surface current compliance status within prompts.
6. **Testing Strategy**
   - Need new Vitest suites under `packages/orchestration/tests` (or `packages/cortex-sec/tests`) to
     cover:
     - Planning context enrichment when compliance data provided.
     - Strategy selection adjustments when violations exist.
     - Event bus publishes cortex-sec events with validated payloads.
     - Kernel binding exposes cortex-sec tools and enforces allow-lists.
     - Prompt template manager includes compliance guidance.

## Security & Compliance Notes

- All new errors/logs must include brAInwav branding per foundational rules.
- Ensure allow-lists default to restrictive values; tests must confirm disallowed tool usage throws.
- Use Zod validation for compliance metadata ingress to prevent malformed risk data injection.
- Maintain deterministic tests—mock time/UUID where necessary.

## Open Questions / Follow-ups

- Confirm desired allow-list defaults for cortex-sec tools (likely scoped to repo root and approved
  network endpoints). Need product confirmation if additional paths required.
- Determine whether compliance violations should always force `OrchestrationStrategy.STRICT` or
  merely reduce quality preference.
- Clarify if prompt updates require localisation or just base English copy.

## Next Steps

1. Draft TDD plan outlining failing tests and implementation checklist.
2. Implement MCP tool binding, planning context enrichment, coordinator updates, event emission, and
   prompt changes per plan.
3. Add comprehensive Vitest coverage and run `pnpm lint:smart`, `pnpm test:smart`, `pnpm security:scan`
   before archival.
