# ML Inference Service

A production-ready machine learning inference service built with FastAPI, MLX, and comprehensive monitoring capabilities.

## Features

### 🚀 Core Capabilities

- **MLX Integration**: Optimized for Apple Silicon with MLX framework
- **Structured Outputs**: Using instructor library with Ollama API for reliable JSON responses  
- **Security**: Input validation, rate limiting, JWT authentication, output sanitization
- **Error Handling**: Circuit breakers, retry logic, graceful degradation
- **Monitoring**: Prometheus metrics, health checks, performance analytics, alerting

### 📊 Model Management

- **Model Registry**: Version control, metadata management, deployment tracking
- **A/B Testing**: Traffic splitting, performance comparison, statistical validation
- **Deployment Strategies**: Blue-green, canary, rolling, immediate deployments
- **Model Lineage**: Version history, performance metrics, dependency tracking

### 🔧 Production Features

- **Docker Support**: Multi-stage builds for dev/prod/GPU environments
- **Kubernetes Ready**: Deployment manifests, health checks, auto-scaling
- **Observability**: Prometheus metrics, Grafana dashboards, alert rules
- **High Availability**: Circuit breakers, load balancing, graceful shutdowns

## Quick Start

### Ollama (macOS) — Primary

On macOS, install and run Ollama via Homebrew (recommended):

```bash
brew install ollama
brew services start ollama   # runs ollama as a background service

# Optionally pull at least one model (examples)
ollama pull llama3.2
# or a coder model
ollama pull qwen3-coder:7b
```

Set `OLLAMA_BASE_URL` to the local server (OpenAI-compatible path for this service):

```bash
export OLLAMA_BASE_URL=http://localhost:11434/v1
```

### Docker — Fallback

If you prefer containers or are not on macOS, use the official Docker image:

```bash
docker run -d --name ollama \
  -p 11434:11434 \
  -v ollama_data:/root/.ollama \
  ollama/ollama:0.12.0
```

The included `docker-compose.yml` also provisions `ollama` (now pinned to `0.12.0`).

### Development Setup

```bash
# Clone and navigate to service
cd services/ml-inference

# Install dependencies
uv sync

# Start development environment
./deploy.sh dev up
```

### Production Deployment

```bash
# Docker deployment
./deploy.sh prod deploy

# GPU-enabled deployment (Apple Silicon)
./deploy.sh prod gpu

# Kubernetes deployment
./deploy.sh k8s apply
```

## API Endpoints

### Core Inference

- `POST /generate` - Generate text with MLX engine
- `POST /generate/structured` - Generate structured outputs via instructor

### Health & Monitoring

- `GET /health` - Service health status
- `GET /ready` - Readiness check
- `GET /metrics` - Prometheus metrics
- `GET /performance/report` - Detailed performance analytics
- `GET /alerts/active` - Active alerts and warnings

### Model Management

- `POST /models/register` - Register new model version
- `POST /models/{model_id}/activate` - Activate model version
- `GET /models/{model_name}` - List model versions
- `POST /models/{model_id}/deploy` - Deploy with strategy

### A/B Testing

- `POST /ab-tests/start` - Start A/B test
- `GET /ab-tests` - List active tests
- `POST /ab-tests/{test_id}/stop` - Stop test

### Circuit Breaker

- `GET /circuit-breaker/status` - Get circuit breaker state
- `POST /circuit-breaker/reset` - Reset circuit breaker

## Configuration

### Environment Variables

```bash
# Core settings
MODEL_NAME=cortex-default
MODEL_PATH=/models/default
OLLAMA_BASE_URL=http://localhost:11434/v1
JWT_SECRET_KEY=your-secret-key
LOG_LEVEL=INFO

# Monitoring
PROMETHEUS_PORT=8001
ENVIRONMENT=production

# MLX specific
MLX_ENABLED=true
```

### Model Registry

```python
# Register a new model
curl -X POST http://localhost:8000/models/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "model_path": "/path/to/model",
    "name": "my-model",
    "version": "1.0.0",
    "description": "Production model v1",
    "model_type": "llm",
    "framework": "mlx",
    "tags": ["production", "optimized"],
    "performance_metrics": {
      "accuracy": 0.95,
      "latency_ms": 150
    }
  }'

# Start A/B test
curl -X POST http://localhost:8000/ab-tests/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "test_id": "model-comparison-1",
    "model_a": "my-model:1.0.0",
    "model_b": "my-model:1.1.0",
    "traffic_split": 0.2,
    "duration_hours": 24,
    "success_metrics": ["accuracy", "response_time"]
  }'
```

## Monitoring & Observability

### Prometheus Metrics

- `ml_inference_requests_total` - Total requests
- `ml_inference_request_duration_seconds` - Request latency
- `ml_inference_errors_total` - Error counts
- `ml_inference_circuit_breaker_state` - Circuit breaker status
- `ml_inference_memory_usage_percent` - Memory utilization
- `ml_inference_health_score` - Overall health score

### Grafana Dashboards

The service includes pre-configured Grafana dashboards for:

- Request metrics and latency percentiles
- Error rates and circuit breaker status  
- Resource utilization (CPU, memory, GPU)
- Model performance and A/B test results

### Alerting Rules

Automatic alerts for:

- High error rates (>10% over 2 minutes)
- Circuit breaker open
- High response times (>10s 95th percentile)
- Memory usage >85%
- Service downtime
- Low health scores (<70%)

## Architecture

### Service Components

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   FastAPI App   │────│ MLX Engine   │────│ Model Registry  │
└─────────────────┘    └──────────────┘    └─────────────────┘
         │                       │                    │
         ▼                       ▼                    ▼
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Monitoring    │    │ Error Handler│    │ Security Layer  │
│   Service       │    │ & Circuit    │    │ & Rate Limiter  │
└─────────────────┘    │ Breaker      │    └─────────────────┘
                       └──────────────┘
```

### Data Flow

1. **Request**: Authenticated via JWT, rate limited
2. **Validation**: Input sanitized and validated
3. **Inference**: Routed through MLX or instructor+Ollama
4. **Output**: Sanitized and optionally structured
5. **Monitoring**: Metrics recorded, health updated

## Development

### Running Tests

```bash
# Unit tests
pytest tests/

# Integration tests  
pytest tests/integration/

# Load testing
k6 run tests/load/inference_test.js
```

### Code Quality

```bash
# Format code
ruff format src/

# Lint code
ruff check src/

# Type check
mypy src/
```

## Deployment Strategies

### Local Development

- Uses docker-compose with hot reloading
- Includes Ollama, Prometheus, and Grafana
- Volume mounts for live code updates

### Production

- Multi-stage Docker builds
- Kubernetes with auto-scaling
- Circuit breakers and health checks
- Persistent model storage

### GPU Environments

- Optimized for Apple Silicon/MLX
- Single-worker deployment for GPU efficiency
- Memory-optimized configurations

## Security

### Authentication

- JWT token-based authentication
- Configurable secret key rotation
- Request-level user identification

### Input Validation

- Prompt injection detection
- Content filtering and sanitization
- Size and rate limits

### Output Security

- Response sanitization
- Structured output validation
- Error message scrubbing

## Troubleshooting

### Common Issues

**Circuit Breaker Open**

```bash
# Check circuit breaker status
curl http://localhost:8000/circuit-breaker/status

# Reset if needed
curl -X POST http://localhost:8000/circuit-breaker/reset
```

**High Memory Usage**

```bash
# Check memory metrics
curl http://localhost:8000/performance/report

# Monitor resource usage
docker stats ml-inference
```

**Model Loading Errors**

```bash
# Check model registry
curl http://localhost:8000/models

# Verify active models
curl http://localhost:8000/health
```

### Log Analysis

```bash
# Service logs
docker-compose logs -f ml-inference-prod

# Kubernetes logs
kubectl logs -n cortex-os -l app=ml-inference -f
```

## Performance Tuning

### MLX Optimization

- Use single worker for GPU workloads
- Optimize batch sizes for memory
- Enable model quantization if supported

### FastAPI Tuning

- Adjust worker count for CPU workloads
- Configure connection pools
- Enable response compression

### Memory Management

- Monitor model memory usage
- Configure garbage collection
- Use model unloading for large models

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure code passes linting and tests
5. Submit a pull request

## License

See the main repository license for details.
