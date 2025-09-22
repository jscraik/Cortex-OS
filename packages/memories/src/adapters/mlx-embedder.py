#!/usr/bin/env python3
import json
import os
import sys


def main():
    if len(sys.argv) != 3:
        print(
            json.dumps({"error": "Usage: mlx-embedder.py <model_path> <json_texts>"}),
            file=sys.stderr,
        )
        sys.exit(1)

    model_path = sys.argv[1]
    try:
        texts = json.loads(sys.argv[2])
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON texts: {e!s}"}), file=sys.stderr)
        sys.exit(1)

    # Add the MLX models directory to the path
    # Check multiple possible locations in order of preference
    possible_paths = [
        os.environ.get("MLX_MODELS_DIR"),
        os.path.expanduser("~/.cache/huggingface/hub"),
        os.path.expanduser("~/huggingface_cache"),
        "/tmp/huggingface_cache",
        "/var/tmp/huggingface_cache",
    ]

    mlx_models_dir = None
    for path in possible_paths:
        if path and os.path.isdir(path):
            mlx_models_dir = path
            break

    if mlx_models_dir:
        sys.path.append(mlx_models_dir)
    else:
        print(json.dumps({"error": "No valid MLX models directory found. Set MLX_MODELS_DIR environment variable."}), file=sys.stderr)
        sys.exit(1)

    try:
        import mlx.core as mx
        from transformers import AutoModel, AutoTokenizer

        # Load model and tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModel.from_pretrained(model_path)

        embeddings = []

        for text in texts:
            # Tokenize input
            inputs = tokenizer(
                text, return_tensors="np", padding=True, truncation=True, max_length=512
            )

            # Convert to MLX arrays
            input_ids = mx.array(inputs["input_ids"])
            attention_mask = mx.array(inputs["attention_mask"])

            # Get embeddings
            outputs = model(input_ids=input_ids, attention_mask=attention_mask)

            # Use mean pooling of last hidden states
            last_hidden_states = outputs.last_hidden_state
            input_mask_expanded = mx.broadcast_to(
                mx.expand_dims(attention_mask, -1), last_hidden_states.shape
            )

            # Apply mask and calculate mean
            masked_states = mx.where(input_mask_expanded, last_hidden_states, 0.0)
            sum_embeddings = mx.sum(masked_states, axis=1)
            sum_mask = mx.sum(input_mask_expanded, axis=1)
            mean_embeddings = sum_embeddings / mx.maximum(sum_mask, 1e-9)

            # Convert to list
            embeddings.append(mean_embeddings.tolist()[0])

        print(json.dumps({"embeddings": embeddings}))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
