# AGENTS

AGENTS.md is authoritative for structure and behavior. Deviations are blocked by CI.

## Roles
Describe agent roles across MCP, A2A, RAG, and Simlab, including responsibilities and limits.

## Boundaries
Explicit boundaries between domains and allowed cross-domain interactions. No deep src/dist imports.

## Inputs
All inputs validated with Zod or JSON schema. Use deterministic seeds and caps.

## Outputs
Machine-readable JSON options (`--json`) and human defaults. ISO-8601 timestamps.

## Memory
Deterministic, bounded memory footprints. Use stores behind interfaces.

## Governance
This document is enforced by .cortex control-centre checks in CI and pre-commit.
