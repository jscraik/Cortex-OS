# Configuration

Set environment variables in `.env` or process environment.

## Core Paths
- `CORTEX_CHECKPOINT_DIR` – directory for workflow checkpoints
- `CORTEX_AUDIT_LOG` – path for structured audit logs
- `CORTEX_HITL_STORE` – JSONL file storing human decisions
- `CORTEX_HITL_TIMEOUT_MS` – wait time for approval (default 300000)

## Provider URLs
- `MLX_SERVICE_URL` – base URL for MLX inference
- `OLLAMA_URL` – Ollama service endpoint
- `MLX_CACHE_DIR` – model cache directory

## Python Bridge
- `PYTHONPATH` extends module lookup when spawning agents
- `PORT` sets outbox service port (default 3001)
