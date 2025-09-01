# Cortex-OS Governance Review

Evaluate the repository for security, licensing, and compliance concerns.

Return **only** JSON that conforms to the schema at `.cortex/schemas/mcp-governance.schema.json` with the following structure:
- `overall`: include a `recommendation` of "go" or "no-go" and a brief `summary`.
- `areas`: list the governance domains that were reviewed.
- `risks`: array of objects each with `severity` and `description`.
- `licenses`: array of key dependencies and their `license` information.

Ensure the output validates against the schema and uses lowercase field values where applicable.
