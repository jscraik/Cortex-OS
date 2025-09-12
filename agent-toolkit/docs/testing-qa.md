# Testing & QA

Run repository checks before committing:
```bash
pnpm biome:staged
pnpm lint
pnpm test
pnpm docs:lint
```
`tools/run_validators.sh` can be used on a file list to execute ESLint, Ruff, Cargo and Pytest selectively.
