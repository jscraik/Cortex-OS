# RAG Audit

## Overview

- **Context**: `apps/cortex-os/packages/rag`
- **Focus**: indexing, chunking, embeddings, retrieval, fusion
- **Dataset**: `golden-1.0`
- **Model**: `dummy-embedding-1.0`

## Checks

| Area                            | Status | Notes                                                     |
| ------------------------------- | ------ | --------------------------------------------------------- |
| Deterministic chunkers          | ✅     | `byChars` yields identical output for repeated runs       |
| Embeddings provider abstraction | ✅     | `Embeddings` interface covers model + dim + embed()       |
| Caching                         | ⚠️     | no built-in cache; test uses wrapper to validate approach |
| Evals (NDCG, recall)            | ✅     | golden set returns NDCG=1.0, Recall=1.0                   |
| Safety filters                  | ⚠️     | no content filtering applied during ingest/query          |

## Eval Results

- **NDCG@2**: `1.0`
- **Recall@2**: `1.0`

## Fix Plan

1. Add first-class embedding cache layer.
2. Record dataset + model versions during ingest.
3. Implement safety filters on query and ingest.
4. Expand evaluation harness with perturbation tests and larger golden sets.

## Score

Overall RAG readiness: **8/10**
