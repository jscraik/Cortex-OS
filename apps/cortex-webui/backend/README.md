# Cortex WebUI Backend

This is the backend component of the Cortex WebUI project, built with Node.js, Express, and SQLite.

## Features

- User authentication (registration, login, logout)
- Conversation management (create, read, update, delete)
- Message handling with real-time WebSocket support
- File upload and management
- AI model management
- RESTful API design
- SQLite database for data persistence
- MCP Tool Execution (contract-driven, rate limited)

## Tech Stack

- **Node.js** with TypeScript
- **Express** for the web framework
- **SQLite** for database storage
- **WebSocket** for real-time communication
- **Zod** for validation
- **JWT** for authentication
- **Multer** for file uploads

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- pnpm (recommended) or npm

### Installation

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the development server:

   ```bash
   pnpm dev
   ```

3. Build for production:

   ```bash
   pnpm build
   ```

4. Start the production server:

   ```bash
   pnpm start
   ```

## Server Architecture

The backend uses a **composable factory pattern** for better testability and modularity:

### Factory Functions

- `createApp()`: Returns configured Express app (pure, testable)
- `createServer()`: Returns full server with HTTP + WebSocket + lifecycle methods
- Auto-start fallback when running `node src/server.ts` directly

### Programmatic Usage

```typescript
import { createServer } from './src/server';

const { app, server, wss, start, stop } = createServer();

// Start server
await start();

// Stop server (for tests or graceful shutdown)
await stop();
```

### Test Integration

Tests can create isolated server instances on ephemeral ports:

```typescript
import { createServer } from '../src/server';

const { server, stop } = createServer();
await new Promise<void>((resolve) => server.listen(0, resolve));
const port = (server.address() as any).port;
// ... run tests against http://localhost:${port}
await stop();
```

## MCP Tool Execution Layer

The backend exposes a Model Context Protocol (MCP) compliant tool execution surface for WebUI interactions. This is contract‑driven using shared schemas under `libs/typescript/contracts` (see `webui-tools.ts`).

### Endpoints

- `GET /api/v1/mcp/tools` – Returns an array of available tools: `{ name, description }`.
- `POST /api/v1/mcp/execute` – Executes a tool.

Request body shape:

```jsonc
{
  "tool": "open_panel",              // string, required
  "args": { /* tool-specific */ },    // validated via Zod per tool
  "correlationId": "optional-id"     // echoed for tracing
}
```

Successful response:

```jsonc
{
  "success": true,
  "tool": "open_panel",
  "data": { /* tool result */ },
  "correlationId": "optional-id",
  "timestamp": "2025-01-01T12:34:56.000Z"
}
```

Error response (contracted):

```jsonc
{
  "success": false,
  "error": {
    "tool": "open_panel",
    "code": "validation_error | unknown_tool | rate_limited | internal_error",
    "message": "Human readable detail",
    "details": { /* optional structured context */ },
    "correlationId": "optional-id"
  }
}
```

### Available Tools (summary)

| Tool | Purpose |
| ---- | ------- |
| `open_panel` | Open a UI panel (e.g. side navigation) |
| `update_component_state` | Patch component state via path & value |
| `navigate` | Trigger client navigation |
| `simulate_click` | Programmatic click on a UI element |
| `submit_form` | Submit (or validate) a form |
| `send_chat_message` | Queue a chat message |
| `render_chart` | Schedule chart render |
| `generate_timeline` | Produce timeline data summary |
| `render_tree` | Render / summarize a tree structure |

(Authoritative definitions live in `webuiMcpTools` contracts.)

### Validation & Contracts

All tool invocations are validated by `validateWebuiToolInput()` which applies the Zod schema bound to the tool definition. This guarantees:

- Stable, forward-compatible shape
- Fast rejection of malformed input (400 + `validation_error`)
- Tool-specific structured `details` when present

### Rate Limiting

Each tool call is subject to a simple in-memory rate limiter with a sliding window:

Environment variables:

- `WEBUI_MCP_RATE_LIMIT` (default: `100`)
- `WEBUI_MCP_RATE_WINDOW_MS` (default: `60000`)

If the threshold is exceeded the handler returns HTTP `429` with error code `rate_limited`.

#### Test Override Helper

For deterministic testing the limiter can be overridden:

```typescript
import { __setMcpRateLimitForTests } from '../src/mcp/tools';
__setMcpRateLimitForTests(2, 10_000); // limit=2 in a 10s window
```

Avoid using this outside tests.

### Service Abstractions

`tools.ts` defines lightweight service interfaces (`PanelService`, `NavigationService`, etc.) and a `WebuiMcpServices` shape. Stubs implement deterministic returns for early integration. Future wiring should:

1. Provide concrete implementations in `src/services/`.
2. Inject them into `executeTool` (e.g. through factory pattern or DI container).
3. Preserve contract boundaries (no cross-feature reach‑through imports).

### Extending with a New Tool

1. Add the tool definition & schema to contracts (`webuiMcpTools`).
2. Add validation schema mapping entry if needed.
3. Implement its execution branch in `executeTool()`.
4. Add contract test (`contracts/tests/…`).
5. Add handler test if logic has branching / side effects.

### Error Categories

| Code | Meaning | HTTP |
| ---- | ------- | ---- |
| `validation_error` | Input failed schema validation | 400 |
| `unknown_tool` | Tool name not recognized | 400 |
| `rate_limited` | Rate limit exceeded | 429 |
| `internal_error` | Unexpected server error | 500 |

Internal errors are logged with `webui_mcp_tool_internal_error` and scrubbed to a generic message.

## Project Structure

```
src/
├── controllers/    # Request handlers
├── middleware/     # Express middleware
├── models/         # Database models
├── services/       # Business logic
├── utils/          # Utility functions
├── mcp/            # MCP tool execution layer (tools.ts)
├── types/          # TypeScript types
└── server.ts       # Main server file
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Conversations

- `GET /api/conversations` - Get all conversations for user
- `POST /api/conversations` - Create a new conversation
- `GET /api/conversations/:id` - Get a specific conversation
- `PUT /api/conversations/:id` - Update a conversation
- `DELETE /api/conversations/:id` - Delete a conversation

### Messages

- `GET /api/conversations/:conversationId/messages` - Get messages for a conversation
- `POST /api/conversations/:conversationId/messages` - Create a new message

### Models

- `GET /api/models` - Get all AI models
- `GET /api/models/:id` - Get a specific AI model

### Files

- `POST /api/files/upload` - Upload a file
- `DELETE /api/files/:id` - Delete a file

## WebSocket API

The backend also provides a WebSocket server for real-time communication:

- **Endpoint**: `ws://localhost:3033/ws`
- **Authentication**: Pass JWT token as query parameter `?token=YOUR_JWT_TOKEN`

## Environment Variables

Create a `.env` file in the root of the backend directory (ports mirror `config/ports.env`):

```env
PORT=3033
JWT_SECRET=your_jwt_secret_here
FRONTEND_URL=http://localhost:3000

# Authentication monitoring dispatch (all optional unless noted)
AUTH_MONITORING_PROMETHEUS_ENABLED=true
AUTH_MONITORING_TIMEOUT_MS=3000
AUTH_MONITORING_DATADOG_API_KEY=
AUTH_MONITORING_DATADOG_APP_KEY=
AUTH_MONITORING_DATADOG_SITE=datadoghq.com
AUTH_MONITORING_NEW_RELIC_ACCOUNT_ID=
AUTH_MONITORING_NEW_RELIC_INSERT_KEY=
AUTH_MONITORING_WEBHOOK_URL=
```

### Authentication Monitoring

The brAInwav Cortex-OS backend publishes authentication activity to multiple observability targets:

- **Prometheus counter** (`brainwav_auth_events_total`) capturing event type, actor, and status labels.
- **Datadog events API** when `AUTH_MONITORING_DATADOG_API_KEY` (and optional app key/site) are provided.
- **New Relic Insights** when both `AUTH_MONITORING_NEW_RELIC_ACCOUNT_ID` and `AUTH_MONITORING_NEW_RELIC_INSERT_KEY` are set.
- **Custom JSON webhook** for any HTTPS endpoint via `AUTH_MONITORING_WEBHOOK_URL`.

All dispatches use a shared timeout configured by `AUTH_MONITORING_TIMEOUT_MS` (defaults to 3000 ms). Missing credentials automatically disable the corresponding provider while logging a brAInwav-branded notice. Set `AUTH_MONITORING_PROMETHEUS_ENABLED=false` to opt out of the Prometheus counter.

## Database

The application uses SQLite for data storage. The database file is automatically created at `./data/cortex.db` when the application starts.

## Development

- The development server runs on port 3001 by default
- Changes to TypeScript files are automatically compiled and the server restarts
- API endpoints are prefixed with `/api`
- WebSocket endpoint is available at `/ws`

## Testing

Run tests with Vitest:

```bash
pnpm test
```

### Contract Tests

The test suite includes contract tests for core endpoints and WebSocket behavior:

- **Health endpoint**: Validates `/health` JSON response schema
- **WebSocket**: Tests welcome message and echo functionality
- **Server lifecycle**: Ensures proper start/stop for test isolation

Test files use the server factory pattern for clean setup/teardown:

```typescript
// test/health.contract.test.ts
import { createServer } from '../src/server';

const { server, stop } = createServer();
// ... test setup with ephemeral port
```

## Building

Create a production build:

```bash
pnpm build
```

The build output will be in the `dist/` directory.
