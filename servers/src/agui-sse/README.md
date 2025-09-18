# AGUI SSE Server

A lightweight Server-Sent Events (SSE) server for real-time AGUI (Agent GUI) updates in Cortex-OS.

## Overview

This server exposes an SSE endpoint on `AGUI_PORT` (default: 3023) and forwards A2A events with the `agui.*` prefix to connected
clients in real-time. It bridges the gap between the internal A2A event system and the browser-based AGUI frontend.

## Features

- **SSE Endpoint**: `/agui/events` for real-time event streaming
- **Health Check**: `/health` endpoint with server status
- **A2A Integration**: Subscribes to `agui.*` events from the A2A bus
- **Connection Management**: Automatic cleanup of stale connections
- **CORS Support**: Configured for cross-origin requests

## Usage

### Starting the Server

```bash
# Using npm/pnpm scripts
pnpm start

# Direct execution
node --loader tsx server.ts

# Development mode with auto-restart
pnpm dev
```

### Environment Variables

- `AGUI_PORT`: Port to bind the SSE server (default: 3023)

### Endpoints

#### SSE Events Stream

```http
GET /agui/events
```

Returns an SSE stream with the following event types:

- `connected`: Initial connection confirmation
- `ping`: Keep-alive pings every 30 seconds  
- `agui_component_rendered`: UI component was rendered
- `agui_user_interaction`: User interacted with a component
- `agui_ai_recommendation`: AI provided a UI recommendation
- `agui_state_changed`: UI state was updated

#### Health Check

```http
GET /health
```

Returns server status and connection count.

### Client Usage

```javascript
const eventSource = new EventSource('http://localhost:3023/agui/events');

eventSource.addEventListener('agui_component_rendered', (event) => {
  const data = JSON.parse(event.data);
  console.log('Component rendered:', data);
});

eventSource.addEventListener('agui_user_interaction', (event) => {
  const data = JSON.parse(event.data);
  console.log('User interaction:', data);
});
```

## Integration with A2A Bus

The server automatically subscribes to these A2A event types:

- `agui.component.rendered`
- `agui.user.interaction`  
- `agui.ai.recommendation`
- `agui.state.changed`

Events received from the A2A bus are forwarded to all connected SSE clients with appropriate event type mapping.

## Architecture

```mermaid
A2A Bus → AGUI SSE Server → SSE Clients (Browsers/AGUI)
         ↑
    createAGUIAdapter
```

The server uses the `createAGUIAdapter` from `@cortex-os/agui` to handle the event bridging and format transformation.

## Development

### Testing the Server

You can publish test events using the server's built-in method:

```javascript
import { AGUISSEServer } from './server.ts';

const server = new AGUISSEServer();
await server.start();

// Publish a test event
await server.publishTestEvent();
```

### Connection Monitoring

The server logs connection events and maintains active connection counts. Use the health endpoint to monitor server
status and connected client count.
