# brAInwav Cortex Proof Artifact v0.2.0

The `cortex-os/proof-artifact` envelope is the canonical provenance record for Cortex-OS agent outputs. Version 0.2.0 aligns with SLSA v1 provenance, in-toto attestations, Sigstore signing, and OpenTelemetry Gen-AI semantic conventions.

## Required fields

- `proofSpec`: constant `cortex-os/proof-artifact`.
- `specVersion`: constant `0.2.0`.
- `artifact`: URI, MIME type, and SHA-256 content hash for the primary output.
- `context.public`: minimal, non-sensitive execution context (instructions, input pointers).
- `evidence`: immutable references (file blobs or URL snapshots) with hashed content.
- `runtime`: model identifier plus optional parameters/tooling versions.

## Optional fields

- `bundle`: manifest of additional files (`sha256` per entry, optional Merkle root).
- `context.sealedRef`: sealed context pointer for sensitive data (hash + URI).
- `trace`: OpenTelemetry trace identifiers (`traceId`, optional `rootSpanId`).
- `policyReceipts`: structured results for WCAG, OWASP LLM, license/SBOM audits.
- `attestations`: Sigstore/in-toto statements encoded as base64 JSON bundles.

## CLI workflow

```bash
# Build the package and create an envelope for ./report.md
pnpm --filter @cortex-os/proof-artifacts build
pnpm --filter @cortex-os/proof-artifacts exec cortex-proofs create \
  --artifact ./report.md \
  --mime text/markdown \
  --context '{"instruction":"summarize release"}' \
  --runtime '{"model":"gpt-5-codex"}'

# Verify hashes and schema
pnpm --filter @cortex-os/proof-artifacts exec cortex-proofs verify ./report.md.proof.json

# Sign with Sigstore (OIDC token provided by CI)
pnpm --filter @cortex-os/proof-artifacts exec cortex-proofs sign \
  ./report.md.proof.json \
  --issuer OIDC@GitHub \
  --identity-token "$ACTIONS_ID_TOKEN"
```

## Validation

1. **Schema** – JSON Schema 2020-12 enforced via Ajv in `createProofEnvelope` and `verifyProofEnvelope`.
2. **Hashes** – Artifact and bundle file SHA-256 values recomputed at verification time.
3. **Evidence** – File evidence validated against on-disk blobs; URL evidence requires pinned snapshots.
4. **Attestation** – Sigstore bundles decoded and verified against the configured trust root.
5. **Traceability** – `context.public` includes kernel proof identifiers and digest metadata for cross-checking.

## Integration notes

- Kernel exports `exportExecutionProofEnvelope` to translate deterministic proof artifacts into spec-compliant envelopes.
- Simple tests and contracts assert canonical structure, ensuring downstream agents consume the same schema.
- CI adds `proofs-verify` workflow to block merges when envelopes fail verification or signatures are missing.

For additional guidance see `packages/proof-artifacts/README.md` and the kernel integration tests.
