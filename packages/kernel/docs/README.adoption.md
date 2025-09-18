# @cortex-os/kernel – LangGraphJS Adoption Readiness

This document tracks prerequisites and readiness gates for migrating the kernel to LangGraphJS.

## Prerequisites

- Node.js 18+
- pnpm
- Install: `pnpm add @langchain/langgraph @langchain/core --filter @cortex-os/kernel`
- Optional model providers: `@langchain/anthropic`, `openai`, etc.

## Docs

- Project plan: `project-documentation/kernel-langgraphjs-adoption-plan.md`
- v0 docs (to be deprecated): [langchain-ai.github.io/langgraphjs](https://langchain-ai.github.io/langgraphjs/)
- v1 alpha docs: [docs.langchain.com/oss/javascript/langgraph/overview](https://docs.langchain.com/oss/javascript/langgraph/overview)

## Gates

- TDD first (tests added for API snapshot and graph skeleton)
- Keep commits scoped and green
- Deterministic mode preserved during migration
