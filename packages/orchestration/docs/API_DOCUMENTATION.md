# nO Master Agent Loop - API Documentation
*brAInwav Production API Reference*

## Overview
The nO Master Agent Loop provides a comprehensive REST API for managing autonomous agents, monitoring system health, and performing administrative operations. All APIs follow brAInwav's standards for security, performance, and reliability.

## Base Information
- **Base URL**: `https://no.brainwav.com` (production) or `http://localhost:3000` (development)
- **API Version**: v1.0.0
- **Content-Type**: `application/json`
- **Authentication**: OAuth 2.0 / OIDC + RBAC

## Authentication

### OAuth 2.0 Flow
```bash
# 1. Redirect user to authorization endpoint
GET /auth/login?provider=google&redirect_uri=<callback>

# 2. Handle callback with authorization code
POST /auth/callback
{
  "code": "authorization_code",
  "state": "csrf_token"
}

# 3. Use received access token for API calls
Authorization: Bearer <access_token>
```

### RBAC Roles
- **admin**: Full system access
- **operator**: Monitoring and operational access
- **user**: Basic agent management access
- **readonly**: Read-only access

## Health & Monitoring APIs

### GET /health
Get basic system health status.

**Response:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600000,
  "version": "1.0.0"
}
```

**Status Codes:**
- `200`: Healthy or degraded
- `503`: Unhealthy

### GET /health/live
Kubernetes liveness probe endpoint.

**Response:**
```json
{
  "status": "alive",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET /health/ready
Kubernetes readiness probe endpoint.

**Response:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "ready": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Status Codes:**
- `200`: Ready to serve requests
- `503`: Not ready

### GET /health/detailed
Detailed health information with all component status.

**Authorization**: Bearer token required

**Response:**
```json
{
  "overall": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600000,
  "version": "1.0.0",
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "timestamp": "2024-01-15T10:30:00Z",
      "responseTime": 45,
      "details": {
        "connected": true
      }
    },
    {
      "name": "redis",
      "status": "healthy",
      "timestamp": "2024-01-15T10:30:00Z",
      "responseTime": 12,
      "details": {
        "connected": true
      }
    },
    {
      "name": "memory",
      "status": "healthy",
      "timestamp": "2024-01-15T10:30:00Z",
      "responseTime": 1,
      "details": {
        "heapUsed": 125829120,
        "heapTotal": 143360000,
        "usedRatio": 0.65,
        "thresholds": {
          "warning": 0.8,
          "critical": 0.95
        }
      }
    },
    {
      "name": "agent-pool",
      "status": "healthy",
      "timestamp": "2024-01-15T10:30:00Z",
      "responseTime": 25,
      "details": {
        "active": 8,
        "total": 10,
        "healthy": 9,
        "healthyRatio": 0.9
      }
    }
  ]
}
```

### GET /metrics
Prometheus metrics endpoint.

**Response**: Prometheus format metrics
```
# HELP no_http_requests_total Total HTTP requests
# TYPE no_http_requests_total counter
no_http_requests_total{method="GET",status="200"} 1234

# HELP no_http_request_duration_seconds HTTP request duration
# TYPE no_http_request_duration_seconds histogram
no_http_request_duration_seconds_bucket{le="0.1"} 100
no_http_request_duration_seconds_bucket{le="0.5"} 150
no_http_request_duration_seconds_bucket{le="1.0"} 180
no_http_request_duration_seconds_bucket{le="+Inf"} 200

# HELP no_agent_pool_size Current agent pool size
# TYPE no_agent_pool_size gauge
no_agent_pool_size{status="active"} 8
no_agent_pool_size{status="idle"} 2
no_agent_pool_size{status="total"} 10
```

### GET /info
System information endpoint.

**Response:**
```json
{
  "service": "nO Master Agent Loop",
  "company": "brAInwav",
  "version": "1.0.0",
  "environment": "production",
  "nodeVersion": "v18.17.0",
  "platform": "linux",
  "arch": "x64",
  "pid": 1,
  "uptime": 3600.5,
  "memory": {
    "rss": 145829120,
    "heapTotal": 143360000,
    "heapUsed": 125829120,
    "external": 2045632
  },
  "cpuUsage": {
    "user": 850000,
    "system": 120000
  }
}
```

## Administrative APIs

All admin APIs require `admin` or `operator` role.

### GET /admin/status
Comprehensive system status for administrators.

**Authorization**: Bearer token with admin/operator role

**Response:**
```json
{
  "health": {
    "overall": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "checks": [...]
  },
  "shutdown": {
    "handlers": ["http-server", "agent-pool", "database", "redis", "cleanup"],
    "inProgress": false
  },
  "system": {
    "pid": 1,
    "uptime": 3600.5,
    "memory": {
      "rss": 145829120,
      "heapTotal": 143360000,
      "heapUsed": 125829120,
      "external": 2045632
    },
    "cpuUsage": {
      "user": 850000,
      "system": 120000
    },
    "loadAverage": [0.5, 0.8, 1.2],
    "freeMemory": 4294967296,
    "totalMemory": 8589934592
  }
}
```

### GET /admin/health/checks
Get all health check results.

**Authorization**: Bearer token with admin/operator role

**Response:**
```json
{
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "timestamp": "2024-01-15T10:30:00Z",
      "responseTime": 45,
      "details": {
        "connected": true
      }
    }
  ],
  "total": 4,
  "healthy": 4,
  "degraded": 0,
  "unhealthy": 0
}
```

### POST /admin/health/check/:name
Run a specific health check on demand.

**Authorization**: Bearer token with admin/operator role

**Parameters:**
- `name` (path): Name of the health check to run

**Response:**
```json
{
  "name": "database",
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "responseTime": 45,
  "details": {
    "connected": true
  }
}
```

**Error Response:**
```json
{
  "status": "error",
  "message": "Health check not found"
}
```

### GET /admin/shutdown/handlers
Get list of registered shutdown handlers.

**Authorization**: Bearer token with admin role

**Response:**
```json
{
  "handlers": [
    "http-server",
    "agent-pool", 
    "job-processor",
    "database",
    "redis",
    "cleanup"
  ],
  "total": 6,
  "shutdownInProgress": false
}
```

### POST /admin/shutdown
Initiate graceful shutdown.

**Authorization**: Bearer token with admin role

**Request Body:**
```json
{
  "reason": "Maintenance window - server restart"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Graceful shutdown initiated",
  "reason": "Maintenance window - server restart"
}
```

**Error Responses:**
```json
{
  "status": "error",
  "message": "Shutdown already in progress"
}
```

## Agent Management APIs

### GET /api/v1/agents
List all agents in the pool.

**Authorization**: Bearer token with user role or higher

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `idle`, `failed`)
- `limit` (optional): Number of results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "agents": [
    {
      "id": "agent-001",
      "status": "active",
      "type": "worker",
      "createdAt": "2024-01-15T10:00:00Z",
      "lastActivity": "2024-01-15T10:29:00Z",
      "performance": {
        "tasksCompleted": 145,
        "averageResponseTime": 250,
        "successRate": 0.98
      },
      "resources": {
        "cpu": 45.2,
        "memory": 512.0,
        "storage": 1024.0
      }
    }
  ],
  "total": 10,
  "active": 8,
  "idle": 2,
  "failed": 0,
  "pagination": {
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

### GET /api/v1/agents/:id
Get detailed information about a specific agent.

**Authorization**: Bearer token with user role or higher

**Parameters:**
- `id` (path): Agent ID

**Response:**
```json
{
  "id": "agent-001",
  "status": "active", 
  "type": "worker",
  "createdAt": "2024-01-15T10:00:00Z",
  "lastActivity": "2024-01-15T10:29:00Z",
  "configuration": {
    "maxConcurrentTasks": 5,
    "timeout": 30000,
    "retryLimit": 3
  },
  "performance": {
    "tasksCompleted": 145,
    "tasksInProgress": 2,
    "averageResponseTime": 250,
    "successRate": 0.98,
    "errorRate": 0.02
  },
  "resources": {
    "cpu": 45.2,
    "memory": 512.0,
    "storage": 1024.0,
    "networkIn": 1024000,
    "networkOut": 512000
  },
  "health": {
    "status": "healthy",
    "lastCheck": "2024-01-15T10:29:00Z",
    "checks": {
      "connectivity": "pass",
      "performance": "pass",
      "resources": "pass"
    }
  }
}
```

### POST /api/v1/agents
Create a new agent.

**Authorization**: Bearer token with operator role or higher

**Request Body:**
```json
{
  "type": "worker",
  "configuration": {
    "maxConcurrentTasks": 5,
    "timeout": 30000,
    "retryLimit": 3
  },
  "resources": {
    "cpu": 1.0,
    "memory": 1024.0,
    "storage": 2048.0
  }
}
```

**Response:**
```json
{
  "id": "agent-012",
  "status": "initializing",
  "type": "worker",
  "createdAt": "2024-01-15T10:30:00Z",
  "configuration": {
    "maxConcurrentTasks": 5,
    "timeout": 30000,
    "retryLimit": 3
  },
  "resources": {
    "cpu": 1.0,
    "memory": 1024.0,
    "storage": 2048.0
  }
}
```

### PUT /api/v1/agents/:id
Update agent configuration.

**Authorization**: Bearer token with operator role or higher

**Parameters:**
- `id` (path): Agent ID

**Request Body:**
```json
{
  "configuration": {
    "maxConcurrentTasks": 10,
    "timeout": 45000,
    "retryLimit": 5
  }
}
```

**Response:**
```json
{
  "id": "agent-001",
  "status": "active",
  "configuration": {
    "maxConcurrentTasks": 10,
    "timeout": 45000,
    "retryLimit": 5
  },
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### DELETE /api/v1/agents/:id
Remove an agent from the pool.

**Authorization**: Bearer token with operator role or higher

**Parameters:**
- `id` (path): Agent ID

**Response:**
```json
{
  "id": "agent-001",
  "status": "terminating",
  "message": "Agent scheduled for removal"
}
```

### POST /api/v1/agents/:id/restart
Restart a specific agent.

**Authorization**: Bearer token with operator role or higher

**Parameters:**
- `id` (path): Agent ID

**Response:**
```json
{
  "id": "agent-001",
  "status": "restarting",
  "message": "Agent restart initiated",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Task Management APIs

### GET /api/v1/tasks
List tasks in the system.

**Authorization**: Bearer token with user role or higher

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `running`, `completed`, `failed`)
- `agentId` (optional): Filter by agent ID
- `limit` (optional): Number of results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "tasks": [
    {
      "id": "task-001",
      "type": "data-processing",
      "status": "running",
      "agentId": "agent-001",
      "createdAt": "2024-01-15T10:25:00Z",
      "startedAt": "2024-01-15T10:26:00Z",
      "progress": 0.65,
      "priority": "normal",
      "metadata": {
        "source": "api",
        "user": "system"
      }
    }
  ],
  "total": 25,
  "pending": 5,
  "running": 8,
  "completed": 10,
  "failed": 2,
  "pagination": {
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

### GET /api/v1/tasks/:id
Get detailed task information.

**Authorization**: Bearer token with user role or higher

**Parameters:**
- `id` (path): Task ID

**Response:**
```json
{
  "id": "task-001",
  "type": "data-processing",
  "status": "running",
  "agentId": "agent-001",
  "createdAt": "2024-01-15T10:25:00Z",
  "startedAt": "2024-01-15T10:26:00Z",
  "progress": 0.65,
  "priority": "normal",
  "configuration": {
    "timeout": 300000,
    "retryLimit": 3,
    "parameters": {
      "inputFile": "data.json",
      "outputFormat": "csv"
    }
  },
  "metrics": {
    "duration": 240000,
    "cpuUsage": 45.2,
    "memoryUsage": 256.0
  },
  "logs": [
    {
      "timestamp": "2024-01-15T10:26:00Z",
      "level": "info",
      "message": "Task started"
    },
    {
      "timestamp": "2024-01-15T10:28:00Z",
      "level": "info", 
      "message": "Processing 65% complete"
    }
  ]
}
```

### POST /api/v1/tasks
Create a new task.

**Authorization**: Bearer token with user role or higher

**Request Body:**
```json
{
  "type": "data-processing",
  "priority": "normal",
  "configuration": {
    "timeout": 300000,
    "retryLimit": 3,
    "parameters": {
      "inputFile": "data.json",
      "outputFormat": "csv"
    }
  },
  "metadata": {
    "source": "api",
    "user": "user-123"
  }
}
```

**Response:**
```json
{
  "id": "task-026",
  "type": "data-processing",
  "status": "pending",
  "priority": "normal",
  "createdAt": "2024-01-15T10:30:00Z",
  "configuration": {
    "timeout": 300000,
    "retryLimit": 3,
    "parameters": {
      "inputFile": "data.json",
      "outputFormat": "csv"
    }
  },
  "metadata": {
    "source": "api",
    "user": "user-123"
  }
}
```

### DELETE /api/v1/tasks/:id
Cancel a task.

**Authorization**: Bearer token with user role or higher (own tasks) or operator role (any task)

**Parameters:**
- `id` (path): Task ID

**Response:**
```json
{
  "id": "task-001",
  "status": "cancelled",
  "message": "Task cancelled successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Performance & Metrics APIs

### GET /api/v1/metrics/performance
Get system performance metrics.

**Authorization**: Bearer token with user role or higher

**Query Parameters:**
- `timeRange` (optional): Time range (`1h`, `24h`, `7d`, `30d`) (default: `1h`)
- `granularity` (optional): Data granularity (`1m`, `5m`, `1h`, `1d`) (default: `5m`)

**Response:**
```json
{
  "timeRange": "1h",
  "granularity": "5m",
  "metrics": {
    "requests": {
      "total": 12450,
      "rate": 3.45,
      "timeline": [
        {
          "timestamp": "2024-01-15T09:30:00Z",
          "value": 210
        }
      ]
    },
    "responseTime": {
      "average": 145.6,
      "p50": 120.0,
      "p95": 340.0,
      "p99": 580.0,
      "timeline": [
        {
          "timestamp": "2024-01-15T09:30:00Z",
          "avg": 145.6,
          "p95": 340.0
        }
      ]
    },
    "agents": {
      "total": 10,
      "active": 8,
      "utilization": 0.75,
      "timeline": [
        {
          "timestamp": "2024-01-15T09:30:00Z",
          "total": 10,
          "active": 8
        }
      ]
    },
    "errors": {
      "total": 25,
      "rate": 0.002,
      "timeline": [
        {
          "timestamp": "2024-01-15T09:30:00Z",
          "value": 2
        }
      ]
    }
  }
}
```

### GET /api/v1/metrics/agents
Get agent-specific performance metrics.

**Authorization**: Bearer token with user role or higher

**Query Parameters:**
- `agentId` (optional): Specific agent ID
- `timeRange` (optional): Time range (default: `1h`)

**Response:**
```json
{
  "agents": [
    {
      "id": "agent-001",
      "metrics": {
        "tasksCompleted": 145,
        "tasksInProgress": 2,
        "averageResponseTime": 250,
        "successRate": 0.98,
        "cpuUsage": 45.2,
        "memoryUsage": 512.0,
        "uptime": 7200000
      }
    }
  ]
}
```

## Configuration APIs

### GET /api/v1/config
Get current system configuration.

**Authorization**: Bearer token with admin role

**Response:**
```json
{
  "service": {
    "name": "nO Master Agent Loop",
    "version": "1.0.0",
    "environment": "production"
  },
  "performance": {
    "autoscaling": {
      "enabled": true,
      "minAgents": 5,
      "maxAgents": 50,
      "targetCpu": 70,
      "targetMemory": 80
    },
    "caching": {
      "enabled": true,
      "defaultTtl": 300000,
      "maxSize": 10000
    }
  },
  "security": {
    "oauth": {
      "enabled": true,
      "providers": ["google"]
    },
    "rbac": {
      "enabled": true,
      "defaultRole": "user"
    }
  }
}
```

### PUT /api/v1/config
Update system configuration.

**Authorization**: Bearer token with admin role

**Request Body:**
```json
{
  "performance": {
    "autoscaling": {
      "targetCpu": 75,
      "targetMemory": 85
    }
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Configuration updated successfully",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

## Error Responses

### Standard Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "agentId",
      "reason": "Agent ID is required"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-12345"
  }
}
```

### Error Codes
- `400`: Bad Request - Invalid request parameters
- `401`: Unauthorized - Authentication required
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource not found
- `409`: Conflict - Resource conflict (e.g., shutdown in progress)
- `422`: Unprocessable Entity - Validation errors
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - System error
- `503`: Service Unavailable - System not ready

## Rate Limiting

All APIs are subject to rate limiting:
- **Authenticated users**: 1000 requests per 15 minutes
- **Admin users**: 5000 requests per 15 minutes
- **Anonymous**: 100 requests per 15 minutes (health endpoints only)

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

## Webhooks

### Event Types
- `agent.created`
- `agent.updated`
- `agent.deleted`
- `agent.failed`
- `task.created`
- `task.completed`
- `task.failed`
- `system.alert`

### Webhook Payload
```json
{
  "id": "event-001",
  "type": "agent.failed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "agentId": "agent-001",
    "reason": "Connection timeout",
    "details": {
      "error": "Network unreachable"
    }
  },
  "metadata": {
    "version": "1.0.0",
    "environment": "production"
  }
}
```

---

*This API documentation is maintained by the brAInwav engineering team.*

**Document Version**: 1.0.0  
**Last Updated**: $(date)  
**API Version**: v1.0.0
