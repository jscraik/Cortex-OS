---
title: User Guide
sidebar_label: User Guide
---

# User Guide

## Generate an Embedding via API
```bash
curl -X POST http://localhost:8000/embed \
  -H 'Content-Type: application/json' \
  -d '{"text":"hello world"}'
```

## Generate Embeddings via CLI
```bash
python -m apps.cortex-py.src.mlx.embedding_generator "hello" "world"
```

The CLI prints embeddings for each supplied text. Use `--json-only` for machine‑readable output.
