# Models templates

This folder holds lightweight model cards and run notes used by agents/docs. Do not place large binaries here.

- SmolLM-135M (MLX): small, fast CPU-capable chat model for sanity checks
- gpt-oss-20b (MLX): larger reasoning/storytelling-friendly chat model

Safe run (local MLX): see `scripts/run_mlx_lm_sample_safe.py`.

Environment hints (ExternalSSD caches):

- HF_HOME or TRANSFORMERS_CACHE -> `/Volumes/ExternalSSD/huggingface_cache`
- MLX_CACHE_DIR -> `/Volumes/ExternalSSD/ai-cache`
