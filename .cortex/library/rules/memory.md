# memory

purpose

- Standardize context use and writes to long-term memory.

principles

- Read: load only relevant memory keys by tag.
- Write: only durable, user-approved facts or project rules.
- Never store sensitive categories without explicit user request.

examples

- good: "Store: MCP consolidation rule v1; scope: repo-wide; reason: governance; retention: project."
- bad: "Store: user's health condition details."

ci_policy

- Fail writes lacking `reason:` and `retention:` fields.
- Block forbidden categories unless `user_consent: true`.
