# Configuration

Configuration relies on environment variables and `.env` files.

- `.env.example` – base template.
- `.env.development.example` – development overrides.
- Set `CORTEX_OS_HOME` to control workspace directory.

Package-specific configs live in `config/` using JSON or TOML. Adjust via `pnpm run config:<name>` scripts.
