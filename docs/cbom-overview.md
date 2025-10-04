# Context Bill of Materials (CBOM)

The Context Bill of Materials captures the runtime context, tooling, and policy
evidence that surround Cortex-OS agent executions. CBOM documents follow the
schema stored in `schemas/cbom.schema.json` and are emitted by the
`@cortex-os/cbom` package.

## CLI workflow

```bash
pnpm cbom:record                # writes reports/cbom/latest.cbom.json
pnpm cbom:attest                # signs the CBOM with an Ed25519 attestation
pnpm cbom:verify                # checks signature and digest integrity
pnpm cbom:export -- --format cyclonedx-mlbom
```

The CLI is wired to Nx targets so `pnpm op:build` and
`scripts/development/release-gate.sh` automatically record, attest, and verify
CBOM artifacts.

## Viewer

`apps/cbom-viewer` provides an accessible React dashboard for inspecting CBOM
files. Launch it locally with:

```bash
pnpm nx serve @cortex-os/cbom-viewer
```

The viewer validates uploaded files against the shared schema using Ajv before
rendering run metadata, policy results, and captured tool calls.

## Attestation and retention

Attestations conform to the in-toto statement structure and carry an Ed25519
signature. Retention defaults to six months to align with EU AI Act
record-keeping expectations; adjust the `retention` field in emitted CBOMs to
reflect environment-specific requirements.
