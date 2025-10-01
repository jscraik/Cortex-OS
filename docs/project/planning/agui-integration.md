# AGUI Integration Guide

AGUI (Agent GUI) is a system for creating dynamic, AI-driven user interfaces in Cortex-OS. This guide explains how AGUI integrates across the platform's architecture and how to use its components effectively.

## Overview

AGUI enables agents to dynamically create, modify, and interact with user interfaces through standardized patterns:

- **MCP Tools**: Agents can create and manipulate UI components through MCP tool calls
- **A2A Events**: UI state changes and user interactions flow through the event bus
- **SSE Stream**: Real-time updates are delivered to frontend clients via Server-Sent Events
- **Contracts**: Shared schemas ensure type safety and consistency across components

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   Agents    │───▶│  MCP Tools   │───▶│  A2A Bus    │───▶│  SSE Server  │
│             │    │              │    │             │    │              │
│ - Create UI │    │ - create_ui_ │    │ - agui.*    │    │ - Port 3023  │
│ - Update    │    │   component  │    │   events    │    │ - /agui/     │
│ - Handle    │    │ - render_    │    │ - Event     │    │   events     │
│   events    │    │   view       │    │   schemas   │    │ - WebSocket  │
│             │    │ - handle_    │    │             │    │   fallback   │
│             │    │   interaction│    │             │    │              │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                                                                   │
                                                                   ▼
                                                          ┌──────────────┐
                                                          │  Frontend    │
                                                          │  Clients     │
                                                          │              │
                                                          │ - EventSource│
                                                          │ - React/Vue  │
                                                          │ - WebUI      │
                                                          │ - Custom     │
                                                          └──────────────┘
```

## Components

### 1. MCP Tools

Agents interact with AGUI through standardized MCP tools:

#### Available Tools

- **`create_ui_component`** - Create new UI components
- **`render_view`** - Render complete views with multiple components  
- **`handle_user_interaction`** - Process user interaction events
- **`update_component`** - Update existing component properties

#### Example Usage

```javascript
// Agent creates a button component
const result = await mcpClient.callTool('create_ui_component', {
  type: 'button',
  properties: {
    id: 'submit-btn',
    label: 'Submit Form',
    required: false,
    disabled: false
  },
  styling: {
    className: 'btn-primary',
    style: { margin: '10px' }
  }
});
```

### 2. A2A Events

AGUI events flow through the A2A bus for decoupled communication:

#### Event Types

- **`agui.component.rendered`** - A component was created/updated
- **`agui.user.interaction`** - User interacted with a component
- **`agui.ai.recommendation`** - AI suggested UI improvements
- **`agui.state.changed`** - UI state was modified

#### Event Schema Example

```typescript
// Component rendered event
{
  type: 'agui.component.rendered',
  source: 'urn:cortex:agent-ui-builder',
  data: {
    componentId: 'btn-submit-123',
    type: 'button',
    name: 'Submit Button',
    properties: {
      label: 'Submit Form',
      disabled: false
    },
    parentId: 'form-main',
    renderedBy: 'agent-ui-builder',
    renderedAt: '2023-12-01T10:30:00Z'
  }
}
```

### 3. SSE Server

The AGUI SSE server (`servers/src/agui-sse`) provides real-time updates to clients.

#### Configuration

- **Port**: `AGUI_PORT` (default: 3023)
- **Endpoint**: `/agui/events`
- **Health Check**: `/health`

#### Starting the Server

```bash
# Standalone
cd servers/src/agui-sse
pnpm start

# Development mode
pnpm dev

# With custom port
AGUI_PORT=4000 pnpm start
```

#### Client Connection

```javascript
// Browser client
const eventSource = new EventSource('http://localhost:3023/agui/events');

eventSource.addEventListener('agui_component_rendered', (event) => {
  const data = JSON.parse(event.data);
  console.log('New component:', data);
  // Update UI with new component
});

eventSource.addEventListener('agui_user_interaction', (event) => {
  const data = JSON.parse(event.data);
  console.log('User interaction:', data);
  // Handle user interaction
});
```

### 4. Contracts

Event schemas are defined in `libs/typescript/contracts/agui/` for type safety.

#### Using Contracts

```typescript
import { 
  createAguiComponentRenderedEvent,
  AGUI_EVENT_TYPES,
  type UiComponentRenderedEvent 
} from '@cortex-os/contracts/agui';

// Create a typed event
const componentData: UiComponentRenderedEvent = {
  componentId: 'btn-123',
  type: 'button',
  name: 'My Button',
  renderedBy: 'my-agent',
  renderedAt: new Date().toISOString()
};

// Create CloudEvents envelope
const envelope = createAguiComponentRenderedEvent(componentData, {
  source: 'urn:cortex:my-agent',
  correlationId: 'request-456'
});

// Publish to bus
await bus.publish(envelope);
```

## Integration Patterns

### Pattern 1: Agent-Driven UI Creation

1. Agent determines UI needs based on task context
2. Agent calls MCP tools to create components
3. Components are rendered and events published
4. Frontend receives SSE updates and renders UI
5. User interactions flow back through events

```typescript
// Agent workflow
async function createTaskInterface(taskContext) {
  // Create form components
  await mcpClient.callTool('create_ui_component', {
    type: 'form',
    properties: { id: 'task-form' }
  });
  
  await mcpClient.callTool('create_ui_component', {
    type: 'input',
    properties: { 
      id: 'task-name',
      placeholder: 'Enter task name'
    }
  });
  
  // Render complete view
  await mcpClient.callTool('render_view', {
    viewId: 'task-creation',
    components: ['task-form', 'task-name'],
    layout: 'flex'
  });
}
```

### Pattern 2: Event-Driven Updates

1. System state changes trigger events
2. AGUI subscribers update UI accordingly
3. Changes propagate via SSE to clients
4. Frontend reactively updates display

```typescript
// System publishes state change
await bus.publish(createAguiStateChangedEvent({
  stateId: 'task-status-update',
  componentId: 'task-progress',
  previousState: { status: 'pending' },
  newState: { status: 'completed', progress: 100 },
  trigger: 'system',
  changedAt: new Date().toISOString()
}));
```

### Pattern 3: AI-Suggested Improvements

1. AI analyzes UI usage patterns
2. Generates improvement recommendations
3. Publishes recommendation events
4. Frontend displays suggestions to users

```typescript
// AI publishes recommendation
await bus.publish(createAguiAiRecommendationEvent({
  recommendationId: 'rec-ui-accessibility',
  type: 'accessibility',
  component: 'main-form',
  suggestion: 'Add keyboard navigation shortcuts',
  confidence: 0.92,
  priority: 'high',
  generatedAt: new Date().toISOString()
}));
```

## Development Guide

### Setting Up AGUI Development

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Start AGUI SSE Server**
   ```bash
   cd servers/src/agui-sse
   pnpm dev
   ```

3. **Register MCP Tools** (already done in `servers/src/everything`)
   - AGUI tools are automatically registered
   - Available in any MCP client

4. **Test Event Flow**
   ```bash
   # Publish test event
   curl -X POST http://localhost:3023/test-event
   
   # Monitor SSE stream
   curl -N http://localhost:3023/agui/events
   ```

### Creating Custom Components

1. **Define Component Schema** in contracts
2. **Add MCP Tool Handler** in relevant server
3. **Implement Frontend Renderer** in client
4. **Test Event Flow** end-to-end

### Error Handling

- **Invalid MCP calls**: Tools validate input schemas
- **Event validation**: Contracts ensure type safety
- **SSE connection loss**: Clients should implement reconnection
- **Server unavailable**: Graceful degradation to polling

## Testing

### Unit Tests

```bash
# Test contracts
cd libs/typescript/contracts/agui
pnpm test

# Test SSE server
cd servers/src/agui-sse  
pnpm test
```

### Integration Tests

```bash
# End-to-end AGUI flow
pnpm test:agui-integration
```

### Manual Testing

1. **Start SSE server**: `cd servers/src/agui-sse && pnpm dev`
2. **Connect test client**: `curl -N http://localhost:3023/agui/events`
3. **Trigger MCP tools** via agent or direct API calls
4. **Verify events** appear in SSE stream

## Troubleshooting

### Common Issues

## SSE Connection Fails
- Check `AGUI_PORT` environment variable
- Verify server is running on correct port
- Check firewall/proxy settings

## Events Not Delivered
- Verify A2A bus configuration
- Check event type spelling (must match `agui.*` pattern)  
- Ensure event schema validation passes

## MCP Tools Not Available
- Check server registration in `servers/src/everything`
- Verify `@cortex-os/agui` dependency is installed
- Restart MCP server after changes

## Type Errors
- Update to latest `@cortex-os/contracts` version
- Check import paths (use `@cortex-os/contracts/agui`)
- Regenerate types if needed

### Debugging

Enable debug logging:
```bash
DEBUG=agui:* pnpm dev
```

Monitor events:
```bash
# Watch A2A bus events
DEBUG=a2a:* pnpm dev

# Monitor SSE connections
curl -N -H "Accept: text/event-stream" http://localhost:3023/agui/events
```

## Performance Considerations

- **Event Batching**: Consider batching frequent updates
- **Connection Limits**: SSE server handles ~1000 concurrent connections
- **Memory Usage**: Events are not persisted by default
- **Rate Limiting**: Implement client-side throttling for high-frequency updates

## Security

- **CORS**: Configured for cross-origin requests
- **Input Validation**: All MCP tool inputs are validated via Zod schemas
- **Event Sanitization**: Consider sanitizing user-generated content in events
- **Access Control**: Implement authentication/authorization as needed

## Migration from Legacy

If migrating from direct event usage:

```typescript
// Old way (deprecated)
import { createAguiEvent } from '@cortex-os/agui';

// New way (recommended)  
import { createAguiComponentRenderedEvent } from '@cortex-os/contracts/agui';
```

## Future Enhancements

- **WebSocket Support**: Bidirectional communication
- **Component Library**: Pre-built component templates
- **Visual Designer**: Drag-and-drop UI builder
- **Analytics Integration**: Usage tracking and optimization
- **Mobile Support**: React Native integration

## See Also

- [A2A Integration Guide](../packages/a2a/README.md)
- [MCP Tools Reference](../packages/mcp/README.md)
- [Event Bus Architecture](../docs/architecture/event-bus.md)
- [WebUI Integration](../apps/cortex-webui/README.md)
