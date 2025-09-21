# Migration: Flat to HNSW

For production retrieval, switch from linear `FlatIndex` to HNSW. Use the helper tool to build a persisted index from your existing vectors:

```bash
# vectors.json should be an array of { id: string, vector: number[] }
node tools/migrate-flat-to-hnsw.mjs \
  --input=./data/vectors.json \
  --out=./data/hnsw/index \
  --space=cosine --M=16 --efConstruction=200 --efSearch=64

# Produces: ./data/hnsw/index.bin and ./data/hnsw/index.meta.json
```

At runtime, load the persisted index using the `HNSWIndex` persistence helpers:

```ts
import { HNSWIndex } from '../src/indexing/hnsw-index';

const idx = new HNSWIndex();
await idx.load('./data/hnsw/index'); // loads .bin + .meta.json
```

Notes:

- `hnswlib-node` is an optional dependency; install it in environments where HNSW is used.
- Tune `M`, `efConstruction`, and `efSearch` for your data distribution and latency targets.
- Consider running the indexing benchmark to validate speed/accuracy budgets in your environment:

```bash
node benchmarks/indexing-bench.mjs --sizes=10000,100000 --ef=32,64,128 --topK=10 --seed=42 \
  --memBudgetMB=4096 --cpuBudgetMs=2000
```
