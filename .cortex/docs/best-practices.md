# Best Practices

- Keep secrets in `.env.local`; never commit them.
- Prefer official providers with TLS-enabled endpoints.
- Enable SBOM generation (`pnpm sbom`) for releases.
- Use `pnpm biome:staged` before committing to enforce style.
