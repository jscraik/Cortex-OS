# brAInwav Cortex WebUI Monitoring System

Comprehensive operational readiness monitoring system for the Cortex WebUI backend with health checks and Prometheus-style metrics collection.

## Overview

The monitoring system provides:

- **Health Check API** - Kubernetes-style readiness/liveness probes
- **Metrics Collection** - Prometheus-compatible metrics with automatic collection
- **Security** - API key authentication for sensitive endpoints
- **brAInwav Branding** - Consistent branding and error messages
- **Production Ready** - Following brAInwav production standards

## Architecture

```
src/monitoring/
├── services/
│   ├── healthService.ts      # Health check logic and dependency validation
│   └── metricsService.ts     # Prometheus metrics collection
├── middleware/
│   └── metricsMiddleware.ts  # Automatic HTTP request tracking
├── routes/
│   ├── healthRoutes.ts       # Health check endpoints
│   └── metricsRoutes.ts      # Metrics endpoints with auth
├── __tests__/                # Comprehensive test coverage
└── index.ts                  # Main exports
```

## Health Check API

### Endpoints

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| GET | `/health` | Basic health check (always 200 if server running) | 200 |
| GET | `/health/ready` | Readiness probe (checks dependencies) | 200, 503 |
| GET | `/health/live` | Liveness probe (checks application state) | 200, 503 |
| GET | `/health/detailed` | Comprehensive health report | 200, 503 |

### Health Check Components

The system validates:

- **Database** - Connection and query performance
- **Filesystem** - Directory access and write permissions
- **Memory** - Heap utilization monitoring
- **Disk Space** - Data directory accessibility
- **Environment** - Required environment variables
- **External Dependencies** - External service connectivity

### Example Responses

#### Basic Health Check
```json
{
  "status": "OK",
  "timestamp": "2025-10-02T01:45:00.000Z",
  "brand": "brAInwav",
  "service": "cortex-webui",
  "uptime": 1234.56
}
```

#### Readiness Probe
```json
{
  "status": "ready",
  "checks": {
    "database": {
      "status": "pass",
      "message": "Database is responding normally",
      "observedValue": 45,
      "observedUnit": "ms",
      "componentId": "database",
      "componentType": "datastore"
    },
    "filesystem": {
      "status": "pass",
      "message": "File system is accessible and writable",
      "componentId": "filesystem",
      "componentType": "system"
    }
  },
  "timestamp": "2025-10-02T01:45:00.000Z",
  "brand": "brAInwav"
}
```

#### Detailed Health Report
```json
{
  "status": "healthy",
  "checks": { /* all health checks */ },
  "timestamp": "2025-10-02T01:45:00.000Z",
  "uptime": 1234.56,
  "version": "1.0.0",
  "brand": "brAInwav",
  "service": "cortex-webui",
  "environment": "production",
  "nodeVersion": "v20.10.0",
  "performance": {
    "memoryUsage": {
      "rss": 134217728,
      "heapTotal": 67108864,
      "heapUsed": 41943040,
      "external": 2097152
    },
    "cpuUsage": { /* CPU usage data */ },
    "eventLoopLag": 12.34
  }
}
```

## Metrics Collection

### Authentication

Metrics endpoints require API key authentication:

```bash
# Set the environment variable
export METRICS_API_KEY="your-secure-api-key"

# Use in requests
curl -H "X-API-Key: your-secure-api-key" http://localhost:3000/metrics
```

### Endpoints

| Method | Endpoint | Description | Format |
|--------|----------|-------------|--------|
| GET | `/metrics` | Prometheus-formatted metrics | text/plain |
| GET | `/metrics/json` | JSON-formatted metrics | application/json |
| POST | `/metrics/collect` | Trigger manual collection | application/json |

### Available Metrics

#### HTTP Request Metrics
- `http_requests_total` - Total HTTP requests by method, route, status
- `http_request_duration_seconds` - Request duration histograms

#### Application Metrics
- `nodejs_memory_usage_bytes` - Memory usage by type
- `process_cpu_usage_percent` - CPU usage percentage
- `nodejs_eventloop_lag_seconds` - Event loop lag
- `process_uptime_seconds` - Process uptime

#### Database Metrics
- `database_connections` - Connection pool by state
- `database_queries_total` - Query count by operation, table, success
- `database_query_duration_seconds` - Query duration histograms

#### Authentication Metrics
- `auth_attempts_total` - Authentication attempts by provider, success
- `auth_failures_total` - Failures by provider, reason
- `active_sessions_total` - Number of active sessions
- `token_validations_total` - Token validations by validity
- `token_validation_duration_seconds` - Token validation duration

### Example Prometheus Metrics

```prometheus
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/models",status_code="200",service="cortex-webui",brand="brAInwav"} 1

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/models",le="0.1",service="cortex-webui",brand="brAInwav"} 1
http_request_duration_seconds_bucket{method="GET",route="/api/models",le="+Inf",service="cortex-webui",brand="brAInwav"} 1

# HELP nodejs_memory_usage_bytes Memory usage in bytes
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="heap_used",service="cortex-webui",brand="brAInwav"} 41943040
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `METRICS_API_KEY` | `dev-api-key-change-in-production` | API key for metrics endpoints |
| `NODE_ENV` | `development` | Environment label for metrics |
| `DATABASE_PATH` | `./data/cortex.db` | Database path for health checks |
| `UPLOAD_DIR` | `./uploads` | Upload directory for health checks |

### Integration with Existing Server

The monitoring system integrates automatically:

```typescript
import { metricsMiddleware, createHealthCheckRoutes, createMetricsRoutes } from './monitoring/index.js';

// Apply metrics collection
app.use(metricsMiddleware());

// Add health check routes
app.use('/health', createHealthCheckRoutes());

// Add metrics routes (secured)
app.use('/metrics', createMetricsRoutes());
```

## Usage Examples

### Kubernetes Readiness/Liveness Probes

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: cortex-webui
        image: brainwav/cortex-webui:latest
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'cortex-webui'
    static_configs:
      - targets: ['cortex-webui:3000']
    metrics_path: /metrics
    authorization:
      credentials_file: /etc/prometheus/metrics-api-key.txt
```

### Custom Metrics in Controllers

```typescript
import { recordHttpRequestMetric, recordDatabaseMetric, recordAuthMetric } from '../monitoring/index.js';

// In controllers
export async function getUsers(req: Request, res: Response) {
  const startTime = Date.now();

  try {
    const users = await userService.getUsers();
    recordDatabaseMetric('SELECT', 'users', Date.now() - startTime, true);
    res.json(users);
  } catch (error) {
    recordDatabaseMetric('SELECT', 'users', Date.now() - startTime, false);
    throw error;
  }
}

// Authentication
export async function login(req: Request, res: Response) {
  try {
    const result = await authService.login(req.body);
    recordAuthMetric('local', true);
    res.json(result);
  } catch (error) {
    recordAuthMetric('local', false, error.reason);
    throw error;
  }
}
```

## Testing

The monitoring system includes comprehensive test coverage:

```bash
# Run monitoring tests
pnpm test src/monitoring/__tests__/

# Validate implementation
node src/monitoring/test-monitoring.js
```

## Security Features

- **API Key Authentication** - Metrics endpoints require valid API key
- **Rate Limiting Ready** - Structure supports rate limiting middleware
- **Security Headers** - All endpoints include security headers
- **Input Validation** - Route sanitization prevents metric explosion
- **Error Handling** - Graceful degradation on monitoring failures

## Performance Considerations

- **Async Operations** - Health checks run in parallel
- **Caching** - Last health check result is cached
- **Resource Limits** - Metric collection is rate-limited
- **Memory Safe** - Automatic cleanup and bounds checking

## brAInwav Standards Compliance

- **No Mock Data** - All health checks perform real validation
- **Error Messages** - Include brAInwav branding
- **Production Ready** - Follows all brAInwav production standards
- **Comprehensive Testing** - 90%+ test coverage requirement
- **Documentation** - Complete API documentation and examples

## Troubleshooting

### Common Issues

1. **Metrics endpoint returns 401**
   - Check `METRICS_API_KEY` environment variable
   - Verify API key is sent in `X-API-Key` header

2. **Health check shows unhealthy status**
   - Check database connectivity
   - Verify file system permissions
   - Review required environment variables

3. **High memory usage in metrics**
   - Metrics collection is automatic and periodic
   - Custom metrics should use appropriate data types

### Debug Mode

Enable debug logging:

```bash
export DEBUG=metrics:*
export NODE_ENV=development
```

## Contributing

When adding new metrics:

1. Follow Prometheus naming conventions
2. Include appropriate labels
3. Add comprehensive tests
4. Update documentation
5. Consider performance impact

## Support

For monitoring system issues:
- Check logs for error messages
- Validate environment configuration
- Run the test script for diagnostics
- Review health check responses