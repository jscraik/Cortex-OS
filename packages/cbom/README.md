# @cortex-os/cbom

The Context Bill of Materials (CBOM) package captures AI run context, policies, and
tooling activity in Cortex-OS. It turns OpenTelemetry Gen-AI spans, A2A tool routing,
and RAG evidence into a deterministic JSON artifact that can be signed and exported to
CycloneDX ML-BOM.

## Usage

```bash
pnpm cbom:record -- --output=reports/cbom/latest.cbom.json
pnpm cbom:attest -- --input=reports/cbom/latest.cbom.json --bundle=reports/cbom/latest.intoto.json
pnpm cbom:verify -- --bundle=reports/cbom/latest.intoto.json
pnpm cbom:export -- --input=reports/cbom/latest.cbom.json --format=cyclonedx-mlbom
```

See `docs/cbom-overview.md` for details on governance alignment and compliance notes.
