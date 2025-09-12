# Testing & QA

Run unit tests:

```sh
pnpm test packages/mcp-core
```

Expectations:

- Coverage for client transports.
- Linting via `pnpm lint` at repo root.
- Use `pnpm biome:staged` before committing.
