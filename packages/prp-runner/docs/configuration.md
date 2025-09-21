# PRP Runner Configuration

This package supports configuration via a file (JSON or YAML), environment variables, and sensible defaults.

Precedence: env > file > defaults.

## File formats

Example YAML:

```yaml
server:
  port: 3000
ai:
  provider: mlx
  model: qwen-small
  maxTokens: 1024
  breakers:
    ollama:
      threshold: 5      # failures to open circuit (default 3)
      timeout: 250      # ms before half-open probe (default 200)
    mlx:
      threshold: 4
      timeout: 300
security:
  bcryptRounds: 12
```

## Environment variables

Breaker-related environment variables (if set via file, env takes precedence when you merge):

- `PRP_AI_PROVIDER` – `ollama` | `mlx`
- `PRP_AI_MODEL` – model name for Ollama
- `PRP_MAX_TOKENS` – default token limit
- `PRP_PORT` – server port
- `PRP_BCRYPT_ROUNDS` – bcrypt cost factor

Breaker env flags (optional; alternative to file/programmatic config):

- `PRP_AI_BREAKERS_OLLAMA_THRESHOLD` – integer failures before opening circuit
- `PRP_AI_BREAKERS_OLLAMA_TIMEOUT` – ms to wait before half-open probe
- `PRP_AI_BREAKERS_MLX_THRESHOLD` – integer failures before opening circuit
- `PRP_AI_BREAKERS_MLX_TIMEOUT` – ms to wait before half-open probe

Note: file/programmatic configuration remains the primary method. Env flags are merged on top of
file/defaults when loaded, following precedence rules.

## Programmatic loading

The loader merges inputs and validates the shape using Zod.

```ts
import { loadConfig } from '../src/config';

const cfg = loadConfig('/path/to/prp.config.yaml', {
  server: { port: 3000 },
});
```

Programmatic override of breaker settings when constructing an `LLMBridge`:

```ts
import { LLMBridge } from '../src/llm-bridge';

const bridge = new LLMBridge({
  provider: 'ollama',
  endpoint: 'http://localhost:11434',
  model: 'llama3',
  breakers: {
    ollama: { threshold: 2, timeout: 150 },
  },
});
```

Acceptance criteria (quick reference):

## Additional configuration notes

PRP Runner reads configuration from environment variables and optional YAML files.

| Setting | Description | Default |
|---------|-------------|---------|
| `CORTEX_DOCS_SEMSEARCH` | Enable docs ingestion for MCP demo | `0` |
| `CORTEX_DOCS_DIR` | Directory to index when semsearch is enabled | `docs` |
| `CORTEX_DOCS_GLOB` | Glob pattern for documents | `**/*.md` |

Place project-specific overrides in `readiness.yml` to enable health checks.
