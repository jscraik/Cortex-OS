# Gitleaks Secret Scanning Cheatsheet

Keep secret scanning easy to run whether you're iterating locally or verifying CI. The commands below assume you're in the repo root.

## One-off scans

- **Diff-only scan** (fastest): `pnpm security:scan:gitleaks`
- **Full repository sweep**: `pnpm security:scan:gitleaks:full`

Both commands use the shared `.gitleaks.toml` config and fall back to Docker automatically if the standalone `gitleaks` binary is not installed.

## Continuous protection

- **Pre-push hook** now runs `gitleaks detect` with your push range and blocks if a secret is found. Install the CLI (or enable Docker) to activate the check.
- **CI coverage**: the `ci` workflow includes a `Secret Scan (Gitleaks)` job so every PR and push to `main` runs the same ruleset.

## On-demand GitHub run

Trigger a hosted scan without waiting for the next push:

```shell
gh workflow run security-modern.yml
```

Monitor the "Actions" tab to view the SARIF report and annotations for any findings.
