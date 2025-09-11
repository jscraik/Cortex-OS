# Cortex-OS Containerization and Deployment Strategy

## Overview

This document outlines the containerization and deployment strategy for Cortex-OS, leveraging OrbStack on macOS and Docker Engine on Linux. The strategy emphasizes local-first execution with MLX acceleration while maintaining vendor neutrality and ensuring production readiness.

## Containerization Architecture

### Host Configuration
```
User → Web/CLI/API
            │
            ▼
Cloudflare Workers/Queues/Tunnels (edge egress allowlist)
            │
            ▼
┌──────────────────────────────────────────────────────────────────────┐
│ OrbStack (Docker-compatible VM on macOS) / Docker Engine on Linux │
│                                                                      │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐          │
│  │ apps/api     │   │ apps/cortex- │   │ apps/cortex-web  │          │
│  │ REST/Webhook │   │ os (ASBR-lite)│  │ Next.js UI       │          │
│  └──────┬───────┘   └──────┬───────┘   └────────┬─────────┘          │
│         │ A2A/HTTP         │ A2A/HTTP           HTTP                 │
│  ┌──────▼────────┐   ┌─────▼──────────┐   ┌─────▼──────────┐         │
│  │ packages/     │   │ packages/model │   │ packages/mcp-   │         │
│  │ agents (worker│   │ -gateway (/chat│   │ registry (HTTP) │         │
│  │ processes)    │   │ /embed /rank)  │   └─────────────────┘         │
│  └───────────────┘   └─────┬──────────┘                               │
│                            │ HTTP/MCP                                 │
│  ┌──────────────┐   ┌──────▼───────┐   ┌──────────────┐               │
│  │ NATS (JetStr)│   │ Postgres     │   │ Qdrant (opt.)│               │
│  │ A2A bus      │   │ meta/outbox  │   │ vectors      │               │
│  └──────────────┘   └──────────────┘   └──────────────┘               │
└──────────────────────────────────────────────────────────────────────┘

Host (macOS):
  apps/cortex-py (MLX servers) → http://host.docker.internal:8081  [Metal]
Optional:
  Ollama (host or container at :11434)
Frontier APIs:
  via Cloudflare edge allowlist
```

## Containerization Strategy

### Deployable Services (Containerized)
1. **apps/cortex-os** - ASBR-lite brain
2. **apps/api** - REST/Webhook interface
3. **apps/cortex-web** - Next.js UI
4. **packages/model-gateway** - AI model gateway
5. **packages/mcp-registry** - HTTP registry
6. **packages/agents** - Agent workers (if long-running)
7. **Infrastructure services** - NATS, Postgres, Qdrant, Ollama (optional)

### Libraries (Bundled in Images)
1. **packages/orchestration** - Workflow coordination
2. **packages/mvp|kernel** - Core functionality
3. **packages/a2a-services** - A2A middleware
4. **packages/security** - Security components
5. **packages/observability** - Monitoring and tracing
6. **packages/mcp** - MCP client
7. **packages/rag** - Retrieval-Augmented Generation
8. **packages/memories** - Memory management

### Host-Native Services (Not Containerized)
1. **apps/cortex-py** - MLX servers for Metal acceleration

## Docker Compose Configuration

### Development Environment (`docker-compose.dev.yml`)
```yaml
version: '3.8'
services:
  cortex-os:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - MODEL_GATEWAY=http://host.docker.internal:8081
      - NATS_URL=nats://nats:4222
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/cortex
    volumes:
      - .:/app
      - /var/cortex/tmp:/var/cortex/tmp
    depends_on:
      - nats
      - postgres
    networks:
      - cortex-network

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    environment:
      - CORTEX_OS_URL=http://cortex-os:3000
    networks:
      - cortex-network

  cortex-web:
    build:
      context: ./apps/cortex-web
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:8080
    networks:
      - cortex-network

  model-gateway:
    build:
      context: ./packages/model-gateway
      dockerfile: Dockerfile.dev
    ports:
      - "8081:8081"
    environment:
      - MLX_SERVICE_URL=http://host.docker.internal:8081
    networks:
      - cortex-network

  mcp-registry:
    build:
      context: ./packages/mcp-registry
      dockerfile: Dockerfile.dev
    ports:
      - "8082:8080"
    networks:
      - cortex-network

  nats:
    image: nats:latest
    command: "--jetstream"
    ports:
      - "4222:4222"
      - "8222:8222"
    networks:
      - cortex-network

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=cortex
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - cortex-network

  qdrant:
    image: qdrant/qdrant:v1.7.4
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
    networks:
      - cortex-network

volumes:
  postgres_data:
  qdrant_storage:

networks:
  cortex-network:
    driver: bridge
```

### Production Environment (`docker-compose.prod.yml`)
```yaml
version: '3.8'
services:
  cortex-os:
    image: cortex-os/cortex-os:${VERSION:-latest}
    ports:
      - "3000:3000"
    environment:
      - MODEL_GATEWAY=http://model-gateway:8081
      - NATS_URL=nats://nats:4222
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/cortex
      - REDIS_URL=redis://redis:6379
    volumes:
      - /var/cortex/data:/var/cortex/data
      - /var/cortex/logs:/var/cortex/logs
    depends_on:
      - nats
      - postgres
      - redis
    networks:
      - cortex-network
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  api:
    image: cortex-os/api:${VERSION:-latest}
    ports:
      - "8080:8080"
    environment:
      - CORTEX_OS_URL=http://cortex-os:3000
    networks:
      - cortex-network
    deploy:
      replicas: 2

  cortex-web:
    image: cortex-os/cortex-web:${VERSION:-latest}
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:8080
    networks:
      - cortex-network
    deploy:
      replicas: 2

  model-gateway:
    image: cortex-os/model-gateway:${VERSION:-latest}
    ports:
      - "8081:8081"
    environment:
      - MLX_SERVICE_URL=http://host.docker.internal:8081
    networks:
      - cortex-network

  mcp-registry:
    image: cortex-os/mcp-registry:${VERSION:-latest}
    ports:
      - "8082:8080"
    networks:
      - cortex-network

  nats:
    image: nats:latest
    command: "--jetstream"
    ports:
      - "4222:4222"
      - "8222:8222"
    volumes:
      - nats_data:/data
    networks:
      - cortex-network

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=cortex
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - cortex-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - cortex-network

  qdrant:
    image: qdrant/qdrant:v1.7.4
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
    networks:
      - cortex-network

volumes:
  nats_data:
  postgres_data:
  redis_data:
  qdrant_storage:

networks:
  cortex-network:
    driver: bridge
```

## Kubernetes Deployment Manifests

### Namespace
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cortex-os
```

### Deployment
```yaml
# k8s/cortex-os-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cortex-os
  namespace: cortex-os
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cortex-os
  template:
    metadata:
      labels:
        app: cortex-os
    spec:
      containers:
      - name: cortex-os
        image: cortex-os/cortex-os:latest
        ports:
        - containerPort: 3000
        env:
        - name: MODEL_GATEWAY
          value: "http://model-gateway:8081"
        - name: NATS_URL
          value: "nats://nats:4222"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: cortex-secrets
              key: database-url
        volumeMounts:
        - name: data
          mountPath: /var/cortex/data
        - name: logs
          mountPath: /var/cortex/logs
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: cortex-data-pvc
      - name: logs
        persistentVolumeClaim:
          claimName: cortex-logs-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: cortex-os
  namespace: cortex-os
spec:
  selector:
    app: cortex-os
  ports:
    - protocol: TCP
      port: 3000
      targetPort: 3000
  type: ClusterIP
```

### Horizontal Pod Autoscaler
```yaml
# k8s/cortex-os-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cortex-os
  namespace: cortex-os
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cortex-os
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
```

## Security Configuration

### Container Security Best Practices
1. **Non-root User Execution**
```dockerfile
# Dockerfile
FROM node:18-alpine
USER node
WORKDIR /app
COPY --chown=node:node . .
```

2. **Read-only File System**
```yaml
# docker-compose.yml
services:
  cortex-os:
    read_only: true
    tmpfs:
      - /tmp
      - /var/log
```

3. **Seccomp and AppArmor Profiles**
```yaml
# k8s/deployment.yaml
spec:
  template:
    spec:
      securityContext:
        seccompProfile:
          type: RuntimeDefault
        runAsNonRoot: true
        runAsUser: 1000
```

## Networking Configuration

### Service Mesh Integration (Istio)
```yaml
# k8s/service-entry.yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: mlx-service
  namespace: cortex-os
spec:
  hosts:
  - host.docker.internal
  ports:
  - number: 8081
    name: http
    protocol: HTTP
  location: MESH_EXTERNAL
  resolution: DNS
```

### Network Policies
```yaml
# k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cortex-os-policy
  namespace: cortex-os
spec:
  podSelector:
    matchLabels:
      app: cortex-os
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: cortex-os
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: cortex-os
    ports:
    - protocol: TCP
      port: 4222  # NATS
    - protocol: TCP
      port: 5432  # Postgres
```

## Monitoring and Observability

### Prometheus Configuration
```yaml
# k8s/prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'cortex-os'
      static_configs:
      - targets: ['cortex-os.cortex-os.svc.cluster.local:3000']
```

### Logging Configuration
```yaml
# k8s/logging-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: logging
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      read_from_head true
      <parse>
        @type json
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>
    <match kubernetes.var.log.containers.cortex-os**>
      @type elasticsearch
      host elasticsearch.logging.svc.cluster.local
      port 9200
      logstash_format true
    </match>
```

## Backup and Disaster Recovery

### Backup Strategy
1. **Database Backups**
```bash
# Daily database dump
pg_dump -h postgres -U postgres cortex > /backups/cortex-$(date +%Y%m%d).sql
```

2. **Persistent Volume Snapshots**
```yaml
# k8s/volume-snapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: cortex-data-snapshot
  namespace: cortex-os
spec:
  volumeSnapshotClassName: csi-hostpath-snapclass
  source:
    persistentVolumeClaimName: cortex-data-pvc
```

3. **Configuration Backup**
```bash
# Backup Kubernetes resources
kubectl get -n cortex-os all -o yaml > /backups/cortex-os-resources-$(date +%Y%m%d).yaml
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
  release:
    types: [published]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Container Registry
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: cortex-os/cortex-os:${{ github.sha }}
        platforms: linux/amd64,linux/arm64
    
    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/cortex-os cortex-os=cortex-os/cortex-os:${{ github.sha }} -n cortex-os
```

## Testing and Validation

### Container Image Testing
```dockerfile
# Dockerfile.test
FROM cortex-os/cortex-os:latest
RUN npm test
```

### Integration Testing
```yaml
# k8s/test-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: cortex-os-integration-test
  namespace: cortex-os
spec:
  containers:
  - name: test-runner
    image: cortex-os/test-runner:latest
    command: ["/bin/sh", "-c"]
    args:
    - |
      # Wait for services to be ready
      until curl -f http://cortex-os:3000/health; do
        echo "Waiting for cortex-os..."
        sleep 5
      done
      
      # Run integration tests
      npm run test:integration
      
      # Cleanup
      exit $?
  restartPolicy: Never
```

## Monitoring and Alerting

### Health Checks
```yaml
# k8s/health-checks.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: health-checks
  namespace: cortex-os
data:
  liveness.sh: |
    #!/bin/bash
    curl -f http://localhost:3000/health || exit 1
  readiness.sh: |
    #!/bin/bash
    curl -f http://localhost:3000/ready || exit 1
```

### Alerting Rules
```yaml
# k8s/alert-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cortex-os-alerts
  namespace: monitoring
spec:
  groups:
  - name: cortex-os.rules
    rules:
    - alert: CortexOSDown
      expr: up{job="cortex-os"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Cortex-OS service is down"
        description: "Cortex-OS service has been down for more than 5 minutes"
```

## Conclusion

This containerization and deployment strategy provides a robust, scalable, and secure foundation for Cortex-OS. By leveraging OrbStack on macOS and Docker Engine on Linux, the system maintains optimal performance while ensuring vendor neutrality. The multi-environment approach with development and production configurations allows for smooth transitions from local development to production deployment.

The strategy emphasizes security best practices, observability, and disaster recovery, ensuring that Cortex-OS can be deployed and operated with confidence in production environments. The use of Kubernetes manifests provides flexibility for cloud deployments while maintaining compatibility with containerized development workflows.
