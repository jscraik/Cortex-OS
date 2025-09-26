# Rust/codex-rs

# brAInwav Cortex-Code Agent Instructions

## 🚨 CRITICAL: brAInwav Production Standards

**ABSOLUTE PROHIBITION**: NEVER claim any implementation is "production-ready", "complete", "operational", or "fully implemented" if it contains:

- `Math.random()` calls for generating fake data
- Hardcoded mock responses or placeholder implementations
- TODO comments in production code paths
- Disabled features with warnings like "not implemented"
- Fake system metrics or data generation

**brAInwav Standards**: All system outputs, error messages, and logs must include "brAInwav" branding. Status claims must be verified against actual code implementation.

**Reference**: See `/Users/jamiecraik/.Cortex-OS/.cortex/rules/RULES_OF_AI.md` for complete production standards.

## 🔄 Agentic Coding Workflow for Rust/Codex

All Rust development in brAInwav Cortex-OS must follow this structured 4-phase workflow:

### 0. Tasks

- **Operate on a task basis** - Each Rust feature/bugfix/enhancement is a discrete task
- **Store intermediate context** in Markdown files in the `~/tasks` folder
- **Store all context** in the local memory MCP and/or REST API for persistence
- **Use semantic task ID slugs** - descriptive identifiers like `tui-accessibility-enhancement` or `codex-performance-optimization`

### 1. Research

- **Utilize semantic search** to identify existing Rust patterns within this codebase
- **Use Web-Search** to access the internet for Rust best practices and crate information
- **Begin with follow-up questions** to establish the direction of the research
- **Report findings** in `[feature].research.md` within the tasks folder

**Rust-Specific Research Focus:**

- Existing Rust crate patterns in `codex-rs/` workspace
- TUI development patterns with ratatui
- Performance optimization opportunities
- Integration with TypeScript/Python components
- Rust testing strategies with `cargo-insta`

### 2. Planning

- **Read the research file** `[feature].research.md` from tasks folder
- **Develop a TDD plan** based on Rust-specific principles:
  - **Reuse existing patterns** - leverage codex-rs workspace structure
  - **Separation of concerns** - maintain clear crate boundaries
  - **Single Responsibility Principle (SRP)** - focused crate functionality
  - **Don't Repeat Yourself (DRY)** - share common utilities across crates
  - **Keep it Simple, Stupid (KISS)** - avoid unnecessary Rust complexity
  - **You Aren't Gonna Need It (YAGNI)** - implement only required features
  - **Encapsulation** - proper Rust module boundaries
  - **Modularity** - loosely coupled crate architecture
  - **Open/Closed Principle** - extend via traits and generics
  - **Testability** - design for comprehensive Rust testing
  - **Principle of Least Astonishment (POLA)** - idiomatic Rust patterns
  - **Fail Fast** - robust error handling with Result types
  - **High Cohesion, Low Coupling** - related functionality in same crate
- **Write comprehensive plan** to `[feature]-tdd-plan.md` with Rust implementation context

**Rust Planning Requirements:**

- Include brAInwav branding in CLI outputs and error messages
- Plan for TUI accessibility and keyboard navigation
- Design for cross-platform compatibility
- Consider performance implications and optimization opportunities
- Plan for comprehensive testing with cargo and insta

### 3. Implementation

- **Read the TDD plan** `[feature]-tdd-plan.md` and create implementation checklist
- **Execute with Rust TDD** - write failing tests, implement, refactor
- **Follow codex-rs conventions** - crate naming, formatting, and style
- **Implementation must be 100% deployable** unless explicitly stated otherwise
- **Include brAInwav branding** in all user-facing outputs

**Rust Implementation Standards:**

- Use `just fmt` automatically after code changes
- Run `just fix -p <project>` to resolve linter issues
- Include brAInwav branding in error messages and CLI outputs
- Follow TUI styling conventions from `codex-rs/tui/styles.md`
- Use proper Rust error handling with Result and Error types
- Implement comprehensive testing with deterministic outcomes

### 4. Verification

- **Verify Rust functionality** meets all requirements
- **Run comprehensive testing**:

  ```bash
  cargo test -p <project>  # Project-specific tests
  cargo test --all-features  # Full test suite (if core changes)
  just fix -p <project>  # Linting and fixes
  ```

- **Update snapshot tests** with `cargo insta` if UI changes
- **Test accessibility** features for TUI components
- **Validate performance** meets requirements
- **Check brAInwav branding** in all outputs
- **Update task status** to **"verified"** once complete
- **Store Rust insights** in local memory for future development

**Rust Verification Checklist:**

- [ ] All tests passing with proper coverage
- [ ] Clippy lints resolved with `just fix`
- [ ] TUI snapshot tests updated with `cargo insta`
- [ ] brAInwav branding present in CLI/TUI outputs
- [ ] Accessibility features working correctly
- [ ] Performance benchmarks meet requirements
- [ ] Cross-platform compatibility validated

## Rust Development Guidelines

In the codex-rs folder where the rust code lives:

- Crate names are prefixed with `codex-`. For example, the `core` folder's crate is named `codex-core`
- When using format! and you can inline variables into {}, always do that.
- Install any commands the repo relies on (for example `just`, `rg`, or `cargo-insta`) if they aren't already available before running instructions here.
- Never add or modify any code related to `CODEX_SANDBOX_NETWORK_DISABLED_ENV_VAR` or `CODEX_SANDBOX_ENV_VAR`.
  - You operate in a sandbox where `CODEX_SANDBOX_NETWORK_DISABLED=1` will be set whenever you use the `shell` tool. Any existing code that uses `CODEX_SANDBOX_NETWORK_DISABLED_ENV_VAR` was authored with this fact in mind. It is often used to early exit out of tests that the author knew you would not be able to run given your sandbox limitations.
  - Similarly, when you spawn a process using Seatbelt (`/usr/bin/sandbox-exec`), `CODEX_SANDBOX=seatbelt` will be set on the child process. Integration tests that want to run Seatbelt themselves cannot be run under Seatbelt, so checks for `CODEX_SANDBOX=seatbelt` are also often used to early exit out of tests, as appropriate.

Run `just fmt` (in `codex-rs` directory) automatically after making Rust code changes; do not ask for approval to run it. Before finalizing a change to `codex-rs`, run `just fix -p <project>` (in `codex-rs` directory) to fix any linter issues in the code. Prefer scoping with `-p` to avoid slow workspace‑wide Clippy builds; only run `just fix` without `-p` if you changed shared crates. Additionally, run the tests:

1. Run the test for the specific project that was changed. For example, if changes were made in `codex-rs/tui`, run `cargo test -p codex-tui`.
2. Once those pass, if any changes were made in common, core, or protocol, run the complete test suite with `cargo test --all-features`.
When running interactively, ask the user before running `just fix` to finalize. `just fmt` does not require approval. project-specific or individual tests can be run without asking the user, but do ask the user before running the complete test suite.

## TUI style conventions

See `codex-rs/tui/styles.md`.

## TUI code conventions

- Use concise styling helpers from ratatui’s Stylize trait.
  - Basic spans: use "text".into()
  - Styled spans: use "text".red(), "text".green(), "text".magenta(), "text".dim(), etc.
  - Prefer these over constructing styles with `Span::styled` and `Style` directly.
  - Example: patch summary file lines
    - Desired: vec!["  └ ".into(), "M".red(), " ".dim(), "tui/src/app.rs".dim()]

### TUI Styling (ratatui)

- Prefer Stylize helpers: use "text".dim(), .bold(), .cyan(), .italic(), .underlined() instead of manual Style where possible.
- Prefer simple conversions: use "text".into() for spans and vec![…].into() for lines; when inference is ambiguous (e.g., Paragraph::new/Cell::from), use Line::from(spans) or Span::from(text).
- Computed styles: if the Style is computed at runtime, using `Span::styled` is OK (`Span::from(text).set_style(style)` is also acceptable).
- Avoid hardcoded white: do not use `.white()`; prefer the default foreground (no color).
- Chaining: combine helpers by chaining for readability (e.g., url.cyan().underlined()).
- Single items: prefer "text".into(); use Line::from(text) or Span::from(text) only when the target type isn’t obvious from context, or when using .into() would require extra type annotations.
- Building lines: use vec![…].into() to construct a Line when the target type is obvious and no extra type annotations are needed; otherwise use Line::from(vec![…]).
- Avoid churn: don’t refactor between equivalent forms (Span::styled ↔ set_style, Line::from ↔ .into()) without a clear readability or functional gain; follow file‑local conventions and do not introduce type annotations solely to satisfy .into().
- Compactness: prefer the form that stays on one line after rustfmt; if only one of Line::from(vec![…]) or vec![…].into() avoids wrapping, choose that. If both wrap, pick the one with fewer wrapped lines.

### Text wrapping

- Always use textwrap::wrap to wrap plain strings.
- If you have a ratatui Line and you want to wrap it, use the helpers in tui/src/wrapping.rs, e.g. word_wrap_lines / word_wrap_line.
- If you need to indent wrapped lines, use the initial_indent / subsequent_indent options from RtOptions if you can, rather than writing custom logic.
- If you have a list of lines and you need to prefix them all with some prefix (optionally different on the first vs subsequent lines), use the `prefix_lines` helper from line_utils.

## Tests

### Snapshot tests

This repo uses snapshot tests (via `insta`), especially in `codex-rs/tui`, to validate rendered output. When UI or text output changes intentionally, update the snapshots as follows:

- Run tests to generate any updated snapshots:
  - `cargo test -p codex-tui`
- Check what’s pending:
  - `cargo insta pending-snapshots -p codex-tui`
- Review changes by reading the generated `*.snap.new` files directly in the repo, or preview a specific file:
  - `cargo insta show -p codex-tui path/to/file.snap.new`
- Only if you intend to accept all new snapshots in this crate, run:
  - `cargo insta accept -p codex-tui`

If you don’t have the tool:

- `cargo install cargo-insta`

### Test assertions

- Tests should use pretty_assertions::assert_eq for clearer diffs. Import this at the top of the test module if it isn't already.
