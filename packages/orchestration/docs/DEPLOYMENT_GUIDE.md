# nO Master Agent Loop - Deployment Guide
*brAInwav Production Deployment Documentation*

## Quick Start Deployment

### Prerequisites Checklist
- [ ] Node.js 18+ installed
- [ ] Docker and Docker Compose installed
- [ ] PostgreSQL 13+ or configured database
- [ ] Redis 6+ for caching
- [ ] kubectl configured (for Kubernetes)
- [ ] Valid OAuth 2.0 credentials
- [ ] SSL certificates (for production)

### 1. Local Development Setup

```bash
# Clone and setup
git clone <repository-url>
cd nO-master-agent-loop
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start dependencies
docker-compose up -d postgres redis

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### 2. Docker Deployment

```bash
# Build image
docker build -t brainwav/no-master-agent-loop:latest .

# Run with docker-compose
docker-compose up -d

# Verify deployment
curl http://localhost:3000/health
```

### 3. Kubernetes Deployment

```bash
# Create namespace
kubectl create namespace no-system

# Apply configurations
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Verify deployment
kubectl get pods -n no-system
kubectl get services -n no-system
```

## Production Deployment

### Infrastructure Requirements

#### Minimum Requirements
- **CPU**: 2 cores per instance
- **Memory**: 4GB RAM per instance
- **Storage**: 20GB SSD
- **Network**: 1Gbps
- **Database**: PostgreSQL 13+ with 2 cores, 8GB RAM
- **Cache**: Redis 6+ with 1 core, 2GB RAM

#### Recommended Requirements
- **CPU**: 4 cores per instance
- **Memory**: 8GB RAM per instance
- **Storage**: 50GB SSD
- **Network**: 10Gbps
- **Database**: PostgreSQL 14+ with 4 cores, 16GB RAM
- **Cache**: Redis 7+ with 2 cores, 4GB RAM

### High Availability Setup

#### Multi-Instance Deployment
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: no-master-agent-loop
spec:
  replicas: 3  # Minimum 3 for HA
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: app
        image: brainwav/no-master-agent-loop:v1.0.0
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

#### Load Balancer Configuration
```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: no-master-agent-loop-service
spec:
  type: LoadBalancer
  selector:
    app: no-master-agent-loop
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
  sessionAffinity: None
```

### Database Setup

#### PostgreSQL Configuration
```sql
-- Create database and user
CREATE DATABASE no_production;
CREATE USER no_app WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE no_production TO no_app;

-- Create required extensions
\c no_production;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Configure connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
```

#### Database Migration
```bash
# Run migrations
export DATABASE_URL="postgresql://no_app:password@localhost/no_production"
npm run db:migrate

# Verify migration
npm run db:verify

# Create initial data
npm run db:seed
```

### Redis Configuration

```redis
# redis.conf
bind 0.0.0.0
port 6379
requirepass secure_redis_password
maxmemory 1gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Environment Configuration

#### Production Environment Variables
```bash
# .env.production
NODE_ENV=production
NO_SERVICE_PORT=3000
NO_SERVICE_HOST=0.0.0.0

# Database
NO_DB_HOST=prod-postgres.example.com
NO_DB_PORT=5432
NO_DB_NAME=no_production
NO_DB_USER=no_app
NO_DB_PASSWORD=secure_password
NO_DB_SSL=true
NO_DB_POOL_MIN=5
NO_DB_POOL_MAX=20

# Redis
NO_REDIS_HOST=prod-redis.example.com
NO_REDIS_PORT=6379
NO_REDIS_PASSWORD=secure_redis_password
NO_REDIS_TLS=true

# OAuth
NO_OAUTH_CLIENT_ID=prod_client_id
NO_OAUTH_CLIENT_SECRET=prod_client_secret
NO_OAUTH_REDIRECT_URI=https://no.brainwav.com/auth/callback

# Security
NO_JWT_SECRET=secure_jwt_secret_256_bits
NO_RATE_LIMIT_ENABLED=true
NO_RBAC_ENABLED=true

# Monitoring
NO_PROMETHEUS_ENABLED=true
NO_GRAFANA_ENABLED=true
NO_LOG_LEVEL=info

# Performance
NO_AUTOSCALING_ENABLED=true
NO_CACHE_ENABLED=true
NO_CONNECTION_POOL_ENABLED=true

# brAInwav specific
NO_COMPANY_NAME=brAInwav
NO_PRODUCT_NAME="nO Master Agent Loop"
NO_BRANDING_ENABLED=true
```

## Container Deployment

### Dockerfile Optimization
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runtime

# Add non-root user
RUN addgroup -g 1001 -S no && adduser -S no -u 1001 -G no

# Install security updates
RUN apk --no-cache add dumb-init

WORKDIR /app

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=no:no . .

# Security: run as non-root
USER no

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]

EXPOSE 3000
```

### Docker Compose Production
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    image: brainwav/no-master-agent-loop:v1.0.0
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '0.5'
          memory: 1G

  postgres:
    image: postgres:14-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: no_production
      POSTGRES_USER: no_app
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass secure_redis_password
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
```

## Kubernetes Production Deployment

### Complete Kubernetes Manifests

#### Namespace
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: no-system
  labels:
    app.kubernetes.io/name: no-master-agent-loop
    app.kubernetes.io/version: v1.0.0
    app.kubernetes.io/managed-by: kubectl
```

#### ConfigMap
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: no-config
  namespace: no-system
data:
  NODE_ENV: "production"
  NO_SERVICE_PORT: "3000"
  NO_SERVICE_HOST: "0.0.0.0"
  NO_DB_HOST: "postgres-service"
  NO_DB_PORT: "5432"
  NO_DB_NAME: "no_production"
  NO_REDIS_HOST: "redis-service"
  NO_REDIS_PORT: "6379"
  NO_PROMETHEUS_ENABLED: "true"
  NO_GRAFANA_ENABLED: "true"
  NO_AUTOSCALING_ENABLED: "true"
  NO_CACHE_ENABLED: "true"
  NO_RBAC_ENABLED: "true"
  NO_RATE_LIMIT_ENABLED: "true"
  NO_COMPANY_NAME: "brAInwav"
  NO_PRODUCT_NAME: "nO Master Agent Loop"
  NO_BRANDING_ENABLED: "true"
```

#### Secrets
```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: no-secrets
  namespace: no-system
type: Opaque
data:
  NO_DB_PASSWORD: <base64-encoded-password>
  NO_REDIS_PASSWORD: <base64-encoded-password>
  NO_OAUTH_CLIENT_SECRET: <base64-encoded-secret>
  NO_JWT_SECRET: <base64-encoded-secret>
```

#### Deployment
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: no-master-agent-loop
  namespace: no-system
  labels:
    app: no-master-agent-loop
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
      app: no-master-agent-loop
  template:
    metadata:
      labels:
        app: no-master-agent-loop
        version: v1.0.0
    spec:
      serviceAccountName: no-service-account
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: app
        image: brainwav/no-master-agent-loop:v1.0.0
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        envFrom:
        - configMapRef:
            name: no-config
        - secretRef:
            name: no-secrets
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 10"]
```

#### Service
```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: no-master-agent-loop-service
  namespace: no-system
  labels:
    app: no-master-agent-loop
spec:
  type: ClusterIP
  selector:
    app: no-master-agent-loop
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
```

#### Ingress
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: no-master-agent-loop-ingress
  namespace: no-system
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - no.brainwav.com
    secretName: no-tls-secret
  rules:
  - host: no.brainwav.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: no-master-agent-loop-service
            port:
              number: 80
```

#### HorizontalPodAutoscaler
```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: no-master-agent-loop-hpa
  namespace: no-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: no-master-agent-loop
  minReplicas: 3
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
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

## Monitoring Setup

### Prometheus Configuration
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'no-master-agent-loop'
    static_configs:
      - targets: ['no-master-agent-loop-service:80']
    metrics_path: '/metrics'
    scrape_interval: 15s
    scrape_timeout: 10s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Alert Rules
```yaml
# monitoring/alert_rules.yml
groups:
- name: no-master-agent-loop
  rules:
  - alert: ServiceDown
    expr: up{job="no-master-agent-loop"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "nO Master Agent Loop service is down"
      
  - alert: HighErrorRate
    expr: rate(no_http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      
  - alert: HighResponseTime
    expr: histogram_quantile(0.95, no_http_request_duration_seconds) > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "95th percentile response time above 2s"
```

## Security Configuration

### SSL/TLS Setup
```bash
# Generate self-signed certificates for development
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# For production, use Let's Encrypt with cert-manager
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.8.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@brainwav.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### RBAC Configuration
```yaml
# k8s/rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: no-service-account
  namespace: no-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: no-cluster-role
rules:
- apiGroups: [""]
  resources: ["pods", "services", "endpoints"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: no-cluster-role-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: no-cluster-role
subjects:
- kind: ServiceAccount
  name: no-service-account
  namespace: no-system
```

## Deployment Scripts

### Automated Deployment Script
```bash
#!/bin/bash
# deploy.sh - Automated deployment script

set -e

VERSION=${1:-latest}
NAMESPACE=${2:-no-system}
ENVIRONMENT=${3:-production}

echo "Deploying nO Master Agent Loop v${VERSION} to ${ENVIRONMENT}"

# Validate prerequisites
kubectl cluster-info
docker --version
helm version

# Create namespace if it doesn't exist
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Apply configurations
echo "Applying configurations..."
kubectl apply -f k8s/configmap.yaml -n ${NAMESPACE}
kubectl apply -f k8s/secrets.yaml -n ${NAMESPACE}

# Deploy application
echo "Deploying application..."
sed "s/{{VERSION}}/${VERSION}/g" k8s/deployment.yaml | kubectl apply -f - -n ${NAMESPACE}
kubectl apply -f k8s/service.yaml -n ${NAMESPACE}
kubectl apply -f k8s/ingress.yaml -n ${NAMESPACE}
kubectl apply -f k8s/hpa.yaml -n ${NAMESPACE}

# Wait for deployment
echo "Waiting for deployment to be ready..."
kubectl rollout status deployment/no-master-agent-loop -n ${NAMESPACE} --timeout=300s

# Verify deployment
echo "Verifying deployment..."
kubectl get pods -n ${NAMESPACE}
kubectl get services -n ${NAMESPACE}

# Run health checks
echo "Running health checks..."
INGRESS_IP=$(kubectl get ingress no-master-agent-loop-ingress -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -f http://${INGRESS_IP}/health || {
    echo "Health check failed!"
    exit 1
}

echo "Deployment completed successfully!"
```

### Rollback Script
```bash
#!/bin/bash
# rollback.sh - Automated rollback script

set -e

NAMESPACE=${1:-no-system}
REVISION=${2:-}

echo "Rolling back nO Master Agent Loop in ${NAMESPACE}"

if [ -n "$REVISION" ]; then
    echo "Rolling back to revision ${REVISION}"
    kubectl rollout undo deployment/no-master-agent-loop --to-revision=${REVISION} -n ${NAMESPACE}
else
    echo "Rolling back to previous revision"
    kubectl rollout undo deployment/no-master-agent-loop -n ${NAMESPACE}
fi

# Wait for rollback
echo "Waiting for rollback to complete..."
kubectl rollout status deployment/no-master-agent-loop -n ${NAMESPACE} --timeout=300s

# Verify rollback
echo "Verifying rollback..."
kubectl get pods -n ${NAMESPACE}

echo "Rollback completed successfully!"
```

---

*This deployment guide is maintained by the brAInwav DevOps team.*

**Document Version**: 1.0  
**Last Updated**: $(date)  
**Next Review**: $(date -d "+1 month")
