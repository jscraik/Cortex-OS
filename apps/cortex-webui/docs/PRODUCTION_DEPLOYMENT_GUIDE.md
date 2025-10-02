# brAInwav Cortex WebUI Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the brAInwav Cortex WebUI to production environments. The deployment architecture follows cloud-native best practices with Docker containerization, Kubernetes orchestration, and comprehensive monitoring.

## Prerequisites

### Infrastructure Requirements
- **Kubernetes Cluster**: v1.25+ with load balancer support
- **Container Registry**: Docker Hub, ECR, GCR, or Azure Container Registry
- **Database**: PostgreSQL 14+ (production), Redis 6+ (caching)
- **Storage**: Persistent storage for database and uploads
- **Network**: TLS termination, ingress controller, DNS management

### Tooling Requirements
- **kubectl**: Kubernetes CLI v1.25+
- **helm**: Helm package manager v3.8+
- **docker**: Container build tool v20.10+
- **pnpm**: Package manager (build-time only)
- **git**: Version control

### Security Requirements
- **Secrets Management**: Kubernetes Secrets, AWS Secrets Manager, or HashiCorp Vault
- **TLS Certificates**: Wildcard or SAN certificates
- **Network Policies**: Kubernetes network policies or service mesh
- **RBAC**: Role-based access control configured

## 1. Docker Deployment Configuration

### 1.1 Production Dockerfiles

#### Backend Dockerfile
```dockerfile
# Multi-stage production build
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/cortex-webui/backend/package.json ./apps/cortex-webui/backend/
RUN corepack enable && pnpm install --frozen-lockfile --prod

# Builder stage
FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/cortex-webui ./apps/cortex-webui
RUN corepack enable && pnpm install --frozen-lockfile
WORKDIR /app/apps/cortex-webui/backend
RUN pnpm build

# Runtime stage
FROM base AS runner
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 cortex
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder --chown=cortex:nodejs /app/apps/cortex-webui/backend/dist ./dist
COPY --from=builder --chown=cortex:nodejs /app/apps/cortex-webui/backend/package.json ./package.json

USER cortex
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

#### Frontend Dockerfile
```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/cortex-webui/package.json ./apps/cortex-webui/
RUN corepack enable && pnpm install --frozen-lockfile

# Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/cortex-webui/node_modules ./apps/cortex-webui/node_modules
COPY . .
WORKDIR /app/apps/cortex-webui
RUN pnpm build

# Runner
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/cortex-webui/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

### 1.2 Docker Compose Production

```yaml
version: '3.8'

services:
  # Frontend service
  frontend:
    image: cortex-webui-frontend:${VERSION:-latest}
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
      - frontend_cache:/var/cache/nginx
    depends_on:
      - backend
    networks:
      - cortex-network
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M

  # Backend service
  backend:
    image: cortex-webui-backend:${VERSION:-latest}
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGIN=${CORS_ORIGIN}
      - LOG_LEVEL=info
    volumes:
      - uploads:/app/uploads
      - logs:/app/logs
    depends_on:
      - postgres
      - redis
    networks:
      - cortex-network
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  # PostgreSQL database
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - cortex-network
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  # Redis cache
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - cortex-network
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M

  # Nginx reverse proxy
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    depends_on:
      - frontend
      - backend
    networks:
      - cortex-network

volumes:
  postgres_data:
  redis_data:
  uploads:
  logs:
  frontend_cache:
  nginx_logs:

networks:
  cortex-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## 2. Kubernetes Production Manifests

### 2.1 Namespace Configuration

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cortex-webui
  labels:
    name: cortex-webui
    environment: production
    brAInwav.io/managed: "true"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: cortex-webui-config
  namespace: cortex-webui
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  CORS_ORIGIN: "https://cortex.brainwav.ai"
  REDIS_DEFAULT_TTL: "3600"
  DB_MAX_CONNECTIONS: "20"
  COMPRESSION_THRESHOLD: "1024"
  RATE_LIMIT_WINDOW: "900000"
  METRICS_ENABLED: "true"
  SLO_VALIDATION_INTERVAL: "300000"
```

### 2.2 Backend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cortex-webui-backend
  namespace: cortex-webui
  labels:
    app.kubernetes.io/name: cortex-webui
    app.kubernetes.io/component: backend
    app.kubernetes.io/part-of: cortex-os
    app.kubernetes.io/version: "1.0.0"
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app.kubernetes.io/name: cortex-webui
      app.kubernetes.io/component: backend
  template:
    metadata:
      labels:
        app.kubernetes.io/name: cortex-webui
        app.kubernetes.io/component: backend
        app.kubernetes.io/part-of: cortex-os
        app.kubernetes.io/version: "1.0.0"
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3001"
        prometheus.io/path: "/metrics"
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001
      containers:
      - name: backend
        image: registry.brainwav.ai/cortex-webui-backend:1.0.0
        imagePullPolicy: Always
        ports:
        - containerPort: 3001
          name: http
          protocol: TCP
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: cortex-webui-config
              key: NODE_ENV
        - name: PORT
          value: "3001"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: cortex-webui-secrets
              key: DATABASE_URL
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: cortex-webui-secrets
              key: REDIS_URL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: cortex-webui-secrets
              key: JWT_SECRET
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: cortex-webui-config
              key: LOG_LEVEL
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
            scheme: HTTP
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
            scheme: HTTP
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /health
            port: 3001
            scheme: HTTP
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 30
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: uploads
          mountPath: /app/uploads
          readOnly: false
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/cache
      volumes:
      - name: uploads
        persistentVolumeClaim:
          claimName: cortex-webui-uploads-pvc
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
      imagePullSecrets:
      - name: registry-credentials
      nodeSelector:
        kubernetes.io/os: linux
      tolerations:
      - key: "workload"
        operator: "Equal"
        value: "production"
        effect: "NoSchedule"
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app.kubernetes.io/name
                  operator: In
                  values:
                  - cortex-webui
                - key: app.kubernetes.io/component
                  operator: In
                  values:
                  - backend
              topologyKey: kubernetes.io/hostname
```

### 2.3 Frontend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cortex-webui-frontend
  namespace: cortex-webui
  labels:
    app.kubernetes.io/name: cortex-webui
    app.kubernetes.io/component: frontend
    app.kubernetes.io/part-of: cortex-os
    app.kubernetes.io/version: "1.0.0"
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app.kubernetes.io/name: cortex-webui
      app.kubernetes.io/component: frontend
  template:
    metadata:
      labels:
        app.kubernetes.io/name: cortex-webui
        app.kubernetes.io/component: frontend
        app.kubernetes.io/part-of: cortex-os
        app.kubernetes.io/version: "1.0.0"
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 101
        runAsGroup: 101
        fsGroup: 101
      containers:
      - name: frontend
        image: registry.brainwav.ai/cortex-webui-frontend:1.0.0
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
          protocol: TCP
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "250m"
        livenessProbe:
          httpGet:
            path: /
            port: 3000
            scheme: HTTP
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /
            port: 3000
            scheme: HTTP
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: nginx-cache
          mountPath: /var/cache/nginx
        - name: nginx-run
          mountPath: /var/run
      volumes:
      - name: nginx-cache
        emptyDir: {}
      - name: nginx-run
        emptyDir: {}
      imagePullSecrets:
      - name: registry-credentials
      nodeSelector:
        kubernetes.io/os: linux
```

### 2.4 Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cortex-webui-ingress
  namespace: cortex-webui
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/rate-limit-connections: "10"
    nginx.ingress.kubernetes.io/rate-limit-connections-burst: "20"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://cortex.brainwav.ai"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-Frame-Options: DENY";
      more_set_headers "X-Content-Type-Options: nosniff";
      more_set_headers "X-XSS-Protection: 1; mode=block";
      more_set_headers "Referrer-Policy: strict-origin-when-cross-origin";
      more_set_headers "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.brainwav.ai; frame-ancestors 'none';";
      more_set_headers "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload";
      more_set_headers "Permissions-Policy: geolocation=(), microphone=(), camera=()";
spec:
  tls:
  - hosts:
    - cortex.brainwav.ai
    - api.cortex.brainwav.ai
    secretName: cortex-webui-tls
  rules:
  - host: cortex.brainwav.ai
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: cortex-webui-frontend-service
            port:
              number: 3000
  - host: api.cortex.brainwav.ai
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: cortex-webui-backend-service
            port:
              number: 3001
```

### 2.5 Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cortex-webui-backend-hpa
  namespace: cortex-webui
  labels:
    app.kubernetes.io/name: cortex-webui
    app.kubernetes.io/component: backend
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cortex-webui-backend
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
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cortex-webui-frontend-hpa
  namespace: cortex-webui
  labels:
    app.kubernetes.io/name: cortex-webui
    app.kubernetes.io/component: frontend
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cortex-webui-frontend
  minReplicas: 2
  maxReplicas: 6
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
```

## 3. Environment Configuration

### 3.1 Production Environment Variables

```bash
# Application Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://cortex.brainwav.ai
API_BASE_URL=https://api.cortex.brainwav.ai

# Database Configuration
DATABASE_URL=postgresql://cortex:${DB_PASSWORD}@postgres:5432/cortex_prod
DB_MAX_CONNECTIONS=20
DB_MIN_CONNECTIONS=5
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000

# Redis Configuration
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
REDIS_DEFAULT_TTL=3600
REDIS_MAX_RETRIES=3
REDIS_CONNECT_TIMEOUT=10000

# Security Configuration
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://cortex.brainwav.ai
SESSION_SECRET=${SESSION_SECRET}

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf
UPLOAD_PATH=/app/uploads

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# Performance Configuration
COMPRESSION_THRESHOLD=1024
COMPRESSION_LEVEL=6
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# Cache Configuration
CACHE_DEFAULT_TTL=3600
CACHE_MAX_SIZE=1000
CACHE_CLEANUP_INTERVAL=300000

# Monitoring Configuration
METRICS_ENABLED=true
METRICS_PATH=/metrics
METRICS_PORT=3001
SLO_VALIDATION_INTERVAL=300000
HEALTH_CHECK_INTERVAL=30000

# External Services
LOCAL_MEMORY_BASE_URL=http://local-memory:3028/api/v1
LOCAL_MEMORY_API_KEY=${LOCAL_MEMORY_API_KEY}
LOCAL_MEMORY_NAMESPACE=cortex-webui-prod

# Error Reporting
SENTRY_DSN=${SENTRY_DSN}
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### 3.2 Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cortex-webui-secrets
  namespace: cortex-webui
  type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  REDIS_URL: <base64-encoded-redis-url>
  JWT_SECRET: <base64-encoded-jwt-secret>
  SESSION_SECRET: <base64-encoded-session-secret>
  REDIS_PASSWORD: <base64-encoded-redis-password>
  DB_PASSWORD: <base64-encoded-db-password>
  LOCAL_MEMORY_API_KEY: <base64-encoded-local-memory-api-key>
  SENTRY_DSN: <base64-encoded-sentry-dsn>
```

## 4. Database Migration Scripts

### 4.1 Migration Script

```typescript
// scripts/migrate.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { logger } from '../src/utils/logger';

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    logger.info('Starting database migration...');
    await migrate(db, { migrationsFolder: './migrations' });
    logger.info('Database migration completed successfully');
  } catch (error) {
    logger.error('Database migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
```

### 4.2 Kubernetes Migration Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: cortex-webui-migration
  namespace: cortex-webui
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migration
        image: registry.brainwav.ai/cortex-webui-backend:1.0.0
        command: ["node", "dist/scripts/migrate.js"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: cortex-webui-secrets
              key: DATABASE_URL
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "250m"
      imagePullSecrets:
      - name: registry-credentials
```

## 5. CI/CD Pipeline Configuration

### 5.1 GitHub Actions Workflow

```yaml
name: Production Deployment

on:
  push:
    branches: [main]
    tags: ['v*']
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'staging'
        type: choice
        options:
        - staging
        - production

env:
  REGISTRY: registry.brainwav.ai
  IMAGE_NAME: cortex-webui

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Run tests
      run: pnpm test

    - name: Run security scan
      run: pnpm security:scan

    - name: Run structure validation
      run: pnpm structure:validate

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      backend-image: ${{ steps.backend-meta.outputs.tags }}
      frontend-image: ${{ steps.frontend-meta.outputs.tags }}
      backend-digest: ${{ steps.backend-build.outputs.digest }}
      frontend-digest: ${{ steps.frontend-build.outputs.digest }}
    steps:
    - uses: actions/checkout@v4

    - name: Setup Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}

    - name: Extract backend metadata
      id: backend-meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}

    - name: Build and push backend image
      id: backend-build
      uses: docker/build-push-action@v5
      with:
        context: .
        file: ./apps/cortex-webui/Dockerfile.backend
        push: true
        tags: ${{ steps.backend-meta.outputs.tags }}
        labels: ${{ steps.backend-meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        platforms: linux/amd64,linux/arm64

    - name: Extract frontend metadata
      id: frontend-meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}

    - name: Build and push frontend image
      id: frontend-build
      uses: docker/build-push-action@v5
      with:
        context: .
        file: ./apps/cortex-webui/Dockerfile.frontend
        push: true
        tags: ${{ steps.frontend-meta.outputs.tags }}
        labels: ${{ steps.frontend-meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        platforms: linux/amd64,linux/arm64

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.event_name == 'workflow_dispatch'
    environment: staging
    steps:
    - uses: actions/checkout@v4

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.28.0'

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBE_CONFIG_STAGING }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Deploy to staging
      run: |
        export KUBECONFIG=kubeconfig
        kubectl set image deployment/cortex-webui-backend backend=${{ needs.build.outputs.backend-image }} -n cortex-webui-staging
        kubectl set image deployment/cortex-webui-frontend frontend=${{ needs.build.outputs.frontend-image }} -n cortex-webui-staging
        kubectl rollout status deployment/cortex-webui-backend -n cortex-webui-staging --timeout=600s
        kubectl rollout status deployment/cortex-webui-frontend -n cortex-webui-staging --timeout=600s

  deploy-production:
    needs: [build, deploy-staging]
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v') || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'production')
    environment: production
    steps:
    - uses: actions/checkout@v4

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.28.0'

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBE_CONFIG_PRODUCTION }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Run production smoke tests
      run: |
        # Run smoke tests against staging
        curl -f https://staging.cortex.brainwav.ai/health || exit 1
        curl -f https://api.staging.cortex.brainwav.ai/health || exit 1

    - name: Deploy to production
      run: |
        export KUBECONFIG=kubeconfig

        # Create backup of current deployment
        kubectl get deployment cortex-webui-backend -n cortex-webui -o yaml > deployment-backup.yaml

        # Update images with rolling update
        kubectl set image deployment/cortex-webui-backend backend=${{ needs.build.outputs.backend-image }} -n cortex-webui
        kubectl set image deployment/cortex-webui-frontend frontend=${{ needs.build.outputs.frontend-image }} -n cortex-webui

        # Wait for rollout to complete
        kubectl rollout status deployment/cortex-webui-backend -n cortex-webui --timeout=600s
        kubectl rollout status deployment/cortex-webui-frontend -n cortex-webui --timeout=600s

        # Run post-deployment health checks
        kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=cortex-webui -n cortex-webui --timeout=300s

    - name: Post-deployment validation
      run: |
        # Health checks
        sleep 30
        curl -f https://cortex.brainwav.ai/health || exit 1
        curl -f https://api.cortex.brainwav.ai/health || exit 1

        # Run smoke tests
        curl -f https://api.cortex.brainwav.ai/api/users || exit 1

        echo "Production deployment completed successfully"
```

### 5.2 ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cortex-webui
  namespace: argocd
  finalizers:
  - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/brainwav/cortex-os.git
    targetRevision: main
    path: apps/cortex-webui/k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: cortex-webui
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    - PruneLast=true
    - RespectIgnoreDifferences=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
    - /spec/replicas
```

## 6. Deployment Procedures

### 6.1 Initial Setup

```bash
# 1. Create namespace
kubectl create namespace cortex-webui

# 2. Create secrets
kubectl create secret generic cortex-webui-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=REDIS_URL="redis://..." \
  --from-literal=JWT_SECRET="your-jwt-secret" \
  --from-literal=SESSION_SECRET="your-session-secret" \
  -n cortex-webui

# 3. Create config maps
kubectl apply -f k8s/configmap.yaml -n cortex-webui

# 4. Create persistent volumes
kubectl apply -f k8s/pvc.yaml -n cortex-webui

# 5. Deploy database and cache
kubectl apply -f k8s/postgres.yaml -n cortex-webui
kubectl apply -f k8s/redis.yaml -n cortex-webui

# 6. Run migrations
kubectl apply -f k8s/migration-job.yaml -n cortex-webui

# 7. Deploy application
kubectl apply -f k8s/ -n cortex-webui
```

### 6.2 Rolling Update

```bash
# 1. Update image tags
kubectl set image deployment/cortex-webui-backend backend=registry.brainwav.ai/cortex-webui-backend:v1.1.0 -n cortex-webui
kubectl set image deployment/cortex-webui-frontend frontend=registry.brainwav.ai/cortex-webui-frontend:v1.1.0 -n cortex-webui

# 2. Monitor rollout
kubectl rollout status deployment/cortex-webui-backend -n cortex-webui --timeout=600s
kubectl rollout status deployment/cortex-webui-frontend -n cortex-webui --timeout=600s

# 3. Validate deployment
kubectl get pods -n cortex-webui -l app.kubernetes.io/name=cortex-webui
kubectl logs -f deployment/cortex-webui-backend -n cortex-webui

# 4. Run health checks
curl -f https://api.cortex.brainwav.ai/health
curl -f https://cortex.brainwav.ai/health
```

### 6.3 Rollback Procedure

```bash
# 1. Check rollout history
kubectl rollout history deployment/cortex-webui-backend -n cortex-webui
kubectl rollout history deployment/cortex-webui-frontend -n cortex-webui

# 2. Rollback to previous version
kubectl rollout undo deployment/cortex-webui-backend -n cortex-webui
kubectl rollout undo deployment/cortex-webui-frontend -n cortex-webui

# 3. Verify rollback
kubectl rollout status deployment/cortex-webui-backend -n cortex-webui
kubectl rollout status deployment/cortex-webui-frontend -n cortex-webui
```

## 7. Troubleshooting

### 7.1 Common Issues

#### Pod Not Starting
```bash
# Check pod status
kubectl describe pod <pod-name> -n cortex-webui

# Check logs
kubectl logs <pod-name> -n cortex-webui --previous

# Check events
kubectl get events -n cortex-webui --sort-by='.lastTimestamp'
```

#### Database Connection Issues
```bash
# Check database pod
kubectl get pods -n cortex-webui -l app=postgres

# Test database connection
kubectl exec -it postgres-<pod-id> -n cortex-webui -- psql -U cortex -d cortex_prod

# Check database logs
kubectl logs deployment/postgres -n cortex-webui
```

#### High Memory Usage
```bash
# Check resource usage
kubectl top pods -n cortex-webui

# Check pod metrics
kubectl describe pod <pod-name> -n cortex-webui

# Scale deployment if needed
kubectl scale deployment cortex-webui-backend --replicas=5 -n cortex-webui
```

### 7.2 Performance Debugging

```bash
# Check resource requests/limits
kubectl describe deployment cortex-webui-backend -n cortex-webui

# Monitor HPA
kubectl get hpa -n cortex-webui -w

# Check node resources
kubectl top nodes
kubectl describe nodes
```

## 8. Security Considerations

### 8.1 Network Security
- Implement network policies to restrict pod communication
- Use TLS for all external traffic
- Implement rate limiting and DDoS protection
- Regular security scans and vulnerability assessments

### 8.2 Secrets Management
- Use Kubernetes secrets with encryption at rest
- Rotate secrets regularly
- Implement principle of least privilege
- Audit secret access

### 8.3 Container Security
- Use minimal base images
- Run containers as non-root users
- Implement security contexts
- Regular image vulnerability scanning

---

**Deployment Guide Version**: 1.0.0
**Last Updated**: 2025-10-02
**Next Review**: 2025-11-02

This guide provides comprehensive production deployment procedures for the brAInwav Cortex WebUI. Follow these procedures to ensure reliable, secure, and scalable deployment in production environments.