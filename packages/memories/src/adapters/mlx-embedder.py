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

    # Validate and sanitize model_path to prevent directory traversal
    if ".." in model_path or model_path.startswith("/"):
        print(json.dumps({"error": "Invalid model path"}), file=sys.stderr)
        sys.exit(1)

    # Validate model_path contains only safe characters
    import re
    if not re.match(r'^[a-zA-Z0-9_\-./]+$', model_path):
        print(json.dumps({"error": "Invalid characters in model path"}), file=sys.stderr)
        sys.exit(1)
    try:
        texts = json.loads(sys.argv[2])
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON texts: {e!s}"}), file=sys.stderr)
        sys.exit(1)

    # Add the MLX models directory to the path
    # Check only necessary locations
    possible_paths = [
        os.environ.get("MLX_MODELS_DIR"),
        os.path.expanduser("~/.cache/huggingface/hub"),
    ]

    mlx_models_dir = None
    for path in possible_paths:
        if path and os.path.isdir(path):
            mlx_models_dir = path
            break

    if mlx_models_dir:
        # Verify path is safe before adding
        if os.path.abspath(mlx_models_dir) != mlx_models_dir:
            print(json.dumps({"error": "Invalid MLX models directory path"}), file=sys.stderr)
            sys.exit(1)
        sys.path.append(mlx_models_dir)
    else:
        print(json.dumps({"error": "MLX models directory not found. Set MLX_MODELS_DIR environment variable."}), file=sys.stderr)
        sys.exit(1)

    try:
        import mlx.core as mx
        from transformers import AutoModel, AutoTokenizer

        # Load model and tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModel.from_pretrained(model_path)

        # Validate texts is a list
        if not isinstance(texts, list):
            print(json.dumps({"error": "texts must be a list"}), file=sys.stderr)
            sys.exit(1)

        # Limit batch size to prevent memory issues
        if len(texts) > 100:
            print(json.dumps({"error": "Batch size too large (max 100)"}), file=sys.stderr)
            sys.exit(1)

        embeddings = []

        for text in texts:
            # Validate text input
            if not isinstance(text, str):
                print(json.dumps({"error": "All texts must be strings"}), file=sys.stderr)
                sys.exit(1)

            # Limit text length
            if len(text) > 10000:
                print(json.dumps({"error": "Text too long (max 10000 chars)"}), file=sys.stderr)
                sys.exit(1)
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
