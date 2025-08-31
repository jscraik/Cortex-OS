# MLX Integration Summary

This library centralizes MLX-based embedding and reranking utilities.

## Usage

```ts
import { generateEmbedding, rerankDocuments } from '../src/lib/mlx/index.js';

const vectors = await generateEmbedding(['hello world']);
const ranked = await rerankDocuments('hello', ['hello world', 'foo bar']);
```

- `generateEmbedding(texts)` returns deterministic numeric vectors.
- `rerankDocuments(query, docs)` sorts documents by simple overlap score.

Both functions execute lightweight Python scripts, enabling concurrent calls without shared state.
