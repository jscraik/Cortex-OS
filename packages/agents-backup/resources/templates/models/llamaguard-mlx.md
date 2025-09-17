# LlamaGuard (MLX)

- Task: Safety policy evaluation (prompt/response/tool) with structured decisions
- Family: Llama-Guard (ported/quantized for MLX)
- Device: Apple Silicon (Metal)

## Configuration

- Recommended model path: ~/.cache/huggingface/hub/models--mlx-community--LlamaGuard/\*
- Typical VRAM: low–moderate depending on quantization
- Batch: small; use short prompts; set max_tokens conservatively

## Usage

- Via Agents Security Agent (LlamaGuard)
- Seed: supported at the agent layer; deterministic behavior where provider allows
- Token caps: max_tokens <= 4096

## Safety & Limits

- Thermal/memory aware fallback enabled in MLX provider
- Retries on transient gateway 5xx
- No direct file access; use governed MemoryStore for events

## References

- https://github.com/meta-llama/llamaguard
