# Amplifying Expertise with Cortex-OS

This guide synthesizes key capabilities in brAInwav Cortex-OS that help teams capture, extend, and reuse expertise across projects. It links to authoritative documents for deeper dives.

## 1. Deploy specialized subagents

- Use the subagent manager to scaffold focused assistants with their own prompts, policies, and tool allowlists.
- Target each subagent at a well-defined skill area (code review, debugging, security, etc.) so Cerebrum can auto-delegate or you can invoke them explicitly when the task matches their charter.
- Store subagent definitions in version control so teams can share and evolve expertise together.

## 2. Capture institutional knowledge with Local Memory

- Run the Local Memory service in both MCP and REST modes to give every agent consistent access to stored insights.
- Automate knowledge capture from workflows (tests, debugging notes, ADRs) and make it searchable with Qdrant-backed semantic retrieval.
- Expose memory APIs to your favorite tools—TypeScript, Python, or cURL—to keep critical learnings synchronized across contexts.

## 3. Combine RAG, orchestration, and governance

- Leverage the agent template’s `plan → gather → critic → synthesize → verify` loop to coordinate planners, specialists, and reviewers with consistent guardrails.
- Route knowledge-intensive work through the Model Gateway and RAG stack (embeddings, retrieval, reranking) to surface the right context before agents act.
- Maintain trust with policy enforcement, CloudEvents auditing, and HITL approvals so expert interventions are traceable and reviewable.

## 4. Build on the broader platform features

- Orchestrate multi-agent workflows with the built-in runtime, workflows, and observability.
- Expand coverage with Wikidata integration, governance templates, and the agent toolkit so teams can accelerate onboarding and decision quality.

> For a condensed answer tailored to "How can we use Cortex-OS to amplify expertise?", see the assistant response in the main conversation, which cites the underlying sources referenced here.
