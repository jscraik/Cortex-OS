# brAInwav Cortex-OS Agents - Production Deployment Guide

## 🚀 Production Readiness Checklist

Our TDD implementation ensures **100% production readiness** with enterprise-grade reliability, observability, and brAInwav branding compliance.

### ✅ Pre-Deployment Validation

```bash
# 1. Build and test brAInwav agents package
npm run build
npm run test
npm run test:integration
npm run test:tdd

# 2. Type checking and linting
npm run typecheck
npm run lint

# 3. Verify brAInwav health checks
npm run health:check

# 4. Validate observability data export
npm run observability:export
```

### 🔧 Tool Layer Configuration

Operators can tune the Tool Layer Agent’s arXiv integration without code changes by overriding the following configuration keys
when calling `createToolLayerAgent` or supplying equivalent runtime configuration:

| Key | Description | Default |
| --- | --- | --- |
| `arxivServerSlug` | Registry slug resolved from the MCP registry. Use this to point at alternate arXiv backends. | `arxiv-1` |
| `arxivSearchTool` | MCP registry tool name invoked for paper search. | `search_papers` |
| `arxivDownloadTool` | MCP registry tool name invoked for PDF/source download. | `download_paper` |
| `arxivMaxResults` | Default maximum number of results returned from search calls. | `5` |

These values flow directly into `ArxivMCPTools`, ensuring `callTool` uses the injected MCP contract names from the registry.
Updates to registry naming conventions therefore only require configuration changes in deployment manifests or environment
variables, not code patches.

## 🐳 Docker Deployment

### Production Dockerfile

```dockerfile
# brAInwav Cortex-OS Agents Production Image
FROM node:20-alpine AS base

# Install dependencies for brAInwav native modules
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY docs/ ./docs/

# Build brAInwav agents
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache curl sqlite

WORKDIR /app

# Copy built application
COPY --from=base /app/dist/ ./dist/
COPY --from=base /app/node_modules/ ./node_modules/
COPY --from=base /app/package.json ./

# Create brAInwav user for security
RUN addgroup -g 1001 -S brAInwav && \
    adduser -S brAInwav -u 1001

# Set permissions
RUN chown -R brAInwav:brAInwav /app
USER brAInwav

# brAInwav service ports
EXPOSE 3000 9090 9091

# brAInwav health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# brAInwav environment configuration
ENV NODE_ENV=production
ENV BRAINWAV_SERVICE_NAME=brAInwav-cortex-agents
ENV BRAINWAV_OBSERVABILITY_ENABLED=true
ENV BRAINWAV_HEALTH_CHECKS_ENABLED=true

# Start brAInwav agents with proper error handling
CMD ["node", "--unhandled-rejections=strict", "--max-old-space-size=1024", "dist/index.js"]
```

### Build and Run

```bash
# Build brAInwav Docker image
docker build -t brAInwav/cortex-agents:latest .

# Run with brAInwav configuration
docker run -d \
  --name brAInwav-cortex-agents \
  --restart unless-stopped \
  -p 3000:3000 \
  -p 9090:9090 \
  -p 9091:9091 \
  -e NODE_ENV=production \
  -e BRAINWAV_SERVICE_NAME=brAInwav-cortex-agents-prod \
  -v /var/log/brAInwav:/app/logs \
  brAInwav/cortex-agents:latest

# Check brAInwav health
curl http://localhost:3000/health
```

## ☸️ Kubernetes Deployment

### Complete Kubernetes Manifests

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: brAInwav-agents
  labels:
    app.kubernetes.io/name: brAInwav-cortex-agents
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/managed-by: brAInwav

---
# configmap.yaml  
apiVersion: v1
kind: ConfigMap
metadata:
  name: brAInwav-agents-config
  namespace: brAInwav-agents
data:
  NODE_ENV: "production"
  BRAINWAV_SERVICE_NAME: "brAInwav-cortex-agents"
  BRAINWAV_OBSERVABILITY_ENABLED: "true"
  BRAINWAV_HEALTH_CHECKS_ENABLED: "true"
  BRAINWAV_METRICS_FLUSH_INTERVAL: "60000"
  BRAINWAV_TRACING_SAMPLING_RATE: "0.1"
  BRAINWAV_HEALTH_CHECK_INTERVAL: "60000"

---
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: brAInwav-agents-secrets
  namespace: brAInwav-agents
type: Opaque
data:
  # Base64 encoded secrets
  api-key: <base64-encoded-api-key>
  db-password: <base64-encoded-db-password>

---
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: brAInwav-cortex-agents
  namespace: brAInwav-agents
  labels:
    app: brAInwav-cortex-agents
    component: agent-runtime
    version: v1.0.0
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: brAInwav-cortex-agents
  template:
    metadata:
      labels:
        app: brAInwav-cortex-agents
        component: agent-runtime
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001
      containers:
      - name: brAInwav-cortex-agents
        image: brAInwav/cortex-agents:v1.0.0
        imagePullPolicy: IfNotPresent
        ports:
        - name: http
          containerPort: 3000
          protocol: TCP
        - name: metrics
          containerPort: 9090
          protocol: TCP
        - name: traces
          containerPort: 9091
          protocol: TCP
        envFrom:
        - configMapRef:
            name: brAInwav-agents-config
        - secretRef:
            name: brAInwav-agents-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /health/startup
            port: http
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 30
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
            ephemeral-storage: "1Gi"
          limits:
            memory: "1Gi"
            cpu: "500m"
            ephemeral-storage: "2Gi"
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: tmp
        emptyDir: {}
      - name: logs
        emptyDir:
          sizeLimit: 1Gi
      terminationGracePeriodSeconds: 30

---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: brAInwav-cortex-agents-service
  namespace: brAInwav-agents
  labels:
    app: brAInwav-cortex-agents
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 80
    targetPort: http
    protocol: TCP
  - name: metrics
    port: 9090
    targetPort: metrics
    protocol: TCP
  selector:
    app: brAInwav-cortex-agents

---
# servicemonitor.yaml (for Prometheus Operator)
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: brAInwav-cortex-agents-metrics
  namespace: brAInwav-agents
  labels:
    app: brAInwav-cortex-agents
spec:
  selector:
    matchLabels:
      app: brAInwav-cortex-agents
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
    honorLabels: true

---
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: brAInwav-cortex-agents-hpa
  namespace: brAInwav-agents
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: brAInwav-cortex-agents
  minReplicas: 3
  maxReplicas: 10
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
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15

---
# poddisruptionbudget.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: brAInwav-cortex-agents-pdb
  namespace: brAInwav-agents
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: brAInwav-cortex-agents
```

### Deploy to Kubernetes

```bash
# Apply brAInwav Kubernetes manifests
kubectl apply -f k8s/

# Verify brAInwav deployment
kubectl get pods -n brAInwav-agents
kubectl get services -n brAInwav-agents

# Check brAInwav health
kubectl port-forward -n brAInwav-agents svc/brAInwav-cortex-agents-service 8080:80
curl http://localhost:8080/health

# View brAInwav logs
kubectl logs -n brAInwav-agents -l app=brAInwav-cortex-agents -f

# Check brAInwav metrics
kubectl port-forward -n brAInwav-agents svc/brAInwav-cortex-agents-service 9090:9090
curl http://localhost:9090/metrics
```

## 📊 Monitoring & Observability

### Prometheus Configuration

```yaml
# prometheus-config.yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "brAInwav-alerts.yaml"

scrape_configs:
  - job_name: 'brAInwav-cortex-agents'
    kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
            - brAInwav-agents
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: brAInwav-cortex-agents-service
      - source_labels: [__meta_kubernetes_endpoint_port_name]
        action: keep
        regex: metrics

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "id": null,
    "title": "brAInwav Cortex Agents - Production Dashboard",
    "tags": ["brAInwav", "cortex", "agents"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "brAInwav Service Health",
        "type": "stat",
        "targets": [
          {
            "expr": "brAInwav_health_overall_status",
            "legendFormat": "Health Status"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "yellow", "value": 0.5},
                {"color": "green", "value": 1}
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "brAInwav Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(brAInwav_requests_total[5m])",
            "legendFormat": "Requests/sec"
          }
        ]
      },
      {
        "id": 3,
        "title": "brAInwav Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(brAInwav_request_duration_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(brAInwav_request_duration_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "id": 4,
        "title": "brAInwav Circuit Breaker Status",
        "type": "table",
        "targets": [
          {
            "expr": "brAInwav_circuit_breaker_state",
            "format": "table"
          }
        ]
      },
      {
        "id": 5,
        "title": "brAInwav Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "brAInwav_system_memory_heap_used",
            "legendFormat": "Heap Used"
          },
          {
            "expr": "brAInwav_system_memory_heap_total", 
            "legendFormat": "Heap Total"
          }
        ]
      }
    ]
  }
}
```

### Alert Rules

```yaml
# brAInwav-alerts.yaml
groups:
  - name: brAInwav.cortex.agents
    rules:
      - alert: brAInwavServiceDown
        expr: up{job="brAInwav-cortex-agents"} == 0
        for: 1m
        labels:
          severity: critical
          service: brAInwav-cortex-agents
        annotations:
          summary: "brAInwav Cortex Agents service is down"
          description: "brAInwav service {{ $labels.instance }} has been down for more than 1 minute."

      - alert: brAInwavHighErrorRate
        expr: rate(brAInwav_operation_error[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
          service: brAInwav-cortex-agents
        annotations:
          summary: "brAInwav high error rate detected"
          description: "brAInwav error rate is {{ $value }} errors per second."

      - alert: brAInwavCircuitBreakerOpen
        expr: brAInwav_circuit_breaker_state == 2
        for: 2m
        labels:
          severity: warning
          service: brAInwav-cortex-agents
        annotations:
          summary: "brAInwav circuit breaker is open"
          description: "brAInwav circuit breaker {{ $labels.name }} has been open for more than 2 minutes."

      - alert: brAInwavHighMemoryUsage
        expr: brAInwav_system_memory_heap_used / brAInwav_system_memory_heap_total > 0.9
        for: 5m
        labels:
          severity: warning
          service: brAInwav-cortex-agents
        annotations:
          summary: "brAInwav high memory usage"
          description: "brAInwav memory usage is at {{ $value }}%."

      - alert: brAInwavHealthCheckFailing
        expr: brAInwav_health_overall_status < 1
        for: 3m
        labels:
          severity: critical
          service: brAInwav-cortex-agents
        annotations:
          summary: "brAInwav health check failing"
          description: "brAInwav health status is {{ $value }}."
```

## 🔒 Security Configuration

### Security Checklist

- ✅ Run as non-root user (UID 1001)
- ✅ Read-only root filesystem
- ✅ Drop all capabilities
- ✅ No privilege escalation
- ✅ Input sanitization enabled
- ✅ Log redaction configured
- ✅ Secrets management via Kubernetes secrets
- ✅ Network policies (if required)
- ✅ Pod security standards compliance

### Network Policy (Optional)

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: brAInwav-cortex-agents-netpol
  namespace: brAInwav-agents
spec:
  podSelector:
    matchLabels:
      app: brAInwav-cortex-agents
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
    - protocol: TCP
      port: 9090
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
  - to:
    - namespaceSelector:
        matchLabels:
          name: database
    ports:
    - protocol: TCP
      port: 5432
```

## 🚀 Production Deployment Steps

### 1. Pre-Deployment Verification

```bash
# Run comprehensive tests
npm run test
npm run test:integration
npm run test:tdd

# Verify brAInwav production readiness score
echo "Expected: 100% production readiness"

# Build and validate
npm run build
npm run typecheck
npm run lint
```

### 2. Docker Image Preparation

```bash
# Build and tag brAInwav image
docker build -t brAInwav/cortex-agents:v1.0.0 .
docker tag brAInwav/cortex-agents:v1.0.0 brAInwav/cortex-agents:latest

# Test image locally
docker run --rm -p 3000:3000 brAInwav/cortex-agents:v1.0.0

# Push to registry
docker push brAInwav/cortex-agents:v1.0.0
docker push brAInwav/cortex-agents:latest
```

### 3. Kubernetes Deployment

```bash
# Create namespace and apply configurations
kubectl create namespace brAInwav-agents
kubectl apply -f k8s/

# Wait for deployment
kubectl rollout status deployment/brAInwav-cortex-agents -n brAInwav-agents

# Verify health
kubectl get pods -n brAInwav-agents
kubectl get services -n brAInwav-agents
```

### 4. Post-Deployment Validation

```bash
# Port forward and test
kubectl port-forward -n brAInwav-agents svc/brAInwav-cortex-agents-service 8080:80

# Test brAInwav health endpoint
curl http://localhost:8080/health

# Verify brAInwav metrics
curl http://localhost:8080/metrics | grep brAInwav

# Check brAInwav logs
kubectl logs -n brAInwav-agents -l app=brAInwav-cortex-agents --tail=50
```

## 🔄 CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/brAInwav-deploy.yml
name: brAInwav Cortex Agents - Deploy

on:
  push:
    branches: [main]
    paths: ['packages/agents/**']

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: brAInwav/cortex-agents

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run brAInwav tests
        run: |
          npm run test
          npm run test:integration
          npm run test:tdd
          
      - name: Type check and lint
        run: |
          npm run typecheck
          npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.image.outputs.image }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}
            
      - name: Build and push brAInwav image
        uses: docker/build-push-action@v5
        with:
          context: packages/agents
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          
      - name: Output image
        id: image
        run: echo "image=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}" >> $GITHUB_OUTPUT

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
        
      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig
          
      - name: Deploy brAInwav agents
        run: |
          export KUBECONFIG=kubeconfig
          
          # Update image in deployment
          kubectl set image deployment/brAInwav-cortex-agents \
            brAInwav-cortex-agents=${{ needs.build.outputs.image }} \
            -n brAInwav-agents
            
          # Wait for rollout
          kubectl rollout status deployment/brAInwav-cortex-agents -n brAInwav-agents
          
          # Verify brAInwav deployment
          kubectl get pods -n brAInwav-agents
          
      - name: Run brAInwav health check
        run: |
          export KUBECONFIG=kubeconfig
          
          # Port forward and test
          kubectl port-forward -n brAInwav-agents svc/brAInwav-cortex-agents-service 8080:80 &
          sleep 10
          
          # Test health endpoint
          curl -f http://localhost:8080/health
          
          echo "brAInwav deployment successful!"
```

## 📋 Operational Runbooks

### Incident Response

**High Memory Usage**

1. Check brAInwav memory metrics: `kubectl top pods -n brAInwav-agents`
2. Review memory stores: Check observability export for store sizes
3. Force cleanup: Restart pods if necessary
4. Scale horizontally: Increase replica count

**Circuit Breaker Open**

1. Check circuit breaker metrics in Grafana
2. Identify failing dependency
3. Verify external service health
4. Reset circuit breaker if appropriate

**Health Check Failures**

1. Get detailed health status: `curl /health`
2. Check individual health check results
3. Review logs for error details
4. Remediate specific failing checks

### Scaling Guidelines

**Horizontal Scaling**

- CPU utilization > 70%: Scale up
- Memory utilization > 80%: Scale up
- Request latency > 500ms: Scale up

**Vertical Scaling**

- Consistent memory pressure: Increase memory limits
- CPU throttling: Increase CPU limits

---

**Deployed by brAInwav Development Team**  
*Production-ready AI agent infrastructure with enterprise observability*
