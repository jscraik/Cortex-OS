---
title: Pq
sidebar_label: Pq
---

# Product Quantization (PQ)

This package includes a simple Product Quantization implementation (`PQFlatIndex`) suitable for synthetic benchmarks and educational use.

## Parameters

- `m`: number of subspaces (must divide the vector dimension). Typical values: 8, 16.
- `k`: centroids per subspace (codebook size). Typical values: 16, 256.
- `iters`: k-means iterations per subspace.

## Usage in Benchmarks

- Persist and measure PQ using the benchmark CLI:

```bash
node packages/rag/benchmarks/indexing-bench.mjs --sizes=10000,100000 --quant=pq --variants=pq,hnswPQ
```

The run will:

- Train codebooks and encode vectors
- Save artifacts to `reports/pq-`N&lt;rows&gt;`-dim<dim>.pq.*`
- Record `onDiskBytesPQ` and `coldLoadMsPQ` in JSON/CSV/HTML outputs

## Trade-offs

- PQ dramatically reduces memory footprint (codes are 1 byte per subspace) while retaining a good portion of recall/mAP compared to float32 baselines.
- Larger `m` improves fidelity but increases code size linearly; larger `k` increases codebook size and training time.
- For production-grade ANN, pair PQ with graph-based indexes (e.g., HNSW) and consider asymmetric distance computations.

## Thresholds and CI

- Global and per-variant thresholds can be provided to the benchmark (recall%, mAP). See `benchmarks/README.md`.
- Stricter PQ characterization thresholds can be enabled by setting `RAG_PQ_STRICT=1` and
  running `pq.characterization.test.ts` with a realistic corpus fixture.
