# Configuration

Configuration is driven by environment variables and JSON policy files.

| Variable | Purpose | Default |
| --- | --- | --- |
| `MODEL_GATEWAY_PORT` | HTTP port | `8081` |
| `CORTEX_PRIVACY_MODE` | Restrict to local MLX models when `true` | `false` |
| `POLICY_CONFIG_PATH` | Path to policy rules | `./policy-config.json` |
| `CORTEX_AUDIT_LOG` | File path for audit records | undefined |
| `OLLAMA_AVAILABLE` | Force enable/disable Ollama adapter | auto-detect |
| `OLLAMA_URL` | Ollama base URL | `http://127.0.0.1:11434` |
| `OLLAMA_DEFAULT_MODEL` | Fallback Ollama model | `nomic-embed-text` |
| `MCP_TRANSPORT` | MCP transport type (`stdio`, `tcp`, `http`) | unset |
| `MCP_COMMAND`/`MCP_ARGS` | Command and JSON args for MCP process | unset |

Policy files are resolved relative to `POLICY_CONFIG_PATH`. Audit logs, when enabled, are appended to the file specified by `CORTEX_AUDIT_LOG`.
