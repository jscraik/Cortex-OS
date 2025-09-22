# brAInwav Cortex-OS Agents - TDD Implementation Guide

## 🎯 Overview

This guide covers the comprehensive TDD plan implementation that brings the brAInwav Cortex-OS agents package to **100% production readiness**. All components include integrated brAInwav branding and enterprise-grade reliability features.

## 🚀 Quick Start

### Basic Setup

```typescript
import {
  // Testing Infrastructure
  TestEnvironment,
  TestSuiteRunner,
  
  // Observability
  observability,
  
  // Health Monitoring
  healthMonitor,
  
  // Error Handling
  setupErrorBoundary,
  AgentError
} from '@brAInwav/cortex-agents';

// Initialize brAInwav production environment
setupErrorBoundary({
  enableGracefulShutdown: true,
  logErrors: true,
  exitOnCritical: true
});

// Start health monitoring
await healthMonitor.getHealthStatus();

// Begin observability collection
observability.metrics.counter('brAInwav.service.started', 1);
```

## 🧪 Testing Infrastructure

### Creating Test Environments

```typescript
import { TestEnvironment, TestSuiteRunner } from '@brAInwav/cortex-agents';

describe('brAInwav Agent Tests', () => {
  let testEnv: TestEnvironment;
  
  beforeEach(() => {
    testEnv = new TestEnvironment();
  });
  
  afterEach(async () => {
    await testEnv.cleanup();
  });
  
  test('should process brAInwav requests', async () => {
    // Create mock agent with brAInwav branding
    const agent = testEnv.createMockAgent({
      name: 'brAInwav-test-agent',
      mockBehavior: 'success'
    });
    
    const response = await agent.execute('test input');
    expect(response.content).toContain('brAInwav');
  });
});
```

### Test Suite Configuration

```typescript
const suiteRunner = new TestSuiteRunner({
  timeout: 30000,
  retries: 3,
  parallel: false,
  cleanup: true,
  verbose: true,
  skipBranding: false // Ensure brAInwav branding validation
});

const { results, summary } = await suiteRunner.runSuite(
  'brAInwav Integration Tests',
  async (env) => {
    // Setup phase
    return env.createMockAgent({ name: 'brAInwav-suite-agent' });
  },
  async (agent, env) => {
    // Test execution
    const tests = [
      await suiteRunner.runTest('brAInwav feature test', async () => {
        // Test implementation
      })
    ];
    return tests;
  }
);

console.log(`brAInwav test suite: ${summary.successRate * 100}% success rate`);
```

### Performance Testing

```typescript
import { PerformanceTestRunner } from '@brAInwav/cortex-agents';

// Measure function performance
const perfResult = await PerformanceTestRunner.measureFunction(
  async () => {
    // Your brAInwav operation
    return await processData();
  },
  100 // iterations
);

console.log(`brAInwav operation avg duration: ${perfResult.avgDuration}ms`);

// Load testing
const loadResult = await PerformanceTestRunner.loadTest(
  async () => {
    await apiCall();
  },
  10, // concurrency
  60000 // duration (1 minute)
);

console.log(`brAInwav load test: ${loadResult.requestsPerSecond} req/s`);
```

## 📊 Observability Implementation

### Metrics Collection

```typescript
import { observability } from '@brAInwav/cortex-agents';

// Counter metrics (cumulative)
observability.metrics.counter('brAInwav.requests.total', 1, {
  endpoint: '/api/agents',
  method: 'POST'
});

// Gauge metrics (current value)
observability.metrics.gauge('brAInwav.active.connections', 42, 'count', {
  service: 'agent-gateway'
});

// Histogram metrics (distribution)
observability.metrics.histogram('brAInwav.request.duration', 150, 
  [1, 5, 10, 25, 50, 100, 250, 500, 1000], // buckets
  'ms',
  { operation: 'agent.execute' }
);

// Get all metrics
const metrics = observability.metrics.getMetrics();
console.log(`brAInwav collected ${metrics.length} metrics`);
```

### Distributed Tracing

```typescript
// Manual span creation
const span = observability.tracing.startSpan('brAInwav.agent.process', undefined, {
  'agent.name': 'cortex-agent-1',
  'operation.type': 'inference'
});

try {
  // Your operation
  const result = await processInference();
  
  observability.tracing.addSpanLog(span, 'info', 'Processing completed');
  observability.tracing.addSpanTags(span, { 'result.status': 'success' });
  
  return result;
} catch (error) {
  observability.tracing.finishSpan(span, error);
  throw error;
} finally {
  observability.tracing.finishSpan(span);
}

// Automatic tracing with decorator
const tracedFunction = observability.traced(
  'brAInwav.data.processing',
  async (data: unknown[]) => {
    // Function automatically traced
    return processData(data);
  }
);

await tracedFunction(inputData);
```

### Trace Export

```typescript
// Export traces for external systems
const traces = observability.tracing.exportTraces('otel'); // OpenTelemetry format
const jaegerTraces = observability.tracing.exportTraces('jaeger');
const zipkinTraces = observability.tracing.exportTraces('zipkin');

// Comprehensive export
const exportData = observability.export();
console.log('brAInwav observability data:', {
  metrics: exportData.metrics.length,
  traces: exportData.traces.length,
  health: exportData.health
});
```

## 🏥 Health Check System

### Basic Health Monitoring

```typescript
import { healthMonitor } from '@brAInwav/cortex-agents';

// Get current health status
const health = await healthMonitor.getHealthStatus();
console.log(`brAInwav service health: ${health.overall}`);
console.log(`brAInwav branding compliance: ${health.brAInwav.brandingCompliance * 100}%`);
```

### Custom Health Checks

```typescript
// Register custom health check
healthMonitor.registerCheck({
  name: 'brAInwav.database.connection',
  description: 'Database connectivity check',
  checkFn: async () => {
    try {
      await database.ping();
      return {
        name: 'brAInwav.database.connection',
        status: 'healthy' as const,
        duration: 15,
        timestamp: Date.now(),
        message: 'brAInwav database connection healthy'
      };
    } catch (error) {
      return {
        name: 'brAInwav.database.connection',
        status: 'unhealthy' as const,
        duration: 30,
        timestamp: Date.now(),
        message: `brAInwav database connection failed: ${error.message}`
      };
    }
  },
  interval: 30000, // Check every 30 seconds
  timeout: 5000,   // 5 second timeout
  retries: 3,
  criticality: 'critical', // critical|important|optional
  enabled: true,
  circuitBreaker: {
    enabled: true,
    failureThreshold: 3,
    resetTimeout: 60000
  }
});
```

### Health Check Dependencies

```typescript
// Register checks with dependencies
healthMonitor.registerCheck({
  name: 'brAInwav.service.api',
  description: 'API service health',
  dependencies: ['brAInwav.database.connection', 'brAInwav.memory'],
  checkFn: async () => {
    // This check runs after its dependencies
    return {
      name: 'brAInwav.service.api',
      status: 'healthy' as const,
      duration: 10,
      timestamp: Date.now(),
      message: 'brAInwav API service operational'
    };
  },
  interval: 60000,
  timeout: 10000,
  retries: 2,
  criticality: 'important',
  enabled: true
});
```

### Built-in Health Checks

The system automatically includes brAInwav built-in health checks:

- **brAInwav.memory**: Memory usage monitoring
- **brAInwav.disk**: Disk accessibility verification  
- **brAInwav.circuit-breakers**: Circuit breaker status
- **brAInwav.observability**: Observability system health

## 🛡️ Error Handling & Security

### Global Error Boundary

```typescript
import { setupErrorBoundary, AgentError, ErrorCategory } from '@brAInwav/cortex-agents';

// Setup comprehensive error handling
setupErrorBoundary({
  enableGracefulShutdown: true,
  logErrors: true,
  exitOnCritical: true,
  notificationCallback: (error) => {
    console.error('brAInwav critical error:', error);
    // Send to alerting system
  }
});

// Custom error creation
throw new AgentError(
  'brAInwav operation failed',
  ErrorCategory.VALIDATION,
  ErrorSeverity.HIGH,
  { context: 'additional details' }
);
```

### Input Sanitization

```typescript
import { InputSanitizer } from '@brAInwav/cortex-agents';

const sanitizer = new InputSanitizer({
  enableXSSProtection: true,
  enableSQLInjectionProtection: true,
  enableCommandInjectionProtection: true,
  maxInputLength: 10000,
  allowedTags: [], // No HTML tags allowed
  enableBrandingValidation: true // Ensure brAInwav context
});

const cleanInput = sanitizer.sanitize(userInput);
const isValid = sanitizer.validate(userInput);
```

### Log Redaction

```typescript
import { LogRedactor } from '@brAInwav/cortex-agents';

const redactor = new LogRedactor({
  enableEmailRedaction: true,
  enablePhoneRedaction: true,
  enableCreditCardRedaction: true,
  enableSSNRedaction: true,
  customPatterns: [/brAInwav-key-\w+/g], // Custom sensitive patterns
  redactionText: '[REDACTED]'
});

const safeLogMessage = redactor.redact('User email: user@example.com logged into brAInwav system');
// Output: "User email: [REDACTED] logged into brAInwav system"
```

## 🧠 Memory Management

### Memory-Bounded Stores

```typescript
import { MemoryBoundedStore } from '@brAInwav/cortex-agents';

const store = new MemoryBoundedStore<UserData>({
  maxSize: 1000,           // Maximum entries
  ttlMs: 3600000,         // 1 hour TTL
  maxMemoryMB: 100,       // 100MB memory limit
  evictionPolicy: 'lru',  // LRU eviction
  enableMetrics: true,    // brAInwav metrics collection
  cleanupInterval: 60000  // Cleanup every minute
});

// Store data
store.set('user-123', userData);

// Retrieve data
const user = store.get('user-123');

// Monitor memory usage
const metrics = store.getMetrics();
console.log(`brAInwav store: ${metrics.currentSize}/${metrics.maxSize} entries`);
console.log(`brAInwav memory: ${metrics.memoryUsageMB}MB`);
```

### Rate Limiting

```typescript
import { RateLimiter } from '@brAInwav/cortex-agents';

const limiter = new RateLimiter({
  maxRequests: 100,       // 100 requests
  windowMs: 60000,        // per minute
  keyGenerator: (req) => req.ip,
  enableMetrics: true,    // brAInwav observability
  maxMemoryMB: 10,        // Memory bounded
  cleanupInterval: 30000
});

// Check rate limit
const allowed = limiter.checkLimit('192.168.1.1');
if (!allowed) {
  throw new AgentError('brAInwav rate limit exceeded', ErrorCategory.RATE_LIMIT);
}
```

## ⚡ Circuit Breaker Protection

### Basic Circuit Breaker

```typescript
import { CircuitBreaker, CircuitBreakerFactory } from '@brAInwav/cortex-agents';

const breaker = new CircuitBreaker({
  failureThreshold: 5,    // Open after 5 failures
  resetTimeout: 60000,    // Try reset after 1 minute
  enableMetrics: true,    // brAInwav observability
  timeout: 30000          // 30 second operation timeout
});

// Protected operation
try {
  const result = await breaker.call(async () => {
    return await externalApiCall();
  });
  console.log('brAInwav operation succeeded:', result);
} catch (error) {
  console.error('brAInwav circuit breaker protected:', error);
}

// Monitor circuit breaker state
console.log(`brAInwav circuit breaker state: ${breaker.getState()}`);
```

### Service-Specific Circuit Breakers

```typescript
// Create circuit breakers for different services
const databaseBreaker = CircuitBreakerFactory.createDatabaseBreaker();
const apiBreaker = CircuitBreakerFactory.createAPIBreaker();
const mlBreaker = CircuitBreakerFactory.createMLServiceBreaker();

// Use with specific operations
const userData = await databaseBreaker.call(() => database.getUser(id));
const apiResponse = await apiBreaker.call(() => httpClient.post('/api', data));
const prediction = await mlBreaker.call(() => mlService.predict(input));
```

## 🔧 Configuration Examples

### Development Environment

```typescript
// Development configuration with brAInwav branding
const devConfig = {
  testing: {
    enableBrandingValidation: true,
    verbose: true,
    cleanup: true
  },
  observability: {
    metrics: {
      enabled: true,
      flushInterval: 10000, // Faster flushing for dev
      enableSystemMetrics: true
    },
    tracing: {
      enabled: true,
      samplingRate: 1.0, // 100% sampling in dev
      enableBrandingValidation: true
    }
  },
  healthCheck: {
    serviceName: 'brAInwav-cortex-agents-dev',
    healthCheckInterval: 30000,
    enableBrandingValidation: true
  }
};
```

### Production Environment

```typescript
// Production configuration optimized for brAInwav deployment
const prodConfig = {
  testing: {
    enableBrandingValidation: true,
    verbose: false,
    cleanup: true
  },
  observability: {
    metrics: {
      enabled: true,
      flushInterval: 60000, // Less frequent flushing
      enableSystemMetrics: true,
      maxMetricsPerSecond: 1000 // Rate limiting
    },
    tracing: {
      enabled: true,
      samplingRate: 0.1, // 10% sampling for performance
      enableBrandingValidation: true
    }
  },
  healthCheck: {
    serviceName: 'brAInwav-cortex-agents-prod',
    healthCheckInterval: 60000,
    enableBrandingValidation: true,
    enableCircuitBreakers: true
  },
  errorHandling: {
    enableGracefulShutdown: true,
    exitOnCritical: true,
    logErrors: true
  }
};
```

## 🚀 Deployment Integration

### Docker Integration

```dockerfile
# Dockerfile with brAInwav configuration
FROM node:18-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY . .

# brAInwav health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# brAInwav observability ports
EXPOSE 3000 9090 9091

# brAInwav startup with proper error handling
CMD ["node", "--unhandled-rejections=strict", "dist/index.js"]
```

### Kubernetes Integration

```yaml
# kubernetes-deployment.yaml with brAInwav configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: brAInwav-cortex-agents
  labels:
    app: brAInwav-cortex-agents
spec:
  replicas: 3
  selector:
    matchLabels:
      app: brAInwav-cortex-agents
  template:
    metadata:
      labels:
        app: brAInwav-cortex-agents
    spec:
      containers:
      - name: brAInwav-cortex-agents
        image: brAInwav/cortex-agents:latest
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: BRAINWAV_SERVICE_NAME
          value: "brAInwav-cortex-agents"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

## 📈 Monitoring & Alerting

### Prometheus Integration

```yaml
# prometheus.yml with brAInwav metrics
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'brAInwav-cortex-agents'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "brAInwav Cortex Agents - Production Dashboard",
    "panels": [
      {
        "title": "brAInwav Request Rate",
        "targets": [
          {
            "expr": "rate(brAInwav_requests_total[5m])"
          }
        ]
      },
      {
        "title": "brAInwav Health Status",
        "targets": [
          {
            "expr": "brAInwav_health_overall_status"
          }
        ]
      },
      {
        "title": "brAInwav Circuit Breaker Status",
        "targets": [
          {
            "expr": "brAInwav_circuit_breaker_state"
          }
        ]
      }
    ]
  }
}
```

## 🎯 Best Practices

### 1. **brAInwav Branding Consistency**

- Always include "brAInwav" in service names, metrics, and health checks
- Use brAInwav-prefixed metric names for consistency
- Include brAInwav context in error messages and logs

### 2. **Performance Optimization**

- Use appropriate sampling rates for tracing (10% in production)
- Configure memory bounds for all stores and caches
- Enable rate limiting to prevent resource exhaustion

### 3. **Reliability Patterns**

- Always use circuit breakers for external service calls
- Implement proper retry logic with exponential backoff
- Set up comprehensive health checks for all critical dependencies

### 4. **Observability Strategy**

- Instrument all critical operations with traces
- Use structured logging with correlation IDs
- Monitor business metrics alongside technical metrics

### 5. **Security Practices**

- Sanitize all user inputs
- Redact sensitive information from logs
- Use least-privilege principles for service accounts

## 🆘 Troubleshooting

### Common Issues

**Circuit Breaker Stuck Open**

```typescript
// Check circuit breaker state
const state = breaker.getState();
const metrics = breaker.getMetrics();
console.log(`brAInwav circuit breaker: ${state}`, metrics);

// Force reset if needed
breaker.reset();
```

**Memory Usage High**

```typescript
// Check memory store metrics
const metrics = store.getMetrics();
if (metrics.memoryUsageMB > 100) {
  console.warn('brAInwav memory usage high, forcing cleanup');
  store.cleanup();
}
```

**Health Checks Failing**

```typescript
// Get detailed health information
const health = await healthMonitor.getHealthStatus();
const failedChecks = health.checks.filter(c => c.status !== 'healthy');
console.error('brAInwav failed health checks:', failedChecks);
```

## 🔗 Related Documentation

- [brAInwav Cortex-OS Architecture Overview](../README.md)
- [brAInwav Agent Development Guide](./AGENT-DEVELOPMENT.md)
- [brAInwav Observability Best Practices](./OBSERVABILITY.md)
- [brAInwav Security Guidelines](./SECURITY.md)

---

**Developed by brAInwav Development Team**  
*Bringing AI-powered observability and reliability to production systems*
