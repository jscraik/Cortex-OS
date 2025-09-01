<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

Security automation playbook

This folder contains scripts and CI workflow examples to implement supply-chain scanning, signing, verification, and basic auto-remediation stubs.

Files:

# Security automation playbook

This folder contains scripts, CI workflow examples, and runtime stubs to implement supply-chain scanning, signing, verification, DAST/fuzz testing, basic RASP hooks, and auto-remediation.

The goal is to provide an extensible starting point you can adapt to your apps and CI policies. The repository-level workflows and scripts intentionally keep defaults conservative; change thresholds and targets to match your risk appetite.

## Contents

- `signing.sh` — helper to sign/verify artifacts using `cosign`.
- `auto_remediate.sh` — basic script stub to attempt dependency patching and open a PR (requires `gh` CLI and credentials).
- `scorecard.sh` — generates a simple security scorecard from SCA outputs.
- `rasp/rasp-middleware.js` — minimal runtime middleware to capture TLS/auth failures and stream events to `infra/security/events/`.
- `fuzz/run-fuzz.js` — example `fast-check` fuzz runner that targets a local HTTP endpoint.

## CI integrations provided

- `.github/workflows/security-sca-and-signing.yml` — SCA scans and cosign signing/verification (lockfiles/artifacts).
- `.github/workflows/dast-and-fuzzing.yml` — runs OWASP ZAP baseline and a fast-check fuzzing job against a dev target. Adjust target URL and startup commands to fit your apps.

## Secrets and configuration (GitHub Actions)

Set these secrets in repository settings when enabling the workflows:

- `COSIGN_PUBKEY` — cosign public key used to verify key-based signatures (or store verifier config in CI/CD secrets).
- `SNYK_TOKEN` — optional Snyk API token for deeper SCA tests.
- `OSSINDEX_API_TOKEN` — optional OSS Index token if using OSS Index scans.

Optional configuration in workflows:

- `TARGET_URL` — override the default DAST/fuzzing target (default `http://localhost:3000`).
- `ZAP_FAIL_RISK` — risk threshold for ZAP to fail the job (1=Low, 2=Medium, 3=High).

## How to use locally

1. Install `cosign` for signing and verification: https://docs.sigstore.dev/cosign/
2. Sign a file locally:

```bash
./infra/security/signing.sh sign pnpm-lock.yaml
```

3. Verify with your public key:

```bash
export COSIGN_PUBKEY=/path/to/cosign.pub
./infra/security/signing.sh verify pnpm-lock.yaml
```

4. Run the fuzz harness against a running dev server (default `http://localhost:3000`):

```bash
node infra/security/fuzz/run-fuzz.js --target http://localhost:3000/api/test
```

## MLX developer notes

This repository includes optional MLX integrations used by `apps/cortex-py` (embedding, chat, and VLM helpers). These are considered "extras" and are not installed by default by the top-level Python lockfile unless you explicitly add them.

To install the MLX runtime extras into the project virtual environment (recommended for development):

```bash
# Add and lock the MLX-related packages (reproducible)
uv add mlx mlx-lm mlx-vlm transformers torch numpy faiss-cpu qdrant-client chromadb
uv sync

# Or, quick one-off (not recorded in uv.lock):
source .venv/bin/activate
python -m pip install mlx mlx-lm mlx-vlm transformers torch numpy faiss-cpu qdrant-client chromadb
```

After installing, run the MLX smoke test (example):

```bash
.venv/bin/python -c "from mlx.mlx_unified import MLXUnified; m=MLXUnified('test-chat-model'); print(m.model_type)"
```

Note: model weight downloads still occur when you call `load_model()` with a remote model path; use local model paths in CI or pre-cache Hugging Face/MLX caches to avoid network downloads during tests.

## RASP runtime stub

The `rasp/rasp-middleware.js` file is a minimal, dependency-free middleware you can mount in an Express/Koa app. It detects repeated authentication failures, TLS handshake errors (where surfaced by the runtime), and writes structured events to `infra/security/events/` for downstream processing by a security broker.

Design notes:

- Keep the middleware light and non-blocking; decisions to quarantine or block are left to an external controller that consumes events.
- By default the middleware behaves "fail-open" for availability: it logs and emits events but does not reject traffic unless configured to the fail-closed mode via environment variables.

## Fail-open vs Fail-closed

- Fail-open (default): security modules log and emit findings but avoid blocking runtime traffic — suitable for early-stage rollout.
- Fail-closed (strict): the system blocks offending clients immediately (recommended once detection/response pipelines are mature).

Control via environment variables in your runtime:

- `RASP_FAIL_CLOSED=true` — enable blocking/quarantine behavior.
- `RASP_BLOCK_THRESHOLD=5` — number of offenses before auto-quarantine.

## Extending the templates

- Update the DAST target in `.github/workflows/dast-and-fuzzing.yml` to the service/port your app exposes in CI.
- Tune ZAP thresholds and fast-check iterations for CI cost vs coverage.
- Integrate events with your A2A broker or SIEM by replacing the events sink with the appropriate publisher.

## Next steps to harden further

- Expand SCA: integrate SBOM generation (Syft) and verify upstream package provenance.
- Add reproducible build enforcement: pin compiler/tool versions and add build provenance checks.
- Replace auto-remediation stubs with safe automerges behind human review for high-risk fixes.

For any additions, create PRs and update this README with the concrete usage patterns.
