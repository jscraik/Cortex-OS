Security automation playbook

This folder contains scripts and CI workflow examples to implement supply-chain scanning, signing, verification, and basic auto-remediation stubs.

Files:

- `signing.sh` - helper to sign/verify artifacts using `cosign`.
- `auto_remediate.sh` - basic script stub to attempt dependency patching and create PRs (requires gh CLI and credentials).
- `scorecard.sh` - generates a simple security scorecard from SCA outputs.

CI integration:

- `.github/workflows/security-sca-and-signing.yml` runs SCA scans and signs artifacts with `cosign`.

Secrets to set in GitHub Actions:

- `COSIGN_PUBKEY` - public key used to verify cosign signatures (for key-based verification)
- `SNYK_TOKEN` - optional Snyk token
- `OSSINDEX_API_TOKEN` - optional OSS Index API token

See docs for cosign and Sigstore for OIDC signing and key management.
