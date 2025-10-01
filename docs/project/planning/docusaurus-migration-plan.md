# Docusaurus Migration Plan

Status: Draft
Owner: Documentation / Platform Engineering
Last Updated: 2025-09-05

## 1. Goals

- Unify scattered Markdown docs into a navigable, searchable documentation site.
- Preserve existing deep-dive and architecture content while improving discoverability.
- Introduce versioning for APIs and agent contracts.
- Enable automated build + deploy (branch preview + main publish).
- Integrate accessibility (WCAG 2.1+/2.2) validation in CI.
- Support diagram rendering (Mermaid), code tabs, admonitions, and partial reuse.

## 2. Scope (Phase 1 vs Later)

| Phase | Includes                                                                                                                                                             | Excludes                                                                                                            |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| P1    | Core README sections already modularized (`quick-start`, `python-integration`, `architecture-overview`), contributing, security, licensing, agent contracts overview | Full legacy deep-dive rewrites, API reference generation automation (kept manual or stubbed), multi-version support |
| P2    | Automated API reference (TypeScript + Python), versioned docs, expanded guides, RAG & Orchestration deep-dives                                                       | Multi-language translation                                                                                          |
| P3    | Search tuning, analytics dashboards, performance budgets                                                                                                             | AI-guided doc QA automation                                                                                         |

## 3. Information Architecture (Initial Outline)

```text
/ (Landing)
  Getting Started
    Quick Start
    Python Integration
    Architecture Overview
  Agents
    Overview
    Contracts & Validation
    Memory & State
  Development
    Contributing
    Code Quality & Linting
    Testing Strategy
  Security & Compliance
    Security Practices
    License / SBOM
  Operations
    Deployment
    Carbon & Sustainability
  Reference (Phase 2+)
    TypeScript API
    Python API
  Appendices
    Legacy Archive (temporary section)
```

## 4. Technical Stack Decisions

| Concern           | Decision                                  | Notes                                  |
| ----------------- | ----------------------------------------- | -------------------------------------- |
| Site Generator    | Docusaurus v3 (latest)                    | MDX support + plugins ecosystem        |
| Styling           | Default + minimal tokens override         | Keep light until design system matures |
| Deployment        | GitHub Pages or Cloudflare Pages          | Choose based on existing org standards |
| Search            | Local (Lunr) initially                    | Algolia DocSearch optional later       |
| Diagrams          | `@docusaurus/theme-mermaid`               | Replace manual PNG generation          |
| API Docs (TS)     | `docusaurus-plugin-typedoc` (Phase 2)     | Needs typedoc config                   |
| API Docs (Python) | Stub pages / manual for P1                | Evaluate `pydoc-markdown` integration  |
| Linting           | Existing markdownlint + mdx compatibility | Add MDX lint later                     |
| Accessibility     | Pa11y / Axe in CI post-build              | Reuse existing scripts                 |

## 5. Repository Changes (Phase 1)

1. Create `website/` directory with Docusaurus scaffold.
2. Migrate selected curated Markdown files into `docs/` under `website/`.
3. Introduce sidebar config mapping to IA.
4. Add build script: `pnpm docs:site:build` (runs in `website/`).
5. Add preview script: `pnpm docs:site:serve`.
6. Wire CI job: (a) install, (b) build, (c) run link + a11y check, (d) upload artifact.
7. Protect `main` publish: only on merge to `main` trigger deploy (`pages` action or Cloudflare).

## 6. Incremental Migration Strategy

| Step | Action                            | Success Criteria                               |
| ---- | --------------------------------- | ---------------------------------------------- |
| 1    | Scaffold site                     | `website/` builds locally                      |
| 2    | Move curated docs (no deep-dives) | Old root README links still valid / redirected |
| 3    | Introduce sidebar + navbar        | Logical navigation works                       |
| 4    | Add mermaid + admonitions         | Diagrams render                                |
| 5    | Add CI build + artifact           | PR has preview build artifact                  |
| 6    | Add deploy pipeline               | `main` publishes site                          |
| 7    | Migrate deep-dives gradually      | Legacy checklist shrinks                       |
| 8    | Introduce versioning (tags)       | `v1` snapshot generated                        |

## 7. Redirects / Backward Compatibility

- Keep `README.md` slim with links to hosted site.
- Provide temporary `docs/legacy/` links until all pages are mapped.
- Optionally generate `redirects.json` (Cloudflare) or `_redirects` (Netlify) if path strategy shifts.

## 8. CI Pipeline (Concept)

Pseudo GitHub Actions job (simplified):

```yaml
name: Docs
on:
  pull_request:
    paths:
      - 'website/**'
      - 'docs/**'
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm -F website build # or inside dir
      - run: pnpm docs:links
      - run: pnpm check:a11y-docs
      - uses: actions/upload-artifact@v4
        with:
          name: docs-site
          path: website/build
  deploy:
    if: github.ref == 'refs/heads/main'
    needs: build
    steps:
      - uses: actions/download-artifact@v4
      - name: Deploy (placeholder)
        run: echo 'Deploy step here'
```

## 9. Risks / Mitigations

| Risk                                  | Impact         | Mitigation                                          |
| ------------------------------------- | -------------- | --------------------------------------------------- |
| Divergence between root docs and site | Confusion      | Treat root README as marketing / pointer only       |
| Legacy deep-dive lingering            | Inconsistency  | Track via normalization checklist (already created) |
| Build perf regression                 | Slower CI      | Cache pnpm + Docusaurus build output                |
| Mermaid large diagrams slow           | UX issues      | Split diagrams, lazy-load if needed                 |
| API doc drift                         | Incorrect info | Add typedoc + validation in CI (Phase 2)            |

## 10. Success Metrics

- P1: Build + deploy pipeline green, curated docs migrated, no broken internal links.
- P2: Automated TS API docs integrated; <1% broken links in quarterly scan.
- P3: Versioned docs live; <2 min docs build time.

## 11. Immediate Next Actions

1. Decide hosting target (Pages vs Cloudflare).
2. Generate Docusaurus scaffold (`npx create-docusaurus@latest website classic`).
3. Curate initial doc subset for migration (already identified).
4. Add sidebar + navbar config.
5. Integrate mermaid plugin.
6. Add CI job skeleton.
7. Begin deep-dive migration (parallel with normalization work).

---

_This plan will be iterated as implementation begins; changes should be logged in a short changelog section if scope shifts materially._
