# ASBR Technical Review & TDD Plan

## Technical Review

- The main entry point bootstraps XDG directories, authentication, an Express API server, and a paired client before returning tokenized access, concentrating initialization into a single asynchronous helper.
- Configuration management relies on a handcrafted `deepMerge` that overwrites arrays and primitives, then validates merged results against zod schemas, with hard-coded defaults for event handling and deterministic normalization.
- Authentication middleware restricts requests to loopback clients and demands Bearer tokens, but error responses expose only a generic `error` field without machine-readable codes.
- Unit tests in `tests/build-output.test.ts` reveal an unresolved build artifact check—this test fails because compiled files expected from the `scripts/build.ts` process are missing, signaling brittle coupling between the test and the build setup.

## Engineering Principle

**Deterministic Validation Contract:** Every external input, build artifact, and runtime state must be deterministically validated and surfaced through structured error codes, with automated tests covering both success and failure paths before any implementation is merged.

## TDD-Driven Implementation Plan

1. **Build Artifact Integrity**

   - Write a failing test that asserts `pnpm test` triggers a build or mocks compiled output.
   - Implement minimal changes (e.g., pre-test build hook or revised test logic) until the test passes.
   - Commit: `test(asbr): ensure build artifacts exist before unit run`.

2. **Safe Deep-Merge Utility**

   - Introduce a failing unit test capturing nested-object and array merge expectations.
   - Refactor `deepMerge` into a utility module and implement correct array handling.
   - Commit: `feat(core): add robust deep-merge with array support`.

3. **Configurable Cache TTLs**

   - Start with a failing integration test verifying cache TTL is read from config.
   - Extend `DEFAULT_CONFIG`, zod schemas, and server initialization to honor a `cache_ttl_ms` value.
   - Commit: `feat(server): make cache TTL configurable`.

4. **Structured Error Responses**

   - Add failing tests asserting every API error includes `{ error, code }`.
   - Update middleware and handlers to supply consistent error codes.
   - Commit: `feat(api): standardize error response structure`.

5. **Release Readiness Gate**
   - Create a failing CI test that runs `pnpm lint`, `pnpm test`, and a smoke deployment.
   - Add make/CI script ensuring the gate passes before release tags.
   - Commit: `ci(asbr): enforce release readiness checks`.
