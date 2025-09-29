# Codemap Generator TDD Plan

## Research Reference

- Derived from `tasks/codemap-generator.research.md`.
- User supplied Python template for codemap generation; needs brAInwav branding and stack-specific heuristics.
- Existing TypeScript codemap script and npm `codemap` entry must be reconciled.

## Scope & Goals

- Provide a Python-based codemap generator under `scripts/codemap.py` that matches the contract (JSON + Markdown outputs) with Cortex-OS adjustments and supports multiple scopes (repo-wide, Nx package, Nx app, arbitrary path).
- Integrate additional automation surfaces: Makefile target, npm script alignment, and GitHub Actions workflow for PR artifacts while allowing scope selection through CLI arguments.
- Capture deeper stack insights (NestJS, Prisma, Kubernetes) and optional dependency graphs when supported by external tools.
  Record tool availability in the codemap JSON.
- Ship tests ensuring deterministic output slices, graceful degradation without optional binaries, enforcement of brAInwav-branded messaging, and correct behavior across scope/mode/tool selections.

## Non-Goals

- Replacing or deleting existing TypeScript analytics tooling beyond updating references to avoid duplication.
- Providing real coverage generation; tests will stub sample coverage files only.
- Enforcing installation of optional third-party tools (`lizard`, `madge`, `depcheck`, `pydeps`, `go`, `jdeps`); the script must degrade gracefully.

## Test Plan (Red → Green → Refine)

- **CLI contract**: running `python scripts/codemap.py --repo <fixture>` yields JSON/MD files and returns zero exit status.
  - Verify console output includes `brAInwav codemap` messaging.
- **Scope selection**: invoking the CLI with `--scope repo`, `--scope package:<name>`, and `--scope app:<name>` resolves the correct root directory (using Nx project metadata) and produces scoped codemaps.
- **Mode filtering**: supplying `--sections complexity,git` trims the JSON/Markdown to only requested sections while omitting others.
- **Tool-specific runs**: passing `--tools lizard,madge` triggers optional integrations and annotates availability per tool.
- **Language & size detection**: ensure fixture with TypeScript, Python, and Go files produces correct language counts and largest file ordering.
- **Hotspot sampling**: mock git log via `subprocess` call patching to verify window filtering and deduplication.
  Use `pytest` monkeypatch to override the `run` helper.
- **Complexity fallback**: simulate missing `lizard` binary to confirm `available=False` while script still emits outputs.
- **Endpoint heuristics**: ensure Express and Nest patterns in fixture produce expected HTTP endpoint entries.
- **Ops detection**: fixture should include Dockerfile, compose, k8s manifest, and Prisma schema to confirm classification.
- **Optional add-ons**: stub madge or depcheck commands (monkeypatch `run`) returning JSON/text.
  Verify script embeds data under `analysis.import_graph` and related keys.
- **Markdown summary**: confirm generated markdown contains headings and data slices (languages, hotspots, complexity, tests, endpoints, ops) and respects section filtering.
- **Configuration**: ensure `--since-days` overrides default in JSON notes.

## Implementation Steps

### Phase 1 — Skeleton & Utilities

- [ ] Port Python script scaffold with adjustments for brAInwav logging, Nx defaults, additional ignore directories, scope-aware CLI options, and section/tool filtering arguments.
- [ ] Extract helper functions for dependency graph detection, scope resolution (Nx project lookup), optional tool execution, coverage parsing, and HTTP heuristics (≤ 40 lines each).

### Phase 2 — Test Fixtures & Failing Tests

- [ ] Create pytest module under `scripts/__tests__/test_codemap.py` with fixture repository builder (temp dir + git repo initialisation).
- [ ] Implement tests enumerated above, using monkeypatching for subprocess interactions.
- [ ] Ensure tests fail prior to implementation (red).

### Phase 3 — Core Feature Implementation

- [ ] Implement filesystem traversal, language summarisation, git metadata, hotspots, and complexity integration via `lizard` detection that respects scoped root directory.
- [ ] Add HTTP heuristics tailored to NestJS decorators, Express routers, FastAPI definitions, and Go routers.
- [ ] Detect ops artifacts (Docker, compose, K8s, Prisma schema, Terraform, CI, env files).
- [ ] Incorporate optional deeper add-ons (madge, depcheck, pydeps, go mod graph, jdeps) with results or availability flags constrained to selected tools.
- [ ] Generate Markdown summary reflecting codemap data and honoring section filters.
- [ ] Ensure CLI prints brAInwav-branded success lines with scope/mode context.

### Phase 4 — Integration Surface Updates

- [ ] Update `package.json` script `codemap` to call the Python generator via `python3 scripts/codemap.py` and document scope flags.
- [ ] Append `codemap` target to `Makefile` capturing the recommended command with overridable scope/mode parameters.
- [ ] Add GitHub Actions workflow `codemap.yml` under `.github/workflows/` as per user instructions.
  Install `lizard`, run the Makefile target (default repo scope), and upload artifacts.

### Phase 5 — Documentation & Change Management

- [ ] Document codemap usage in `README.md` and `website/README.md` (short section referencing outputs, scope/mode/tool flags, and CI artifact).
- [ ] Add CHANGELOG entry summarizing codemap introduction.
- [ ] Provide implementation summary in a new or existing doc if needed.

### Phase 6 — Verification & Archive

- [ ] Run `pnpm lint`, `pnpm test`, `pnpm security:scan`, and `pnpm structure:validate` or targeted equivalents.
- [ ] Execute `python3 scripts/codemap.py --repo . --out out/codemap.json --md out/codemap.md --since-days 180` locally to ensure generator works.
- [ ] Archive checklist completion within local memory if required.

## Risks & Mitigations

- **Command availability**: use `shutil.which` + graceful JSON annotations to avoid failures when optional binaries absent.
- **Git state**: tests must initialise git repo within temp dir to exercise hotspot logic; fallback for non-git contexts needed.
- **File volume**: restrict large file reads (size limit) to avoid performance issues; keep JSON top-N trimmed.
- **CI policy**: document user-requested workflow addition to satisfy prohibition override rationale.

## Exit Criteria

- All tests (including new pytest suite) pass with ≥90% coverage for new module scope.
- Manual execution produces JSON+MD outputs with brAInwav-branded messages.
- CI workflow present and referencing Makefile target without breaking existing pipelines.
- Documentation and changelog updates merged; tasks checklist marked complete.
