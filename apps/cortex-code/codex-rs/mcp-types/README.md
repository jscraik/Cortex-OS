# mcp-types

## 🚨 CRITICAL: brAInwav Production Standards

**ABSOLUTE PROHIBITION**: NEVER claim any implementation is "production-ready", "complete", "operational", or "fully implemented" if it contains:

- `Math.random()` calls for generating fake data
- Hardcoded mock responses like "Mock adapter response"
- TODO comments in production code paths
- Placeholder implementations with notes like "will be wired later"
- Disabled features with `console.warn("not implemented")`
- Fake system metrics or data generation

**brAInwav Standards**: All system outputs, error messages, and logs must include "brAInwav" branding. Status claims must be verified against actual code implementation.

**Reference**: See `/Users/jamiecraik/.Cortex-OS/.cortex/rules/RULES_OF_AI.md` for complete production standards.

---

Types for Model Context Protocol. Inspired by <https://crates.io/crates/lsp-types>.

As documented on <https://modelcontextprotocol.io/specification/2025-06-18/basic>:

- TypeScript schema is the source of truth: <https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-06-18/schema.ts>
- JSON schema is amenable to automated tooling: <https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-06-18/schema.json>
