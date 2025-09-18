# Production Deployment Guide

This guide provides instructions for deploying the Cortex Agent package in a production environment.

## Prerequisites

- Node.js 20.0.0 or higher
- pnpm package manager
- Docker and Docker Compose (for containerized deployment)
- Kubernetes cluster (for K8s deployment)

## Environment Variables

### Required

```bash
# Server Configuration
PORT=4310
NODE_ENV=production

# Authentication
API_KEY=your-secure-api-key-here
JWT_SECRET=your-jwt-secret-here

# Model Providers
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key

# Optional: Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434

# Optional: Enable MLX (macOS only)
ENABLE_MLX=true
```

### Optional (for monitoring)

```bash
# Observability
ENABLE_METRICS=true
METRICS_PORT=9090

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Deployment Options

### 1. Docker Deployment

#### Build the Image

```bash
docker build -t cortex-agent:latest .
```

#### Run with Docker

```bash
docker run -d \
  --name cortex-agent \
  -p 4310:4310 \
  -e NODE_ENV=production \
  -e API_KEY=your-api-key \
  -e OPENAI_API_KEY=your-openai-key \
  -v $(pwd)/logs:/app/logs \
  cortex-agent:latest
```

#### Docker Compose

```yaml
version: '3.8'

services:
  cortex-agent:
    image: cortex-agent:latest
    ports:
      - "4310:4310"
    environment:
      - NODE_ENV=production
      - API_KEY=${API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OLLAMA_BASE_URL=http://ollama:11434
    depends_on:
      - ollama
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4310/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  ollama_data:
  grafana_data:
```

### 2. Kubernetes Deployment

#### Namespace and ConfigMap

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cortex-agent
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: cortex-agent-config
  namespace: cortex-agent
data:
  NODE_ENV: "production"
  PORT: "4310"
  ENABLE_METRICS: "true"
```

#### Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cortex-agent-secrets
  namespace: cortex-agent
type: Opaque
stringData:
  API_KEY: "your-api-key"
  OPENAI_API_KEY: "your-openai-key"
  ANTHROPIC_API_KEY: "your-anthropic-key"
```

#### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cortex-agent
  namespace: cortex-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cortex-agent
  template:
    metadata:
      labels:
        app: cortex-agent
    spec:
      containers:
      - name: cortex-agent
        image: cortex-agent:latest
        ports:
        - containerPort: 4310
        envFrom:
        - configMapRef:
            name: cortex-agent-config
        - secretRef:
            name: cortex-agent-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4310
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 4310
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cortex-agent-service
  namespace: cortex-agent
spec:
  selector:
    app: cortex-agent
  ports:
  - protocol: TCP
    port: 80
    targetPort: 4310
  type: LoadBalancer
```

### 3. PM2 Deployment

#### Install PM2

```bash
npm install -g pm2
```

#### Create ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'cortex-agent',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4310
    },
    env_production: {
      NODE_ENV: 'production',
      API_KEY: process.env.API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY
    }
  }]
};
```

#### Start with PM2

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## Security Considerations

### 1. Network Security

- Use HTTPS in production
- Implement firewall rules to restrict access
- Use VPN or private networks for internal communication

### 2. API Security

- Always use API keys for authentication
- Implement rate limiting (already included)
- Use input validation and sanitization
- Regularly rotate API keys and secrets

### 3. Data Protection

- Encrypt sensitive data at rest
- Use TLS for data in transit
- Implement proper logging without sensitive data

### 4. Monitoring and Alerting

- Set up alerts for:
  - High error rates
  - Unusual traffic patterns
  - Service downtime
  - Resource exhaustion

## Monitoring

### Health Checks

- `/health` - Basic health endpoint
- `/metrics` - Detailed metrics (requires authentication)

### Key Metrics to Monitor

- Request rate and response times
- Error rates by type
- Memory and CPU usage
- Model provider availability
- Active connections

### Logging

The service uses structured JSON logging in production. Configure log aggregation with:

- ELK Stack (Elasticsearch, Logstash, Kibana)
- Grafana Loki
- Datadog or similar services

## Scaling

### Horizontal Scaling

- Use Kubernetes HPA (Horizontal Pod Autoscaler)
- Configure load balancers for multiple instances
- Consider read replicas for database-dependent features

### Vertical Scaling

- Monitor resource usage
- Adjust CPU/memory limits based on load
- Consider GPU instances for MLX workloads

## Backup and Recovery

### Configuration Backups

- Version control all configuration
- Backup environment variables securely
- Document all custom configurations

### Disaster Recovery

- Implement multi-region deployment
- Regular backup of important data
- Test recovery procedures regularly

## Troubleshooting

### Common Issues

1. **Service won't start**
   - Check environment variables
   - Verify port availability
   - Review logs for errors

2. **High memory usage**
   - Monitor request patterns
   - Adjust instance size
   - Implement request timeouts

3. **Model provider errors**
   - Verify API keys
   - Check provider status
   - Monitor rate limits

### Debug Commands

```bash
# View logs
docker logs cortex-agent
pm2 logs cortex-agent

# Check health
curl http://localhost:4310/health

# Get metrics
curl -H "x-api-key: your-key" http://localhost:4310/metrics
```

## Support

For production issues:

1. Check this documentation
2. Review logs and metrics
3. Consult the Cortex-OS main documentation
4. Contact the support team with:
   - Environment details
   - Error logs
   - Steps to reproduce
