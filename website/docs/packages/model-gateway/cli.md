---
title: Cli
sidebar_label: Cli
---

# CLI Reference

| Command | Description |
| --- | --- |
| `pnpm --filter @cortex-os/model-gateway dev` | Start the server in watch mode with TypeScript support |
| `pnpm --filter @cortex-os/model-gateway build` | Compile TypeScript to `dist/` |
| `pnpm --filter @cortex-os/model-gateway start` | Run the compiled server |
| `MODEL_GATEWAY_PORT&#61;9000 pnpm --filter @cortex-os/model-gateway start` | Override default port |

No additional CLI options are exposed beyond environment variables.
