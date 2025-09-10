# Cortex-OS Observability Implementation Plan

## Overview

This document outlines a comprehensive observability implementation plan for Cortex-OS, ensuring visibility into system behavior, performance, and reliability. The plan encompasses distributed tracing, metrics collection, structured logging, and alerting to provide deep insights into the system's operation while maintaining compliance with privacy and security requirements.

## Observability Pillars

### 1. Distributed Tracing
Implementation of end-to-end request tracking using OpenTelemetry with W3C Trace Context propagation to understand request flows across microservices and identify performance bottlenecks.

### 2. Metrics Collection
Collection of key performance indicators (KPIs), system resource utilization, and business metrics using Prometheus-compatible exporters for monitoring and alerting.

### 3. Structured Logging
Implementation of consistent, structured logging with correlation IDs and contextual information to facilitate debugging and audit trails.

### 4. Alerting and Monitoring
Establishment of proactive alerting mechanisms and comprehensive dashboards to ensure system health and performance.

## Current State Assessment

### Strengths
- Partial OpenTelemetry integration
- Basic logging infrastructure
- CloudEvents 1.0 compliance for A2A messaging
- Correlation ID propagation in some components

### Gaps
- Incomplete distributed tracing across all services
- Limited metrics collection and dashboarding
- Inconsistent structured logging
- Missing alerting and monitoring infrastructure
- No centralized log aggregation

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

#### Task 1: OpenTelemetry Infrastructure Setup
```typescript
// packages/observability/src/tracing/opentelemetry-config.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'cortex-os',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.VERSION || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  metricReader: new PrometheusExporter({
    port: parseInt(process.env.PROMETHEUS_PORT || '9464'),
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        requireParentforOutgoingSpans: true,
        requestHook: (span, req) => {
          // Add custom attributes to HTTP spans
          span.setAttribute('http.user_agent', req.headers['user-agent']);
        }
      },
      '@opentelemetry/instrumentation-express': {
        ignoreLayersType: [expressLayerType.MIDDLEWARE]
      }
    })
  ]
});

// Start SDK and handle shutdown
sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry SDK shut down successfully'))
    .catch((error) => console.log('Error shutting down OpenTelemetry SDK', error))
    .finally(() => process.exit(0));
});
```

#### Task 2: Tracer Initialization
```typescript
// packages/observability/src/tracing/tracer.ts
import { trace, context, Span, SpanStatusCode } from '@opentelemetry/api';

export const tracer = trace.getTracer('cortex-os');

export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options?: {
    attributes?: Record<string, string | number | boolean>;
    kind?: any; // SpanKind
  }
): Promise<T> {
  return tracer.startActiveSpan(
    name,
    {
      attributes: options?.attributes,
      kind: options?.kind,
    },
    async (span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

export function createChildSpan(
  name: string,
  parentContext?: any, // Context
  attributes?: Record<string, string | number | boolean>
): Span {
  return tracer.startSpan(
    name,
    {
      attributes,
    },
    parentContext
  );
}
```

### Phase 2: Metrics Collection (Weeks 3-4)

#### Task 3: Custom Metrics Definition
```typescript
// packages/observability/src/metrics/custom-metrics.ts
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('cortex-os');

// HTTP request metrics
export const httpRequestDuration = meter.createHistogram('http_request_duration_seconds', {
  description: 'Duration of HTTP requests in seconds',
  unit: 's',
  valueType: 1, // DOUBLE
});

export const httpRequestTotal = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests',
});

// AI model metrics
export const modelInferenceDuration = meter.createHistogram('model_inference_duration_seconds', {
  description: 'Duration of model inference operations',
  unit: 's',
  valueType: 1,
});

export const modelInferenceTotal = meter.createCounter('model_inference_total', {
  description: 'Total number of model inference operations',
});

// A2A messaging metrics
export const a2aMessagePublished = meter.createCounter('a2a_messages_published_total', {
  description: 'Total number of A2A messages published',
});

export const a2aMessageProcessed = meter.createCounter('a2a_messages_processed_total', {
  description: 'Total number of A2A messages processed',
});

// Memory metrics
export const memoryItemsTotal = meter.createUpDownCounter('memory_items_total', {
  description: 'Total number of items in memory',
});

export const memoryCacheHitRatio = meter.createGauge('memory_cache_hit_ratio', {
  description: 'Memory cache hit ratio',
});
```

#### Task 4: Metrics Collection Middleware
```typescript
// packages/observability/src/metrics/middleware.ts
import { NextFunction, Request, Response } from 'express';
import { httpRequestDuration, httpRequestTotal } from './custom-metrics';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Record response metrics
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    
    httpRequestDuration.record(duration, {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    });
    
    httpRequestTotal.add(1, {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    });
  });
  
  next();
}
```

### Phase 3: Structured Logging (Weeks 5-6)

#### Task 5: Logger Implementation
```typescript
// packages/observability/src/logging/logger.ts
import { context, trace } from '@opentelemetry/api';
import pino from 'pino';
import { ulid } from 'ulid';

interface LogFields {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  timestamp: string;
  traceId?: string;
  spanId?: string;
  runId?: string;
  correlationId?: string;
  [key: string]: any;
}

class StructuredLogger {
  private logger: pino.Logger;
  
  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
      },
      mixin() {
        // Add trace context to all log entries
        const span = trace.getSpan(context.active());
        const traceId = span?.spanContext().traceId;
        const spanId = span?.spanContext().spanId;
        
        return {
          timestamp: new Date().toISOString(),
          traceId,
          spanId,
          instanceId: ulid(),
        };
      },
    });
  }
  
  private log(level: string, message: string, fields: Omit<LogFields, 'level' | 'message' | 'timestamp'> = {}) {
    const logEntry: LogFields = {
      level: level as any,
      message,
      timestamp: new Date().toISOString(),
      ...fields,
    };
    
    this.logger[level](logEntry);
  }
  
  trace(message: string, fields?: Omit<LogFields, 'level' | 'message' | 'timestamp'>) {
    this.log('trace', message, fields);
  }
  
  debug(message: string, fields?: Omit<LogFields, 'level' | 'message' | 'timestamp'>) {
    this.log('debug', message, fields);
  }
  
  info(message: string, fields?: Omit<LogFields, 'level' | 'message' | 'timestamp'>) {
    this.log('info', message, fields);
  }
  
  warn(message: string, fields?: Omit<LogFields, 'level' | 'message' | 'timestamp'>) {
    this.log('warn', message, fields);
  }
  
  error(message: string, fields?: Omit<LogFields, 'level' | 'message' | 'timestamp'>) {
    this.log('error', message, fields);
  }
  
  fatal(message: string, fields?: Omit<LogFields, 'level' | 'message' | 'timestamp'>) {
    this.log('fatal', message, fields);
  }
  
  // Specialized loggers for common patterns
  logA2AMessage(direction: 'in' | 'out', messageType: string, fields?: any) {
    this.info(`A2A message ${direction}`, {
      eventType: 'a2a.message',
      direction,
      messageType,
      ...fields,
    });
  }
  
  logMCPRequest(tool: string, fields?: any) {
    this.info(`MCP tool request`, {
      eventType: 'mcp.request',
      tool,
      ...fields,
    });
  }
  
  logModelInference(model: string, operation: string, duration: number, fields?: any) {
    this.info(`Model inference completed`, {
      eventType: 'model.inference',
      model,
      operation,
      duration,
      ...fields,
    });
  }
}

export const logger = new StructuredLogger();
```

#### Task 6: Context-Aware Logging
```typescript
// packages/observability/src/logging/context-logger.ts
import { context, trace } from '@opentelemetry/api';
import { logger } from './logger';

export class ContextAwareLogger {
  static info(message: string, fields: Record<string, any> = {}) {
    const ctx = context.active();
    const span = trace.getSpan(ctx);
    
    if (span) {
      const spanContext = span.spanContext();
      fields.traceId = spanContext.traceId;
      fields.spanId = spanContext.spanId;
    }
    
    logger.info(message, fields);
  }
  
  static error(message: string, error: Error, fields: Record<string, any> = {}) {
    const ctx = context.active();
    const span = trace.getSpan(ctx);
    
    if (span) {
      const spanContext = span.spanContext();
      fields.traceId = spanContext.traceId;
      fields.spanId = spanContext.spanId;
    }
    
    fields.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
    
    logger.error(message, fields);
  }
  
  static withContext(correlationId: string, runId?: string) {
    return {
      info: (message: string, fields: Record<string, any> = {}) => {
        ContextAwareLogger.info(message, { correlationId, runId, ...fields });
      },
      error: (message: string, error: Error, fields: Record<string, any> = {}) => {
        ContextAwareLogger.error(message, error, { correlationId, runId, ...fields });
      }
    };
  }
}
```

### Phase 4: Alerting and Monitoring (Weeks 7-8)

#### Task 7: Alert Definitions
```yaml
# k8s/monitoring/alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cortex-os-alerts
  namespace: monitoring
spec:
  groups:
  - name: cortex-os.rules
    rules:
    # System Health Alerts
    - alert: HighErrorRate
      expr: rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate detected"
        description: "Error rate is above 5% for more than 5 minutes"
        
    - alert: HighLatency
      expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High latency detected"
        description: "95th percentile latency is above 1 second"
        
    - alert: LowCacheHitRatio
      expr: memory_cache_hit_ratio < 0.8
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Low cache hit ratio"
        description: "Cache hit ratio is below 80%"
        
    # AI Model Alerts
    - alert: SlowModelInference
      expr: histogram_quantile(0.95, rate(model_inference_duration_seconds_bucket[5m])) > 5
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Slow model inference"
        description: "95th percentile model inference time is above 5 seconds"
        
    # A2A Messaging Alerts
    - alert: MessageQueueBacklog
      expr: a2a_messages_published_total - a2a_messages_processed_total > 100
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "A2A message queue backlog"
        description: "Message queue backlog exceeds 100 messages"
```

#### Task 8: Dashboard Templates
```json
{
  "dashboard": {
    "title": "Cortex-OS System Overview",
    "panels": [
      {
        "title": "HTTP Request Rates",
        "type": "graph",
        "targets": [
          "rate(http_requests_total[5m])"
        ],
        "legend": "{{method}} {{route}} {{status_code}}"
      },
      {
        "title": "Request Latency (95th Percentile)",
        "type": "graph",
        "targets": [
          "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
        ],
        "legend": "{{route}}"
      },
      {
        "title": "Model Inference Duration",
        "type": "graph",
        "targets": [
          "histogram_quantile(0.95, rate(model_inference_duration_seconds_bucket[5m]))"
        ],
        "legend": "{{model}} {{operation}}"
      },
      {
        "title": "System Resources",
        "type": "graph",
        "targets": [
          "rate(container_cpu_usage_seconds_total[5m])",
          "container_memory_usage_bytes"
        ]
      },
      {
        "title": "A2A Message Processing",
        "type": "graph",
        "targets": [
          "rate(a2a_messages_published_total[5m])",
          "rate(a2a_messages_processed_total[5m])"
        ]
      },
      {
        "title": "Cache Hit Ratio",
        "type": "gauge",
        "targets": [
          "memory_cache_hit_ratio"
        ]
      }
    ]
  }
}
```

## Integration Patterns

### 1. Express.js Integration
```typescript
// apps/cortex-os/src/middleware/observability.ts
import { trace, context } from '@opentelemetry/api';
import { metricsMiddleware } from '@cortex-os/observability/metrics/middleware';
import { ContextAwareLogger } from '@cortex-os/observability/logging/context-logger';

export function observabilityMiddleware(req: Request, res: Response, next: NextFunction) {
  // Add metrics middleware
  metricsMiddleware(req, res, () => {});
  
  // Add tracing context
  const span = trace.getSpan(context.active());
  if (span) {
    const spanContext = span.spanContext();
    res.setHeader('x-trace-id', spanContext.traceId);
    res.setHeader('x-span-id', spanContext.spanId);
  }
  
  // Add structured logging
  ContextAwareLogger.info('HTTP request started', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
  });
  
  next();
}
```

### 2. A2A Bus Integration
```typescript
// packages/a2a/src/bus/observable-bus.ts
import { trace, context } from '@opentelemetry/api';
import { withSpan } from '@cortex-os/observability/tracing/tracer';
import { ContextAwareLogger } from '@cortex-os/observability/logging/context-logger';
import { a2aMessagePublished, a2aMessageProcessed } from '@cortex-os/observability/metrics/custom-metrics';

export class ObservableBus {
  async publish(message: any) {
    return withSpan('a2a.publish', async (span) => {
      // Add message attributes to span
      span.setAttribute('message.type', message.type);
      span.setAttribute('message.id', message.id);
      
      // Record metric
      a2aMessagePublished.add(1, {
        messageType: message.type,
      });
      
      // Log message
      ContextAwareLogger.info('A2A message published', {
        messageType: message.type,
        messageId: message.id,
        source: message.source,
      });
      
      // Publish message
      await this.bus.publish(message);
      
      span.setAttribute('message.published', true);
    });
  }
  
  async subscribe(types: string[], handler: Function) {
    return this.bus.subscribe(types, async (message) => {
      return withSpan('a2a.process', async (span) => {
        // Add message attributes to span
        span.setAttribute('message.type', message.type);
        span.setAttribute('message.id', message.id);
        
        const startTime = Date.now();
        
        try {
          // Process message
          await handler(message);
          
          // Record success metrics
          const duration = Date.now() - startTime;
          a2aMessageProcessed.add(1, {
            messageType: message.type,
            status: 'success',
          });
          
          // Log success
          ContextAwareLogger.info('A2A message processed successfully', {
            messageType: message.type,
            messageId: message.id,
            duration,
          });
          
          span.setAttribute('message.processed', true);
          span.setAttribute('message.duration', duration);
        } catch (error) {
          // Record error metrics
          a2aMessageProcessed.add(1, {
            messageType: message.type,
            status: 'error',
          });
          
          // Log error
          ContextAwareLogger.error('A2A message processing failed', error as Error, {
            messageType: message.type,
            messageId: message.id,
          });
          
          span.recordException(error as Error);
          span.setStatus({
            code: 2, // ERROR
            message: (error as Error).message,
          });
          
          throw error;
        }
      });
    });
  }
}
```

### 3. Model Gateway Integration
```typescript
// packages/model-gateway/src/observable-model-gateway.ts
import { withSpan } from '@cortex-os/observability/tracing/tracer';
import { ContextAwareLogger } from '@cortex-os/observability/logging/context-logger';
import { 
  modelInferenceDuration, 
  modelInferenceTotal 
} from '@cortex-os/observability/metrics/custom-metrics';

export class ObservableModelGateway {
  async generateEmbedding(request: any) {
    return withSpan('model.generate_embedding', async (span) => {
      // Add request attributes to span
      span.setAttribute('model.name', request.model);
      span.setAttribute('model.type', 'embedding');
      
      const startTime = Date.now();
      
      try {
        const result = await this.modelAdapter.generateEmbedding(request);
        
        const duration = (Date.now() - startTime) / 1000; // Convert to seconds
        const endTime = Date.now();
        
        // Record metrics
        modelInferenceDuration.record(duration, {
          model: request.model,
          operation: 'embedding',
          provider: result.provider,
        });
        
        modelInferenceTotal.add(1, {
          model: request.model,
          operation: 'embedding',
          provider: result.provider,
          status: 'success',
        });
        
        // Log success
        ContextAwareLogger.info('Model embedding generation completed', {
          model: request.model,
          duration,
          tokens: result.usage?.totalTokens,
          provider: result.provider,
        });
        
        span.setAttribute('model.duration', duration);
        span.setAttribute('model.tokens', result.usage?.totalTokens);
        
        return result;
      } catch (error) {
        // Record error metrics
        modelInferenceTotal.add(1, {
          model: request.model,
          operation: 'embedding',
          status: 'error',
        });
        
        // Log error
        ContextAwareLogger.error('Model embedding generation failed', error as Error, {
          model: request.model,
          inputLength: request.text?.length,
        });
        
        span.recordException(error as Error);
        span.setStatus({
          code: 2, // ERROR
          message: (error as Error).message,
        });
        
        throw error;
      }
    });
  }
}
```

## Monitoring Infrastructure

### 1. Prometheus Configuration
```yaml
# k8s/monitoring/prometheus-config.yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "/etc/prometheus/rules/*.rules"

scrape_configs:
  - job_name: 'cortex-os'
    static_configs:
      - targets: ['cortex-os.cortex-os.svc.cluster.local:9464']
    metrics_path: '/metrics'
    
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
    - role: pod
    relabel_configs:
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
      action: keep
      regex: true
    - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
      action: replace
      regex: ([^:]+)(?::\d+)?;(\d+)
      replacement: $1:$2
      target_label: __address__
    - action: labelmap
      regex: __meta_kubernetes_pod_label_(.+)
    - source_labels: [__meta_kubernetes_namespace]
      action: replace
      target_label: kubernetes_namespace
    - source_labels: [__meta_kubernetes_pod_name]
      action: replace
      target_label: kubernetes_pod_name
```

### 2. Grafana Dashboard Provisioning
```json
{
  "apiVersion": 1,
  "providers": [
    {
      "name": "cortex-os-dashboards",
      "type": "file",
      "disableDeletion": false,
      "updateIntervalSeconds": 10,
      "allowUiUpdates": false,
      "options": {
        "path": "/var/lib/grafana/dashboards/cortex-os",
        "foldersFromFilesStructure": true
      }
    }
  ]
}
```

## Security and Compliance

### 1. Log Sanitization
```typescript
// packages/observability/src/security/log-sanitizer.ts
class LogSanitizer {
  private sensitivePatterns: RegExp[] = [
    // API keys and secrets
    /\b[A-Za-z0-9_\-]{32,}\b/g,
    /\b[A-Za-z0-9]{8,}\b/g,
    // Email addresses
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    // IP addresses
    /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
  ];
  
  sanitize(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    } else if (typeof data === 'object' && data !== null) {
      return this.sanitizeObject(data);
    }
    return data;
  }
  
  private sanitizeString(str: string): string {
    let sanitized = str;
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    return sanitized;
  }
  
  private sanitizeObject(obj: any): any {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive keys
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password', 'secret', 'token', 'key', 'apikey', 'auth', 'credentials'
    ];
    return sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    );
  }
}

export const logSanitizer = new LogSanitizer();
```

### 2. Audit Trail Generation
```typescript
// packages/observability/src/audit/audit-trail.ts
import { ulid } from 'ulid';

interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure';
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  traceId?: string;
  sessionId?: string;
}

class AuditTrail {
  private events: AuditEvent[] = [];
  
  log(event: Omit<AuditEvent, 'id' | 'timestamp'>) {
    const auditEvent: AuditEvent = {
      id: ulid(),
      timestamp: new Date().toISOString(),
      ...event,
    };
    
    this.events.push(auditEvent);
    
    // Persist to audit store
    this.persist(auditEvent);
    
    // Log to structured logger
    logger.info('Audit event recorded', {
      eventType: 'audit.event',
      ...auditEvent,
    });
  }
  
  private async persist(event: AuditEvent) {
    try {
      // Persist to secure audit store
      await this.auditStore.insert(event);
    } catch (error) {
      logger.error('Failed to persist audit event', error as Error, {
        eventId: event.id,
      });
    }
  }
  
  // Query methods for audit reporting
  async query(criteria: {
    actor?: string;
    action?: string;
    resource?: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
  }): Promise<AuditEvent[]> {
    return this.auditStore.query(criteria);
  }
  
  // Export for compliance reporting
  async export(format: 'json' | 'csv', criteria: any): Promise<Buffer> {
    const events = await this.query(criteria);
    // Export logic based on format
    return this.exporter.export(events, format);
  }
}

export const auditTrail = new AuditTrail();
```

## Testing and Validation

### 1. Observability Testing Framework
```typescript
// tests/observability/observability.test.ts
import { test, expect } from '@playwright/test';
import { withSpan } from '@cortex-os/observability/tracing/tracer';
import { logger } from '@cortex-os/observability/logging/logger';

test.describe('Observability', () => {
  test('should generate traces for HTTP requests', async ({ request }) => {
    // Simulate HTTP request with tracing
    await withSpan('test.http.request', async (span) => {
      span.setAttribute('test.attribute', 'value');
      
      const response = await request.get('/api/health');
      expect(response.status()).toBe(200);
      
      // Verify trace attributes
      // This would require integration with trace collector
    });
  });
  
  test('should log structured messages', async () => {
    // Capture log output
    const logOutput: any[] = [];
    
    // Intercept logger output
    const originalInfo = logger.info;
    logger.info = (...args: any[]) => {
      logOutput.push(args);
      originalInfo.apply(logger, args);
    };
    
    // Generate log message
    logger.info('Test message', { test: 'value' });
    
    // Verify structured logging
    expect(logOutput).toHaveLength(1);
    expect(logOutput[0][0]).toBe('Test message');
    expect(logOutput[0][1]).toEqual({ test: 'value' });
    
    // Restore original logger
    logger.info = originalInfo;
  });
  
  test('should collect metrics', async () => {
    // This would require integration with metrics collector
    // and verification of metric emission
  });
});
```

### 2. Performance Impact Testing
```typescript
// tests/observability/performance-impact.test.ts
import { test, expect } from '@playwright/test';
import { withSpan } from '@cortex-os/observability/tracing/tracer';

test.describe('Performance Impact', () => {
  test('should have minimal overhead for tracing', async () => {
    const iterations = 1000;
    const startTime = Date.now();
    
    // Test without tracing
    for (let i = 0; i < iterations; i++) {
      // Simple operation
      Math.sqrt(i);
    }
    
    const withoutTracingTime = Date.now() - startTime;
    
    // Test with tracing
    const tracingStartTime = Date.now();
    for (let i = 0; i < iterations; i++) {
      await withSpan('test.operation', async () => {
        Math.sqrt(i);
      });
    }
    
    const withTracingTime = Date.now() - tracingStartTime;
    const overhead = ((withTracingTime - withoutTracingTime) / withoutTracingTime) * 100;
    
    // Assert overhead is less than 10%
    expect(overhead).toBeLessThan(10);
  });
});
```

## Success Metrics

### Observability KPIs
1. **Trace Coverage**: &gt;95% of requests have complete trace context
2. **Metric Collection**: &gt;99% of metrics successfully collected and exported
3. **Log Completeness**: &gt;99% of log messages contain required contextual information
4. **Alert Effectiveness**: &lt;5% false positive alerts
5. **Dashboard Availability**: &gt;99.9% dashboard uptime

### Performance Targets
1. **Tracing Overhead**: &lt;5% impact on request processing time
2. **Metrics Collection Latency**: &lt;100ms for metric export
3. **Log Processing**: &lt;1ms per log entry processing time
4. **Alert Detection**: &lt;30 seconds from event occurrence to alert firing

### Reliability Metrics
1. **Trace Continuity**: &lt;1% trace breaks across service boundaries
2. **Metric Accuracy**: &gt;99% accuracy of collected metrics
3. **Log Integrity**: &lt;0.1% corrupted or lost log entries
4. **Alert Reliability**: &gt;99% successful alert delivery

## Conclusion

This observability implementation plan provides a comprehensive approach to gaining visibility into Cortex-OS operations while maintaining system performance and security. By implementing distributed tracing, metrics collection, structured logging, and alerting, the system will have the observability capabilities necessary for production operation and continuous improvement.

The phased approach allows for incremental implementation with measurable results at each stage. The focus on security and compliance ensures that observability does not compromise user privacy or system security. With proper testing and validation, Cortex-OS will achieve enterprise-grade observability that supports reliable, high-performance operation.
