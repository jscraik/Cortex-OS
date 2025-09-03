# API Reference

This document provides detailed information about the planned REST API for Cortex Code. The API will enable programmatic access to all Cortex Code functionality and serve as the foundation for the WebUI and SDK integrations.

_Note: This API is planned for implementation and is not yet available in the current release._

## Overview

The Cortex Code REST API follows modern REST principles with JSON request/response bodies. It provides comprehensive access to all Cortex Code features including AI chat, GitHub integration, A2A communications, and MCP management.

## Base URL

```bash
http://localhost:8080/api/v1
```

For production deployments, the base URL will depend on your installation:

```bash
https://your-domain.com/api/v1
```

## Authentication

### API Keys

Most endpoints require authentication via API keys:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:8080/api/v1/chat
```

### OAuth2 (Planned)

For enterprise deployments, OAuth2 authentication will be supported:

```bash
curl -H "Authorization: Bearer OAUTH_TOKEN" \
     http://localhost:8080/api/v1/chat
```

## Rate Limiting

API requests are subject to rate limiting to ensure fair usage:

- **Anonymous requests**: 60 requests per hour
- **Authenticated requests**: 1,000 requests per hour
- **Enterprise accounts**: Configurable limits

Rate limit information is included in response headers:

```bash
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1624234567
```

## Error Handling

All API responses use standard HTTP status codes:

| Code | Description           |
| ---- | --------------------- |
| 200  | Success               |
| 201  | Created               |
| 204  | No Content            |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 403  | Forbidden             |
| 404  | Not Found             |
| 429  | Too Many Requests     |
| 500  | Internal Server Error |

Error responses include a JSON body with details:

``json
{
"error": {
"code": "invalid_request",
"message": "The request was invalid",
"details": {
"field": "model",
"issue": "Model not found"
}
}
}

````

## API Endpoints

### Chat

#### Create Chat Completion

`POST /chat/completions`

Create a chat completion with an AI model.

**Request Body:**

```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "stream": false,
  "temperature": 0.7,
  "max_tokens": 1024
}
````

**Response:**

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "I'm doing well, thank you for asking!"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 9,
    "completion_tokens": 12,
    "total_tokens": 21
  }
}
```

#### Stream Chat Completion

`POST /chat/completions` with `stream: true`

Stream a chat completion response in real-time.

**Request Body:**

```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": "Count to 10."
    }
  ],
  "stream": true
}
```

**Response (Server-Sent Events):**

```bash
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4o","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"1"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":", "},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"2"},"finish_reason":null}]}

data: [DONE]
```

#### List Models

`GET /chat/models`

List available AI models.

**Response:**

``json
{
"object": "list",
"data": [
{
"id": "gpt-4o",
"object": "model",
"created": 1677610602,
"owned_by": "openai"
},
{
"id": "gpt-4o-mini",
"object": "model",
"created": 1677610602,
"owned_by": "openai"
},
{
"id": "claude-3-sonnet",
"object": "model",
"created": 1677610602,
"owned_by": "anthropic"
}
]
}

````

### GitHub Integration

#### Get Repository Overview

`GET /github/repos/{owner}/{repo}`

Get repository statistics and health metrics.

**Response:**

```json
{
  "id": 1296269,
  "name": "cortex-os",
  "full_name": "cortex-os/cortex-os",
  "private": false,
  "owner": {
    "login": "cortex-os",
    "id": 1342004,
    "avatar_url": "https://avatars.githubusercontent.com/u/1342004?v=4"
  },
  "html_url": "https://github.com/cortex-os/cortex-os",
  "description": "Terminal UI for Cortex-OS AI coding agent",
  "fork": false,
  "created_at": "2011-01-26T19:01:12Z",
  "updated_at": "2023-01-01T00:00:00Z",
  "pushed_at": "2023-01-01T00:00:00Z",
  "size": 1234,
  "stargazers_count": 42,
  "watchers_count": 42,
  "language": "Rust",
  "has_issues": true,
  "has_projects": true,
  "has_downloads": true,
  "has_wiki": true,
  "has_pages": false,
  "forks_count": 10,
  "open_issues_count": 5,
  "default_branch": "main"
}
````

#### List Pull Requests

`GET /github/repos/{owner}/{repo}/pulls`

List pull requests for a repository.

**Query Parameters:**

- `state`: open, closed, or all (default: open)
- `sort`: created, updated, or popularity (default: created)
- `direction`: asc or desc (default: desc)

**Response:**

```json
[
  {
    "id": 1,
    "number": 1347,
    "state": "open",
    "title": "Add new feature",
    "user": {
      "login": "octocat",
      "id": 1,
      "avatar_url": "https://avatars.githubusercontent.com/u/1?v=4"
    },
    "created_at": "2011-01-26T19:01:12Z",
    "updated_at": "2011-01-26T19:01:12Z",
    "closed_at": null,
    "merged_at": null,
    "merge_commit_sha": null,
    "draft": false,
    "commits": 1,
    "additions": 10,
    "deletions": 5,
    "changed_files": 2
  }
]
```

#### List Issues

`GET /github/repos/{owner}/{repo}/issues`

List issues for a repository.

**Query Parameters:**

- `state`: open, closed, or all (default: open)
- `labels`: comma-separated list of label names
- `sort`: created, updated, or comments (default: created)
- `direction`: asc or desc (default: desc)

**Response:**

```json
[
  {
    "id": 1,
    "number": 1347,
    "title": "Bug in chat interface",
    "user": {
      "login": "octocat",
      "id": 1,
      "avatar_url": "https://avatars.githubusercontent.com/u/1?v=4"
    },
    "state": "open",
    "locked": false,
    "assignee": null,
    "milestone": null,
    "comments": 0,
    "created_at": "2011-04-22T13:33:48Z",
    "updated_at": "2011-04-22T13:33:48Z",
    "closed_at": null,
    "author_association": "OWNER",
    "body": "There is a bug in the chat interface when sending long messages."
  }
]
```

### A2A Communications

#### List Agents

`GET /a2a/agents`

List all active agents.

**Response:**

```json
{
  "agents": [
    {
      "id": "agent-1",
      "name": "github-agent",
      "status": "online",
      "last_seen": "2023-01-01T00:00:00Z",
      "capabilities": ["github-pr-review", "github-issue-triage"]
    },
    {
      "id": "agent-2",
      "name": "security-agent",
      "status": "online",
      "last_seen": "2023-01-01T00:00:00Z",
      "capabilities": ["code-scanning", "vulnerability-detection"]
    }
  ]
}
```

#### Get Agent Events

`GET /a2a/agents/{agent_id}/events`

Get recent events for a specific agent.

**Query Parameters:**

- `limit`: Number of events to return (default: 50, max: 1000)
- `level`: Filter by log level (debug, info, warn, error, critical)

**Response:**

```json
{
  "events": [
    {
      "id": "event-1",
      "timestamp": "2023-01-01T00:00:00Z",
      "level": "info",
      "source": "github-agent",
      "target": "user",
      "type": "pr_review_complete",
      "message": "Completed review of PR #123",
      "metadata": {
        "pr_number": 123,
        "findings": 2
      }
    }
  ]
}
```

#### Stream Events

`GET /a2a/events/stream`

Stream A2A events in real-time using Server-Sent Events.

**Response (Server-Sent Events):**

```bash
data: {"id":"event-1","timestamp":"2023-01-01T00:00:00Z","level":"info","source":"github-agent","target":"user","type":"pr_review_complete","message":"Completed review of PR #123","metadata":{"pr_number":123,"findings":2}}

data: {"id":"event-2","timestamp":"2023-01-01T00:00:01Z","level":"debug","source":"security-agent","target":"github-agent","type":"scan_started","message":"Starting security scan","metadata":{"files":15}}
```

### MCP Management

#### List MCP Servers

`GET /mcp/servers`

List available MCP servers.

**Response:**

```json
{
  "servers": [
    {
      "name": "cortex-fs",
      "description": "File system operations",
      "status": "running",
      "version": "1.0.0",
      "capabilities": ["read_file", "write_file", "list_directory"]
    },
    {
      "name": "cortex-git",
      "description": "Git operations",
      "status": "stopped",
      "version": "1.0.0",
      "capabilities": ["git_status", "git_commit", "git_push"]
    }
  ]
}
```

#### Start MCP Server

`POST /mcp/servers/{server_name}/start`

Start an MCP server.

**Response:**

```json
{
  "name": "cortex-git",
  "status": "starting",
  "message": "Server start initiated"
}
```

#### Stop MCP Server

`POST /mcp/servers/{server_name}/stop`

Stop an MCP server.

**Response:**

```json
{
  "name": "cortex-git",
  "status": "stopping",
  "message": "Server stop initiated"
}
```

### Configuration

#### Get Configuration

`GET /config`

Get current configuration.

**Response:**

```json
{
  "name": "Cortex Code",
  "version": "2.0.0",
  "providers": {
    "default": "github",
    "fallback": ["openai", "anthropic"]
  },
  "features": {
    "tui": {
      "enabled": true
    },
    "daemon": {
      "enabled": true,
      "port": 8080
    }
  }
}
```

#### Update Configuration

`PUT /config`

Update configuration.

**Request Body:**

```json
{
  "providers": {
    "default": "openai"
  }
}
```

**Response:**

```json
{
  "message": "Configuration updated successfully"
}
```

### Cloudflare Tunnel

#### Get Tunnel Status

`GET /tunnel/status`

Get the current status of the Cloudflare tunnel.

**Response:**

```json
{
  "running": true,
  "url": "https://cortex-code.trycloudflare.com",
  "uptime": 3600,
  "connections": 2
}
```

#### Control Tunnel

`POST /tunnel/control`

Start or stop the Cloudflare tunnel.

**Request Body:**

```json
{
  "action": "start"
}
```

or

```json
{
  "action": "stop"
}
```

**Response:**

```json
{
  "status": "started",
  "url": "https://cortex-code.trycloudflare.com"
}
```

## WebSockets (Planned)

For real-time updates, Cortex Code will support WebSocket connections:

### Connection Endpoint

`ws://localhost:8080/ws`

### Events

WebSocket connections can subscribe to various events:

- Chat message updates
- GitHub activity notifications
- A2A event streams
- Configuration changes

### Example Connection

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onopen = function (event) {
  // Subscribe to chat events
  ws.send(
    JSON.stringify({
      type: 'subscribe',
      channel: 'chat',
    }),
  );
};

ws.onmessage = function (event) {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

## SDK Generation

The API is designed to support automatic SDK generation for multiple languages:

- Python
- TypeScript/JavaScript
- Go
- Java
- Rust

Each SDK will provide:

- Type-safe interfaces
- Automatic retry logic
- Request/response validation
- Streaming support
- Authentication helpers

## Related Documentation

- [Introduction](introduction.md) - Overview of Cortex Code
- [Roadmap](roadmap.md) - Planned features and enhancements
- [Cloudflare Tunnel](cloudflare-tunnel.md) - Secure remote access configuration
- [SDK Overview](sdk-overview.md) - Planned SDK documentation
