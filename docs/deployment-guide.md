# Production Deployment Guide - brAInwav Cortex-OS

## Overview

This comprehensive guide covers production deployment of brAInwav Cortex-OS with complete TDD implementation, multimodal AI processing, advanced security, and operational excellence features.

## Prerequisites

### System Requirements

**Minimum Requirements:**
- **CPU**: 4 cores (8+ recommended for production)
- **Memory**: 8GB RAM (16GB+ recommended for multimodal processing)
- **Storage**: 100GB SSD (500GB+ recommended for content storage)
- **Network**: 1Gbps connection (required for large file processing)

**Software Requirements:**
- Docker 20.10+ and Docker Compose 2.0+
- Kubernetes 1.24+ (for K8s deployment)
- Node.js 20.x (for local development)
- Python 3.11+ (for Python services)

### Infrastructure Preparation

```bash
# Ensure proper DNS configuration
# Configure SSL certificates (Let's Encrypt recommended)
# Set up load balancer/reverse proxy
# Prepare persistent storage volumes
# Configure network security groups/firewalls
```

## Quick Start Deployment

### 1. Environment Configuration

```bash
# Clone the repository
git clone https://github.com/jamiescottcraik/Cortex-OS.git
cd Cortex-OS

# Copy environment templates
cp .env.example .env
cp apps/cortex-webui/backend/.env.example apps/cortex-webui/backend/.env
cp apps/cortex-webui/frontend/.env.example apps/cortex-webui/frontend/.env

# Generate secure secrets
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 64)
OAUTH_CLIENT_SECRET=$(openssl rand -hex 32)

# Edit environment files with production values
```

### 2. TDD Environment Setup

```bash
# Initialize TDD Coach and quality gates
make tdd-setup

# Run initial validation
make tdd-validate

# Verify test coverage meets 95/95 targets
pnpm test:coverage
make coverage:report
```

### 3. Docker Deployment

```bash
# Build and start all services
docker-compose up --build -d

# Verify service health
docker-compose ps
curl http://localhost:3001/health
curl http://localhost:3024/health  # MCP server

# Run TDD validation against running services
make tdd-status
```

### 4. Kubernetes Deployment

```bash
# Create namespace and secrets
kubectl apply -f k8s/namespace.yaml
kubectl create secret generic cortex-secrets \
  --from-literal=jwt-secret=$JWT_SECRET \
  --from-literal=encryption-key=$ENCRYPTION_KEY \
  --from-literal=oauth-client-secret=$OAUTH_CLIENT_SECRET

# Deploy core services in order
kubectl apply -f k8s/persistent-volumes.yaml
kubectl apply -f k8s/database.yaml
kubectl apply -f k8s/mcp-server.yaml
kubectl apply -f k8s/cortex-webui-backend.yaml
kubectl apply -f k8s/cortex-webui-frontend.yaml
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/ingress.yaml

# Enable autoscaling
kubectl apply -f k8s/horizontal-pod-autoscaler.yaml

# Verify deployment
kubectl get pods -n cortex-os
kubectl get services -n cortex-os
```

## Security Configuration

### OAuth 2.1 + PKCE Setup

```bash
# Configure OAuth provider (example: Google)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
REDIRECT_URI="https://your-domain.com/auth/callback"

# Update environment variables
echo "OAUTH_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" >> .env
echo "OAUTH_GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" >> .env
echo "OAUTH_REDIRECT_URI=$REDIRECT_URI" >> .env
```

### Environment Variables

**Critical Security Settings:**
```env
# Authentication
JWT_SECRET=your-32-character-secret
ENCRYPTION_KEY=your-64-character-encryption-key
OAUTH_CLIENT_SECRET=your-oauth-client-secret
BCRYPT_ROUNDS=12

# Production Mode
NODE_ENV=production
DEBUG=false

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cortex_os
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# Multimodal Processing
MAX_FILE_SIZE=500MB
ENABLE_SANDBOXING=true
PROCESSING_TIMEOUT=300000

# Observability
OTEL_SERVICE_NAME=cortex-os
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
PROMETHEUS_ENABLED=true
```

### Security Headers & Rate Limiting

```yaml
# Rate limiting configuration (environment variables)
RATE_LIMIT_GENERAL=100
RATE_LIMIT_AUTH=5
RATE_LIMIT_UPLOAD=10
RATE_LIMIT_SEARCH=60
RATE_LIMIT_WINDOW_MS=900000

# Security headers configuration
SECURITY_CSP="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
SECURITY_HSTS_MAX_AGE=31536000
SECURITY_FRAME_OPTIONS=DENY
```

## Multimodal AI Processing Configuration

### MLX Model Setup

```bash
# Configure MLX models for local processing
mkdir -p config/models
cat > config/models/multimodal-config.json << EOF
{
  "imageModels": {
    "vision": "mlx-community/vit-base-patch16-224",
    "ocr": "mlx-community/layoutlmv3-base"
  },
  "audioModels": {
    "transcription": "mlx-community/whisper-large-v3",
    "embedding": "mlx-community/wav2vec2-base"
  },
  "textModels": {
    "embedding": "mlx-community/all-MiniLM-L6-v2",
    "generation": "mlx-community/mistral-7b-instruct-v0.2"
  },
  "resources": {
    "maxMemoryGB": 8,
    "maxBatchSize": 32,
    "enableQuantization": true
  }
}
EOF
```

### Vector Database Configuration

```yaml
# Qdrant configuration
vectorStore:
  host: "qdrant"
  port: 6333
  apiKey: "${QDRANT_API_KEY}"
  collections:
    multimodal:
      vectorSize: 1536
      distance: "Cosine"
      hnswConfig:
        m: 16
        efConstruct: 200
```

## Monitoring & Observability

### OpenTelemetry Setup

```yaml
# OpenTelemetry Collector configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
      memory_limiter:
        limit_mib: 512
      resource:
        attributes:
          - key: service.name
            value: cortex-os
          - key: service.version
            value: "1.0.0"

    exporters:
      prometheus:
        endpoint: "0.0.0.0:8889"
      jaeger:
        endpoint: jaeger:14250
        tls:
          insecure: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, batch, resource]
          exporters: [jaeger]
        metrics:
          receivers: [otlp]
          processors: [memory_limiter, batch, resource]
          exporters: [prometheus]
```

### Health Check Configuration

```typescript
// Health check endpoints implementation
export const healthChecks = {
  // Liveness probe - basic process health
  live: {
    path: '/health/live',
    interval: 30,
    timeout: 5,
    failureThreshold: 3
  },

  // Readiness probe - dependency health
  ready: {
    path: '/health/ready',
    interval: 10,
    timeout: 3,
    failureThreshold: 3,
    checks: ['database', 'redis', 'mcp-server', 'vector-store']
  },

  // Comprehensive health - monitoring
  comprehensive: {
    path: '/health',
    interval: 60,
    timeout: 10,
    detailed: true
  }
};
```

### Prometheus Metrics

```typescript
// Custom metrics configuration
import { Counter, Histogram, Gauge } from 'prom-client';

export const metrics = {
  // API request metrics
  apiRequests: new Counter({
    name: 'brainwav_api_requests_total',
    help: 'Total number of API requests',
    labelNames: ['method', 'path', 'status']
  }),

  // Request duration
  requestDuration: new Histogram({
    name: 'brainwav_request_duration_seconds',
    help: 'Request duration in seconds',
    labelNames: ['method', 'path'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  }),

  // TDD compliance
  tddCompliance: new Gauge({
    name: 'brainwav_tdd_compliance_ratio',
    help: 'TDD compliance ratio'
  }),

  // Multimodal processing
  multimodalProcessing: new Histogram({
    name: 'brainwav_multimodal_processing_duration_seconds',
    help: 'Multimodal processing duration',
    labelNames: ['modality', 'operation'],
    buckets: [1, 5, 10, 30, 60, 120, 300]
  })
};
```

## TDD & Quality Gates in Production

### Quality Gate Configuration

```json
{
  "qualityGates": {
    "coverage": {
      "statements": 95,
      "branches": 95,
      "functions": 95,
      "lines": 95
    },
    "mutation": {
      "score": 80
    },
    "security": {
      "zeroCritical": true,
      "maxHigh": 0
    },
    "performance": {
      "p95Latency": 250,
      "errorRate": 0.5
    }
  }
}
```

### Production TDD Validation

```bash
# Run TDD validation in CI/CD pipeline
make tdd-validate
make test:coverage
make test:integration
make security:scan
make quality:gate

# Generate compliance report
make compliance:report
```

## Scaling Configuration

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cortex-webui-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cortex-webui-backend
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

### Resource Requirements

```yaml
# Cortex WebUI Backend
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cortex-webui-backend
spec:
  template:
    spec:
      containers:
      - name: backend
        image: cortex-os/webui-backend:latest
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
        env:
        - name: NODE_OPTIONS
          value: "--max-old-space-size=1536"

# MCP Server
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
spec:
  template:
    spec:
      containers:
      - name: mcp-server
        image: cortex-os/mcp-server:latest
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 1Gi
```

## Backup & Disaster Recovery

### Database Backup Strategy

```bash
#!/bin/bash
# backup-database.sh

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# PostgreSQL backup
pg_dump -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME | \
  gzip > $BACKUP_DIR/postgres_$TIMESTAMP.sql.gz

# Vector database backup
curl -X POST "http://qdrant:6333/collections/multimodal/snapshots" \
  -H "api-key: $QDRANT_API_KEY"

# Clean old backups
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $TIMESTAMP"
```

### Kubernetes Backup

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15
            command:
            - /bin/bash
            - -c
            - |
              pg_dump -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME | \
                gzip > /backups/postgres_$(date +%Y%m%d_%H%M%S).sql.gz
            env:
            - name: DATABASE_HOST
              value: "postgresql"
            - name: DATABASE_USER
              valueFrom:
                secretKeyRef:
                  name: cortex-secrets
                  key: database-user
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: cortex-secrets
                  key: database-password
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

## Production Checklist

### Pre-Deployment Checklist

- [ ] **Environment Setup**
  - [ ] Generate secure secrets (JWT, encryption, OAuth)
  - [ ] Configure all required environment variables
  - [ ] Set up persistent storage volumes
  - [ ] Configure SSL certificates and HTTPS
  - [ ] Set up DNS and load balancer configuration

- [ ] **Security Configuration**
  - [ ] Configure OAuth 2.1 + PKCE authentication
  - [ ] Set up rate limiting and security headers
  - [ ] Configure firewall rules and network security
  - [ ] Set up intrusion detection and monitoring
  - [ ] Verify OWASP compliance

- [ ] **TDD & Quality Assurance**
  - [ ] Run `make tdd-setup` and validate configuration
  - [ ] Ensure 95/95 coverage targets are met
  - [ ] Run mutation testing (≥80% score)
  - [ ] Execute security scans and vulnerability assessment
  - [ ] Validate quality gates are passing

- [ ] **Multimodal Processing**
  - [ ] Configure MLX models and vector database
  - [ ] Set up file processing limits and timeouts
  - [ ] Configure sandboxing for secure processing
  - [ ] Test multimodal processing pipeline
  - [ ] Validate cross-modal search functionality

- [ ] **Monitoring & Observability**
  - [ ] Configure OpenTelemetry instrumentation
  - [ ] Set up Prometheus metrics collection
  - [ ] Configure log aggregation and analysis
  - [ ] Set up alerting rules and notifications
  - [ ] Test health check endpoints

### Post-Deployment Verification

- [ ] **Service Health**
  - [ ] Verify all services are running and healthy
  - [ ] Test health check endpoints (`/health`, `/ready`, `/live`)
  - [ ] Validate service connectivity and dependencies
  - [ ] Check resource utilization and performance

- [ ] **Functional Testing**
  - [ ] Test authentication and authorization flow
  - [ ] Validate multimodal file upload and processing
  - [ ] Test search and RAG functionality
  - [ ] Verify MCP tool execution
  - [ ] Test TDD validation and coaching features

- [ ] **Performance Validation**
  - [ ] Run load testing scenarios
  - [ ] Verify response times meet SLO requirements
  - [ ] Check auto-scaling behavior
  - [ ] Validate memory usage and resource limits

- [ ] **Security Validation**
  - [ ] Test rate limiting and DDoS protection
  - [ ] Validate input sanitization and XSS protection
  - [ ] Test authentication bypass attempts
  - [ ] Verify secure communication (HTTPS, TLS)

## Troubleshooting

### Common Issues and Solutions

#### 1. Service Startup Failures

**Symptoms**: Services failing to start or health checks failing

**Diagnostic Steps**:
```bash
# Check pod status
kubectl get pods -n cortex-os

# View logs
kubectl logs -n cortex-os deployment/cortex-webui-backend

# Check resource usage
kubectl top pods -n cortex-os

# Check events
kubectl get events -n cortex-os --sort-by='.lastTimestamp'
```

**Common Solutions**:
- Verify environment variables and secrets
- Check resource requests/limits
- Validate persistent volume claims
- Review network policies and security contexts

#### 2. Multimodal Processing Issues

**Symptoms**: File upload failures, processing timeouts, memory errors

**Diagnostic Steps**:
```bash
# Check processing service logs
kubectl logs -n cortex-os deployment/multimodal-processor

# Monitor resource usage
kubectl top pods -n cortex-os --containers

# Check vector database status
curl http://qdrant:6333/health

# Verify model availability
curl http://mlx-service:8080/models
```

**Common Solutions**:
- Increase memory limits for processing services
- Adjust processing timeouts
- Verify model files are available
- Check storage capacity and permissions

#### 3. TDD Validation Failures

**Symptoms**: Quality gate failures, coverage drops below thresholds

**Diagnostic Steps**:
```bash
# Run TDD validation locally
make tdd-validate

# Check coverage reports
make coverage:report

# Run specific failing tests
pnpm test -- --reporter=verbose

# Check mutation testing results
pnpm mutation:test
```

**Common Solutions**:
- Review failing tests and fix issues
- Add missing test coverage
- Update quality gate thresholds if appropriate
- Check for flaky tests and stabilize them

#### 4. Performance Issues

**Symptoms**: High latency, increased error rates, resource exhaustion

**Diagnostic Steps**:
```bash
# Check metrics
curl http://prometheus:9090/api/v1/query?query=brainwav_request_duration_seconds

# View application logs
kubectl logs -n cortex-os deployment/cortex-webui-backend --tail=100

# Check resource usage
kubectl describe pod -n cortex-os <pod-name>

# Analyze database performance
curl http://postgres:5432/monitoring
```

**Common Solutions**:
- Scale up resources or add replicas
- Optimize database queries and add indexes
- Implement caching strategies
- Review and optimize application code

## Maintenance & Operations

### Regular Maintenance Tasks

**Daily:**
- [ ] Monitor system health and performance metrics
- [ ] Review security alerts and incidents
- [ ] Check backup completion and integrity
- [ ] Monitor resource utilization and scaling

**Weekly:**
- [ ] Review and rotate secrets if needed
- [ ] Update security patches and dependencies
- [ ] Analyze performance trends and capacity planning
- [ ] Review audit logs for security events

**Monthly:**
- [ ] Update container images and dependencies
- [ ] Review and update documentation
- [ ] Conduct security assessments and penetration testing
- [ ] Review and update quality gate thresholds

**Quarterly:**
- [ ] Disaster recovery testing and validation
- [ ] Performance testing and optimization
- [ ] Review and update architecture
- [ ] Capacity planning and resource optimization

### Alerting Configuration

```yaml
# Prometheus alerting rules
groups:
- name: cortex-os.rules
  rules:
  - alert: ServiceDown
    expr: up{job="cortex-os"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Cortex-OS service is down"
      description: "Service {{ $labels.instance }} has been down for more than 1 minute"

  - alert: HighErrorRate
    expr: rate(brainwav_api_requests_total{status=~"5.."}[5m]) > 0.01
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} errors per second"

  - alert: LowTDDCompliance
    expr: brainwav_tdd_compliance_ratio < 0.95
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "TDD compliance below threshold"
      description: "TDD compliance is {{ $value }}, below required 95%"
```

## Support

### Escalation Contacts

- **Critical Issues**: DevOps on-call team
- **Security Incidents**: Security team
- **Application Issues**: Backend development team
- **Performance Issues**: Performance engineering team

### Documentation and Resources

- **API Documentation**: `/docs/api-comprehensive-reference.md`
- **TDD Guide**: `/docs/tdd-implementation-guide.md`
- **Security Guide**: `/docs/security-configuration.md`
- **Monitoring Guide**: `/docs/observability-setup.md`

---

**brAInwav Cortex-OS Production Deployment Guide v1.0**
*Last updated: January 2025*

This guide ensures production-ready deployment with comprehensive security, monitoring, TDD compliance, and operational excellence for the brAInwav Cortex-OS platform.