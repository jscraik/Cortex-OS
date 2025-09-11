# CLI Reference

Wrapper scripts return JSON envelopes to stderr-safe output.

| Command | Description |
|---------|-------------|
| `tools/rg_search.sh <pattern> <path>` | regex search via ripgrep |
| `tools/semgrep_search.sh <pattern> <path>` | Semgrep rule search |
| `tools/astgrep_search.sh <pattern> <path>` | AST-grep search |
| `tools/comby_rewrite.sh <match> <rewrite> <path>` | structural rewrite diff |
| `tools/treesitter_query.sh <query> <path>` | tree-sitter query |
| `tools/difftastic_diff.sh <fileA> <fileB>` | structural diff |
| `tools/run_validators.sh <changed-files>` | run appropriate linters and tests |
| `tools/patch_apply.sh --diff <file>` | apply patch after validation |

Use `just` targets for higher level flows.
