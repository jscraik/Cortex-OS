# Agent Toolkit

Shell wrappers returning JSON envelopes for common developer tools. Each wrapper prints a single JSON object to stdout, making it easy to consume from automated agents.

## Available tools

- `rg_search.sh` – ripgrep regex search
- `semgrep_search.sh` – Semgrep rules search
- `astgrep_search.sh` – AST-grep structural search
- `comby_rewrite.sh` – Comby structural rewrite
- `difftastic_diff.sh` – structural diff review
- `eslint_verify.sh` – JavaScript/TypeScript linting
- `ruff_verify.sh` – Python linting
- `cargo_verify.sh` – Rust tests
- `pytest_verify.sh` – Python tests
- `run_validators.sh` – auto run validators based on changed files
- `treesitter_query.sh` – Tree-sitter query helper
- `patch_apply.sh` – safe patch apply with backup

## Usage

See the `Justfile` for examples:

```sh
just help
just scout "pattern" path
just codemod 'find(:[x])' 'replace(:[x])' path
just verify changed.txt
just tsq '(function_declaration name: (identifier) @name)' src/
```
