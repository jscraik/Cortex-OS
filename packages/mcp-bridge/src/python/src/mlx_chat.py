#!/usr/bin/env python3
"""
MLX chat runner

Reads a single JSON object on stdin of the form:
  {"messages":[{"role":"user","content":"..."}, ...], "temperature":0.0, "max_tokens":128}

Writes JSONL with tokens, one per line:
  {"token":"..."}

Usage:
  python3 mlx_chat.py <model_name>

Special model: "echo" — emits the user message back token-by-token for tests,
without requiring MLX packages. For real models, requires `mlx_lm`.
"""
import json
import sys
from typing import Iterator


def iter_echo_tokens(text: str) -> Iterator[str]:
    # Very simple tokenization for smoke tests
    for part in text.split():
        yield part + " "


def chat_with_mlx(model: str, prompt: str, temperature: float, max_tokens: int) -> Iterator[str]:
    if model == "echo":
        yield from iter_echo_tokens(prompt)
        return

    try:
        from mlx_lm import load, generate  # type: ignore
    except Exception as e:
        raise SystemExit(
            "MLX is not available. Install with `pip install mlx-lm` or use the 'echo' model for testing.\n"
            f"Underlying import error: {e}"
        )

    model_obj, tokenizer = load(model)

    full: str = ""

    def cb(tok: str):
        nonlocal full
        full += tok
        sys.stdout.write(json.dumps({"token": tok}) + "\n")
        sys.stdout.flush()

    _ = generate(
        model_obj,
        tokenizer,
        prompt=prompt,
        temp=temperature,
        max_tokens=max_tokens,
        verbose=False,
        stream=True,
        callback=cb,
    )

    # Some generators may not call callback on finalization — ensure newline separation
    if not full.endswith("\n"):
        sys.stdout.write("")


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python3 mlx_chat.py <model>", file=sys.stderr)
        return 2

    model = sys.argv[1]
    try:
        data = json.loads(sys.stdin.readline())
    except Exception as e:
        print(f"Invalid input: {e}", file=sys.stderr)
        return 2

    messages = data.get("messages") or []
    if not messages:
        print("No messages provided", file=sys.stderr)
        return 2

    # Use a simple last-user-message prompt strategy for now
    # More complex strategies can be added (system+history formatting)
    last_user = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            last_user = m.get("content", "")
            break

    temperature = float(data.get("temperature", 0.0))
    max_tokens = int(data.get("max_tokens", 256))

    try:
        for _ in chat_with_mlx(model, last_user, temperature, max_tokens):
            pass  # streaming already writes tokens via stdout
    except SystemExit as e:
        return int(e.code) if isinstance(e.code, int) else 1
    except Exception as e:
        print(f"Inference error: {e}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

