# Cortex-OS Operations

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

</div>

This directory contains operational scripts, deployment configurations, and system administration tools for managing Cortex-OS in production environments.

## Operational Overview

### Operations Philosophy

Cortex-OS operations focus on:

- **Reliability** - High availability and fault tolerance
- **Scalability** - Horizontal and vertical scaling capabilities
- **Security** - Secure deployment and access controls
- **Monitoring** - Comprehensive observability and alerting
- **Automation** - Infrastructure as Code and GitOps

## Directory Structure

```text
ops/
├── deployment/
│   ├── kubernetes/
│   │   ├── manifests/         # K8s deployment manifests
│   │   ├── helm-charts/       # Helm chart configurations
│   │   └── operators/         # Custom operators
│   ├── docker/
│   │   ├── compose/           # Docker Compose files
│   │   └── swarm/             # Docker Swarm configs
│   └── terraform/
│       ├── aws/               # AWS infrastructure
│       ├── gcp/               # Google Cloud Platform
│       └── azure/             # Microsoft Azure
├── monitoring/
│   ├── prometheus/
│   │   ├── rules/             # Alerting rules
│   │   └── config/            # Prometheus config
│   ├── grafana/
│   │   ├── dashboards/        # Monitoring dashboards
│   │   └── datasources/       # Data source configs
│   └── jaeger/                # Distributed tracing
├── scripts/
│   ├── deployment/            # Deployment automation
│   ├── maintenance/           # System maintenance
│   ├── backup/                # Backup procedures
│   └── recovery/              # Disaster recovery
├── security/
│   ├── policies/              # Security policies
│   ├── rbac/                  # Role-based access control
│   └── certificates/          # SSL/TLS certificates
└── ci-cd/
    ├── github-actions/        # GitHub Actions workflows
    ├── jenkins/               # Jenkins pipelines
    └── argocd/                # ArgoCD configurations
```

## Deployment Strategies

### Kubernetes Deployment

Production-ready Kubernetes deployment:

```yaml
# deployment/kubernetes/manifests/cortex-os.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cortex-os
  namespace: cortex-system
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
          image: cortex-os:latest
          ports:
            - containerPort: 3000
          resources:
            requests:
              memory: '512Mi'
              cpu: '250m'
            limits:
              memory: '1Gi'
              cpu: '500m'
```

### Docker Deployment

Simple Docker Compose deployment:

```yaml
# deployment/docker/compose/production.yml
version: '3.8'
services:
  cortex-os:
    image: cortex-os:latest
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    volumes:
      - app-data:/app/data
    restart: unless-stopped

  database:
    image: postgres:14
    environment:
      - POSTGRES_DB=cortex
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - db-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  app-data:
  db-data:
```

### Cloud Infrastructure

Terraform for AWS deployment:

```hcl
# deployment/terraform/aws/main.tf
resource "aws_ecs_cluster" "cortex_cluster" {
  name = "cortex-os"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_service" "cortex_service" {
  name            = "cortex-os"
  cluster         = aws_ecs_cluster.cortex_cluster.id
  task_definition = aws_ecs_task_definition.cortex_task.arn
  desired_count   = 3

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }
}
```

## Monitoring and Observability

### Prometheus Configuration

```yaml
# monitoring/prometheus/config/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - '/etc/prometheus/rules/*.yml'

scrape_configs:
  - job_name: 'cortex-os'
    static_configs:
      - targets: ['cortex-os:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

### Grafana Dashboards

Key metrics to monitor:

- **System Metrics** - CPU, memory, disk usage
- **Application Metrics** - Request rate, response time, error rate
- **Business Metrics** - Active agents, completed tasks
- **Infrastructure Metrics** - Network, storage, database

### Alerting Rules

```yaml
# monitoring/prometheus/rules/cortex-alerts.yml
groups:
  - name: cortex-os
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value }} for 5 minutes'

      - alert: HighMemoryUsage
        expr: process_memory_usage / process_memory_limit > 0.9
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: 'High memory usage'
          description: 'Memory usage is {{ $value }}%'
```

## CI/CD Pipeline

### GitHub Actions

```yaml
# ci-cd/github-actions/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: |
          docker build -t cortex-os:${{ github.sha }} .
          docker tag cortex-os:${{ github.sha }} cortex-os:latest

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/cortex-os cortex-os=cortex-os:${{ github.sha }}
          kubectl rollout status deployment/cortex-os
```

### ArgoCD Configuration

```yaml
# ci-cd/argocd/application.yml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cortex-os
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/cortex-os/cortex-os
    targetRevision: HEAD
    path: ops/deployment/kubernetes/manifests
  destination:
    server: https://kubernetes.default.svc
    namespace: cortex-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Security Operations

### Security Policies

```yaml
# security/policies/network-policy.yml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cortex-os-policy
  namespace: cortex-system
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
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
```

### RBAC Configuration

```yaml
# security/rbac/service-account.yml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cortex-os
  namespace: cortex-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cortex-os-role
rules:
  - apiGroups: ['']
    resources: ['pods', 'services']
    verbs: ['get', 'list', 'watch']
```

## Backup and Recovery

### Backup Strategy

```bash
#!/bin/bash
# scripts/backup/backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="cortex"

# Create database backup
pg_dump $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Upload to cloud storage
aws s3 cp $BACKUP_DIR/db_backup_$DATE.sql.gz s3://cortex-backups/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete
```

### Disaster Recovery

```bash
#!/bin/bash
# scripts/recovery/restore-database.sh

BACKUP_FILE=$1
DB_NAME="cortex"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

# Download backup from cloud storage
aws s3 cp s3://cortex-backups/$BACKUP_FILE /tmp/

# Restore database
gunzip -c /tmp/$BACKUP_FILE | psql $DB_NAME

echo "Database restored from $BACKUP_FILE"
```

## Maintenance Operations

### System Maintenance

```bash
#!/bin/bash
# scripts/maintenance/system-maintenance.sh

# Update system packages
apt update && apt upgrade -y

# Clean Docker images
docker system prune -f

# Rotate logs
logrotate /etc/logrotate.conf

# Check disk space
df -h

# Restart services if needed
systemctl restart cortex-os
```

### Health Checks

```bash
#!/bin/bash
# scripts/maintenance/health-check.sh

# Check service status
systemctl is-active cortex-os

# Check database connectivity
pg_isready -h localhost -p 5432

# Check API health
curl -f http://localhost:3000/health

# Check memory usage
free -h

# Check CPU usage
top -bn1 | grep "Cpu(s)"
```

## Scaling Operations

### Horizontal Scaling

```bash
# Scale Kubernetes deployment
kubectl scale deployment cortex-os --replicas=5

# Scale Docker Swarm service
docker service scale cortex_cortex-os=5
```

### Vertical Scaling

```yaml
# Update resource limits
resources:
  requests:
    memory: '1Gi'
    cpu: '500m'
  limits:
    memory: '2Gi'
    cpu: '1000m'
```

### Auto-scaling

```yaml
# monitoring/kubernetes/hpa.yml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cortex-os-hpa
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
```

## Performance Optimization

### Database Optimization

```sql
-- Performance monitoring queries
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'cortex_data';

-- Index optimization
CREATE INDEX CONCURRENTLY idx_cortex_data_timestamp
ON cortex_data(created_at);

-- Connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
```

### Application Optimization

```javascript
// Performance monitoring
const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

// Memory monitoring
const memoryUsage = new prometheus.Gauge({
  name: 'process_memory_usage_bytes',
  help: 'Process memory usage in bytes',
  collect() {
    const usage = process.memoryUsage();
    this.set(usage.heapUsed);
  },
});
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**

   - Check for memory leaks
   - Analyze heap dumps
   - Optimize garbage collection

2. **Database Connection Issues**

   - Check connection pool settings
   - Verify database health
   - Check network connectivity

3. **Performance Degradation**
   - Analyze slow queries
   - Check resource utilization
   - Review application metrics

### Debugging Tools

```bash
# Application debugging
kubectl logs -f deployment/cortex-os
kubectl exec -it cortex-os-pod -- bash

# Database debugging
psql -h localhost -U cortex -d cortex
EXPLAIN ANALYZE SELECT * FROM cortex_data;

# Network debugging
kubectl port-forward svc/cortex-os 3000:3000
curl -v http://localhost:3000/health
```

## Operations Runbooks

### Incident Response

1. **Incident Detection**

   - Monitor alerts and dashboards
   - Verify issue severity
   - Assemble response team

2. **Incident Response**

   - Follow escalation procedures
   - Implement immediate fixes
   - Document actions taken

3. **Post-Incident Review**
   - Conduct root cause analysis
   - Update procedures
   - Implement preventive measures

### Deployment Procedures

1. **Pre-deployment**

   - Code review and testing
   - Backup current state
   - Prepare rollback plan

2. **Deployment**

   - Execute deployment scripts
   - Monitor system health
   - Verify functionality

3. **Post-deployment**
   - Monitor for issues
   - Update documentation
   - Communicate status

## Related Documentation

- [Infrastructure Documentation](/infra/README.md)
- [Monitoring Setup](/docs/)
- [Security Policies](/SECURITY.md)
- [Docker Configuration](/docker/README.md)
