---
title: PRODUCTION_RUNBOOK
sidebar_label: PRODUCTION_RUNBOOK
---

# nO Master Agent Loop - Production Operations Runbook
*brAInwav Production Operations Guide*

## Table of Contents
1. [System Overview](#system-overview)
2. [Deployment Procedures](#deployment-procedures)
3. [Monitoring and Alerting](#monitoring-and-alerting)
4. [Troubleshooting Guide](#troubleshooting-guide)
5. [Performance Optimization](#performance-optimization)
6. [Security Operations](#security-operations)
7. [Disaster Recovery](#disaster-recovery)
8. [Maintenance Procedures](#maintenance-procedures)
9. [Emergency Procedures](#emergency-procedures)
10. [Appendices](#appendices)

---

## System Overview

### Architecture
The nO (Number Zero) Master Agent Loop is brAInwav's flagship AI orchestration system designed for production-scale autonomous agent management. The system consists of:

- **Master Controller**: Core orchestration engine
- **Agent Pool**: Dynamic worker agent instances
- **Performance Monitor**: Real-time metrics and optimization
- **Security Layer**: OAuth 2.0/OIDC + RBAC authentication
- **Operational Interface**: Health checks and admin endpoints

### Key Components
- **Service Name**: nO Master Agent Loop
- **Company**: brAInwav
- **Version**: 1.0.0
- **Default Port**: 3000
- **Default Environment**: Production

---

## Deployment Procedures

### Prerequisites
```bash
# Required software
- Node.js 18+
- Docker & Docker Compose
- Redis 6+
- PostgreSQL 13+ (or configured database)
- kubectl (for Kubernetes deployments)
```

### Standard Deployment

#### 1. Environment Setup
```bash
# Clone repository
git clone &lt;repository-url&gt;
cd nO-master-agent-loop

# Install dependencies
npm install

# Set environment variables
export NO_SERVICE_PORT=3000
export NO_SERVICE_HOST=0.0.0.0
export NODE_ENV=production
export NO_OAUTH_CLIENT_ID=&lt;client-id&gt;
export NO_OAUTH_CLIENT_SECRET=&lt;client-secret&gt;
```

#### 2. Configuration
```bash
# Copy and edit configuration
cp config/operational.example.json config/operational.json
# Edit config/operational.json with production settings
```

#### 3. Database Setup
```bash
# Run database migrations
npm run db:migrate

# Verify database connection
npm run db:health-check
```

#### 4. Start Services
```bash
# Start with Docker Compose
docker-compose up -d

# Or start directly
npm run start:production
```

#### 5. Verification
```bash
# Check health endpoints
curl http://localhost:3000/health
curl http://localhost:3000/health/ready
curl http://localhost:3000/metrics
```

### Kubernetes Deployment

#### 1. Apply Manifests
```bash
# Apply all Kubernetes manifests
kubectl apply -f k8s/

# Verify deployment
kubectl get pods -l app=no-master-agent-loop
kubectl get services
```

#### 2. Configure Ingress
```bash
# Apply ingress configuration
kubectl apply -f k8s/ingress.yaml

# Verify ingress
kubectl get ingress
```

### Rolling Updates
```bash
# Update image version
kubectl set image deployment/no-master-agent-loop \
  app=brainwav/no-master-agent-loop:v1.1.0

# Monitor rollout
kubectl rollout status deployment/no-master-agent-loop

# Rollback if needed
kubectl rollout undo deployment/no-master-agent-loop
```

---

## Monitoring and Alerting

### Health Check Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|------------------|
| `/health` | Overall system health | 200 (healthy), 503 (unhealthy) |
| `/health/live` | Liveness probe | 200 (alive) |
| `/health/ready` | Readiness probe | 200 (ready), 503 (not ready) |
| `/health/detailed` | Detailed health info | Full health status |
| `/metrics` | Prometheus metrics | Metrics in Prometheus format |

### Key Metrics to Monitor

#### System Metrics
- **CPU Usage**: Target <70%, Alert >85%
- **Memory Usage**: Target <80%, Alert >95%
- **Disk Usage**: Target <80%, Alert >90%
- **Network I/O**: Monitor for anomalies

#### Application Metrics
```prometheus
# Request metrics
no_http_requests_total
no_http_request_duration_seconds
no_http_requests_in_flight

# Agent pool metrics
no_agent_pool_size
no_agent_pool_active
no_agent_pool_idle
no_agent_pool_failed

# Performance metrics
no_loop_iteration_duration_seconds
no_task_queue_depth
no_cache_hit_ratio
```

#### Business Metrics
```prometheus
# brAInwav specific metrics
no_agent_performance_score
no_loop_efficiency_ratio
no_customer_satisfaction_index
```

### Grafana Dashboards

#### Main Dashboard Panels
1. **System Overview**
   - Service status
   - Request rate
   - Response time
   - Error rate

2. **Agent Pool Status**
   - Active agents
   - Agent health
   - Task distribution
   - Performance trends

3. **Performance Metrics**
   - CPU/Memory usage
   - Cache performance
   - Database connections
   - Queue depths

4. **Error Analysis**
   - Error rates by endpoint
   - Failed agent tasks
   - Security violations
   - System failures

### Alert Configuration

#### Critical Alerts
```yaml
# High error rate
- alert: HighErrorRate
  expr: rate(no_http_requests_total{status=~"5.."}[5m]) > 0.1
  for: 2m
  annotations:
    summary: "High error rate detected"

# Service down
- alert: ServiceDown
  expr: up{job="no-master-agent-loop"} == 0
  for: 1m
  annotations:
    summary: "nO Master Agent Loop service is down"

# Agent pool unhealthy
- alert: AgentPoolUnhealthy
  expr: no_agent_pool_healthy_ratio < 0.5
  for: 5m
  annotations:
    summary: "Agent pool health below 50%"
```

#### Warning Alerts
```yaml
# High response time
- alert: HighResponseTime
  expr: histogram_quantile(0.95, no_http_request_duration_seconds) > 2
  for: 5m
  annotations:
    summary: "95th percentile response time above 2s"

# Memory usage high
- alert: HighMemoryUsage
  expr: no_memory_usage_ratio > 0.85
  for: 10m
  annotations:
    summary: "Memory usage above 85%"
```

---

## Troubleshooting Guide

### Common Issues

#### 1. Service Won't Start
**Symptoms**: Process exits immediately, port binding errors
**Diagnosis**:
```bash
# Check logs
docker logs no-master-agent-loop
kubectl logs deployment/no-master-agent-loop

# Check port usage
netstat -tlnp | grep 3000

# Verify configuration
npm run config:validate
```

**Solutions**:
- Verify port availability
- Check configuration syntax
- Validate environment variables
- Review database connectivity

#### 2. High Memory Usage
**Symptoms**: Memory usage >90%, OOM kills
**Diagnosis**:
```bash
# Check memory metrics
curl http://localhost:3000/health/detailed

# Monitor process memory
ps aux | grep node
top -p $(pgrep -f "node")

# Check for memory leaks
node --inspect app.js
```

**Solutions**:
- Restart service if memory leak suspected
- Review cache configuration
- Check for infinite loops in agent tasks
- Scale horizontally if traffic increased

#### 3. Database Connection Issues
**Symptoms**: Health checks failing, timeout errors
**Diagnosis**:
```bash
# Test database connectivity
npm run db:test-connection

# Check connection pool
curl http://localhost:3000/admin/status

# Review database logs
docker logs postgres
```

**Solutions**:
- Verify database credentials
- Check network connectivity
- Review connection pool settings
- Restart database if necessary

#### 4. Agent Pool Degradation
**Symptoms**: Tasks taking longer, agent failures
**Diagnosis**:
```bash
# Check agent pool status
curl http://localhost:3000/admin/health/checks

# Review agent logs
kubectl logs -l component=agent-worker

# Check resource constraints
kubectl top pods
```

**Solutions**:
- Scale agent pool up
- Review agent configuration
- Check resource limits
- Restart degraded agents

#### 5. Authentication Failures
**Symptoms**: 401/403 errors, OAuth failures
**Diagnosis**:
```bash
# Check OAuth configuration
curl http://localhost:3000/admin/status

# Review authentication logs
grep "auth" /var/log/no-master-agent-loop.log

# Test OAuth flow
curl -X POST http://localhost:3000/auth/login
```

**Solutions**:
- Verify OAuth client credentials
- Check redirect URI configuration
- Review RBAC role assignments
- Clear authentication cache

### Log Analysis

#### Important Log Patterns
```bash
# Authentication issues
grep -E "(auth|oauth|rbac)" /var/log/app.log

# Performance issues
grep -E "(timeout|slow|performance)" /var/log/app.log

# Error patterns
grep -E "(error|exception|failed)" /var/log/app.log

# Agent issues
grep -E "(agent|pool|worker)" /var/log/app.log
```

#### Log Levels
- **ERROR**: Critical issues requiring immediate attention
- **WARN**: Potential issues that should be monitored
- **INFO**: Normal operational information
- **DEBUG**: Detailed diagnostic information

---

## Performance Optimization

### Performance Monitoring

#### Key Performance Indicators
1. **Response Time**: <500ms (95th percentile)
2. **Throughput**: >1000 requests/second
3. **Agent Utilization**: 70-80%
4. **Cache Hit Ratio**: >80%
5. **Error Rate**: <1%

#### Performance Tuning

##### 1. Autoscaling Configuration
```javascript
// Optimal autoscaling settings
{
  "performance": {
    "autoscaling": {
      "enabled": true,
      "minAgents": 5,
      "maxAgents": 50,
      "targetCpu": 70,
      "targetMemory": 80,
      "scaleUpCooldown": 180000,   // 3 minutes
      "scaleDownCooldown": 600000  // 10 minutes
    }
  }
}
```

##### 2. Cache Optimization
```javascript
// Cache configuration
{
  "performance": {
    "caching": {
      "enabled": true,
      "defaultTtl": 300000,  // 5 minutes
      "maxSize": 10000,      // 10k entries
      "layers": ["memory", "redis"]
    }
  }
}
```

##### 3. Connection Pool Tuning
```javascript
// Connection pool settings
{
  "performance": {
    "connectionPool": {
      "enabled": true,
      "minConnections": 10,
      "maxConnections": 100,
      "acquireTimeout": 30000,
      "idleTimeout": 300000
    }
  }
}
```

### Load Testing

#### Setup Load Tests
```bash
# Install k6
npm install -g k6

# Run load test
k6 run tests/load/basic-load-test.js

# Run stress test
k6 run tests/load/stress-test.js
```

#### Performance Benchmarks
```javascript
// Target performance metrics
const benchmarks = {
  responseTime: {
    p50: 100,    // 50th percentile < 100ms
    p90: 300,    // 90th percentile < 300ms
    p95: 500,    // 95th percentile < 500ms
    p99: 1000    // 99th percentile < 1s
  },
  throughput: {
    rps: 1000,   // > 1000 requests/second
    concurrent: 500  // Handle 500 concurrent users
  },
  availability: {
    uptime: 99.9,    // 99.9% uptime
    errorRate: 0.1   // < 0.1% error rate
  }
};
```

---

## Security Operations

### Security Monitoring

#### Security Metrics
```prometheus
# Authentication metrics
no_auth_attempts_total
no_auth_failures_total
no_auth_token_validations_total

# Authorization metrics
no_rbac_decisions_total
no_rbac_denials_total

# Security events
no_security_violations_total
no_suspicious_activity_total
```

#### Security Alerts
```yaml
# Failed authentication attempts
- alert: HighAuthFailures
  expr: rate(no_auth_failures_total[5m]) > 0.1
  for: 2m
  annotations:
    summary: "High authentication failure rate"

# RBAC violations
- alert: RBACViolations
  expr: rate(no_rbac_denials_total[5m]) > 0.05
  for: 1m
  annotations:
    summary: "Unusual RBAC denial rate"
```

### Security Procedures

#### 1. Certificate Rotation
```bash
# Generate new certificates
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365

# Update Kubernetes secrets
kubectl create secret tls no-tls-secret --cert=cert.pem --key=key.pem

# Restart services
kubectl rollout restart deployment/no-master-agent-loop
```

#### 2. OAuth Token Refresh
```bash
# Rotate OAuth client secret
# 1. Generate new secret in OAuth provider
# 2. Update environment variables
export NO_OAUTH_CLIENT_SECRET=&lt;new-secret&gt;

# 3. Restart service
kubectl set env deployment/no-master-agent-loop \
  NO_OAUTH_CLIENT_SECRET=&lt;new-secret&gt;
```

#### 3. Security Audit
```bash
# Run security scan
npm audit
npm run security:scan

# Check for vulnerabilities
docker scan brainwav/no-master-agent-loop:latest

# Review access logs
kubectl logs -l app=no-master-agent-loop | grep -E "(auth|security)"
```

---

## Disaster Recovery

### Backup Procedures

#### 1. Database Backup
```bash
# Daily database backup
pg_dump -h localhost -U no_user no_database > backup_$(date +%Y%m%d).sql

# Verify backup
pg_restore --list backup_$(date +%Y%m%d).sql
```

#### 2. Configuration Backup
```bash
# Backup configuration
kubectl get configmap no-config -o yaml &gt; no-config-backup.yaml
kubectl get secret no-secrets -o yaml &gt; no-secrets-backup.yaml
```

#### 3. Redis Backup
```bash
# Create Redis snapshot
redis-cli BGSAVE

# Copy snapshot
cp /var/lib/redis/dump.rdb /backup/redis-$(date +%Y%m%d).rdb
```

### Recovery Procedures

#### 1. Service Recovery
```bash
# Full service restoration
kubectl apply -f k8s/
kubectl apply -f no-config-backup.yaml
kubectl apply -f no-secrets-backup.yaml

# Verify restoration
kubectl get pods
curl http://localhost:3000/health
```

#### 2. Database Recovery
```bash
# Restore database
createdb no_database_restored
pg_restore -d no_database_restored backup_latest.sql

# Update configuration to point to restored database
kubectl patch configmap no-config -p '{"data":{"database.host":"restored-db"}}'
```

#### 3. Cache Recovery
```bash
# Restore Redis data
redis-cli FLUSHALL
redis-cli --rdb /backup/redis-latest.rdb

# Restart Redis
kubectl restart deployment/redis
```

### RTO/RPO Targets
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 1 hour
- **Maximum Tolerable Downtime**: 8 hours

---

## Maintenance Procedures

### Scheduled Maintenance

#### Weekly Tasks
- [ ] Review performance metrics
- [ ] Check error logs
- [ ] Verify backup integrity
- [ ] Update security patches
- [ ] Clear old logs (>30 days)

#### Monthly Tasks
- [ ] Security audit
- [ ] Performance review
- [ ] Capacity planning
- [ ] Certificate expiry check
- [ ] Dependency updates

#### Quarterly Tasks
- [ ] Disaster recovery test
- [ ] Load testing
- [ ] Security penetration test
- [ ] Architecture review
- [ ] Documentation updates

### Maintenance Windows

#### Standard Maintenance Window
- **Time**: Sunday 02:00-06:00 UTC
- **Duration**: 4 hours maximum
- **Frequency**: Monthly
- **Notification**: 48 hours advance notice

#### Emergency Maintenance
- **Time**: As needed
- **Duration**: 2 hours maximum
- **Notification**: 2 hours advance notice (if possible)

### Update Procedures

#### 1. Application Updates
```bash
# Staging deployment
kubectl apply -f k8s/ --namespace=staging

# Smoke tests
npm run test:smoke -- --env=staging

# Production deployment
kubectl apply -f k8s/ --namespace=production

# Post-deployment verification
npm run test:production-health
```

#### 2. Dependency Updates
```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Run full test suite
npm test

# Security audit
npm audit --audit-level=moderate
```

---

## Emergency Procedures

### Incident Response

#### Severity Levels

##### Severity 1 (Critical)
- Service completely down
- Data corruption or loss
- Security breach
- **Response Time**: 15 minutes
- **Escalation**: Immediate

##### Severity 2 (High)
- Significant performance degradation
- Partial service outage
- Authentication failures
- **Response Time**: 30 minutes
- **Escalation**: 1 hour

##### Severity 3 (Medium)
- Minor performance issues
- Non-critical feature failures
- Warning alerts
- **Response Time**: 2 hours
- **Escalation**: 4 hours

#### Emergency Contacts
```
On-Call Engineer: +1-XXX-XXX-XXXX
Engineering Manager: engineering@brainwav.com
Security Team: security@brainwav.com
DevOps Team: devops@brainwav.com
```

### Rollback Procedures

#### 1. Application Rollback
```bash
# Quick rollback to previous version
kubectl rollout undo deployment/no-master-agent-loop

# Verify rollback
kubectl rollout status deployment/no-master-agent-loop
curl http://localhost:3000/health
```

#### 2. Database Rollback
```bash
# Restore from backup
pg_restore -d no_database backup_pre_deployment.sql

# Update application configuration
kubectl patch configmap no-config -p '{"data":{"version":"previous"}}'
```

#### 3. Configuration Rollback
```bash
# Restore previous configuration
kubectl apply -f config-backup-pre-deployment.yaml

# Restart services
kubectl rollout restart deployment/no-master-agent-loop
```

### Communication Templates

#### Incident Notification
```
Subject: [INCIDENT] nO Master Agent Loop - Severity X

Service: nO Master Agent Loop
Severity: X
Impact: [Description of impact]
Status: [Investigating/Identified/Monitoring/Resolved]

Details:
[Incident description]

Next Update: [Time]
Incident Commander: [Name]
```

#### Resolution Notification
```
Subject: [RESOLVED] nO Master Agent Loop Incident

The incident affecting nO Master Agent Loop has been resolved.

Root Cause: [Brief description]
Resolution: [What was done to fix]
Duration: [Total downtime]

Post-mortem will be conducted within 48 hours.
```

---

## Appendices

### Appendix A: Configuration Reference

#### Environment Variables
```bash
# Service configuration
NO_SERVICE_PORT=3000
NO_SERVICE_HOST=0.0.0.0
NODE_ENV=production

# Database configuration
NO_DB_HOST=localhost
NO_DB_PORT=5432
NO_DB_NAME=no_database
NO_DB_USER=no_user
NO_DB_PASSWORD=secret

# Redis configuration
NO_REDIS_HOST=localhost
NO_REDIS_PORT=6379
NO_REDIS_PASSWORD=secret

# OAuth configuration
NO_OAUTH_CLIENT_ID=client_id
NO_OAUTH_CLIENT_SECRET=client_secret
NO_OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback

# Monitoring configuration
NO_PROMETHEUS_ENABLED=true
NO_GRAFANA_ENABLED=true

# Security configuration
NO_RBAC_ENABLED=true
NO_RATE_LIMIT_ENABLED=true
```

### Appendix B: API Reference

#### Health Check APIs
- `GET /health` - Basic health status
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe
- `GET /health/detailed` - Detailed health information

#### Metrics APIs
- `GET /metrics` - Prometheus metrics
- `GET /admin/health/checks` - All health check results
- `POST /admin/health/check/:name` - Run specific health check

#### Admin APIs
- `GET /admin/status` - System status
- `POST /admin/shutdown` - Graceful shutdown
- `GET /admin/shutdown/handlers` - Shutdown handlers

### Appendix C: Kubernetes Manifests

See `k8s/` directory for complete Kubernetes deployment manifests.

### Appendix D: Docker Configuration

See `docker-compose.yml` and `Dockerfile` for container configurations.

---

*This runbook is maintained by the brAInwav DevOps team. For updates or questions, contact devops@brainwav.com*

**Document Version**: 1.0
**Last Updated**: $(date)
**Next Review**: $(date -d "+3 months")
