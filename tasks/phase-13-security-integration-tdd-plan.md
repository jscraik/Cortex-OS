# Phase 13 – Security & Compliance Integration TDD Plan

## Goal

Enable orchestration to leverage cortex-sec by wiring its MCP tools, modelling compliance metadata
inside planning context, emitting security events, and updating agent prompts so security posture
actively shapes execution strategies. All additions must meet brAInwav branding, accessibility, and
security standards.

## Test Strategy

1. **Kernel Tool Binding**
   - _Test_: Binding configuration includes cortex-sec tools with declared allow-lists and brAInwav metadata.
   - _Fail condition_: Attempting to invoke a cortex-sec tool outside its allow-list rejects with branded policy violation.
2. **Planning Context Compliance Metadata**
   - _Test_: `getDefaultOrchestrationPlanningContext` seeds a `compliance` node with defaults (standards, risk score, violations array).
   - _Test_: Strategy selector switches to resilient/strict when compliance risk score exceeds threshold or violations present.
3. **A2A Event Emission**
   - _Test_: When a security scan kicks off, orchestration publishes `cortex_sec.scan.started` via event bus with validated payload.
   - _Test_: Compliance violation triggers `cortex_sec.compliance.violation` event and updates planning context risk values.
4. **Prompt Template Guidance**
   - _Test_: Security-aware prompt templates include compliance status, mitigation guidance, and reminders to use cortex-sec tools.
5. **Regressions & Accessibility**
   - _Test_: Existing orchestration workflow execution remains successful when compliance is nominal.
   - _Test_: Prompt output maintains WCAG-consistent structure (headings, bullet lists) and brAInwav branding strings.

## Implementation Steps

1. **Extend Types & Defaults**
   - Update `PlanningContext` interface to add `compliance` structure (standards, lastCheckedAt, riskScore, outstandingViolations).
   - Adjust `getDefaultOrchestrationPlanningContext` to populate the new fields.
2. **Strategy Adjustment Logic**
   - Enhance strategy selector/adaptive coordinator to downgrade strategy or set `preferences.failureHandling` based on compliance risk.
   - Ensure updates remain under 40-line function limit; extract helpers if necessary.
3. **Kernel Tool Binding Integration**
   - Import cortex-sec tool metadata and expose them via `bindKernelTools` return payload with explicit allow-lists.
   - Restrict invocation to curated commands/paths (`security/scans`, dependency manifests, etc.) and propagate metadata.
4. **MCP Tool Wiring**
   - Register cortex-sec tools in orchestration MCP layer so planning/execution flows can invoke them with compliance context.
   - Tag each tool with compliance metadata for planners.
5. **Event Bus Hooks**
   - Use `createCortexSecEvent` helpers to publish events at scan start, vulnerability detection, compliance violation, and policy updates.
   - Ensure event envelopes include brAInwav branding and pass existing CloudEvents validation.
6. **Prompt Template Updates**
   - Modify prompt templates (system/planning/error) to display compliance status and instruct agents to run cortex-sec tools when risk > 0.
   - Maintain readability and accessibility (ordered sections, bullet spacing, limited line length).
7. **Testing**
   - Add Vitest coverage for planning context defaults, strategy adjustments, kernel binding metadata, prompt updates, and event publish helpers.
   - Use dependency injection/mocks to avoid filesystem/network calls.
8. **Quality Gates**
   - Run `pnpm lint:smart`, `pnpm test:smart`, `pnpm security:scan`, and `pnpm structure:validate`.
   - Document coverage deltas and ensure ≥90% threshold maintained.

## Implementation Checklist

- [ ] PlanningContext type includes compliance metadata and defaults.
- [ ] Strategy selection respects compliance risk levels.
- [ ] Cortex-sec MCP tools registered with guarded allow-lists and exposed metadata.
- [ ] A2A security events emitted with validated payloads and brAInwav branding.
- [ ] Prompt templates surface compliance status and guidance.
- [ ] New tests covering context, strategy, events, prompts, and binding.
- [ ] All required pnpm quality gates executed and documented.
- [ ] Documentation updates (CHANGELOG, READMEs, website) completed with truthful implementation notes.
