# TDD Plan – OpenAI Agents + Instructor (brAInwav)

Unit (JS):
- openai-agents-js-adapter: chat ok/error, tool call, abort signal.
- instructor-js-adapter: schema success/failure, coercion.

Unit (Py):
- openai_agents_py_adapter: chat ok/error.
- instructor_adapter: pydantic schema success/failure.

Integration:
- model-gateway provider routing selection from hybrid configs; health branding.

Security:
- Semgrep clean; no secrets; no random.

Coverage: ≥90% changed; logs include brand:"brAInwav".
