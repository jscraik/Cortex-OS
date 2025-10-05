# 1Password Env Integration Plan

## 1) File Tree of Proposed Changes

```text
.gitignore                               UPDATE – note 1Password-mounted env pipes
README.md                                UPDATE – highlight 1Password env workflow
docs/quick-start.md                      UPDATE – add setup link for secrets
docs/development/1password-env.md        NEW – detailed mounting + cleanup guide
scripts/utils/dotenv-loader.mjs          NEW – shared loader handling FIFO / prompts
scripts/nx-smart.mjs                     UPDATE – swap inline dotenv logic for loader
scripts/vitest-safe.mjs                  UPDATE – swap inline dotenv logic for loader
scripts/mlx/verify.mjs                   UPDATE – reuse loader, add prompt guidance
scripts/mlx/doctor.mjs                   UPDATE – reuse loader, add prompt guidance
scripts/deployment/docker-dev.sh         UPDATE – detect FIFO mounts, avoid overwrites
scripts/deployment/deploy-production.sh  UPDATE – same as above, add helper usage
packages/cortex-ai-github/src/server/start.ts        UPDATE – invoke shared loader
packages/cortex-semgrep-github/src/server/app.ts     UPDATE – invoke shared loader
packages/cortex-structure-github/src/server/app.ts   UPDATE – invoke shared loader
packages/agents/package.json             UPDATE – add npm script hook to warn if env missing
packages/agents/docs/configuration.md    UPDATE – reference new 1Password workflow
packages/memories/deployment/README.md   UPDATE – document mounted env expectations
docker/memory-stack/README.md            UPDATE – add 1Password env guidance
packages/memories/deployment/scripts/run.sh          UPDATE – ensure FIFO-friendly reads
tests/tools/dotenv-loader.test.ts        NEW – vitest coverage for loader fallbacks
CHANGELOG.md                             UPDATE – record 1Password env integration
```

## 2) Implementation Plan

1. **Create shared loader.** Add `scripts/utils/dotenv-loader.mjs` exporting `loadDotenv({ cwd, candidates, logger })`.
   Detect FIFOs with `fs.statSync().isFIFO()` and log brAInwav-branded guidance whenever a read requires authorization.

2. **Wire scripts to loader.** Replace inline dotenv calls in `scripts/nx-smart.mjs` and `scripts/vitest-safe.mjs`.
   Repeat the swap in `scripts/mlx/verify.mjs` and `scripts/mlx/doctor.mjs`.
   Pass candidate paths (`BRAINWAV_ENV_FILE`, `.env.local`, `.env`) and surface clear messaging if 1Password prompts.

3. **Harden deployment shell scripts.** Update `scripts/deployment/docker-dev.sh` and `scripts/deployment/deploy-production.sh`.
   Treat FIFO `.env` files as mounted assets.
   Skip auto-copy, trigger a `cat` read when authorization is needed, and emit brAInwav-branded warnings if mounts are unavailable.

4. **TypeScript services.** Introduce a lightweight wrapper (inline or shared per package).
   The wrapper should call `await import('../../../../scripts/utils/dotenv-loader.mjs')` during module bootstrap.
   Apply it to `cortex-ai-github`, `cortex-semgrep-github`, and `cortex-structure-github` servers.
   This keeps behavior consistent with 1Password-mounted env files.

5. **Package-level guidance.** Refresh READMEs for `packages/agents`, `packages/memories/deployment`, and `docker/memory-stack`.
   Document the following mount targets:

   - Root `.env`
   - `packages/agents/.env`
   - `packages/cortex-ai-github/.env`
   - `packages/cortex-semgrep-github/.env`
   - `packages/cortex-structure-github/.env`
   - `packages/memories/deployment/.env`
   - `docker/memory-stack/.env`
   - `infra/compose/.env.dev`

6. **Documentation.** Create `docs/development/1password-env.md` to capture mount steps, Git cleanup of plaintext envs, and team workflow.
   Link it from `README.md` and `docs/quick-start.md`.

7. **Git ignore annotations.** Comment in `.gitignore` that `.env` patterns cover 1Password-mounted FIFOs and reference the new workflow doc.

8. **Dev safeguards.** Add a prestart script entry in `packages/agents/package.json`.
   Use the Node helper to check for a mounted FIFO and print guidance if the mount is missing.

9. **Tests.** Add `tests/tools/dotenv-loader.test.ts` with vitest to confirm the loader selects the correct candidate order.
   Cover missing-path behavior, expected logging, and mocked `fs.statSync` FIFO scenarios while keeping new functions under the 40-line limit.

## 3) Technical Rationale

- Centralizing dotenv loading avoids duplicating FIFO detection and ensures every entrypoint understands 1Password semantics.
- Housing docs under `docs/development/` aligns with existing knowledge-base structure and keeps security guidance accessible.
- Updating shell scripts prevents them from overwriting the mounted pipe and gives users actionable feedback when authorization is required.
- Listing explicit directories reflects actual `.env.example` footprints, keeping mounts scoped to components that handle secrets.

## 4) Dependency Impact

- No new external packages; reuse existing `dotenv`.
- Internal dependency: scripts importing the shared helper; TypeScript code will import via dynamic `await import` to stay ESM-compatible.
- No environment variable changes beyond supporting optional `BRAINWAV_ENV_FILE`.

## 5) Risks & Mitigations

- **Risk: Loader misidentifies path** → Add unit tests covering FIFO detection and fallback ordering.
- **Risk: Shell scripts hang without authorization** → Implement timeout plus a brAInwav-branded message.
   The prompt should instruct the teammate to approve the 1Password authorization dialog.
- **Risk: TypeScript bundlers struggle with `.mjs` import** → Use dynamic `await import` and guard with try/catch.
   Add a fallback to legacy `dotenv.config()` if the helper fails.
- **Risk: Documentation drift** → Link the new doc from README and quick-start to keep onboarding consistent.

## 6) Testing & Validation Strategy

- Run `pnpm lint:smart`, `pnpm test:smart`, and targeted `vitest run tests/tools/dotenv-loader.test.ts`.
- Manual smoke: start `pnpm nx-smart lint` with 1Password mount present and absent to verify prompts.
- Shell smoke: execute `scripts/deployment/docker-dev.sh --check` with a dummy FIFO (use `mkfifo`) to confirm detection logic.
- Documentation lint: `pnpm docs:lint`.

## 7) Rollout / Migration Notes

- No feature flags; rollout is doc + tooling update.
- Teammates should delete legacy plaintext `.env` files before mounting; include `git rm` instructions.
- If issues arise, fallback is to set `BRAINWAV_ENV_FILE` to a standard plaintext file while troubleshooting.

## 8) Completion Criteria

- [ ] Shared loader in place, all targeted scripts updated.
- [ ] TypeScript entrypoints load env via helper without regressions.
- [ ] Documentation and README references published.
- [ ] Tests (unit + lint + smart suite) pass.
- [ ] CHANGELOG records the integration.
- [ ] Verified shell scripts respect 1Password FIFOs.
