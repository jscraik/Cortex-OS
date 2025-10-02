---
title: Performance
sidebar_label: Performance
---

# Performance & Benchmarking

The RAG package includes comprehensive performance benchmarking tools to measure and optimize retrieval performance.

## Quick Start

Run all benchmarks with default settings:

```bash
pnpm benchmark:all
```

## Individual Benchmarks

### Document Ingestion Performance

```bash
# Basic ingestion test
pnpm benchmark:ingest

# Custom parameters
node benchmarks/ingest.js --batch-size=50 --doc-count=1000 --doc-size=2000
```

Measures:

- Documents processed per second
- Memory usage during ingestion
- Batch processing efficiency
- Throughput vs document size

### Vector Retrieval Performance

```bash
# Basic retrieval test
pnpm benchmark:retrieval

# Large database test
node benchmarks/retrieval.js --db-size=10000 --queries=100 --top-k=20
```

Measures:

- Query latency (P50, P95, P99)
- Queries per second
- Similarity search accuracy
- Performance by result set size

### Comprehensive Performance Suite

```bash
# Standard performance testing
pnpm test:performance

# Memory-focused profiling
pnpm test:performance:memory

# Detailed metrics collection
pnpm test:performance:detailed
```

The comprehensive suite includes:

- End-to-end pipeline benchmarks
- Memory usage profiling
- Embedding generation performance
- Error handling performance
- Resource cleanup verification

## Benchmark Configuration

### Ingestion Benchmark Options

- `--batch-size=N`: Documents per batch (default: 25)
- `--doc-count=N`: Total documents (default: 100)
- `--doc-size=N`: Characters per document (default: 1000)
- `--embedding-dim=N`: Vector dimensions (default: 384)
- `--concurrency=N`: Concurrent batches (default: 1)

### Retrieval Benchmark Options

- `--db-size=N`: Vector database size (default: 1000)
- `--queries=N`: Number of test queries (default: 50)
- `--top-k=N`: Results per query (default: 10)
- `--threshold=N`: Similarity threshold (default: 0.7)

### Performance Suite Options

- `--profile=TYPE`: standard | memory | detailed (default: standard)
- `--iterations=N`: Benchmark iterations (default: 10)

## Performance Baselines

### Expected Performance Targets

- **Ingestion**: >50 documents/second for 1KB documents
- **Retrieval**: <100ms P95 latency for 1000-vector database
- **Memory**: <200MB peak for 1000 documents
- **Throughput**: >20 queries/second sustained

### Optimization Tips

#### For Ingestion Performance

- Increase `batchSize` if the embedder supports it
- Use concurrent processing for independent documents
- Consider document size vs embedding quality tradeoffs
- Monitor memory usage for large batches

#### For Retrieval Performance

- Optimize vector dimensions vs accuracy
- Use similarity thresholds to reduce candidates
- Consider approximate nearest neighbor algorithms for large datasets
- Cache frequently accessed embeddings

#### For Memory Efficiency

- Implement streaming for large document sets
- Use garbage collection-friendly batch sizes
- Monitor heap growth during long-running operations
- Consider external vector stores for production scale

## Continuous Performance Monitoring

### Automated Performance Testing

```bash
# Add to CI/CD pipeline
pnpm test:performance --iterations=5 --profile=standard
```

### Performance Regression Detection

```bash
# Compare against baseline
node benchmarks/performance-suite.js --iterations=20 &gt; current-results.json
# Compare with previous results...
```

### Production Monitoring

- Track query latency percentiles
- Monitor memory usage patterns
- Alert on performance degradation
- Log throughput metrics

## Troubleshooting Performance Issues

### Common Issues and Solutions

1. **High Memory Usage**
   - Reduce batch sizes
   - Implement document streaming
   - Check for memory leaks in embedders

2. **Slow Retrieval**
   - Profile vector operations
   - Check similarity computation efficiency
   - Consider database indexing strategies

3. **Poor Throughput**
   - Increase concurrency appropriately
   - Optimize embedding generation
   - Review I/O bottlenecks

### Performance Profiling

Use Node.js built-in profiling:

```bash
node --cpu-prof benchmarks/retrieval.js
# Analyze with Chrome DevTools
```

Memory profiling:

```bash
node --inspect benchmarks/performance-suite.js --profile=memory
# Connect Chrome DevTools for heap analysis
```

## Integration with Monitoring

The benchmarks generate detailed JSON reports that can be integrated with monitoring systems:

```javascript
// Example: Parse benchmark results for monitoring
const results = JSON.parse(fs.readFileSync('benchmarks/benchmark-results.json'));
const avgLatency = results.benchmarkResults.find(r => r.name.includes('Retrieval')).duration.mean;
// Send to monitoring system...
```
