# Research – OpenAI Agents + Instructor integration (brAInwav)

Goal: Evaluate and plan adapters for JS/Python OpenAI Agents SDKs and instructor libraries under hybrid model routing.

Scope:
- JS: openai-agents-js, instructor-js
- Python: openai-agents-python, instructor
- Config: hybrid-model-strategy.json, hybrid-model-enforcement.json, hybrid-deployment.yml

Findings [Unverified]:
- Package names/registries may be unstable → prefer pinned git SHA deps initially.
- Instructor libs provide schema-constrained outputs; map to Zod/Pydantic.
- Routing must honor MLX-first and cloud conjunction.

RAID:
- Risks: unstable deps, API drift, network in tests.
- Assumptions: no breaking Nx rules; no root deps needed.
- Issues: confirm SDK package names.
- Dependencies: model-gateway contracts; observability/logging.
