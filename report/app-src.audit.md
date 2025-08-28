# Cortex-OS App Source Audit

## Composition Root

- `src/index.ts` invokes `startRuntime()` immediately and logs start or failure, causing side effects on import.

## Providers & Dependency Injection

- `src/boot.ts` constructs an Inversify container, binds memories, orchestration, and MCP providers, then validates bindings. The module exports a container instance created at import time.
- Telemetry spans record container validation outcomes.

## Routing

- `src/boot/a2a.ts` wires an in-process bus and binds a health handler.

## Environment Bootstrap

- No environment schema or configuration module is present; environment variables are never validated.

## Checks

- **Side-effect order:** container and runtime initialization occur at module load.
- **Dependency injection:** Inversify container uses constant bindings without feature toggles.
- **Feature toggles:** none found.
- **Logging early init:** only telemetry span in container validation.

## Fix Plan

1. Introduce a single bootstrap `createApp()` that configures logging, validates env with Zod, builds the container, and returns a starter function. Avoid top-level side effects.
2. Move `container = createContainer()` into the bootstrap and export only factory methods.
3. Add feature toggle service injecting flags into the container.
4. Implement environment schema module and tests.
5. Expand routing tests to cover additional handlers as features grow.

## Score

| Area                  | Score (1-5) |
| --------------------- | ----------- |
| Side-effect isolation | 2           |
| Dependency injection  | 4           |
| Feature toggles       | 1           |
| Logging init          | 3           |
| Env bootstrap         | 1           |
| **Overall**           | **2.2/5**   |
