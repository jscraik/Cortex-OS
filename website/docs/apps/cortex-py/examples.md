---
title: Examples
sidebar_label: Examples
---

# Examples & Tutorials

## Python SDK Example
```python
from apps.cortex-py.src.mlx.embedding_generator import MLXEmbeddingGenerator

gen &#61; MLXEmbeddingGenerator()
vec &#61; gen.generate_embedding("sample")
print(len(vec))
```

## Curl Example
See the [User Guide](./user-guide.md#generate-an-embedding-via-api) for a `curl` request.
