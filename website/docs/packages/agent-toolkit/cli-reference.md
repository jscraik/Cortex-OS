---
title: Cli Reference
sidebar_label: Cli Reference
---

# CLI Reference

Wrapper scripts return JSON envelopes to stderr-safe output.

| Command | Description |
| --------- | ------------- |
| `tools/rg_search.sh &lt;pattern&gt; &lt;path&gt;` | regex search via ripgrep |
| `tools/semgrep_search.sh &lt;pattern&gt; &lt;path&gt;` | Semgrep rule search |
| `tools/astgrep_search.sh &lt;pattern&gt; &lt;path&gt;` | AST-grep search |
| `tools/comby_rewrite.sh &lt;match&gt; &lt;rewrite&gt; &lt;path&gt;` | structural rewrite diff |
| `tools/treesitter_query.sh &lt;query&gt; &lt;path&gt;` | tree-sitter query |
| `tools/difftastic_diff.sh &lt;fileA&gt; &lt;fileB&gt;` | structural diff |
| `tools/run_validators.sh &lt;changed-files&gt;` | run appropriate linters and tests |
| `tools/patch_apply.sh --diff &lt;file&gt;` | apply patch after validation |

Use `just` targets for higher level flows.
