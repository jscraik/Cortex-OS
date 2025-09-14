# A2A Schema Registry

Schema registry service for A2A (Agent-to-Agent) communication with persistent storage backend.

## Features

### Persistent Storage
- **SQLite Backend**: Durable schema storage using SQLite database
- **In-Memory Option**: For development and testing purposes
- **CRUD Operations**: Full create, read, update, and delete operations for schemas

### RESTful API
- **Schema Management**: Create, retrieve, and delete JSON schemas
- **Versioning**: Support for multiple versions of the same schema
- **Validation**: Automatic validation of schema format and structure

### Middleware
- **Rate Limiting**: Built-in rate limiting with Redis backend support
- **Quota Management**: Global and per-agent quota enforcement
- **Burst Smoothing**: Token bucket algorithm for request smoothing
- **Security**: ACL-based access control

## Installation

```bash
npm install @cortex-os/a2a-schema-registry
```

## Usage

### Database Backend

```typescript
import { createService } from '@cortex-os/a2a-schema-registry/db';

// Create service with SQLite database
const app = createService({
  dbPath: './schemas.db' // Path to SQLite database file
});

app.listen(3000, () => {
  console.log('Schema registry listening on port 3000');
});
```

### In-Memory Backend (Development)

```typescript
import { createService } from '@cortex-os/a2a-schema-registry';

// Create service with in-memory storage
const app = createService();

app.listen(3000, () => {
  console.log('Schema registry listening on port 3000');
});
```

## API Endpoints

### Create Schema
```http
POST /schemas
Content-Type: application/json

{
  "name": "user-profile",
  "version": "1.0.0",
  "schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "email": { "type": "string", "format": "email" }
    },
    "required": ["name", "email"]
  }
}
```

### Get Schema by Name and Version
```http
GET /schemas/user-profile/1.0.0
```

### Get All Versions of a Schema
```http
GET /schemas/user-profile
```

### Delete Schema
```http
DELETE /schemas/user-profile/1.0.0
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port for the schema registry service | `3000` |
| `DATABASE_PATH` | Path to SQLite database file | `:memory:` |
| `REDIS_URL` | Redis connection URL for rate limiter | `redis://localhost:6379` |
| `SCHEMA_SVC_SMOOTHING` | Enable burst smoothing middleware | `true` |
| `SCHEMA_SVC_GLOBAL_QUOTA` | Enable global quota middleware | `true` |
| `SCHEMA_SVC_PER_AGENT_QUOTA` | Enable per-agent quota middleware | `true` |

## Database Schema

The SQLite database uses the following schema:

```sql
CREATE TABLE IF NOT EXISTS schemas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  schema TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(name, version)
);

CREATE INDEX IF NOT EXISTS idx_schemas_name ON schemas(name);
CREATE INDEX IF NOT EXISTS idx_schemas_name_version ON schemas(name, version);
```

## Testing

Run tests with:

```bash
npm test
```

The test suite includes:
- Unit tests for database operations
- Integration tests for REST API endpoints
- Performance tests for concurrent access