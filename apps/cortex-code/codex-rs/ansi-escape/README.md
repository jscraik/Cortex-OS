# oai-codex-ansi-escape

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

Small helper functions that wrap functionality from
<https://crates.io/crates/ansi-to-tui>:

```rust
pub fn ansi_escape_line(s: &str) -> Line<'static>
pub fn ansi_escape<'a>(s: &'a str) -> Text<'a>
```

Advantages:

- `ansi_to_tui::IntoText` is not in scope for the entire TUI crate
- we `panic!()` and log if `IntoText` returns an `Err` and log it so that
  the caller does not have to deal with it
