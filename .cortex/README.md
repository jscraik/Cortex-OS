# Cortex Control Centre (.cortex)

This directory is the single source of truth for repository structure, agent mandates, and domain indexes. CI and pre-commit gates enforce these policies to prevent scope creep and ensure predictable changes.

- Policy lives under `./policy` (paths, mandates, rules).
- JSON Schemas under `./schemas` validate policy files.
- Tooling under `./tooling` runs structure/mandates/index checks and emits a unified report.
- Domain indexes under `./indexes` declare owned packages for MCP, A2A, RAG, and Simlab.

AGENTS.md is authoritative for structure and behavior. Deviations are blocked by CI.

