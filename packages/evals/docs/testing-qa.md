# Testing & QA

Run unit tests with:

```bash
pnpm --filter @cortex-os/evals test
```

Aim for coverage on critical logic such as threshold handling and dependency failures. Consider adding synthetic datasets to reproduce edge cases.

## Prompt, RAG, and Red-Team Evaluations

```bash
pnpm eval:prompt   # promptfoo regression checks for assistant flows
pnpm eval:redteam  # OWASP LLM-aligned adversarial refusals
pnpm eval:rag      # ragas metrics via uv for retrieval quality
```

Reports land in `reports/evals/` as JSON, HTML, and Markdown summaries. Attach significant diffs to PRs touching prompts, MCP suites, or retrievers so reviewers can validate behavioural changes.
