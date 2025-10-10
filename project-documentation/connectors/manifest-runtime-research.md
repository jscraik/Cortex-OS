# Research Document: Manifest-Driven Connectors Runtime

**Task ID**: `connectors-manifest-runtime`
**Created**: 2025-10-10
**Researcher**: AI Agent (GPT-5 Codex)
**Status**: Complete

---

## Objective

Investigate (1) how to share a single connectors manifest schema between TypeScript and Python, and (2) which React build pipeline best serves the ChatGPT Apps widget without relying on Vite, while satisfying brAInwav governance constraints (local-first, signed manifests, high coverage, WCAG 2.2 AA).

---

## Current State Observations

### Existing Implementation
- **Location**: `packages/asbr/src/api/server.ts` currently returns an empty `{}` for `/v1/connectors/service-map`.
- **Current Approach**: ExecutionSurfaceAgent uses hard-coded stubbed connectors; MCP bridge/server have single-proxy logic for “Pieces”.
- **Limitations**: No manifest contract, no signature validation, no shared schema, and no operator UI.

### Related Components
- **`schemas/service-map.schema.json`**: High-level draft schema for service map responses; not enforced anywhere.
- **`packages/workflow-common`**: Demonstrates Zod → JSON schema conversions (enforcement profile) we can emulate.
- **`apps/dashboard`**: Existing React build (Nx-managed) using Webpack that can serve as reference for app targets without Vite.

### brAInwav-Specific Context
- **MCP Integration**: MCP bridge requires RemoteToolProxy instances with telemetry hooks; connectors runtime must emit Prometheus metrics and structured logs with `brand:"brAInwav"`.
- **A2A Events**: No new events planned, but runtime must not bypass domain boundaries.
- **Local Memory**: Connectors will call Memory and Tasks APIs; manifest must enumerate scopes to honor least privilege.
- **Existing Patterns**: Governance mandates TDD, coverage ≥92%, functions ≤40 lines, named exports, and explicit environment configuration.

---

## External Standards & References

### Industry Standards
1. **JSON Schema Draft 2020-12**
   - **Relevance**: Canonical format for cross-language validation of manifest payloads.
   - **Key Requirements**: `$schema` field, type definitions, `additionalProperties` control, `$defs` for reuse.

2. **HMAC-SHA256 Signing (RFC 2104)**
   - **Relevance**: Shared signing mechanism for ASBR and Python runtime to guarantee manifest integrity.
   - **Key Requirements**: Stable canonicalization (sorted keys), time-bound TTL, key rotation strategy.

### Best Practices (2025)
- **Schema Sharing**: Use single source of truth (Zod/TypeBox) and generate language-specific artifacts automatically; avoid duplicating handwritten schemas.
- **React Micro-Frontends**: Webpack 5 with module output remains standard for embedding widgets in third-party runtimes when Vite is disallowed.
- **Python Config Management**: Pydantic `BaseSettings` for env/manifest validation; ensure deterministic error messages for ops.

### Relevant Libraries/Frameworks

| Library | Version | Purpose | License | Recommendation |
|---------|---------|---------|---------|----------------|
| `zod` | 3.23.x | TS runtime validation | MIT | ✅ Use |
| `zod-to-json-schema` | 3.22.x | Generate JSON Schema from Zod | MIT | ✅ Use |
| `pydantic` / `pydantic-settings` | 2.6.x | Python model validation | MIT | ✅ Use |
| `openai-agents` | ≥0.3.3 | Official OpenAI Agents SDK (Python) for MCP servers | MIT | ✅ Use |
| `webpack` | 5.95.x | React bundler with module output | MIT | ✅ Use |
| `babel-loader` | 9.x | Transpile TS/JS for Webpack | MIT | ✅ Use |
| `esbuild` | 0.24.x | Alternative bundler; lacks native HTML pipeline | MIT | ⚠️ Evaluate |
| `create-react-app` | 5.0.x | React scaffolding using Webpack | MIT | ⚠️ Evaluate (needs eject for ESM) |

---

## Technology Research

### Option 1: Zod → JSON Schema Pipeline (TypeScript source of truth)

**Description**: Define manifest schema in TypeScript using Zod, generate JSON schema via `zod-to-json-schema`, commit generated artifact under `schemas/`, and load the same JSON schema in Python (Pydantic `TypeAdapter` with `json_schema` loader + custom validator).

**Pros**:
- ✅ Single source of truth close to ASBR implementation.
- ✅ CI can diff generated schema to detect drift.
- ✅ Easy to enforce extra TS-only helpers (type inference) while keeping Python aligned.

**Cons**:
- ❌ Requires build step to regenerate JSON schema.
- ❌ Slightly slower startup if Python re-validates large schema at runtime.

**brAInwav Compatibility**:
- Aligns with `packages/workflow-common` precedent.
- Enables structural validation before signing; satisfies Constitution requirement for evidence-backed changes.
- Security: ensures Python runtime rejects unexpected fields.

**Implementation Effort**: Medium (introduce generator script + Nx target).

### Option 2: Hand-Maintained JSON Schema

**Description**: Write `schemas/connectors-manifest.schema.json` manually and import into both languages.

**Pros**:
- ✅ No generation tooling required.
- ✅ Immediate parity between languages.

**Cons**:
- ❌ High drift risk; manual updates error-prone.
- ❌ No TypeScript type inference; developers must manually sync interfaces.
- ❌ Harder to extend with derived types (e.g., strongly-typed connectors registry).

**brAInwav Compatibility**:
- Violates “evidence-based” expectations due to manual sync risk.

**Implementation Effort**: Medium (but ongoing maintenance overhead).

### Option 3: OpenAPI / JSON Schema via FastAPI

**Description**: Define manifest schema in Python (Pydantic models), export OpenAPI, and consume in TypeScript using `openapi-typescript`.

**Pros**:
- ✅ Rich auto-generated docs.
- ✅ Pydantic-first approach fits Python runtime closely.

**Cons**:
- ❌ ASBR is TypeScript-first; shifting source of truth to Python complicates build order.
- ❌ Additional tooling to convert OpenAPI to Zod or TS types.
- ❌ Harder to integrate with existing Nx pipelines.

**brAInwav Compatibility**:
- Would require governance approval to move source of truth away from ASBR domain.

**Implementation Effort**: High.

---

### React Widget Build Options & OpenAI Apps SDK

#### Option A: Webpack 5 (Module Output)

**Description**: Use Webpack 5 with `experiments.outputModule = true` to emit ESM bundles, plus `webpack-dev-server` for local dev. Configure Babel for JSX/TypeScript and `mini-css-extract-plugin` for styles.

**Pros**:
- ✅ Mature ecosystem; Nx already has Webpack integrations.
- ✅ Supports module output for ChatGPT Apps consumption.
- ✅ Easy to integrate with Jest, Testing Library, and the official OpenAI Apps SDK.

**Cons**:
- ❌ Slightly slower dev server than Vite.
- ❌ Manual configuration required for optimal DX.

**brAInwav Compatibility**:
- Aligns with existing non-Vite apps; no new tooling approvals required.
- Security/perf budgets manageable via Webpack bundle analyzer.

**Implementation Effort**: Medium.

#### Option B: esbuild + Custom Scripts

**Description**: Write build scripts invoking `esbuild` API to bundle React widget, produce HTML via template plugin, and run dev server using `serve` or custom express server.

**Pros**:
- ✅ Very fast builds.
- ✅ Minimal dependencies.

**Cons**:
- ❌ Need to hand-roll many features (HMR, CSS handling, environment injection).
- ❌ Integrations (eslint, jest) need additional glue.

**brAInwav Compatibility**:
- Additional custom scripts increase maintenance overhead; risk of missing governance toggles.

**Implementation Effort**: High.

#### Option C: Create React App (CRA)

**Description**: Use `create-react-app` with TypeScript template and eject to customize output to modules.

**Pros**:
- ✅ Familiar DX.
- ✅ Batteries-included testing (Jest) and linting.

**Cons**:
- ❌ CRA is in maintenance mode; ejecting complicates upgrades.
- ❌ Produces IIFE bundles by default; would require heavy customization for ESM.

**brAInwav Compatibility**:
- Ejected CRA increases repo complexity; not aligned with preference for lightweight tooling.

**Implementation Effort**: Medium-High (due to required eject/customization).

---

## Comparative Analysis

| Criteria | Zod→JSON Schema | Hand JSON Schema | Python OpenAPI |
|----------|-----------------|------------------|-----------------|
| Performance | ✅ Single parse | ✅ Single parse | ✅ Single parse |
| Security | ✅ Strong (type-safe) | ⚠️ Manual drift risk | ✅ Strong |
| Maintainability | ✅ Automated | ❌ Manual sync | ⚠️ Cross-language tooling |
| brAInwav Fit | ✅ Mirrors enforcement profile workflow | ❌ Contradicts evidence-driven mandate | ⚠️ Moves source of truth |
| Community Support | ✅ Active | ✅ (generic) | ✅ |
| License | MIT | N/A | MIT |

| Criteria | Webpack 5 | esbuild Custom | CRA |
|----------|-----------|----------------|-----|
| Performance | ⚠️ Moderate dev speed | ✅ Fast | ⚠️ Moderate |
| Security | ✅ Mature ecosystem | ⚠️ Custom hardening needed | ✅ |
| Maintainability | ✅ Known patterns | ❌ Custom scripts | ⚠️ Ejected config |
| brAInwav Fit | ✅ Matches existing packages | ⚠️ Additional governance review | ⚠️ Maintenance mode |
| Community Support | ✅ Large | ✅ Large | ⚠️ Declining |
| License | MIT | MIT | MIT |

---

## Recommended Approach

**Selected**: Option 1 (Zod→JSON Schema) + Option A (Webpack 5 module output) with the official OpenAI Apps SDK as the Apps runtime interface.

**Rationale**:
- Keeps TypeScript (ASBR) as manifest authority while providing generated, auditable artifacts for Python. CI can run `pnpm manifest:schema` to ensure parity, satisfying Constitution requirements for documented evidence.
- Webpack 5 matches existing brAInwav React apps, avoids introducing Vite, and supports module output for ChatGPT Apps. Jest integrates seamlessly, allowing coverage and accessibility testing per package AGENTS mandates, and plays nicely with the OpenAI Apps SDK client initialization lifecycle.
- Both choices minimize drift risk and align with local-first, signed manifest goals. Security posture remains strong with HMAC signatures and controlled build tooling.

**Trade-offs Accepted**:
- Slightly slower dev server compared to Vite, mitigated via Webpack incremental builds and HMR.
- Need to maintain schema generation pipeline, but automation/CI reduces manual burden.

---

## Constraints & Considerations

### brAInwav-Specific Constraints
- ✅ Local-first: Manifest stored locally; connectors server loads from disk; no extra remote dependencies.
- ✅ Zero Exfiltration: React app only consumes connectors API; no analytics unless approved.
- ✅ Named Exports & Function Size: Ensure generated TypeScript code follows CODESTYLE.
- ✅ Branding: Include `brand:"brAInwav"` in JSON responses, telemetry, and UI messages.

### Technical Constraints
- Nx monorepo needs project configuration for new React app and Python package; ensure targets integrate with `pnpm build:smart`.
- Performance budgets: ChatGPT widget must meet LCP/TBT constraints; Webpack bundle analyzer to enforce size budget.
- Cross-platform support: Webpack config must run on macOS/Linux; Python dependencies pinned in `python/uv.lock`.

### Security Constraints
- Enforce API-key headers; connectors manifest must not expose secrets.
- Sign all service map payloads; add health checks for signature presence.
- Ensure React build outputs hashed filenames to reduce cache poisoning risk.

### Integration Constraints
- Connectors server must serve static assets from bundle directory while proxying MCP tools.
- ExecutionSurfaceAgent must respect TTL to avoid stale manifests.
- Documentation updates required in `docs/connectors/openai-agents-integration.md` and `docs/operators/chatgpt-connector-bridge.md`.

---

## Next Steps

1. Implement Zod schema + generator script -> JSON schema artifact.
2. Scaffold Webpack-based React app under `apps/chatgpt-dashboard` with Jest + Testing Library.
3. Update spec/TDD plan and package docs to reference Webpack (not Vite).
4. Proceed with Phase 0 scaffolding per TDD plan.
