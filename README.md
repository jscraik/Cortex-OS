# Cortex-OS

## 🚨 CRITICAL: brAInwav Production Standards

**ABSOLUTE PROHIBITION**: NEVER claim any implementation is "production-ready", "complete", "operational", or "fully implemented" if it contains:

- `Math.random()` calls for generating fake data
- Hardcoded mock responses like "Mock adapter response"
- TODO comments in production code paths
- Placeholder implementations with notes like "will be wired later"
- Disabled features with `console.warn("not implemented")`
- Fake system metrics or data generation

**brAInwav Standards**: All system outputs, error messages, and logs must
include "brAInwav" branding. Status claims must be verified against actual code
implementation.

**Reference**: See `.cortex/rules/RULES_OF_AI.md` for complete production standards.

---

<!-- markdownlint-disable MD013 -->

![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)
![Node.js Version](https://img.shields.io/badge/node-20.x%20or%2022.x-brightgreen)
![Package Manager](https://img.shields.io/badge/pnpm-10.3.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Test Coverage](https://img.shields.io/badge/coverage-90%25+-brightgreen)
![Security Scan](https://img.shields.io/badge/security-OWASP%20compliant-green)
![Code Quality](https://img.shields.io/badge/code%20quality-A-brightgreen)
![Smart Nx Mode](https://img.shields.io/badge/Smart%20Nx-Active-success)
<img alt="Branch Coverage" src="https://raw.githubusercontent.com/jamiescottcraik/Cortex-OS/main/reports/badges/branch-coverage.svg" />
<img alt="Mutation Score" src="https://raw.githubusercontent.com/jamiescottcraik/Cortex-OS/main/reports/badges/mutation-score.svg" />
<img alt="Quality Gate" src="https://raw.githubusercontent.com/jamiescottcraik/Cortex-OS/main/reports/badges/quality-gate.svg" />
<img alt="Branch Trend" src="https://raw.githubusercontent.com/jamiescottcraik/Cortex-OS/main/reports/badges/branch-trend.svg" />

<!-- BRANCH_TREND_INLINE_START -->
<!-- Inline branch coverage sparkline will be auto-embedded here by `pnpm sparkline:inline` once enough history exists. -->
<!-- BRANCH_TREND_INLINE_END -->

<!-- Future: replace static coverage badge with dynamic endpoint (GitHub Pages JSON endpoint reading reports/coverage-badge.json) -->

<!-- markdownlint-enable MD013 -->

## 🔧 Agent Toolkit (MANDATORY)

The `packages/agent-toolkit` provides a **unified, contract-driven interface** for all development  
operations. This toolkit is **REQUIRED** for maintaining monorepo uniformity and code quality.

### Core Integration Pattern

```typescript
import { createAgentToolkit } from '@cortex-os/agent-toolkit';

const toolkit = createAgentToolkit();
// Use TypeScript interface for programmatic access
await toolkit.multiSearch('pattern', './src');
await toolkit.validateProject(['*.ts', '*.py', '*.rs']);
```

### Shell Interface (Just Recipes)

- `just scout "pattern" path` - Multi-tool search (ripgrep + semgrep + ast-grep)
- `just codemod 'find(:[x])' 'replace(:[x])' path` - Structural modifications
- `just verify changed.txt` - Auto-validation based on file types

### When Agents MUST Use Agent-Toolkit

1. **Code Search Operations** - Instead of raw grep/rg commands
2. **Structural Modifications** - For any refactoring or codemod operations  
3. **Quality Validation** - Before commits, PRs, or code changes
4. **Cross-Language Tasks** - Unified interface for TypeScript/Python/Rust
5. **Pre-Commit Workflows** - Automated validation pipelines

### Architecture Compliance

Agent-toolkit follows Cortex-OS principles:

- **Contract-first**: Zod schemas ensure type safety
- **Event-driven**: A2A integration ready
- **MCP compatible**: Tool exposure for agent consumption
- **Layered design**: Clean domain/app/infra separation

---

## 🚀 Smart Nx Execution (Affected-Only)

Use smart wrappers instead of blanket `run-many`:

```bash
pnpm build:smart       # affected build with base/head auto-detect
pnpm test:smart        # affected test
pnpm lint:smart        # affected lint
pnpm typecheck:smart   # affected typecheck

# Dry-run mode (preview affected projects without execution)
pnpm build:smart --dry-run
node scripts/nx-smart.mjs test --dry-run
```

Features:

- Detects `base` / `head` via `NX_BASE`, `NX_HEAD` or previous commit fallback.
- Preflight `nx print-affected` summary (fast fail + transparency).
- Falls back to full run only if diff cannot be resolved (warns explicitly).
- Emits: `[nx-smart] target=<t> base=<sha> head=<sha> changed=<n> strategy=affected|all`.

Override interactive (rare / local only):

```bash
CORTEX_NX_INTERACTIVE=1 pnpm build:smart
```

## 🤖 Non-Interactive Nx Mode

Default behavior sets `NX_INTERACTIVE=false` (and `CI=true` if unset) ensuring no prompts (no `h`/`q`).
`--no-interactive` is applied only to Nx CLI – not forwarded to underlying tools (`tsc`, `vitest`, `tsup`).

Why: deterministic CI logs, lower cognitive load for agents, consistent caching decisions.

Diagnostics examples:

```text
[nx-smart] target=test base=<sha> head=<sha> changed=<n> strategy=affected
```

Dry-run output:

```text
📋 Affected Projects Summary:
Target: build
Base: origin/main
Head: abc123
Changed files: 15
Affected projects: @cortex-os/agents, @cortex-os/mcp-core

💡 To execute: pnpm build:smart
```

Fallback warning:

```text
[nx-smart][warn] unable to resolve git diff – falling back to full run-many
```

Add new automation using smart scripts rather than chaining raw `nx run-many`.

---

### Latest Maintenance

- **2025-09-27** – Reinforced the brAInwav Prisma bootstrap in `apps/api` so
  `pnpm --filter @cortex-os/api build` stays green with mutable logging and
  fallback delegates aligned to brAInwav standards.
- Implementation staged: Added a `.well-known/mcp.json` discovery manifest in
  `packages/cortex-mcp/cortex_fastmcp_server_v2.py` so ChatGPT MCP connectors
  can discover the brAInwav endpoint. Deploy and verify with
  `curl https://cortex-mcp.brainwav.io/.well-known/mcp.json` before rerunning
  connector setup.

---

## Autonomous Software Behavior Reasoning (ASBR) Runtime

Clean, governed monorepo with strict architectural boundaries and
comprehensive quality gates.

[Documentation](./README.md#documentation) • [Quick Start](./docs/quick-start.md) •
[Architecture](./docs/architecture-overview.md) • [Python Integration](./docs/python-integration.md) •
[Contributing](./README.md#contributing) • [Packages](./README.md#packages)

---

## 📊 Quality Gate & Metrics

Automated quality signals are produced on every CI run and surfaced as static badges + an inline sparkline:

### Thresholds

#### PR Gate Requirements (Must Pass)

These are **mandatory minimums** for PR merges:

| Metric | PR Gate Minimum | Env Override |
|--------|----------------|-------------|
| Branch Coverage | 65% | `BRANCH_MIN` |
| Mutation Score  | 75% | `MUTATION_MIN` |

The composite gate passes only if BOTH thresholds are met. Customize via:

```bash
BRANCH_MIN=85 MUTATION_MIN=80 pnpm badges:generate
```

#### Aspirational Baselines (Target Goals)

These are the **target coverage expectations** configured in `vitest.config.ts`:

| Metric | Target | Environment Variable |
|--------|--------|--------------------||
| Statements | 90% | `COVERAGE_THRESHOLD_STATEMENTS` |
| Branches | 90% | `COVERAGE_THRESHOLD_BRANCHES` |
| Functions | 90% | `COVERAGE_THRESHOLD_FUNCTIONS` |
| Lines | 95% | `COVERAGE_THRESHOLD_LINES` |

### CI Enforcement

Workflow: `.github/workflows/ci-quality-gate.yml` runs:

1. Coverage sampling (`pnpm coverage:branches:record`)
2. Mutation testing (`pnpm mutation:test`)
3. Badge + metrics generation (`pnpm badges:generate`)
4. Gate enforcement (`pnpm quality:gate`)

Failure returns a non‑zero exit code and blocks the PR with a required status check.

### Inline Sparkline

The inline sparkline between `BRANCH_TREND_INLINE_START/END` markers is injected by:

```bash
pnpm sparkline:inline
```

Generation order (if running locally):

```bash
pnpm coverage:branches:record   # Adds a sample & updates history
pnpm mutation:test              # Produces Stryker JSON
pnpm badges:generate            # Writes badges + metrics + trend
pnpm sparkline:inline           # Embeds data URI sparkline into README
```

### Mutation Operator Effectiveness

Stryker output is aggregated to provide detection rates per operator. View:

```text
reports/badges/mutation-operators-summary.md
```

Columns:

### metrics.json Structure

```jsonc
{
  "branchCoverage": 87.5,
  "mutationScore": 78.3,
  "qualityGate": { "pass": true, "branchMin": 65, "mutationMin": 75 },
  "branchSamples": 12,
  "mutationSamples": 12,
  "generatedAt": "2025-01-01T12:34:56.000Z"
}
```

### Why Static SVGs?

Deterministic, cache‑friendly artifacts (content-addressable in Git history)
reduce API latency and allow offline inspection while still enabling future
evolution to dynamic endpoints (e.g., GitHub Pages JSON → Shields endpoint
pattern) without breaking existing consumers.

## Overview

Cortex-OS is a production-ready **Autonomous Software Behavior Reasoning (ASBR)
Runtime** enabling AI agents to collaborate through event-driven architecture
and Model Context Protocol (MCP) integrations. The system implements strict
governance boundaries, comprehensive testing, and security practices.

### 🎯 Key Features

- **🤖 AI Agent Orchestration** – Multi-agent workflows with A2A communication
- **🔌 MCP Integration** – Standardized tool integration via MCP
- **🛡️ Security First** – OWASP compliance, SBOM generation, vulnerability scanning
- **📊 Observability** – Monitoring, tracing, analytics hooks
- **🏗️ Governed Architecture** – Import boundaries (ESLint + Nx)
- **🧪 Quality Gates** – 65% branch coverage (PR gate) + 90% test coverage targets & automated scans
- **🚀 Production Ready** – Docker deployment & CI/CD pipelines
- **🎯 Reality Filter** – Truthfulness verification and accuracy validation for all AI agents

---

## Quick Start (Condensed)

See the full guide: [docs/quick-start.md](./docs/quick-start.md)

```bash
git clone https://github.com/jamiescottcraik/Cortex-OS.git
cd cortex-os

# Run automated setup (installs deps, auto-trusts mise, sets up hooks, lints, validates structure)
./scripts/dev-setup.sh

# For a minimal setup with lightweight hooks:
# ./scripts/dev-setup.sh --minimal

# Optional: customize workspace home (defaults to ~/.Cortex-OS)
export CORTEX_OS_HOME="$HOME/.Cortex-OS"

# Verify installation
pnpm readiness:check
pnpm dev
```

Helpful:

```bash
pnpm build
pnpm test:coverage
pnpm security:scan
pnpm structure:validate
pnpm test:integration:langgraph   # LangGraph integration harness suite

# Husky-only hooks
# Manually run a quick pre-commit equivalent if needed:
pnpm biome:staged  # format + lint staged files
pnpm test:safe     # safe, minimal tests



## Architecture Snapshot

High‑level governed monorepo:

- UI + runtime apps mount feature packages via DI
- Feature packages communicate via **A2A events** and **MCP tools**
- Contracts + schemas in `libs/typescript/contracts`
- Governance rules & structure validation in `.cortex/`

More detail: [Architecture Overview](./docs/architecture-overview.md) • Full reference: [architecture.md](./docs/architecture.md)

---

## Python Integration (Instructor + Ollama)

Structured LLM usage standardized via `cortex_ml.instructor_client` with
Instructor + Ollama (OpenAI-compatible). Deterministic defaults
(`temperature=0.0`, `seed=42`).

Full guide: [Python Integration](./docs/python-integration.md)

---

## Documentation

### 📚 Core Documentation

- **[Architecture Guide](./docs/architecture.md)** – System design and patterns
- **[Architecture Overview](./docs/architecture-overview.md)** – High-level summary
- **[Quick Start](./docs/quick-start.md)** – Fast setup path
- **[Python Integration](./docs/python-integration.md)** – Instructor + Ollama
- **[Deployment Guide](./docs/deployment.md)** – Production deployment
- **[Security Guide](./docs/security.md)** – Security practices and compliance
- **[Streaming Modes](./docs/streaming-modes.md)** – Token, aggregated, and JSON streaming (CLI + config)
- **[Changelog](./CHANGELOG.md)** – Release notes and feature updates

### 🛠️ Development Documentation

- **[Development Setup](./docs/development-setup.md)** – Local environment
- **[Testing Guide](./docs/testing.md)** – Strategies and practices
- **[Contributing Guide](./CONTRIBUTING.md)** – How to contribute
- **[Code of Conduct](./CODE_OF_CONDUCT.md)** – Community guidelines
- **[Memory Tuning Guide](./docs/memory-tuning.md)** – Current temporary workspace memory mitigation
- **Policy Hot Reload (Structure Guard)** – Runtime dynamic policy updates. Integration & events:
  [simple-tests/README.md#policy-hot-reload-structure-guard](./simple-tests/README.md#policy-hot-reload-structure-guard)

### 📖 Package Documentation

| Package            | Description                  | Documentation                                   |
| ------------------ | ---------------------------- | ----------------------------------------------- |
| `cortex-ai-github` | AI-powered GitHub automation | [README](./packages/cortex-ai-github/README.md) |
| `cortex-code`      | Terminal user interface      | [README](./apps/cortex-code/README.md)          |
| `a2a`              | Agent-to-agent communication | [README](./packages/a2a/README.md)              |
| `mcp`              | Model Context Protocol       | [README](./packages/mcp/README.md)              |
| `orchestration`    | Multi-agent workflows        | [README](./packages/orchestration/README.md)    |

---

## Packages

### 🤖 AI & Automation

- **[cortex-ai-github](./packages/cortex-ai-github/)** – GitHub automation
- **[agents](./packages/agents/)** – Core AI agent behaviors
- **[rag](./packages/rag/)** – Retrieval-Augmented Generation pipeline
- **[orchestration](./packages/orchestration/)** – Multi-agent workflows

### 🔌 Communication & Integration

- **[a2a](./packages/a2a/)** – JSON-RPC 2.0 agent messaging
- **[mcp](./packages/mcp/)** – Model Context Protocol integration
- **[mcp-bridge](./packages/mcp-bridge/)** – MCP transport bridge
- **[mcp-registry](./packages/mcp-registry/)** – MCP plugin registry

### 💾 Data & Memory

- **[memories](./packages/memories/)** – State management (Neo4j/Qdrant)
- **[registry](./packages/registry/)** – Service registry and discovery
- **[mvp](./packages/mvp/)** – MVP core functionality

### 🛡️ Security & Quality

- **[security](./packages/security/)** – OWASP compliance and mTLS
- **[simlab](./packages/simlab/)** – Simulation test environment
- **[contracts](./libs/typescript/contracts/)** – Type-safe contracts

### 🖥️ User Interfaces

- **[cortex-os](./apps/cortex-os/)** – Runtime application
- **[cortex-code](./apps/cortex-code/)** – Terminal UI & command-line tooling (successor to cortex-cli)
- **[cortex-webui](./apps/cortex-webui/)** – Web dashboard

---

## Development & Quality Gates (Summary)

### 🔁 Streaming Modes (CLI Summary)

The CLI and runtime support flexible model output streaming with strict precedence control.

- Default behavior: token deltas streamed to stdout
- Aggregated final output: use `--aggregate` (or set config `stream.mode = "aggregate"`)
- Force token streaming when aggregate is configured: `--no-aggregate`
- JSON event streaming for programmatic consumption: `--json` (alias) or `--stream-json` (emits events: `delta`, `item`, `completed`)
- Precedence: CLI flag > environment (`CORTEX_STREAM_MODE`) > config file > internal default

See full spec & examples: [Streaming Modes Documentation](./docs/streaming-modes.md)

```bash
pnpm lint               # ESLint + Prettier
pnpm test:coverage      # 90% coverage threshold
pnpm security:scan      # Semgrep OWASP profiles
pnpm structure:validate # Governance/import rules
pnpm nx graph           # Dependency visualization
scripts/list-rust-editions.sh -e 2024  # Audit crates pinned to Rust 2024 edition
scripts/cleanup-duplicate-configs.sh   # Remove/consolidate duplicate config files
```

> **Latest:** Improved streaming modes with unified `--stream-mode` flag, JSON schema validation,
> and comprehensive automation examples. See [`docs/streaming-modes.md`](./docs/streaming-modes.md).

### 🧪 Coverage & Mutation Badges

Badges are generated locally and (optionally) committed so the README can reference static SVGs:

```bash
# Record branch coverage sample and generate badges
pnpm coverage:branches:record
pnpm badges:generate

# Run mutation tests, enforce threshold, then regenerate badges
pnpm mutation:enforce
pnpm badges:generate
```

Scripts:

| Script | Purpose |
| ------ | ------- |
| `coverage:branches:record` | Run coverage + append branch % to history file |
| `coverage:branches:report` | Show branch coverage trend |
| `coverage:branches:enforce` | Fail if branch coverage < 65% (env `BRANCH_MIN` override) |
| `mutation:test` | Run Stryker mutation tests (targeted scope) |
| `mutation:enforce` | Run Stryker then enforce `MUTATION_MIN` (default 75%) |
| `mutation:badges` | Run Stryker then generate both badges |
| `badges:generate` | Generate SVG badges from existing reports |

Outputs:

- Branch coverage history: `reports/branch-coverage-history.json`
- Mutation report JSON: `reports/mutation/mutation.json`
- Badges: `reports/badges/{branch-coverage.svg,mutation-score.svg}`
- Metrics JSON (for Pages / API): `reports/badges/metrics.json`

Nightly workflow (`badge-refresh.yml`) regenerates coverage, mutation score, badges, and publishes a
GitHub Pages artifact (includes `index.html`, badges, and `metrics.json`). This enables low‑latency
cached badge rendering while allowing programmatic consumption of the combined metrics at:

```text
https://<github-user>.github.io/Cortex-OS/metrics.json
```

Example JSON shape:

```json
{
  "branchCoverage": 92.31,
  "mutationScore": 76.45,
  "generatedAt": "2025-09-14T02:17:12.345Z"
}
```

To manually refresh locally (e.g., before pushing a quality improvements PR):

```bash
pnpm coverage:branches:record
pnpm mutation:enforce  # ensures threshold >= 75%
pnpm badges:generate
git add reports/badges reports/branch-coverage-history.json reports/mutation/mutation.json
git commit -m "chore(badges): manual refresh" && git push
```

CI Workflows:

- `ci-smoke-micro-edge.yml` – fast heuristic & negative-path guard (<5s)
- `ci-mutation-guard.yml` – mutation score enforcement (`MUTATION_MIN`)

Adjust thresholds via env overrides in CI if needed.

---

## 🔋 Memory Management & Agent Guidance

This repository experienced a transient spike in memory usage during
`pnpm install` and concurrent Nx tasks. A focused, reversible mitigation
set is in place. Agents (LLMs, automation scripts) and developers must
respect these constraints until the baseline is declared stable.

### Implemented Mitigations (Active)

| Layer | Change | File | Purpose | Revisit When |
|-------|--------|------|---------|--------------|
| pnpm  | `childConcurrency: 2` | `pnpm-workspace.yaml` | Limit simultaneous lifecycle scripts | After two stable low-RSS installs |
| pnpm  | `useNodeVersion: 24.7.0`, `engineStrict: true` | `pnpm-workspace.yaml` | Avoid duplicate toolchains / watchers | If multi-version testing required |
| Nx    | `parallel: 1`, `maxParallel: 1` | `nx.json` | Serialize heavy tasks to lower peak | When memory plateau acceptable |
| Graph | Added `.nxignore` patterns | `.nxignore` | Reduce hashing + watcher churn | If excluded dirs become needed |
| Tool  | Memory sampler script | `scripts/sample-memory.mjs` | Consistent RSS / heap telemetry | Likely keep (low overhead) |

Full detail & rollback: **[Memory Tuning Guide](./docs/memory-tuning.md)**.

### Required Behaviors (Agents & Devs)

1. Do **not** raise Nx parallelism or remove `childConcurrency` without two
  comparative sampler runs (before vs after).
2. Always sample during bulk ops: `node scripts/sample-memory.mjs --tag <label> \
  --out .memory/<label>.jsonl -- pnpm <command>`.
3. Prefer incremental refactors—avoid unnecessary workspace-wide rebuilds.
4. Large dependency PRs: include sampler diff (pre/post install) + rationale.
5. Agents must use `@cortex-os/agent-toolkit` `multiSearch` instead of raw
  recursive greps to minimize IO storms.

### Quick Sampling Examples

Install (cold):

```bash
rm -rf node_modules .pnpm-store
node scripts/sample-memory.mjs --tag install-cold --interval 1500 --out .memory/install-cold.jsonl -- pnpm install
```

Focused build:

```bash
node scripts/sample-memory.mjs --tag build --interval 2000 --out .memory/build.jsonl -- pnpm nx run cortex-os:build
```

Tail peak candidate:

```bash
awk '{print $0}' .memory/build.jsonl | jq '.rssMB' | sort -n | tail -1
```

### Escalation Criteria

Open an issue titled `perf(memory): escalation` if ANY:

- Peak RSS > 2.5x baseline after a small dependency addition
- Sustained upward drift across three comparable runs
- Install > 15 min wall time with unchanged dependency graph

### Rollback (Condensed)

See full guide, but nominally:

```bash
sed -i.bak 's/"parallel": 1/"parallel": 2/' nx.json
sed -i.bak 's/"maxParallel": 1/"maxParallel": 2/' nx.json
# Edit pnpm-workspace.yaml to remove childConcurrency/useNodeVersion/engineStrict if justified
```

### Future (Optional)

- Add automated peak parser to CI summary
- Enforce memory budget via sentinel script (fail if > threshold)
- Integrate flamegraphs for largest builds

---

### 🛡️ Code Quality & Security Automation

This repository enforces a layered quality model combining fast local feedback, pre-push hard gates, and CI/PR decoration:

| Layer             | Scope             | Tools                                                                                                     | Failing Effect                    |
| ----------------- | ----------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Pre-commit (fast) | Staged files only | Biome/ESLint formatting, minimal lint, pattern guard, `.env` presence check                               | Blocks commit (fix immediately)   |
| Pre-push (full)   | Entire workspace  | Typecheck (TS/py), Ruff, Semgrep focused profiles, tests + coverage, structural governance                | Blocks push (stops degraded code) |
| CI Workflows      | Trusted baseline  | Semgrep SARIF (OWASP + LLM + Top 10), optional SonarCloud, structure validation, license + security scans | Blocks merge via required checks  |

### 🧪 TDD Enforcement

This repository enforces Test-Driven Development practices using the TDD Coach package:

| Layer          | Scope         | Tools                  | Failing Effect                     |
| -------------- | ------------- | ---------------------- | ---------------------------------- |
| Development    | Real-time     | TDD Coach Watch Mode   | Immediate feedback in IDE          |
| Pre-commit     | Staged files  | TDD Coach Validation   | Blocks non-TDD compliant commits   |
| CI/CD Pipeline | Pull requests | TDD Coach Status Check | Blocks merge of non-compliant code |

To enforce TDD practices:

```bash
# Set up TDD Coach
make tdd-setup

# Check current TDD status
make tdd-status

# Validate specific files
make tdd-validate FILES="src/file1.ts src/file2.ts"

# Run in watch mode during development
make tdd-watch
```

See [TDD Enforcement Guide](./docs/tdd-enforcement-guide.md) for detailed instructions.

#### Semgrep Usage

Baseline (captures current state – do NOT run casually unless intentionally resetting):

```bash
pnpm security:scan:baseline   # writes reports/semgrep-baseline.json
```

Diff against baseline (local developer check before large refactors / PR polish):

```bash
pnpm security:scan:diff       # generates current + compares; exits non-zero on NEW findings
```

CI pipeline runs (excerpt):

```bash
pnpm security:scan:ci         # produces JSON report consumed for SARIF conversion
```

Reports directory structure (examples):

```text
reports/
  semgrep-baseline.json   # canonical baseline – versioned in repo if approved
  semgrep-current.json    # transient diff artefact
  semgrep-results.json    # CI raw scan output
```

#### SonarCloud (Optional)

`sonar-project.properties` config exists at repo root. CI workflow (`sonar.yml`) performs:

1. Install + cache dependencies
2. Run tests & collect coverage
3. Invoke Sonar scanner for PR decoration + quality gate

To disable: delete the workflow or restrict with a branch condition.

#### Common Commands

```bash
pnpm lint:all             # Full lint suite across workspace
pnpm security:scan        # Focused Semgrep (primary OWASP profile)
pnpm security:scan:all    # Expanded profiles (OWASP + LLM + MITRE ATLAS)
pnpm security:scan:diff   # New issues vs baseline only
pnpm test:coverage        # Enforces 90%+ threshold
pnpm structure:validate   # Governance / import boundary integrity
```

#### Developer Workflow Tips

- Keep baseline churn intentional – treat resets as mini change-control events.
- Prefer suppressions (`// semgrep-disable-next-line <rule-id>`) with justification comments.
- Run `pnpm security:scan:diff` before pushing if you touched risky surfaces (auth, network, dynamic exec, file IO).
- Use `nx graph` to visualize dependency impact of refactors prior to wide code moves.
- Use the canonical variable catalog in `.env.example`; keep the tracked `.env` scrubbed
  (no real secrets) and load real values via untracked overlays or a secret manager.

Further detail: see [`SECURITY.md`](./SECURITY.md) and future `docs/code-quality.md` (placeholder to expand if needed).

---

## 🚀 CI/CD Workflows Architecture

Cortex-OS uses a **modern, reusable GitHub Actions architecture** designed for
efficiency, maintainability, and scalability. All workflows have been optimized
for fast execution with improved caching and standardized patterns.

### Core Reusable Workflows

- **`quality-gates.yml`** - Fast PR quality checks (lint, typecheck, tests, build)
- **`security-modern.yml`** - Comprehensive security scanning (CodeQL, Semgrep, secrets)
- **`supply-chain-security.yml`** - Dependency analysis, SBOM generation, vulnerability assessment
- **`reusable-full-stack-setup.yml`** - Standardized Node.js/Python/Rust environment setup

### Key Workflow Categories

#### Pull Request Workflows

- **`pr-light.yml`** - Minimal quality gates for fast feedback
- **`ci.yml`** - Full integration checks via quality-gates
- **`readiness.yml`** - Package-level coverage enforcement (≥95%)

#### Security & Compliance  

- **`unified-security.yml`** - Redirects to security-modern.yml (migration pattern)
- **`codeql.yml`** - GitHub CodeQL analysis
- **`deep-security.yml`** - Weekly comprehensive scans

#### Specialized Workflows

- **`advanced-ci.yml`** - Full CI/CD pipeline with performance testing
- **`scheduled-lint.yml`** - Automated governance and quality checks
- **`nightly-quality.yml`** - Coverage tracking and quality metrics

### Migration Benefits

The recent workflow modernization provides:

- ✅ **60% faster setup** through shared reusable workflows
- ✅ **Improved cache hit rates** via standardized caching strategies  
- ✅ **Reduced duplication** from 200+ lines to 20 lines per workflow
- ✅ **Consistent permissions** and concurrency controls
- ✅ **Better maintainability** with centralized patterns

### Deprecated Workflows

Legacy workflows have been moved to `.deprecated-workflows/` with full deprecation tracking:

- `security-scan.yml`, `security.yml` → replaced by `security-modern.yml`
- `compliance.yml`, `license-check.yml`, `gitleaks.yml` → integrated into main workflows
- `security-and-sbom.yml`, `security-enhanced-sast.yml` → consolidated patterns

See `.deprecated-workflows/DEPRECATION_RECORD.md` for full migration details.

### Workflow Usage

Standard commands leverage the new architecture:

```bash
# Trigger quality gates manually
gh workflow run quality-gates.yml

# Run security scan
gh workflow run security-modern.yml

# Check workflow status  
gh run list --workflow=quality-gates.yml
```

For detailed workflow documentation, see [`.github/workflows/WORKFLOWS-OVERVIEW.md`](./.github/workflows/WORKFLOWS-OVERVIEW.md).

---

## Automated Linting & Scheduled Quality Runs

In addition to on-demand commands and the existing **nightly quality** workflow, the repository includes a **scheduled lint** workflow: `scheduled-lint.yml`.

### Schedule

Runs three times daily at 10:00, 14:00, and 20:00 UTC (GMT). You can also trigger it manually via the Actions tab.

### Workflow Steps

| Phase             | Command                      | Purpose                                               |
| ----------------- | ---------------------------- | ----------------------------------------------------- |
| Biome (changed)   | `pnpm biome:ci`              | Fast style + formatting validation                    |
| ESLint (quality)  | `pnpm lint:quality`          | Core quality & import rules                           |
| ESLint (security) | `pnpm lint:security`         | Security-focused rules (sonarjs, boundaries)          |
| Ruff (Python)     | `pnpm python:lint`           | Python style & lint consistency                       |
| Structure         | `pnpm structure:validate`    | Enforces architecture governance                      |
| Pattern Guard     | `pnpm lint:ripgrep:hardened` | Detects secrets, debug statements, forbidden patterns |
| AST Policy        | `pnpm lint:ast-grep:check`   | Enforces structural AST policies                      |

All steps soft-fail (`|| true`) to ensure an aggregated summary; review logs for violations.
Promote to hard failure by removing `|| true` once baseline is clean.

### Local Parity

```bash
pnpm lint:all            # Aggregated lint suite
pnpm structure:validate  # Governance integrity
# Manual pre-commit equivalent (Husky hooks run automatically on commit)
pnpm biome:staged  # format + lint staged files
pnpm test:safe     # quick, low-risk tests
```

### Future Enhancements (Optional)

1. Open an issue automatically if violations increase week-over-week.
2. Upload SARIF for AST-Grep + pattern guard to unify security dashboards.
3. Persist weekly lint trend JSON similar to coverage trend.

---

## Contributing

We welcome contributions! See the [Contributing Guide](./CONTRIBUTING.md) for details.

Quick Flow:

1. Fork
2. Branch: `git checkout -b feature/awesome`
3. Implement + tests + docs
4. `pnpm lint && pnpm test`
5. Commit & push
6. Open PR (follows template)

---

## License

Apache-2.0 – see [LICENSE](./LICENSE)

---

## Support

- **📧 Email**: <support@cortex-os.dev>
- **💬 Discussions**: [GitHub Discussions](https://github.com/jamiescottcraik/Cortex-OS/discussions)
- **🐛 Issues**: [GitHub Issues](https://github.com/jamiescottcraik/Cortex-OS/issues)
- **📖 Documentation**: <https://docs.cortex-os.dev>

---

## Acknowledgments

- Model Context Protocol (MCP)
- A2A event-driven agent patterns
- OWASP & MITRE guidance
- OpenAI + Instructor ecosystem

---

Built with ❤️ by the Cortex-OS Team

<!-- markdownlint-disable MD013 -->

![GitHub Stars](https://img.shields.io/github/stars/jamiescottcraik/Cortex-OS?style=social) ![GitHub Forks](https://img.shields.io/github/forks/jamiescottcraik/Cortex-OS?style=social) ![GitHub Issues](https://img.shields.io/github/issues/jamiescottcraik/Cortex-OS) ![GitHub PRs](https://img.shields.io/github/issues-pr/jamiescottcraik/Cortex-OS)

<!-- markdownlint-enable MD013 -->

## Submodules

This repository uses `git submodule` for certain external, read-only references.

Currently included:

| Path                    | Upstream                              | Purpose                                                                                            |
| ----------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `external/openai-codex` | <https://github.com/openai/codex.git> | Reference implementation; selectively copy patterns (no direct cross-imports in governed domains). |

See overlay governance guide: [openai-codex overlay](./docs/submodules/openai-codex.md)

### Working With Submodules

Clone (including submodules):

```bash
git clone --recurse-submodules https://github.com/jamiescottcraik/Cortex-OS.git
```

If you already cloned without `--recurse-submodules`:

```bash
git submodule update --init --recursive
```

Pull latest (root + all submodules):

```bash
git pull --recurse-submodules
# Or explicitly
git submodule update --remote --merge
```

Inspect status:

```bash
git submodule status
```

Pin a submodule to a newer upstream commit:

```bash
cd external/openai-codex
git fetch origin
git checkout <new-commit-or-tag>
cd -
git add external/openai-codex
git commit -m "chore(submodule): bump openai-codex to <sha>"
```

Remove a submodule (example for `external/openai-codex`):

```bash
git submodule deinit -f external/openai-codex
rm -rf .git/modules/external/openai-codex
git rm -f external/openai-codex
# Edit .gitmodules if other entries remain
```

> Governance: Do **not** import submodule code directly across feature boundaries.
> Copy needed snippets into governed packages and add tests + attribution.
