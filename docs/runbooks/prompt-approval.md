# Prompt Change Approval Workflow

BrAInwav prompts are governed by the Prompt Library (see Phase 0.1 of the TDD plan). This runbook defines the approval process and risk tiers for modifying system, task, or tool prompts.

## Risk Levels

| Level | Description | Approval | Notes |
|-------|-------------|----------|-------|
| L1 | Minor wording tweaks (spelling, formatting) with no behavioral impact | Self-approve (1 engineer) | Must update prompt registry entry
| L2 | Updates affecting tone or detail but not policy/compliance content | Peer review (2nd engineer) | Verify unit tests covering variables/lengths
| L3 | Changes touching compliance posture, policies, or escalation behavior | Human-in-loop approver (product or compliance lead) | Requires linked ticket + recorded decision; update prompts.json hash in changelog
| L4 | Net-new prompts for high-risk tools, connectors, or regulated data | Security/compliance sign-off + HIL approver | Requires dry-run evidence and evaluation scores

## Approval Steps

### Prompt Registry Quick Reference

| Prompt ID | Purpose | Default Consumers |
|-----------|---------|-------------------|
| `sys.n0-master` | Default N0 orchestration system prompt | `@cortex-os/orchestration` |
| `sys.server.test-helper` | Sandbox server sampling responses | `servers/src/everything` |
| `sys.prp.insights` | PRP evidence insight generation | `src/lib/insights`, `@cortex-os/prp-runner` |
| `sys.asbr.fact-checker` | Fact-check retrieval flow | `@cortex-os/prp-runner` |
| `sys.asbr.evidence-analyst` | Evidence enhancement summaries | `@cortex-os/prp-runner` |
| `sys.asbr.evidence-gap` | Evidence gap suggestions | `@cortex-os/prp-runner` |
| `sys.github.code-review` | GitHub MLX code review analyses | `@cortex-os/cortex-ai-github` |
| `sys.github.security-scan` | GitHub security scan lens | `@cortex-os/cortex-ai-github` |
| `sys.a2a.generate-text` | A2A text generation fallback prompt | `@cortex-os/prp-runner` |
| `sys.a2a.rag-query` | A2A RAG query guidance | `@cortex-os/prp-runner` |
| `sys.a2a.rag-default` | A2A default RAG fallback | `@cortex-os/prp-runner` |


1. Update the prompt entry in `packages/prompts/src/registry.ts` (or add a new entry).
2. Run `pnpm test --filter @cortex-os/prompts` to confirm schema/tests.
3. Execute `pnpm run prompts:export` and attach the diff (`.cortex/prompts/registry.json`).
4. Capture evaluation results (Ragas/DeepEval, if applicable) and link in the PR.
5. Record approvers in the PR template and update the changelog with the new prompt hash (from registry export).
6. After merge, ensure run bundles reflect the new prompt (check prompts.json for a smoke test run).

## Emergency Rollback

If a prompt causes regressions, revert the registry entry and rerun `pnpm run prompts:export`. Notify the compliance/SRE channel with the affected run IDs (from prompts.json).

