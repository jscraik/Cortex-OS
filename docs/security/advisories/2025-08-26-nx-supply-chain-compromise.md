# Nx Supply-Chain Compromise Advisory (2025-08-26)

## Summary
On **26 Aug 2025**, attackers exploited a misconfigured GitHub Actions workflow in the Nx open-source project to steal an npm publishing token. The stolen token was used to publish malicious builds of `nx` and supporting packages for roughly four hours. During that window, compromised packages executed a post-install script (`telemetry.js` variants) that harvested secrets from developer workstations and CI agents on macOS and Linux.

Nx maintainers revoked the affected credentials, pulled the malicious packages, and re-cut releases with Trusted Publisher protections. However, any machine that installed the tainted versions must be treated as compromised until remediated.

> **Severity**: Critical (supply-chain compromise, credential exfiltration). Treat any impacted host as untrusted until containment and rebuild steps complete.

## Affected Versions
- **Malicious**: `nx@21.6.0` and any companion packages published during the incident window (approx. 2025-08-26 05:00–09:00 UTC).
- **Safe**: `nx@21.6.1` and all later releases.

Blocklist all `21.6.0` or earlier builds in private registries, lockfiles, and CI images. Rebuild any caches that might retain the compromised tarballs (e.g., `.pnpm-store`, `~/.npm`, container layers, artifact caches).

## Malicious Payload Behavior
- Post-install script executed automatically on install, named `telemetry.js` (or similarly disguised).
- Enumerated SSH keys, `.env` files, `.gitconfig`, npm tokens, cryptocurrency wallet directories, and other secrets.
- Attempted exfiltration by creating public GitHub repositories named `s1ngularity-repository*` under the victim account and pushing the harvested data.
- Some variants modified shell startup files (e.g., `~/.bashrc`, `~/.zshrc`) to add `sudo shutdown -h 0` so new sessions would immediately power off.

## Indicators of Compromise
- Unexpected repositories named `s1ngularity-repository…` under personal or organization GitHub accounts.
- GitHub audit log events for repo creation, token usage spikes, or unusual npm publishes on 26 Aug 2025.
- Presence of unknown lines appended to shell startup files, especially forced shutdown commands or `curl`/`wget` payloads.
- Post-install scripts within `node_modules/nx/telemetry.js` (or similar) containing credential harvesting logic.
- CI logs showing anomalous child processes, archive uploads, or GitHub API calls from build agents.
- Developer workstations exhibiting repeated terminal crashes at session start (indicative of the injected `sudo shutdown -h 0`).

## Immediate Response Actions
1. **Pin and re-install**: Update manifests to `nx@21.6.1` or newer. Rebuild lockfiles and reinstall dependencies from a clean cache.
2. **Block unsafe versions**: Configure `.npmrc`, Artifactory policies, and Renovate/Dependabot rules to deny `21.6.0` (and older, if feasible) so regressions cannot sneak in.
3. **Rotate secrets**: Revoke and recreate all tokens, SSH keys, API credentials, and npm/GitHub tokens present on affected machines and CI runners. Update dependent systems and document completion in the security backlog.
4. **Audit GitHub**: Search for repositories whose names start with `s1ngularity-repository`. Remove any that appear, review pushed contents, and rotate any secrets discovered within.
5. **Inspect shells**: Manually review `~/.bashrc`, `~/.zshrc`, `/etc/profile.d/`, and shell drop-ins for unauthorized commands or binary blobs. Pay special attention to appended `sudo shutdown -h 0` lines.
6. **Review pipelines**: Examine CI/CD logs for suspicious child processes, archive uploads, or credential access between 05:00 and 09:00 UTC on 26 Aug 2025.
7. **Reimage if unsure**: Treat any host that ran the malicious installer as compromised. Reimage from a known-good template if integrity cannot be verified.

## Hardening Recommendations for Cortex-OS
- Enforce dependency pinning and provenance checks (npm provenance metadata, lockfile integrity) across all workspaces.
- Require multi-factor authentication and short-lived publish tokens for internal package publishing workflows.
- Enable publish-time policy checks (Trusted Publishers, provenance attestations) for private registries in addition to upstream npm to prevent lateral movement.
- Integrate supply-chain monitoring (e.g., `pnpm audit`, OSV scans) into CI with explicit allow/block lists for critical dependencies like Nx.
- Expand secret-scanning coverage (e.g., Gitleaks) to developer machines via pre-commit hooks and CI runners to detect leaked credentials quickly.
- Log and alert on unexpected GitHub repository creation events via the Cortex-OS observability stack.
- Add Renovate and internal dependency dashboards to flag when vulnerable versions reappear in manifests or caches.

## Detection Playbooks
- **Identify rogue repositories**
  ```bash
  gh repo list "$GITHUB_OWNER" --json name --limit 200 \
    | jq -r '.[] | select(.name | startswith("s1ngularity-repository")) | .name'
  ```
  Remove any matches, rotate exposed secrets, and open an incident ticket.
- **Scan for malicious shell edits**
  ```bash
  rg --hidden --line-number 'shutdown -h 0' \
    ~/.bashrc ~/.zshrc ~/.config/fish/config.fish /etc/profile.d
  ```
  Compare diffs to version-controlled dotfiles or golden images before removing malicious lines.
- **Check Nx installations**
  ```bash
  pnpm why nx
  pnpm store prune
  find node_modules -path '*nx*/telemetry.js' -print
  ```
  Delete any cached tarballs from 26 Aug 2025 and reinstall after confirming the resolved version is ≥ 21.6.1.

## Communication
- Share this advisory with all developers and SREs who interact with Nx-based projects.
- Document any waivers or exceptions in `/.cortex/waivers/` per governance policy.
- Track remediation progress in the Cortex-OS security backlog and ensure evidence is attached to the Code Review Checklist for related PRs.

## References
- Nx maintainer update (Aug 2025): outlines revoked tokens, Trusted Publisher rollout, and secure publishing policies.
- Cortex-OS governance pack: `.cortex/rules/` for mandatory security workflow checkpoints.
