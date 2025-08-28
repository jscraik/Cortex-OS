# Cortex-OS licensing strategy (Apache + commercial)

This document outlines how we keep Cortex-OS friendly to Apache-2.0 open source and a separate commercial license.

## Current state

- Repo license: Apache-2.0 (see `/LICENSE`) with `/NOTICE` present.
- Commercial: `/COMMERCIAL-LICENSE.md` stub committed for paid features/support.

## Plan

1. Migrate to Apache-2.0
   - Replace `/LICENSE` with Apache-2.0 text and year/holder. (DONE)
   - Add `/NOTICE` with copyright and third-party notices. (DONE)
   - Update READMEs to state Apache-2.0. (IN PROGRESS)
2. Commercial license offering
   - Add `/COMMERCIAL-LICENSE.md` with terms for paid features, SLAs, LTS, support. (DONE)
   - Keep commercial-only modules isolated (clear directory, build flags, or private repo).
3. Dependency policy
   - Only allow permissive licenses (Apache-2.0, MIT, BSD). Avoid AGPL/SSPL unless isolated opt-in external services.
   - Track licenses with tooling (e.g., license-checker, pip-licenses, uv/pnpm audits).
4. Contributor and governance
   - Adopt a CLA (or DCO) for inbound rights. Store CLA text and automations.
   - Code of Conduct, security policy, release policy.
5. Third-party attribution
   - Maintain a machine-generated THIRD-PARTY-NOTICES in releases.
   - Embed NOTICE file into distributed artifacts/containers.
6. Branding/trademark
   - Establish Cortex-OS trademark usage guidelines. Avoid third-party branding restrictions.
   - We will not incorporate code with branding lock clauses (e.g., Open WebUI license) into Apache-2.0 codebase.

## Implementation checklist

- [x] Replace `/LICENSE` with Apache-2.0; add `/NOTICE` and `/COMMERCIAL-LICENSE.md` stubs.
- [ ] Update repo docs to reflect dual-licensing and contribution policy.
- [ ] Add license scanning to CI (pnpm and Python).
- [ ] Add SBOM generation step (CycloneDX) for releases.
- [ ] Publish a public OSS vs Commercial feature matrix page.

## Notes on Open WebUI

- Open WebUI uses a customized BSD-3 license with a branding restriction; do not copy code/assets.
- Safe: treat as inspiration only; optionally support it as an external UI via OpenAI-compatible APIs.
