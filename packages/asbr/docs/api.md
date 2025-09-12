# API & SDK

## Authentication
Requests require the token printed by the CLI:
```
Authorization: Bearer <token>
```

## Endpoints
- `POST /v1/tasks` – create a task
- `GET /v1/tasks/{id}` – retrieve task status
- `GET /v1/artifacts` – list artifacts
- `GET /v1/artifacts/{id}` – download artifact
- `GET /v1/service-map` – discover available routes

## SDK Usage
```ts
import { createASBRClient } from '@cortex-os/asbr';

const client = createASBRClient({ baseUrl: 'http://127.0.0.1:7439', token });
await client.createTask({ name: 'example', input: {} });
```
