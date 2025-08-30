# GPT-OSS 20B (MLX 8-bit)

- Upstream: `openai/gpt-oss-20b`
- MLX quant: `lmstudio-community/gpt-oss-20b-MLX-8bit`
- Task: Text generation (chat/instruct style)
- License: Apache-2.0 (see upstream and HF card)

## Quick run (safe)

Set caches to keep model weights off your repo and on ExternalSSD:

- `HF_HOME=/Volumes/ExternalSSD/huggingface_cache`
- `TRANSFORMERS_CACHE=/Volumes/ExternalSSD/huggingface_cache`
- `MLX_CACHE_DIR=/Volumes/ExternalSSD/ai-cache`

Example run:

```bash
# Minimal probe (JSON-only output)
HF_HOME=/Volumes/ExternalSSD/.cache/huggingface \
TRANSFORMERS_CACHE=/Volumes/ExternalSSD/.cache/huggingface/hub \
MLX_CACHE_DIR=/Volumes/ExternalSSD/ai-cache \
python3 scripts/run_mlx_lm_sample_safe.py \
	--model lmstudio-community/gpt-oss-20b-MLX-8bit \
	--prompt "Say hello in one short sentence." \
	--max-tokens 48 \
	--temperature 0.2 \
	--json-only
```

Notes:

- This is a large 20B model; first run will download several GB.
- On macOS 15+, consider increasing wired memory limits for speed if needed.
- If the tokenizer requires special EOS tokens, pass `--eos-token`.

## Download via mlx_lm CLI (optional)

```bash
# Pull and run via CLI for manual testing
mlx_lm.generate \
	--model lmstudio-community/gpt-oss-20b-MLX-8bit \
	--prompt "One fun fact about the Moon." \
	--max-tokens 64 --temp 0.3
```

## Integration

- Router: handled by Ollama for chat in this repo; MLX path is validated via the Python runner.
- For embeddings/rerank, use the MLX models defined in router (qwen3-embedding-\* and reranker).

## References

- HF card: <https://huggingface.co/lmstudio-community/gpt-oss-20b-MLX-8bit>
- MLX LM docs: <https://github.com/ml-explore/mlx-lm>
