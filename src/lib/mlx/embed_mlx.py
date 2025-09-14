import hashlib
import json
import sys
from typing import Any


def validate_texts_input(texts: Any) -> list[str]:
    """Validate and sanitize text inputs."""
    if not isinstance(texts, list):
        raise ValueError("Input must be a list of strings")

    # Validate each text item
    clean_texts = []
    for i, text in enumerate(texts[:100]):  # Limit to 100 texts
        if not isinstance(text, str):
            raise ValueError(f"Text {i} must be a string")

        # Sanitize text (remove null bytes, limit length)
        clean_text = text.replace('\x00', '')[:5000]  # 5KB limit per text
        clean_texts.append(clean_text)

    return clean_texts


def embed_texts(texts):
    vectors = []
    for text in texts:
        h = hashlib.sha256(text.encode("utf-8")).digest()
        # produce 8-dim deterministic vector
        vec = [b / 255 for b in h[:8]]
        vectors.append(vec)
    return vectors


if __name__ == "__main__":
    try:
        # Validate command line arguments
        if len(sys.argv) != 2:
            raise ValueError("Expected exactly one JSON argument")

        # Parse and validate JSON input
        raw_texts = json.loads(sys.argv[1])
        texts = validate_texts_input(raw_texts)

        result = embed_texts(texts)
        print(json.dumps(result))
    except (json.JSONDecodeError, ValueError) as e:
        print(json.dumps({"error": f"Input validation error: {e!s}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Processing error: {e!s}"}), file=sys.stderr)
        sys.exit(1)
