# SmolLM-135M (MLX)

- HF repo: `mlx-community/SmolLM-135M-Instruct-mlx`
- Purpose: ultra-small chat model for local sanity checks; fast and minimal memory
- Suggested use: quick smoke tests and demos; not for production quality
- Notes: keep max-tokens low (<= 64) for speed; temperature ~0.7

Sample safe run:

```bash
python3 scripts/run_mlx_lm_sample_safe.py \
  --prompt "Summarize: MLX is working" \
  --model mlx-community/SmolLM-135M-Instruct-mlx \
  --max-tokens 48 --temperature 0.7 --seed 13 --json-only
```

Cache hints (ExternalSSD):

- `HF_HOME` or `TRANSFORMERS_CACHE` -> `/Volumes/ExternalSSD/huggingface_cache`
- `MLX_CACHE_DIR` -> `/Volumes/ExternalSSD/ai-cache`# SmolLM-135M (MLX)

- HF repo: `mlx-community/SmolLM-135M-4bit` (alternatives: `mlx-community/SmolLM-135M-8bit`, `mlx-community/SmolLM-135M-fp16`)
- Purpose: tiny chat model for quick local sanity checks on Apple Silicon
- License: Apache-2.0 (see upstream model card)

## Safe-run (local)

Use the helper script to verify generation without heavy params:

```bash
python3 scripts/run_mlx_lm_sample_safe.py \
  --model mlx-community/SmolLM-135M-4bit \
  --prompt "Say one short fun fact about cats." \
  --max-tokens 64 --temperature 0.2 --json-only
```

## Caches on ExternalSSD

Set environment so weights live on your external drive:

```bash
export HF_HOME=/Volumes/ExternalSSD/huggingface_cache
export TRANSFORMERS_CACHE=$HF_HOME
export MLX_CACHE_DIR=/Volumes/ExternalSSD/ai-cache
```

## Notes

- For Qwen-family models you may need `--eos-token "<|endoftext|>"` but SmolLM typically works without.
- Keep models out of git; artifacts are resolved at runtime via the caches above.
