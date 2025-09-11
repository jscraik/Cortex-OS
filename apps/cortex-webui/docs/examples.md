# Examples & Tutorials

## Send a Chat Message via API

```bash
curl -X POST http://localhost:3001/api/conversations \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}'
```

See [API Reference](./api.md) for more endpoints.
