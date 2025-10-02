---
title: Configuration
sidebar_label: Configuration
---

# Configuration

- **Model config file**: `src/mlx/embedding_models.json` lists available models and dimensions.
- **Environment variables**:
  - `HF_HOME`, `TRANSFORMERS_CACHE`: locations for Hugging Face caches
  - `MLX_CACHE_DIR`: directory for MLX model data
  - `MLX_LOCAL_MODEL_PATH`: override path for a small local model in tests
- Config files may also be supplied in TOML format when calling `MLXEmbeddingGenerator(config_path=...)`.
