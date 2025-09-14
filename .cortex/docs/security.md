# Security

- Tokens are passed via HTTP `Authorization` headers.
- All transports default to HTTPS; use TLS certificates in `infra/certs`.
- Run `pnpm security:scan` to perform dependency and code scans.
- SBOM artifacts are generated in `sbom/` for compliance.
