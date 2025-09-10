# Cortex WebUI - Production Deployment Guide

## Overview

This guide covers production deployment of Cortex WebUI with comprehensive security, monitoring, and operational readiness features.

## Quick Start

### 1. Environment Configuration

```bash
# Copy environment templates
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Generate secure JWT secret
openssl rand -hex 32

# Edit .env files with your configuration
```

### 2. Docker Deployment (OrbStack/Docker)

```bash
# Build and start services
docker-compose up --build -d

# Check service health
docker-compose ps
curl http://localhost:3001/health
```

### 3. Kubernetes Deployment

```bash
# Apply manifests in order
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/persistent-volumes.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/horizontal-pod-autoscaler.yaml

# Check deployment status
kubectl get pods -n cortex-webui
```

## Security Configuration

### Environment Variables

**Critical Security Settings:**
- `JWT_SECRET`: Must be at least 32 characters (use `openssl rand -hex 32`)
- `BCRYPT_ROUNDS`: Recommended value is 12-15
- `NODE_ENV`: Set to `production` for production deployments

### Rate Limiting

The application includes comprehensive rate limiting:
- **General API**: 100 requests per 15 minutes
- **Auth endpoints**: 5 attempts per 15 minutes
- **Chat endpoints**: 30 messages per minute
- **File uploads**: 20 uploads per hour

### Security Headers

Helmet.js is configured with:
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Referrer Policy
- And other security headers

## Health Monitoring

### Health Check Endpoints

| Endpoint | Purpose | Usage |
|----------|---------|-------|
| `/health` | Load balancer health check | Returns 200/503 based on system status |
| `/health/detailed` | Detailed system diagnostics | Monitoring dashboards |
| `/ready` | Kubernetes readiness probe | Pod readiness validation |
| `/live` | Kubernetes liveness probe | Pod restart decisions |

### Health Check Components

- **Database**: Connection and query performance
- **File System**: Directory access and write permissions
- **Memory**: Heap utilization monitoring
- **Environment**: Required configuration validation

## Monitoring and Observability

### Structured Logging

Logs are structured using Winston with:
- JSON format for production
- Correlation IDs for request tracing
- Log levels: error, warn, info, http, debug
- Automatic log rotation (configurable)

### Log Categories

- **Authentication**: User login/logout events
- **Chat**: Message handling and AI interactions
- **API**: Request/response logging with timing
- **Security**: Rate limiting and security events
- **Performance**: Slow operations and bottlenecks

### Metrics Collection

Ready for integration with:
- Prometheus (via custom metrics endpoints)
- Grafana dashboards
- Application Performance Monitoring (APM)

## Production Checklist

### Before Deployment

- [ ] Generate secure JWT secret (32+ characters)
- [ ] Configure all required environment variables
- [ ] Set up persistent storage for database and uploads
- [ ] Configure proper DNS and SSL certificates
- [ ] Review and adjust rate limiting settings
- [ ] Set up log aggregation (ELK, Fluentd, etc.)
- [ ] Configure monitoring alerts
- [ ] Test backup and recovery procedures

### Security Hardening

- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure firewall rules
- [ ] Set up intrusion detection
- [ ] Regular security updates
- [ ] Audit logs review
- [ ] Penetration testing
- [ ] OWASP compliance validation

### Performance Optimization

- [ ] Configure CDN for static assets
- [ ] Set up database connection pooling
- [ ] Enable compression (gzip/brotli)
- [ ] Configure caching strategies
- [ ] Load testing and capacity planning
- [ ] Database indexing optimization

## Scaling Configuration

### Horizontal Pod Autoscaler (HPA)

**Backend Scaling:**
- Min replicas: 2
- Max replicas: 10
- CPU threshold: 70%
- Memory threshold: 80%

**Frontend Scaling:**
- Min replicas: 3
- Max replicas: 15
- CPU threshold: 60%
- Memory threshold: 70%

### Resource Requests/Limits

**Backend:**
- Requests: 250m CPU, 256Mi memory
- Limits: 500m CPU, 512Mi memory

**Frontend:**
- Requests: 100m CPU, 128Mi memory
- Limits: 200m CPU, 256Mi memory

## Backup and Recovery

### Database Backup

```bash
# Backup SQLite database
cp /app/data/cortex.db /backup/cortex-$(date +%Y%m%d_%H%M%S).db
```

### File Uploads Backup

```bash
# Sync uploads directory
rsync -av /app/uploads/ /backup/uploads/
```

### Kubernetes Backup

```bash
# Backup PVC data
kubectl create job backup-data --from=cronjob/backup-cortex-data
```

## Troubleshooting

### Common Issues

1. **503 Service Unavailable**
   - Check health endpoints: `/health`, `/ready`
   - Verify database connectivity
   - Check log files for errors

2. **Rate Limiting Issues**
   - Review rate limit settings in environment variables
   - Check client IP detection (proxy configuration)
   - Monitor rate limit headers in responses

3. **Memory Issues**
   - Monitor `/health/detailed` for memory usage
   - Check for memory leaks in logs
   - Adjust Node.js memory limits

4. **Database Performance**
   - Check slow query logs
   - Monitor database response times in health checks
   - Consider database optimization

### Diagnostic Commands

```bash
# Check service status
docker-compose ps
kubectl get pods -n cortex-webui -o wide

# View logs
docker-compose logs backend
kubectl logs -n cortex-webui deployment/cortex-webui-backend

# Health check validation
curl -v http://localhost:3001/health/detailed
curl -v http://localhost:3001/ready
```

## Support and Maintenance

### Regular Maintenance Tasks

- [ ] Weekly security updates
- [ ] Monthly dependency updates  
- [ ] Quarterly penetration testing
- [ ] Log rotation and cleanup
- [ ] Database vacuum/optimization
- [ ] Certificate renewal (if not automated)

### Alerting Setup

Configure alerts for:
- Service downtime (health check failures)
- High error rates (4xx/5xx responses)
- Resource utilization (CPU/memory thresholds)
- Rate limiting violations
- Security events

### Contact Information

For operational issues:
- **Primary**: DevOps Team
- **Secondary**: Backend Development Team
- **Security Issues**: Security Team

---

*This deployment guide ensures production-ready operation with comprehensive security, monitoring, and operational excellence.*
