# Codemap Runtime Readiness TDD Plan

## Objective
Ensure Python-backed codemap generation works everywhere the toolkit runs by provisioning dependencies, validating them preflight, and exposing configuration knobs.

## Test Plan (Red → Green → Refine)
1. **CI provisioning**
   - Add `actions/setup-python` to codemap-related workflows, then run `python3 scripts/codemap.py --repo . --scope repo --since-days 1 --out /tmp/codemap.json --md /tmp/codemap.md` (expected to fail before implementation).
   - Cache/install optional tools (`pip install lizard`) and assert CI passes after provisioning.
2. **Local dev bootstrap**
   - Update dev setup script to check `python3 --version` ≥ 3.9 and run a short codemap smoke command; write a test/shell spec to ensure it fails without Python.
3. **Container/VM images**
   - Adjust Dockerfiles to install Python + copy `scripts/codemap.py`; add integration test that builds the image and runs the smoke command via `docker run` (initially failing).
4. **Preflight/health hooks**
   - Extend existing quality gates (Makefile or scripts/ci) to `pnpm codemap -- --scope repo --since-days 1`; add unit/integration coverage to ensure failure bubbles up.
5. **Toolkit configuration coverage**
   - Add tests documenting `createAgentToolkit({ codemap: { pythonExecutable, scriptPath } })`; ensure non-default options route to the adapter.

## Implementation Steps
1. Update `.github/workflows/codemap.yml` (and other relevant pipelines) with Python setup, optional tool install, and codemap smoke run.
2. Modify local onboarding scripts/README to enforce Python requirement and run the smoke command; include instructions for installing optional tools.
3. Update container Dockerfiles to install Python, copy `scripts/codemap.py`, and add a container smoke stage in CI.
4. Wire codemap validation into preflight scripts/Makefile targets (`pnpm codemap ...`), with an opt-out env flag for emergencies.
5. Document configuration knobs in toolkit/README; add integration tests for custom `pythonExecutable`/`scriptPath` values.
6. Run full suite (`pnpm lint`, `pnpm test`, codemap smoke, container tests) and ensure CI passes.

## Acceptance Criteria
- CI fails with explicit messages when Python/codemap dependencies are missing and passes once provisioned.
- Local dev bootstrap halts with clear Python/codemap instructions if misconfigured.
- Containers/VMs include Python and codemap script; automated smoke tests succeed.
- Preflight/quality gates execute the codemap validation by default.
- Toolkit docs/tests show configurable codemap options validated via new tests.
