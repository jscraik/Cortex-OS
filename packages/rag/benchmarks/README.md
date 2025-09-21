# RAG Indexing Benchmark

This harness measures indexing performance and retrieval accuracy across multiple variants, producing JSON/CSV/HTML reports.

## Usage

Basic run:

```bash
node packages/rag/benchmarks/indexing-bench.mjs \
  --sizes=10000,100000 --ef=64,128 --queries=10 --topK=10 \
  --variants=flat,hnsw,scalarQ,pq,hnswScalar,hnswPQ \
  --report=reports/indexing-performance.json
```

### Threshold gates (global)

- `--minRecallPct=<number>`: Minimum average Recall@K (%) for HNSW
- `--minMap=<number>`: Minimum average mAP for HNSW
- `--peakRssBudgetMB=<number>`: Maximum allowed peak process RSS during a run (MB). Fails if any row exceeds this.

### Threshold gates (per-variant)

- `--minRecallPctByVariant=<v1:thr,v2:thr,...>`: e.g. `hnsw:95,hnswScalar:93,hnswPQ:90`
- `--minMapByVariant=<v1:thr,v2:thr,...>`: e.g. `hnsw:0.85,hnswScalar:0.82,hnswPQ:0.80`
- `--failOnMissingVariant[=true|false]`: When true, if a threshold for a variant is set but no metric exists, the run fails.

Examples:

```bash
# Global + per-variant, enforce missing
node packages/rag/benchmarks/indexing-bench.mjs \
  --sizes=10000,50000 --ef=64,128 --queries=10 --topK=10 \
  --minRecallPct=95 --minMap=0.85 \
  --minRecallPctByVariant=hnsw:95,hnswScalar:93,hnswPQ:90 \
  --minMapByVariant=hnsw:0.85,hnswScalar:0.82,hnswPQ:0.8 \
  --failOnMissingVariant
```

### Curves and UI presets

- `--curveKs=1,5,10` (default)
- `--curveVariants=hnsw,scalarQ,pq,hnswScalar,hnswPQ`
- `--curveMetrics=recall,map`
- `--curveDefaultVariantVisibility=<subset>`: Pre-checked variants in overlay

### Report tagging and CI artifact publishing

- `--reportTag=<text>`: Sanitized to folder name components
- Set `RAG_DATA_DIR` and/or `RAG_BACKUP_DIR` to replicate: JSON, CSV, HTML, and a contextual README into timestamped subfolders.
- When running in GitHub Actions, the script appends artifact paths to `GITHUB_OUTPUT` and links to `GITHUB_STEP_SUMMARY`.

HTML report includes:

- Summary badges for global thresholds
- Peak RSS, CPU max, and RSS-after-query badges in the header
- Per-variant threshold summary table with badge legend
- Curve viewer with compare mode, presets, and per-row toggles

CSV includes Recall@K and mAP@K for each variant.

### Product Quantization (PQ)

- Use `--quant=pq` to persist PQ artifacts and measure on-disk size and cold-load time.
- New metrics in outputs:
  - `onDiskBytesPQ`: total bytes for `*.pq.*` files
  - `coldLoadMsPQ`: time to load PQ artifacts
- Optional PQ budgets:
  - `--pqMinCompressionRatio=<x>`: require `flatBytes / onDiskBytesPQ >= x` (e.g., `3` for ≥3x smaller than float baseline)
  - `--pqMaxColdLoadMs=<ms>`: fail if `coldLoadMsPQ` exceeds this threshold
