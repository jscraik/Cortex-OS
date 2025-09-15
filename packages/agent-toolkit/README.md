# Agent Toolkit

Unified agent-friendly interfaces for code search, validation, codemods, diagnostics, and observability. Provides:

- Shell wrappers that emit single JSON envelopes (stable machine contract)
- Type-safe programmatic API (`createAgentToolkit`)
- Diagnostics + Prometheus/OpenTelemetry metric helpers
- Homebrew formula generator for packaging
- JSON Schema + Zod contracts for diagnostics output

## Available tools

- `rg_search.sh` – ripgrep regex search
- `semgrep_search.sh` – Semgrep rules search
- `astgrep_search.sh` – AST-grep structural search
- `comby_rewrite.sh` – Comby structural rewrite
- `difftastic_diff.sh` – structural diff review
- `eslint_verify.sh` – JavaScript/TypeScript linting
- `ruff_verify.sh` – Python linting
- `cargo_verify.sh` – Rust tests
- `pytest_verify.sh` – Python tests
- `run_validators.sh` – auto run validators based on changed files
- `treesitter_query.sh` – Tree-sitter query helper
- `patch_apply.sh` – safe patch apply with backup

### Diagnostics & Observability

- `runDiagnostics()` (TS API) – executes `scripts/mcp/mcp_diagnose.sh --json` and validates output
- `generatePrometheusMetrics(result)` – converts diagnostics JSON to exposition format
- `agent-toolkit-diagnostics` (CLI) – JSON output by default, `--prom` for metrics
- OpenTelemetry meters: `diagnostics_runs_total`, `diagnostics_runs_failed_total`, `diagnostics_health_latency_ms`

JSON Schema (machine validation): `schemas/diagnostics.schema.json`

Zod contract: `diagnosticsResultSchema` exported from `@cortex-os/contracts`

## Usage

See the `Justfile` for examples:

```sh
just help
just scout "pattern" path
just codemod 'find(:[x])' 'replace(:[x])' path
just verify changed.txt
just tsq '(function_declaration name: (identifier) @name)' src/
```

### Programmatic (TypeScript)

```ts
import { runDiagnostics, generatePrometheusMetrics } from '@cortex-os/agent-toolkit';

const result = await runDiagnostics();
console.log(result.summary.overall);
console.log(generatePrometheusMetrics(result));
```

### CLI Diagnostics

```bash
pnpm build # ensure dist artifacts
npx agent-toolkit-diagnostics            # JSON
npx agent-toolkit-diagnostics --prom     # Prometheus metrics
```

### Homebrew Formula Generation

```ts
import { generateHomebrewFormula } from '@cortex-os/agent-toolkit';
console.log(
  generateHomebrewFormula({ repo: 'jamiescottcraik/Cortex-OS', version: '0.1.0', sha256: 'REPLACE_SHA256' })
);
```

### JSON Schema Validation (External Consumer)

```bash
ajv validate -s schemas/diagnostics.schema.json -d diagnostics_sample.json
```

### Metrics Mapping

| Metric | Type | Purpose |
| ------ | ---- | ------- |
| `diagnostics_runs_total` | counter | Count of all diagnostic executions |
| `diagnostics_runs_failed_total` | counter | Count of failed executions (script or schema parse) |
| `diagnostics_health_latency_ms` | histogram | Health probe latency distribution |

### Exit Codes (Underlying Script)

| Code | Meaning |
| ---- | ------- |
| 0 | All OK |
| 2 | Port guard intervened but overall OK |
| 3 | Health probe failure |
| 4 | Tunnel validation failure |
| 10 | Multiple failures |

### Contract Evolution Policy

Diagnostics schema changes follow additive-first policy:

- Adding optional fields: non-breaking
- Tightening enums / removing fields: introduce new version field if needed
- Always update both: Zod contract + JSON Schema + contract test

### OpenTelemetry Integration

The diagnostics module uses `@opentelemetry/api` only; you must register a meter provider & exporter in your host to surface metrics:

```ts
import { metrics } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/sdk-metrics';

const provider = new MeterProvider();
metrics.setGlobalMeterProvider(provider);
// configure exporter (Prometheus, OTLP, etc.)
```

### Security Notes

Diagnostics script execution shell-spawns a local repo script; avoid passing untrusted workspace contents
without review. Output schema validation guards downstream consumers.
