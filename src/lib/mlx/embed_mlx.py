import json
import hashlib
import sys


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
        texts = json.loads(sys.argv[1])
        result = embed_texts(texts)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
