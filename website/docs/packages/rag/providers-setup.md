---
title: Providers Setup
sidebar_label: Providers Setup
---

# Providers Setup

## Python Embedding Service
- `PY_EMBED_ENDPOINT` – URL of the embedding API.
- `PY_EMBED_TIMEOUT` – request timeout in ms.

## Model Gateway
When using `@cortex-os/model-gateway` providers, set:
- `MODEL_GATEWAY_URL` – gateway endpoint.
- `MODEL_GATEWAY_API_KEY` – authentication token.

## Vector Stores
- **In-memory** requires no configuration.
- External stores should expose a similarity search API with `upsert` and `query` operations.
