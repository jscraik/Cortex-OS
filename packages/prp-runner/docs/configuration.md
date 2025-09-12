# Configuration

PRP Runner reads configuration from environment variables and optional YAML files.

| Setting | Description | Default |
|---------|-------------|---------|
| `CORTEX_DOCS_SEMSEARCH` | Enable docs ingestion for MCP demo | `0` |
| `CORTEX_DOCS_DIR` | Directory to index when semsearch is enabled | `docs` |
| `CORTEX_DOCS_GLOB` | Glob pattern for documents | `**/*.md` |

Place project-specific overrides in `readiness.yml` to enable health checks.
