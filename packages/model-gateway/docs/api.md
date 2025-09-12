# API Reference

## POST /chat

Request:

```json
{
  "model": "mlx-stablelm",
  "msgs": [{ "role": "user", "content": "Hello" }]
}
```

Response:

```json
{
  "content": "Hi there!",
  "modelUsed": "mlx-stablelm"
}
```

## POST /embeddings

`texts` is an array of strings.

## POST /rerank

Provide `query` and `docs` array with optional `topK`.

## GET /privacy and POST /privacy

Get or set privacy mode: `{ "enabled": true }`.

## GET /metrics

Prometheus metrics.

## GET /health

Returns service status and available capabilities.
