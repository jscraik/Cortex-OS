# Schema Registry Service

A runtime schema registry service for serving Cortex-OS contract schemas via REST API endpoints.

## Features

- **REST API Endpoints**: Serve contract schemas at runtime
- **Schema Discovery**: List all available schemas and categories
- **Schema Validation**: Event validation against JSON schemas
- **CORS Support**: Default CORS for local development
- **Security**: Helmet middleware for security headers
- **Authentication**: Optional API key gating via `x-api-key`

## API Endpoints

### Health Check

```http
GET /health
```

Returns service health status and timestamp.

### List All Schemas

```http
GET /schemas
```

Returns all available schemas with metadata.

### Get Schema by ID

```http
GET /schemas/:schemaId
```

Returns a specific schema by its ID.

### Validate Event

```http
POST /validate/:schemaId
```

Validates an event against a specific schema.

### Get Schemas by Category

```http
GET /categories/:category
```

Returns all schemas in a specific category (e.g., `cloudevents`, `asyncapi`).

## Usage

### Starting the Service

```typescript
import { SchemaRegistry } from '@cortex-os/registry';

const registry = new SchemaRegistry({
  port: 3001,
  contractsPath: './contracts',
});

registry.start();
```

### Configuration Options

- `port`: Server port (default: 3001)
- `contractsPath`: Path to contracts directory (default: `process.cwd()/contracts`)
- `apiKey`: Optional API key for request authentication (default: `REGISTRY_API_KEY` env var)

### Authentication

Set an API key using the `REGISTRY_API_KEY` environment variable or the `apiKey` option. Clients must send the key in an `x-api-key` header for all endpoints except `/health`.

## Development

### Building

```bash
pnpm build
```

### Running Tests

```bash
pnpm test
```

### Starting Development Server

```bash
pnpm dev
```

## Schema Structure

Schemas are expected to be organized in the contracts directory:

```
contracts/
├── cloudevents/
│   ├── agent-task-requested.json
│   ├── agent-task-completed.json
│   └── ...
└── asyncapi/
    └── agent-messaging-api.json
```

Each schema should have an `$id` field for identification and follow JSON Schema draft-07 format.
