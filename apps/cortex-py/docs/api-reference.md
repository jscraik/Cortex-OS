# API Reference

### POST `/embed`
- **Request**: `{ "text": "string" }`
- **Response**: `{ "embedding": [float, ...] }`
- **Errors**:
  - `422` if `text` is empty
  - `500` on model failure

The endpoint returns a normalized vector representing the input text. Authentication is not required for local use; deploy behind your own gateway for multi‑user environments.
