---
title: Providers Setup
sidebar_label: Providers Setup
---

# Providers & Setup

The toolkit runs locally and does not require external services. Optional integrations rely on environment variables.

## Tree-sitter
- Build a compiled language bundle.
- Set `TS_LIB` to the bundle path.
- Set `TS_LANG` to the target language name.

## System Tools
Ensure ripgrep, Semgrep, AST-grep, Comby, Difftastic, ESLint, Ruff, Cargo and Pytest are installed and on `PATH`.
