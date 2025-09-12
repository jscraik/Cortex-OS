# API Reference

## Model Gateway
- `POST /v1/models/:modelId/infer` – run inference for a model.
  - Request and response bodies are validated with Zod.
  - Authentication: provider tokens supplied via environment variables.

## Orchestration
Programmatic interface:

```typescript
import { run } from '@cortex-os/service-orchestration';
```

The `run` function executes a workflow definition and returns a result or throws on failure.
