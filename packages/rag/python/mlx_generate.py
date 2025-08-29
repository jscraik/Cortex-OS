import json
import sys

try:
    import mlx.core as mx  # noqa: F401
    from mlx_lm import load, generate

    input_data = json.loads(sys.stdin.read())
    model_path = input_data["model"]
    prompt = input_data["prompt"]
    max_tokens = input_data.get("max_tokens", 2048)
    temperature = input_data.get("temperature", 0.7)
    top_p = input_data.get("top_p", 0.9)

    model, tokenizer = load(model_path)
    response = generate(
        model,
        tokenizer,
        prompt=prompt,
        temp=temperature,
        top_p=top_p,
        max_tokens=max_tokens,
    )
    generated_text = response[len(prompt):].strip()
    result = {"text": generated_text}
    print(json.dumps(result))
except ImportError:
    result = {"error": "MLX not available - install with: pip install mlx-lm"}
    print(json.dumps(result))
    sys.exit(1)
except Exception as e:
    result = {"error": str(e)}
    print(json.dumps(result))
    sys.exit(1)
