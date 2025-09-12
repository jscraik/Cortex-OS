# Examples & Tutorials

## Embeddings Example

```bash
curl -X POST http://127.0.0.1:8081/embeddings \
  -H 'Content-Type: application/json' \
  -d '{"texts":["hello","world"]}'
```

## Rerank Example

```bash
curl -X POST http://127.0.0.1:8081/rerank \
  -H 'Content-Type: application/json' \
  -d '{"query":"search","docs":["a","b","c"],"topK":2}'
```
