---
title: Cli Reference
sidebar_label: Cli Reference
---

# CLI Reference

## `embedding_generator.py`
```
python -m apps.cortex-py.src.mlx.embedding_generator TEXT [TEXT...] \
  --model qwen3-embedding-4b-mlx \
  [--no-normalize] [--json-only] [--verbose]
```
Generates embeddings for one or more texts. Outputs JSON arrays and supports model selection.

## `mlx_unified.py`
```
python -m apps.cortex-py.src.mlx.mlx_unified --model MODEL [options]
```
Modes:
- `--embedding-mode` / `--batch-embedding-mode`
- `--chat-mode`
- `--rerank-mode`
Each mode accepts inputs on the command line and prints JSON results.
