# Getting Started

## Prerequisites
- Bash shell
- git
- Required tools: ripgrep, ast-grep, semgrep, comby, difftastic, ESLint, Ruff, Cargo, Pytest

## Installation
Clone the repository and ensure tools are on your PATH.

```bash
pnpm install # workspace deps
```

## First Use
Run a search:
```bash
just scout "pattern" src/
```
Apply a codemod:
```bash
just codemod 'foo(:[x])' 'bar(:[x])' src/
```
