# Comprehensive API Reference - brAInwav Cortex-OS

## Overview

This document provides comprehensive API documentation for all brAInwav Cortex-OS services, including authentication, multimodal processing, RAG system, MCP integration, and TDD coach endpoints.

## Authentication

### OAuth 2.1 + PKCE Authentication

brAInwav Cortex-OS implements secure OAuth 2.1 with PKCE for authentication and authorization.

#### Authorization Code Flow with PKCE

**Step 1: Initiate Authorization**

```http
GET /auth/oauth/authorize?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}&code_challenge={code_challenge}&code_challenge_method=S256&scope={scope}&state={state}
```

**Parameters:**
- `client_id` (required): Application client identifier
- `redirect_uri` (required): Registered redirect URI
- `code_challenge` (required): PKCE code challenge (SHA256)
- `code_challenge_method` (required): Must be "S256"
- `scope` (optional): Requested permissions (space-separated)
- `state` (required): CSRF protection parameter

**Step 2: Exchange Authorization Code**

```http
POST /auth/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code={authorization_code}&redirect_uri={redirect_uri}&code_verifier={code_verifier}&client_id={client_id}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def...",
  "scope": "read write",
  "brand": "brAInwav"
}
```

#### Refresh Token Flow

```http
POST /auth/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token={refresh_token}&client_id={client_id}
```

#### Token Validation

```http
GET /auth/oauth/introspect
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "active": true,
  "client_id": "your-client-id",
  "username": "user@example.com",
  "scope": "read write",
  "exp": 1640995200,
  "iat": 1640991600,
  "brand": "brAInwav"
}
```

## Multimodal Processing API

### Upload Multimodal Document

Upload and process documents of various modalities with advanced AI processing capabilities.

**Endpoint**: `POST /api/v1/multimodal/upload`

**Content-Type**: `multipart/form-data`

**Request Parameters**:
- `file` (required): The file to upload
- `options` (optional): JSON string with processing options

**Processing Options**:
```json
{
  "chunkSize": 1000,
  "chunkOverlap": 200,
  "enableOCR": true,
  "enableVisionAnalysis": true,
  "enableTranscription": true,
  "enableSpeakerDiarization": true,
  "language": "en",
  "visionModel": "gpt-4-vision-preview",
  "transcriptionModel": "whisper-large",
  "quality": "high",
  "generateThumbnails": true
}
```

**Supported File Formats**:
- **Images**: PNG, JPG, JPEG, WebP, GIF (max 50MB)
- **Audio**: MP3, WAV, M4A, OGG, FLAC (max 500MB, max 4 hours)
- **PDFs**: PDF (max 200MB, max 200 pages)

**Response**:
```json
{
  "documentId": "uuid-string",
  "filename": "example.jpg",
  "modality": "image",
  "status": "success",
  "chunksCreated": 3,
  "processingTime": 2500,
  "metadata": {
    "width": 1920,
    "height": 1080,
    "format": "JPEG",
    "ocrText": "Extracted text from image",
    "visionAnalysis": {
      "description": "Image contains a landscape with mountains",
      "objects": [
        {
          "label": "mountain",
          "confidence": 0.95,
          "boundingBox": { "x": 100, "y": 50, "width": 300, "height": 200 }
        }
      ],
      "confidence": 0.92,
      "analysisModel": "gpt-4-vision-preview"
    }
  },
  "brand": "brAInwav"
}
```

### Search Multimodal Content

Perform semantic search across all or specific modalities with advanced filtering and cross-modal understanding.

**Endpoint**: `POST /api/v1/multimodal/search`

**Request Body**:
```json
{
  "query": "mountain landscape photography",
  "modalities": ["text", "image", "audio_transcript"],
  "limit": 20,
  "minScore": 0.7,
  "documentIds": ["uuid-1", "uuid-2"],
  "includeContent": true,
  "filters": {
    "mimeType": ["image/jpeg", "image/png"],
    "minDuration": 30,
    "maxDuration": 300,
    "minWidth": 800,
    "maxWidth": 1920,
    "language": "en",
    "speakerCount": 2,
    "dateRange": {
      "start": "2025-01-01T00:00:00.000Z",
      "end": "2025-01-31T23:59:59.999Z"
    }
  }
}
```

**Response**:
```json
{
  "results": [
    {
      "id": "chunk-uuid",
      "documentId": "doc-uuid",
      "filename": "landscape.jpg",
      "modality": "image",
      "content": "Mountain landscape with forest in foreground...",
      "score": 0.89,
      "chunkIndex": 0,
      "startPage": 1,
      "citations": [
        {
          "documentId": "doc-uuid",
          "documentName": "landscape.jpg",
          "filename": "landscape.jpg",
          "modality": "image",
          "page": 1,
          "text": "Mountain landscape with forest in foreground...",
          "score": 0.89
        }
      ],
      "preview": {
        "type": "image",
        "content": "Mountain landscape with forest..."
      }
    }
  ],
  "total": 15,
  "query": "mountain landscape photography",
  "processingTime": 145,
  "filters": { ... },
  "modalities": ["text", "image", "audio_transcript"],
  "brand": "brAInwav"
}
```

### Get Multimodal Statistics

Retrieve comprehensive statistics about multimodal content usage and processing.

**Endpoint**: `GET /api/v1/multimodal/stats`

**Response**:
```json
{
  "documents": {
    "total": 156,
    "byModality": {
      "text": 45,
      "image": 67,
      "audio": 28,
      "pdf_with_images": 16
    },
    "totalSize": 2147483648,
    "totalDuration": 18720
  },
  "chunks": {
    "total": 1247,
    "withEmbeddings": 1198,
    "byModality": {
      "text": 412,
      "image": 523,
      "audio_transcript": 245,
      "pdf_page_image": 67
    }
  },
  "processing": {
    "completed": 152,
    "failed": 3,
    "pending": 1,
    "averageProcessingTime": 3200
  },
  "brand": "brAInwav"
}
```

## RAG (Retrieval-Augmented Generation) API

### Enhanced RAG Query

Execute advanced RAG queries with multimodal context and citation tracking.

**Endpoint**: `POST /api/v1/rag/query`

**Request Body**:
```json
{
  "query": "What are the key features of our mountain landscape images?",
  "context": {
    "conversationId": "optional-conv-uuid",
    "userId": "user-uuid",
    "sessionData": { ... }
  },
  "retrieval": {
    "maxContextDocuments": 5,
    "maxChunksPerDocument": 3,
    "minRelevanceScore": 0.7,
    "includeMultimodal": true,
    "preferredModalities": ["image", "text"]
  },
  "generation": {
    "model": "gpt-4-turbo",
    "temperature": 0.1,
    "maxTokens": 1000,
    "systemPrompt": "You are a helpful AI assistant specializing in analyzing multimodal content.",
    "includeCitations": true
  }
}
```

**Response**:
```json
{
  "queryId": "query-uuid",
  "answer": "Based on the analyzed mountain landscape images, the key features include dramatic mountain peaks, forest foregrounds, professional composition, and varied lighting conditions that create depth and visual interest.",
  "sources": [
    {
      "documentId": "doc-uuid-1",
      "filename": "mountain_sunset.jpg",
      "modality": "image",
      "relevanceScore": 0.92,
      "excerpts": [
        {
          "text": "Mountain landscape with dramatic sunset lighting",
          "confidence": 0.95
        }
      ]
    }
  ],
  "citations": [
    {
      "id": "citation-1",
      "text": "Mountain landscape with dramatic sunset lighting",
      "source": "mountain_sunset.jpg",
      "position": 0
    }
  ],
  "metadata": {
    "processingTime": 1250,
    "documentsRetrieved": 5,
    "chunksUsed": 12,
    "model": "gpt-4-turbo",
    "brand": "brAInwav"
  }
}
```

### RAG Context Management

Manage retrieval contexts for enhanced RAG performance.

**Endpoint**: `POST /api/v1/rag/context`

**Request Body**:
```json
{
  "action": "create",
  "context": {
    "name": "Mountain Photography Analysis",
    "description": "Specialized context for mountain photography queries",
    "documentIds": ["doc-1", "doc-2", "doc-3"],
    "preferences": {
      "preferredModalities": ["image", "text"],
      "relevanceThreshold": 0.8,
      "maxDocuments": 10
    }
  }
}
```

## MCP (Model Context Protocol) API

### List Available MCP Tools

Retrieve all available MCP tools with their schemas and descriptions.

**Endpoint**: `GET /api/v1/mcp/tools`

**Response**:
```json
{
  "tools": [
    {
      "name": "memory.store",
      "description": "Store memories with metadata",
      "inputSchema": {
        "type": "object",
        "properties": {
          "content": { "type": "string" },
          "metadata": { "type": "object" },
          "tags": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["content"]
      },
      "annotations": {
        "title": "brAInwav Memory Storage",
        "idempotentHint": false
      }
    },
    {
      "name": "memory.search",
      "description": "Search stored memories",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string" },
          "limit": { "type": "number", "default": 10 }
        },
        "required": ["query"]
      },
      "annotations": {
        "readOnlyHint": true,
        "idempotentHint": true
      }
    }
  ],
  "brand": "brAInwav"
}
```

### Execute MCP Tool

Execute an MCP tool with validated input and receive structured results.

**Endpoint**: `POST /api/v1/mcp/execute`

**Request Body**:
```json
{
  "tool": "memory.store",
  "args": {
    "content": "Mountain landscape photography techniques",
    "metadata": {
      "category": "photography",
      "difficulty": "intermediate"
    },
    "tags": ["photography", "mountains", "techniques"]
  },
  "correlationId": "optional-id"
}
```

**Response**:
```json
{
  "success": true,
  "tool": "memory.store",
  "data": {
    "memoryId": "memory-uuid",
    "stored": true,
    "timestamp": "2025-01-15T10:30:00.000Z"
  },
  "correlationId": "optional-id",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "brand": "brAInwav"
}
```

### MCP Resources

Access MCP resources for data retrieval and management.

**Endpoint**: `GET /api/v1/mcp/resources/{uri}`

**Example**: `GET /api/v1/mcp/resources/memory://recent`

**Response**:
```json
{
  "contents": [
    {
      "uri": "memory://recent/item-1",
      "mimeType": "text/plain",
      "text": "Recent memory content about mountain photography"
    }
  ],
  "brand": "brAInwav"
}
```

## TDD Coach API

### TDD Validation

Validate code changes against TDD principles and quality standards.

**Endpoint**: `POST /api/v1/tdd/validate`

**Request Body**:
```json
{
  "files": [
    {
      "path": "src/services/multimodal.ts",
      "changes": "Added new image processing function",
      "testCoverage": true
    }
  ],
  "options": {
    "strictMode": true,
    "requireTests": true,
    "checkCodeStyle": true
  }
}
```

**Response**:
```json
{
  "validationId": "validation-uuid",
  "overallStatus": "passed",
  "results": [
    {
      "filePath": "src/services/multimodal.ts",
      "status": "passed",
      "issues": [],
      "suggestions": [
        "Consider adding more edge case tests for image processing"
      ],
      "coverage": {
        "lines": 96.5,
        "branches": 94.2,
        "functions": 100
      }
    }
  ],
  "summary": {
    "totalFiles": 1,
    "passedFiles": 1,
    "failedFiles": 0,
    "overallCoverage": 96.5,
    "brand": "brAInwav"
  }
}
```

### TDD Status

Get current TDD compliance status and metrics.

**Endpoint**: `GET /api/v1/tdd/status`

**Response**:
```json
{
  "status": {
    "overall": "compliant",
    "lastValidation": "2025-01-15T10:30:00.000Z",
    "validationCount": 156
  },
  "coverage": {
    "lines": 95.2,
    "branches": 94.8,
    "functions": 96.1,
    "statements": 95.0
  },
  "quality": {
    "mutationScore": 82.3,
    "flakyTests": 2,
    "testCount": 1247,
    "passRate": 99.8
  },
  "tddMetrics": {
    "testFirstCommits": 89.5,
    "redGreenRefactorCycles": 234,
    "averageCycleTime": "4.2m"
  },
  "brand": "brAInwav"
}
```

### TDD Coaching

Get AI-powered coaching suggestions for TDD improvement.

**Endpoint**: `POST /api/v1/tdd/coach`

**Request Body**:
```json
{
  "codeSnippet": "function processImage(image) { return image.process(); }",
  "context": {
    "filePath": "src/services/image.ts",
    "testExists": false,
    "complexity": "medium"
  },
  "coachingType": "test-first"
}
```

**Response**:
```json
{
  "coachingId": "coach-uuid",
  "suggestions": [
    {
      "type": "test-first",
      "priority": "high",
      "message": "Write a failing test before implementing the processImage function",
      "example": "describe('processImage', () => { it('should process image correctly', () => { const result = processImage(mockImage); expect(result).toBeDefined(); }); });"
    }
  ],
  "resources": [
    {
      "type": "documentation",
      "title": "TDD Best Practices",
      "url": "/docs/tdd-best-practices"
    }
  ],
  "brand": "brAInwav"
}
```

## Observability & Monitoring API

### Health Checks

Comprehensive health check endpoints for Kubernetes deployment and monitoring.

**Liveness Check**: `GET /health/live`

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 86400,
  "brand": "brAInwav"
}
```

**Readiness Check**: `GET /health/ready`

**Response**:
```json
{
  "status": "ready",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "dependencies": {
    "database": "healthy",
    "redis": "healthy",
    "mcp_server": "healthy",
    "vector_store": "healthy"
  },
  "brand": "brAInwav"
}
```

**Comprehensive Health**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 86400,
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 15
    },
    "redis": {
      "status": "healthy",
      "responseTime": 2
    },
    "mcp_server": {
      "status": "healthy",
      "responseTime": 8
    },
    "vector_store": {
      "status": "healthy",
      "responseTime": 25
    }
  },
  "metrics": {
    "memory_usage": "45%",
    "cpu_usage": "12%",
    "active_connections": 23
  },
  "brand": "brAInwav"
}
```

### Metrics Endpoint

Prometheus-compatible metrics endpoint.

**Endpoint**: `GET /metrics`

**Response** (Prometheus format):
```
# HELP brainwav_api_requests_total Total number of API requests
# TYPE brainwav_api_requests_total counter
brainwav_api_requests_total{method="GET",path="/api/v1/multimodal/search",status="200"} 1250

# HELP brainwav_request_duration_seconds Request duration in seconds
# TYPE brainwav_request_duration_seconds histogram
brainwav_request_duration_seconds_bucket{method="POST",path="/api/v1/multimodal/upload",le="0.1"} 100
brainwav_request_duration_seconds_bucket{method="POST",path="/api/v1/multimodal/upload",le="0.5"} 450
brainwav_request_duration_seconds_bucket{method="POST",path="/api/v1/multimodal/upload",le="1.0"} 780
brainwav_request_duration_seconds_bucket{method="POST",path="/api/v1/multimodal/upload",le="5.0"} 995
brainwav_request_duration_seconds_bucket{method="POST",path="/api/v1/multimodal/upload",le="+Inf"} 1000

# HELP brainwav_tdd_compliance_ratio TDD compliance ratio
# TYPE brainwav_tdd_compliance_ratio gauge
brainwav_tdd_compliance_ratio 0.895
```

## Error Handling

All API endpoints follow consistent error response patterns:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "field": "file",
      "issue": "File size exceeds maximum limit"
    },
    "timestamp": "2025-01-15T10:30:00.000Z",
    "requestId": "req-uuid"
  },
  "brand": "brAInwav"
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Input validation failed | 400 |
| `AUTHENTICATION_ERROR` | Authentication required | 401 |
| `AUTHORIZATION_ERROR` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `PAYLOAD_TOO_LARGE` | File size exceeds limits | 413 |
| `RATE_LIMITED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable | 503 |

## Rate Limiting

API endpoints are protected by rate limiting:

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Authentication | 10 requests | 1 minute |
| Multimodal Upload | 5 requests | 1 minute |
| Search/Query | 60 requests | 1 minute |
| MCP Tools | 100 requests | 1 minute |
| TDD Validation | 30 requests | 1 minute |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
```

## WebSocket API

Real-time communication for live updates and streaming responses.

**Endpoint**: `ws://localhost:3001/ws`

**Authentication**: Include JWT token as query parameter or in headers

**Message Format**:
```json
{
  "type": "message_type",
  "payload": { ... },
  "timestamp": "2025-01-15T10:30:00.000Z",
  "messageId": "msg-uuid"
}
```

### Message Types

#### Client to Server

- `subscribe`: Subscribe to updates
- `query`: Send query request
- `upload_progress`: Track upload progress

#### Server to Client

- `update`: Data update notification
- `query_response`: Query response
- `upload_progress`: Upload progress update
- `error`: Error notification

## SDK Examples

### JavaScript/TypeScript

```typescript
import { CortexOSClient } from '@cortex-os/client-sdk';

const client = new CortexOSClient({
  baseURL: 'https://api.cortex-os.brainwav.io',
  authToken: 'your-jwt-token'
});

// Upload multimodal document
const result = await client.multimodal.upload(file, {
  enableOCR: true,
  enableVisionAnalysis: true
});

// Search across modalities
const searchResults = await client.multimodal.search({
  query: 'mountain landscapes',
  modalities: ['image', 'text'],
  limit: 10
});

// Execute RAG query
const ragResponse = await client.rag.query({
  query: 'What techniques work best for mountain photography?',
  includeCitations: true
});
```

### Python

```python
from cortex_os import CortexOSClient

client = CortexOSClient(
    base_url='https://api.cortex-os.brainwav.io',
    auth_token='your-jwt-token'
)

# Upload and process audio
with open('meeting.mp3', 'rb') as f:
    result = await client.multimodal.upload(f, {
        'enableTranscription': True,
        'enableSpeakerDiarization': True
    })

# Search multimodal content
results = await client.multimodal.search({
    'query': 'project requirements',
    'modalities': ['text', 'audio_transcript']
})
```

## Support

For API support and questions:
- **Documentation**: Check this comprehensive reference guide
- **Issues**: Report through your organization's support channels
- **Status**: Check system health at `/health` endpoint
- **Rate Limits**: Monitor via `X-RateLimit-*` headers

---

**brAInwav Cortex-OS Comprehensive API Reference v1.0**
*Last updated: January 2025*