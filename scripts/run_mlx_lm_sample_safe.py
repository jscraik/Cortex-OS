#!/usr/bin/env python3
"""
Minimal and safe MLX text generation runner.

- Uses mlx-lm Python API (load, generate) with conservative defaults
- Prints short output; supports --json-only for automation
- Respects HF/MLX cache envs so weights live on ExternalSSD

Examples:
  python3 scripts/run_mlx_lm_sample_safe.py \
    --model mlx-community/SmolLM-135M-4bit \
    --prompt "Write one fun fact about cats." \
    --max-tokens 64 --temperature 0.2 --json-only

Notes:
  - For Qwen or other models requiring remote code/tokenizer options,
    pass --eos-token if needed. We set trust_remote_code=True by default.
  - Ensure caches point to your ExternalSSD to avoid large downloads in repo.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any, Dict

try:
    from mlx_lm import load, generate
except Exception as e:  # noqa: BLE001 - show friendly hint
    print(
        "ERROR: mlx-lm is not installed or not importable.\n"
        "Install with: pip install mlx-lm\n"
        f"Details: {e}",
        file=sys.stderr,
    )
    sys.exit(2)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Safe MLX text generation runner")
    p.add_argument(
        "--model",
        default=os.environ.get("MLX_SAFE_MODEL", "mlx-community/SmolLM-135M-4bit"),
        help="HF repo name of the model (e.g., mlx-community/SmolLM-135M-4bit)",
    )
    p.add_argument(
        "--prompt",
        default=os.environ.get("MLX_SAFE_PROMPT", "Hello from MLX!"),
        help="Short prompt to generate from",
    )
    p.add_argument(
        "--max-tokens",
        type=int,
        default=int(os.environ.get("MLX_SAFE_MAX_TOKENS", 64)),
        help="Maximum new tokens to generate",
    )
    p.add_argument(
        "--temperature",
        type=float,
        default=float(os.environ.get("MLX_SAFE_TEMPERATURE", 0.2)),
        help="Sampling temperature",
    )
    p.add_argument(
        "--eos-token",
        default=os.environ.get("MLX_SAFE_EOS_TOKEN"),
        help="Optional explicit EOS token (e.g., for Qwen: <|endoftext|>)",
    )
    p.add_argument(
        "--json-only",
        action="store_true",
        help="Emit only a compact JSON object with model and text",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()

    # Respect caches (user should set these to ExternalSSD paths)
    # Defaults are harmless if not set; mlx/hf will use their own defaults.
    hf_home = os.environ.get("HF_HOME") or os.environ.get("TRANSFORMERS_CACHE")
    mlx_cache = os.environ.get("MLX_CACHE_DIR")

    # Construct tokenizer_config safely; many models work without extra config
    tokenizer_config: Dict[str, Any] = {"trust_remote_code": True}
    if args.eos_token:
        tokenizer_config["eos_token"] = args.eos_token

    try:
        model, tokenizer = load(args.model, tokenizer_config=tokenizer_config)
        # Apply a simple chat template if available; otherwise use the raw prompt
        try:
            messages = [{"role": "user", "content": args.prompt}]
            prompt = tokenizer.apply_chat_template(messages, add_generation_prompt=True)
        except Exception:
            prompt = args.prompt

        text = generate(
            model,
            tokenizer,
            prompt=prompt,
            max_tokens=args.max_tokens,
            temp=args.temperature,
            verbose=False,
        )

        if args.json_only:
            print(
                json.dumps(
                    {
                        "model": args.model,
                        "text": text,
                        "hf_home": hf_home,
                        "mlx_cache_dir": mlx_cache,
                    },
                    ensure_ascii=False,
                )
            )
        else:
            print("=== MLX Safe Runner ===")
            print(f"Model: {args.model}")
            if hf_home:
                print(f"HF_HOME/TRANSFORMERS_CACHE: {hf_home}")
            if mlx_cache:
                print(f"MLX_CACHE_DIR: {mlx_cache}")
            print("--- Prompt ---")
            print(args.prompt)
            print("--- Output ---")
            print(text)

        return 0
    except Exception as e:  # noqa: BLE001
        print(f"ERROR: generation failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
