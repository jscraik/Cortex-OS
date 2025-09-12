# User Guide

## Searching Code
```bash
just scout "MyPattern" src/
```
Outputs JSON matches from ripgrep, semgrep and ast-grep.

## Running Codemods
```bash
just codemod 'foo(:[x])' 'bar(:[x])' src/
```
Review the diff and apply with `tools/patch_apply.sh`.

## Validating Changes
```bash
changed=$(git diff --name-only)
./agent-toolkit/tools/run_validators.sh "$changed"
```
