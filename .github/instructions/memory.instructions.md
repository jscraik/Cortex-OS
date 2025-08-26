---
applyTo: '**'
---

# Memory: Conversation Summary (2025-08-22)

- SimLab added under `apps/cortex-os/packages/simlab` to run deterministic “simulate → judge → gate” loops with seeded RNG, JSONL per-run artifacts, and aggregated reports; quality gates set (minPassRate=0.9, maxP0Failures=0).
- Core modules: runner (deterministic IDs with “-det”), user-sim, agent-adapter (delay removed for test speed/determinism), judge (strict evidence, weighted scoring + critical failures), reporter (aggregates, gates, trends), scripts (smoke/critical/full/report/gates), and public index/types.
- Tests added: `runner.test.ts` (determinism), `judge.test.ts` (evidence and strict-mode critical), `reporter.test.ts` (pass-rate and P0 gates). Root delegator calls shared smoke runner to avoid drift.
- Agents package hygiene: legacy subtree quarantined via tsconfig and ESLint; broken scripts removed; placeholder index to reduce lint/type noise.
- Repo-wide tests show unrelated failures (gRPC mocks for @grpc/grpc-js, platform/arch assumptions, OCR/Unstructured expectations, MIME policy messages, memory policy access). SimLab tests need isolated package run to validate green.
- Next: run SimLab tests in isolation; optional integration test for `generate-report` to assert `sim/reports/latest.json`; consider schema/type parity check.
