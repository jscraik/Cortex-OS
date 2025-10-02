---
title: Runbook
sidebar_label: Runbook
---

# RAG Service Operational Runbook

This runbook provides step-by-step troubleshooting procedures for common RAG service issues.

## Table of Contents

- [Health Check Failures](#health-check-failures)
- [High Memory Usage](#high-memory-usage)
- [Component Failures](#component-failures)
- [Performance Issues](#performance-issues)
- [Emergency Procedures](#emergency-procedures)

## Health Check Failures

### Symptom: `/health` endpoint returns 503 or timeouts

#### Immediate Actions (0-5 minutes)

1. **Check service status**:

   ```bash
   curl -f http://localhost:8080/health || echo "Health check failed"
   curl -f http://localhost:8080/live || echo "Liveness failed"
   ```

2. **Check logs for errors**:

   ```bash
   kubectl logs -f deployment/rag-service --tail=100
   # or for docker:
   docker logs rag-service --tail=100
   ```

3. **Identify failing components**:

   ```bash
   curl -s http://localhost:8080/health | jq '.checks'
   ```

#### Root Cause Analysis (5-15 minutes)

- **If embedder failing**: Check model loading and GPU/CPU resources
- **If store failing**: Check pgvector/database connectivity
- **If reranker failing**: Check Python process and model availability
- **If memory high**: Check for memory leaks or batch size issues

#### Resolution Steps

1. **For model loading issues**:

   ```bash
   # Check available disk space for models
   df -h /path/to/models
   # Restart with smaller batch size
   export RAG_BATCH_SIZE=16  # default is 32
   ```

2. **For database connectivity**:

   ```bash
   # Test database connection
   psql $DATABASE_URL -c "SELECT version();"
   # Check pgvector extension
   psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname='vector';"
   ```

3. **For Python subprocess issues**:

   ```bash
   # Check Python availability
   python3 --version
   # Test reranker script manually
   cd packages/rag/python && python3 qwen3_rerank.py
   ```

## High Memory Usage

### Symptom: Memory usage &gt; 1GB RSS or heap &gt; 85%

#### Immediate Actions (0-5 minutes)

1. **Check current usage**:

   ```bash
   curl -s http://localhost:8080/health | jq '.resources'
   # or use system tools:
   ps aux | grep rag-service
   ```

2. **Reduce load immediately**:

   ```bash
   # Scale down processing
   export RAG_BATCH_SIZE=8  # reduce batch size
   export RAG_WORKERS=1     # reduce worker count
   ```

3. **Trigger garbage collection** (Node.js):

   ```bash
   # Send SIGUSR2 if configured
   kill -USR2 $(pgrep -f rag-service)
   ```

#### Root Cause Analysis (5-15 minutes)

- **Check for memory leaks**: Look for continuously growing heap
- **Analyze batch sizes**: Large document batches can cause spikes
- **Review recent changes**: New models or configurations
- **Check embedding cache**: Vector caches might be too large

#### Resolution Steps

1. **Tune batch processing**:

   ```bash
   # Environment configuration
   export RAG_MAX_CONTENT_CHARS=10000  # reduce content size
   export RAG_EMBEDDING_BATCH_SIZE=16  # smaller batches
   export RAG_CHUNK_SIZE=256          # smaller chunks
   ```

2. **Enable streaming mode**:

   ```bash
   export RAG_STREAMING_MODE=true
   export RAG_STREAM_CHUNK_SIZE=1024
   ```

3. **Clear caches**:

   ```bash
   # Clear embedding cache (if using file cache)
   rm -rf /tmp/rag-cache/*
   ```

## Component Failures

### Embedder Component Down

#### Symptoms

- Embedding operations fail
- Health check shows embedder: `ok: false`
- Logs show model loading errors

#### Resolution

1. **Check model availability**:

   ```bash
   ls -la /path/to/models/
   # Verify model files are accessible
   curl -I https://huggingface.co/your/model/resolve/main/config.json
   ```

2. **Restart with fallback model**:

   ```bash
   export RAG_EMBEDDER_MODEL="sentence-transformers/all-MiniLM-L6-v2"
   export RAG_EMBEDDER_DEVICE="cpu"  # fallback to CPU
   ```

3. **Check resource constraints**:

   ```bash
   nvidia-smi  # if using GPU
   free -h     # check available RAM
   ```

### Store Component Down

#### Symptoms

- Vector storage operations fail
- Database connection errors
- Health check shows store: `ok: false`

#### Resolution

1. **Check database connectivity**:

   ```bash
   pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER
   ```

2. **Verify pgvector extension**:

   ```sql
   -- Connect to database
   SELECT * FROM pg_extension WHERE extname='vector';
   -- If missing:
   CREATE EXTENSION vector;
   ```

3. **Fallback to in-memory store** (temporary):

   ```bash
   export RAG_STORE_TYPE="memory"
   # Note: Data will be lost on restart
   ```

### Reranker Component Down

#### Symptoms

- Reranking operations fail or timeout
- Python subprocess errors
- Health check shows reranker: `ok: false`

#### Resolution

1. **Check Python environment**:

   ```bash
   python3 -c "import transformers; print(transformers.__version__)"
   python3 -c "import torch; print(torch.__version__)"
   ```

2. **Test reranker script**:

   ```bash
   cd packages/rag/python
   echo '{"query": "test", "documents": ["doc1"], "model_path": "ms-marco-MiniLM-L-12-v2"}' | python3 qwen3_rerank.py
   ```

3. **Enable fallback mode**:

   ```bash
   export RAG_RERANKER_FALLBACK="original"  # use original ranking
   ```

## Performance Issues

### Symptom: High latency (&gt; 5 seconds) or low throughput

#### Immediate Actions

1. **Check current performance**:

   ```bash
   curl -w "Total time: %{time_total}s\n" -s http://localhost:8080/health &gt; /dev/null
   ```

2. **Enable performance monitoring**:

   ```bash
   export RAG_METRICS_ENABLED=true
   export RAG_TRACE_ENABLED=true
   ```

#### Optimization Steps

1. **Optimize batch sizes**:

   ```bash
   # For throughput optimization
   export RAG_EMBEDDING_BATCH_SIZE=64
   export RAG_PARALLEL_WORKERS=4

   # For latency optimization
   export RAG_EMBEDDING_BATCH_SIZE=8
   export RAG_MAX_CONCURRENT_REQUESTS=2
   ```

2. **Enable caching**:

   ```bash
   export RAG_ENABLE_EMBEDDING_CACHE=true
   export RAG_CACHE_SIZE_MB=256
   ```

3. **Use faster models**:

   ```bash
   # Smaller, faster embedding model
   export RAG_EMBEDDER_MODEL="all-MiniLM-L6-v2"
   # Disable reranking for speed
   export RAG_RERANKER_ENABLED=false
   ```

## Emergency Procedures

### Service Completely Unresponsive

1. **Immediate restart**:

   ```bash
   # Kubernetes
   kubectl rollout restart deployment/rag-service

   # Docker
   docker restart rag-service

   # Process
   systemctl restart rag-service
   ```

2. **Scale to safe configuration**:

   ```bash
   export RAG_BATCH_SIZE=8
   export RAG_MAX_CONTENT_CHARS=5000
   export RAG_WORKERS=1
   export RAG_STORE_TYPE="memory"  # temporary
   ```

3. **Monitor recovery**:

   ```bash
   watch -n 5 'curl -s http://localhost:8080/health | jq ".ok"'
   ```

### Data Corruption Suspected

1. **Stop writes immediately**:

   ```bash
   export RAG_READ_ONLY_MODE=true
   ```

2. **Backup current state**:

   ```bash
   pg_dump $DATABASE_URL &gt; rag_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

3. **Validate data integrity**:

   ```sql
   -- Check for null embeddings
   SELECT COUNT(*) FROM rag_documents WHERE embedding IS NULL;
   -- Check for corrupted vectors
   SELECT id FROM rag_documents WHERE vector_length(embedding) != 384;
   ```

### Security Incident

1. **Isolate service**:

   ```bash
   # Block external traffic
   kubectl patch service rag-service -p '{"spec":{"type":"ClusterIP"}}'
   ```

2. **Enable audit logging**:

   ```bash
   export RAG_AUDIT_ENABLED=true
   export RAG_LOG_LEVEL=debug
   ```

3. **Preserve evidence**:

   ```bash
   kubectl logs deployment/rag-service &gt; incident_logs_$(date +%Y%m%d_%H%M%S).txt
   ```

## Contact Information

- **Primary Oncall**: `@rag-oncall` in Slack
- **Secondary**: `@platform-team` in Slack
- **Emergency**: Call platform duty phone

## Related Documentation

- [RAG Service Architecture](./architecture.md)
- [Monitoring Dashboard](https://grafana.internal/d/rag-service)
- [Alert Rules](./monitoring/prometheus-alerts.yml)
- [Deployment Guide](./deployment.md)
