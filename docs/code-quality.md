# Code Quality & Security Deep Dive

> Source-of-truth for automated quality gates, scanning philosophy, and baseline management.
> Developer style rules live in `CODESTYLE.md` (linked where relevant).

## Layers of Enforcement

| Layer | Purpose | Tools | Failure Effect |
|-------|---------|-------|----------------|
| Pre-commit | Instant local feedback (fast) | Biome, ESLint (subset), pattern-guard, .env presence | Block commit |
| Pre-push | Heavy validation | TypeScript project refs, Ruff, full lint, Semgrep focused, tests+coverage, structure guard | Block push |
| CI (PR) | Reproducible gates | Semgrep SARIF, SonarCloud (optional), license scan, dependency audit, SBOM (release) | Block merge |
| Nightly | Drift & supply-chain audit | Full Semgrep suite, license policy, dependency diff, secret scan | Open issues / alerts |
| Release | Compliance snapshot | SBOM, coverage freeze, provenance (future) | Block release if failing |

## Static Analysis Stack

| Domain | Tool | Rationale |
|--------|------|-----------|
| Formatting / style | Biome | Fast + unified TS/JS formatting & lint hints |
| Type correctness | tsc (incremental) | Contract safety, ensures project references intact |
| Python lint | Ruff | Fast, opinionated, security checks |
| Rust | Clippy + rustfmt | Enforce no warnings, consistent style |
| Security (code) | Semgrep | OWASP + custom patterns + LLM awareness |
| Secrets | pattern-guard + gitleaks | Early catch + deep scan |
| Architecture | structure validator / Nx | Enforce import boundaries & layering |
| Licensing | license-scanner.mjs | Policy-based license allow/deny |
| Code health metrics | SonarCloud (optional) | PR decoration & maintainability debt tracking |

## Semgrep Profiles

Current configs (see `.semgrep/`):

- `owasp-precise.yaml` – Core high-confidence security rules (fast)
- `owasp-top-10-improved.yaml` – Broader OWASP coverage
- `owasp-llm-top-ten.yaml` – LLM integration safety checks
- `mitre-atlas.yaml` – Adversarial simulation behaviors

### Baseline vs Diff Strategy

We maintain a stored baseline capturing existing (accepted) findings. New PRs must not
introduce *additional* findings of equal or higher severity unless explicitly justified.

Commands:

```bash
pnpm security:scan:baseline   # Recompute baseline (DO NOT run casually)
pnpm security:scan:diff       # Show only newly introduced findings
pnpm security:scan:ci         # CI raw scan (feeds SARIF)
```

Baseline regeneration workflow:

1. Create an issue: "Rotate Semgrep baseline <date>". *(Use ISO date e.g. 2025-09-06)*
2. Run `pnpm security:scan:baseline` locally.
3. Review diff; ensure only intended changes.
4. Commit with: `chore(security): refresh semgrep baseline` + link issue.
5. Ensure CI still passes (no surges in new findings).

## Baseline Regeneration Script (Planned)

A helper script (`scripts/security/semgrep-baseline-regenerate.mjs`) will:

- Refuse to run if git working tree dirty.
- Prompt for confirmation & issue reference.
- Run full baseline scan and stage result.

## Secrets Management

Tracked `.env` file: placeholder-only; real values sourced from:

- GitHub Actions secrets (`SONAR_TOKEN`, etc.)
- Developer secret manager (1Password / vault)
- Local untracked overlays (`.env.local` ignored)

Secret detection layers:

- `pattern-guard.sh` (staged diff) – regex for OpenAI, GitHub, Sonar, entropy.
- `gitleaks` (workflow + manual) – deep scan including history (HEAD scope by default).

## SonarCloud (Optional Tier)

`sonar-project.properties` config enables code smells, duplication, and security hotspot analysis.
If disabled, remove or limit `sonar.yml` workflow. Use when longitudinal maintainability
metrics are desired.

## License & Dependency Governance

Nightly + PR gates run `scripts/license/license-scanner.mjs` against `license-policy.json`.
Dependency drift diff (planned) will compare lockfile hash vs previous nightly artifact.

## Nightly Quality Workflow (Planned)

Planned tasks:

- Full Semgrep (all profiles)
- License scan
- Dependency diff (pnpm + Python uv lock)
- Secret scan (gitleaks)
- Optional SBOM regenerate (CycloneDX / Syft)
- Open a consolidated issue or update dashboard artifact.

## Secret Redaction Playbook

See `docs/secret-redaction.md` (to be added) for step-by-step:

- Rotate → Revoke → Replace
- Containment assessment
- History rewrite (filter-repo) vs forward rotation only
- Post-rotation validation checklist

## Adding New Rules / Tools

1. Propose via issue with rationale & false-positive assessment.
2. Add minimal failing test (if pattern-specific).
3. Add config under `.semgrep/` or tool-specific directory.
4. Run locally; measure added latency (<10% target per layer).
5. Open PR with profiling notes.

## Performance Targets

| Layer | Target Runtime |
|-------|----------------|
| Pre-commit | < 3s typical (cold < 6s) |
| Pre-push | < 90s full workspace |
| CI PR (node layer) | < 6 min end-to-end |
| Nightly | < 15 min (parallelizable) |

## Future Enhancements (Backlog)

- Coverage trend badge automation
- Supply-chain attestations (SLSA provenance)
- Policy-as-code integration (Open Policy Agent) for architecture
- Auto-comment summarizer for new security findings

## Cross References

- Developer style: `CODESTYLE.md`
- Security practices: `SECURITY.md`
- Architecture governance: `docs/architecture.md`
- Streaming & CLI modes: `docs/streaming-modes.md`

---
Maintainers: Update this document when adding or materially changing quality gates.
