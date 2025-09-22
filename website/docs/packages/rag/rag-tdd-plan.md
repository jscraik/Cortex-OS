# RAG System TDD Plan & Production Readiness Review

## Executive Summary

This document provides a comprehensive technical analysis and TDD (Test-Driven Development) plan for the Cortex-OS RAG (Retrieval-Augmented Generation) system, with a focus on production readiness and MLX integration for Apple Silicon optimization.

### Current State Assessment
- **Status:** 🔴 **Not Production Ready** - Multiple critical areas require remediation
- **Test Coverage:** Partial - Many test files exist but several are placeholders
- **MLX Integration:** 🟡 **Partially Implemented** - Documentation exists but core implementation incomplete
- **Code Quality:** Mixed - Some components well-structured, others need refactoring

## 1. Architecture Analysis

### Current Architecture

```
packages/rag/
├── src/
│   ├── agent/          # Agentic components (minimal implementation)
│   ├── chunk/          # Document chunking
│   ├── embed/          # Embedding generation
│   ├── generation/     # Text generation
│   ├── mcp/            # MCP tool integration
│   ├── pipeline/       # Core pipeline logic
│   ├── store/          # Vector stores
│   └── mlx/            # ❌ MLX integration (MISSING)
```

### Critical Missing Components

1. **MLX Client Implementation** - No actual MLX client code found
2. **Python Bridge Server** - MLX server script not implemented
3. **Memory Management** - No MLX-specific memory optimization
4. **Error Recovery** - Limited circuit breaker and fallback mechanisms

## 2. Test-Driven Development Plan

### Phase 1: Foundation & Infrastructure (Week 1-2)

#### 1.1 MLX Client Tests
```typescript
// packages/rag/__tests__/mlx/client.test.ts
describe('MLXClient', () => {
  describe('initialization', () => {
    it('should verify Apple Silicon availability');
    it('should check Python MLX installation');
    it('should validate model paths');
    it('should handle initialization failures gracefully');
  });

  describe('text generation', () => {
    it('should generate text with default parameters');
    it('should respect custom generation parameters');
    it('should handle timeout scenarios');
    it('should implement retry logic on transient failures');
    it('should track token usage accurately');
  });

  describe('memory management', () => {
    it('should monitor memory usage during generation');
    it('should trigger cleanup when memory threshold exceeded');
    it('should unload models when not in use');
  });
});
```

#### 1.2 Embedding Service Tests
```typescript
// packages/rag/__tests__/embed/mlx-embedder.test.ts
describe('MLXEmbedder', () => {
  describe('single embedding', () => {
    it('should generate embeddings for text');
    it('should maintain consistent dimensions');
    it('should handle special characters and encoding');
  });

  describe('batch processing', () => {
    it('should process batches efficiently');
    it('should handle batch size optimization');
    it('should recover from partial batch failures');
  });

  describe('caching', () => {
    it('should cache frequently used embeddings');
    it('should invalidate cache appropriately');
    it('should respect memory limits for cache');
  });
});
```

### Phase 2: Core RAG Pipeline (Week 3-4)

#### 2.1 Pipeline Integration Tests
```typescript
// packages/rag/__tests__/pipeline/mlx-pipeline.integration.test.ts
describe('MLX RAG Pipeline', () => {
  describe('end-to-end query processing', () => {
    it('should process simple queries under 2 seconds');
    it('should handle complex multi-hop queries');
    it('should fallback to Ollama when MLX unavailable');
    it('should stream responses in real-time');
  });

  describe('document ingestion', () => {
    it('should chunk documents optimally for context');
    it('should generate and store embeddings');
    it('should handle various file formats');
    it('should validate content security');
  });

  describe('retrieval and reranking', () => {
    it('should retrieve relevant documents');
    it('should rerank using MLX models');
    it('should combine lexical and semantic search');
    it('should handle empty result sets gracefully');
  });
});
```

#### 2.2 Performance Tests
```typescript
// packages/rag/__tests__/performance/mlx-benchmarks.test.ts
describe('MLX Performance Benchmarks', () => {
  describe('latency requirements', () => {
    it('should achieve first token < 500ms');
    it('should maintain p95 latency < 2s');
    it('should handle concurrent queries efficiently');
  });

  describe('throughput', () => {
    it('should process 100 queries/minute');
    it('should scale with available resources');
    it('should degrade gracefully under load');
  });

  describe('resource usage', () => {
    it('should stay under 500MB baseline memory');
    it('should not exceed 2GB peak memory');
    it('should utilize GPU efficiently');
  });
});
```

### Phase 3: Production Hardening (Week 5-6)

#### 3.1 Reliability Tests
```typescript
// packages/rag/__tests__/reliability/failover.test.ts
describe('Failover and Recovery', () => {
  describe('MLX to Ollama failover', () => {
    it('should detect MLX failures quickly');
    it('should switch to Ollama seamlessly');
    it('should retry MLX after recovery period');
    it('should maintain query state during failover');
  });

  describe('circuit breaker', () => {
    it('should open circuit after threshold failures');
    it('should enter half-open state after timeout');
    it('should close circuit after successful operations');
  });

  describe('graceful degradation', () => {
    it('should reduce functionality when resources limited');
    it('should prioritize critical operations');
    it('should notify users of degraded service');
  });
});
```

#### 3.2 Security Tests
```typescript
// packages/rag/__tests__/security/content-validation.test.ts
describe('Content Security', () => {
  describe('input validation', () => {
    it('should sanitize user queries');
    it('should prevent prompt injection');
    it('should validate document content');
    it('should enforce rate limiting');
  });

  describe('output filtering', () => {
    it('should prevent sensitive data leakage');
    it('should filter inappropriate content');
    it('should maintain audit logs');
  });
});
```

## 3. Implementation Requirements

### 3.1 MLX Client Implementation

```typescript
// packages/rag/src/mlx/client.ts
export interface MLXClient {
  // Core functionality
  generate(prompt: string, options?: GenerationOptions): Promise<MLXResponse>;
  embed(texts: string[]): Promise<number[][]>;
  
  // Health and monitoring
  health(): Promise<HealthStatus>;
  getMemoryUsage(): Promise<MemoryStats>;
  
  // Lifecycle management
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  
  // Model management
  loadModel(path: string): Promise<void>;
  unloadModel(): Promise<void>;
  listAvailableModels(): Promise<ModelInfo[]>;
}

export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  repetitionPenalty?: number;
  streamingCallback?: (token: string) => void;
}

export interface MLXResponse {
  text: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  latency: {
    firstToken: number;
    total: number;
  };
  provider: 'mlx' | 'ollama';
  model: string;
}
```

### 3.2 Python MLX Bridge

```python
# packages/rag/scripts/mlx_bridge.py
import asyncio
import json
import sys
from typing import Dict, List, Optional, Any
import mlx.core as mx
import mlx.nn as nn
from mlx_lm import load, generate

class MLXBridge:
    """Production MLX bridge server for TypeScript integration"""
    
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.tokenizers: Dict[str, Any] = {}
        self.memory_monitor = MemoryMonitor()
        
    async def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming requests from TypeScript client"""
        action = request.get('action')
        
        if action == 'generate':
            return await self.generate_text(request)
        elif action == 'embed':
            return await self.generate_embeddings(request)
        elif action == 'health':
            return await self.health_check()
        elif action == 'load_model':
            return await self.load_model(request)
        else:
            raise ValueError(f"Unknown action: {action}")
    
    async def generate_text(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Generate text using MLX model"""
        # Implementation with proper error handling
        pass
    
    async def generate_embeddings(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Generate embeddings for text"""
        # Implementation with batching support
        pass
```

### 3.3 Memory Management

```typescript
// packages/rag/src/mlx/memory-manager.ts
export class MLXMemoryManager {
  private readonly thresholds = {
    warning: 0.7,  // 70% memory usage
    critical: 0.85, // 85% memory usage
    shutdown: 0.95  // 95% memory usage
  };

  async checkMemory(): Promise<MemoryStatus> {
    const stats = await this.getSystemMemory();
    const usage = stats.used / stats.total;
    
    if (usage > this.thresholds.shutdown) {
      await this.emergencyCleanup();
      return 'critical';
    }
    
    if (usage > this.thresholds.critical) {
      await this.releaseNonEssentialMemory();
      return 'warning';
    }
    
    return 'healthy';
  }

  private async emergencyCleanup(): Promise<void> {
    // Unload models, clear caches, force GC
  }

  private async releaseNonEssentialMemory(): Promise<void> {
    // Clear embedding cache, reduce batch sizes
  }
}
```

## 4. Quality Assurance Checklist

### 4.1 Unit Test Coverage
- [ ] **MLX Client**: Core functionality tests
- [ ] **Embedder**: Embedding generation and caching
- [ ] **Generator**: Text generation with parameters
- [ ] **Memory Manager**: Resource monitoring and cleanup
- [ ] **Error Handler**: Recovery and fallback logic

### 4.2 Integration Test Coverage
- [ ] **E2E Pipeline**: Complete query processing flow
- [ ] **Failover**: MLX to Ollama transition
- [ ] **Concurrent Load**: Multiple simultaneous queries
- [ ] **Memory Pressure**: Behavior under resource constraints
- [ ] **Network Issues**: Handling of connection problems

### 4.3 Performance Requirements
- [ ] **Latency**: First token < 500ms, p95 < 2s
- [ ] **Throughput**: 100 queries/minute sustained
- [ ] **Memory**: < 500MB baseline, < 2GB peak
- [ ] **GPU Utilization**: Efficient use of Metal Performance Shaders
- [ ] **Cache Hit Rate**: > 30% for common queries

### 4.4 Security Requirements
- [ ] **Input Validation**: Zod schemas for all inputs
- [ ] **Prompt Injection Prevention**: Content filtering
- [ ] **Rate Limiting**: Per-user and global limits
- [ ] **Audit Logging**: Complete request/response tracking
- [ ] **Data Encryption**: At rest and in transit

## 5. Deployment Readiness

### 5.1 Infrastructure Requirements
```yaml
# deployment/mlx-requirements.yaml
system:
  platform: darwin  # macOS only
  architecture: arm64  # Apple Silicon
  memory:
    minimum: 8GB
    recommended: 16GB
  storage:
    models: 50GB  # For MLX models
    cache: 10GB   # For embeddings cache
    
dependencies:
  python:
    version: ">=3.9"
    packages:
      - mlx>=0.5.0
      - mlx-lm>=0.2.0
      - numpy
      - tokenizers
  node:
    version: ">=18.0.0"
    
monitoring:
  metrics:
    - memory_usage
    - gpu_utilization
    - query_latency
    - error_rate
  alerts:
    - memory_threshold_exceeded
    - high_error_rate
    - slow_response_time
```

### 5.2 Monitoring & Observability

```typescript
// packages/rag/src/monitoring/metrics.ts
export const RAGMetrics = {
  // Performance metrics
  queryLatency: new Histogram({
    name: 'rag_query_latency_ms',
    help: 'Query processing latency in milliseconds',
    buckets: [100, 250, 500, 1000, 2000, 5000, 10000]
  }),
  
  // Resource metrics
  memoryUsage: new Gauge({
    name: 'rag_memory_usage_bytes',
    help: 'Current memory usage in bytes',
    labelNames: ['component']
  }),
  
  // Business metrics
  queryCount: new Counter({
    name: 'rag_query_total',
    help: 'Total number of queries processed',
    labelNames: ['status', 'provider']
  }),
  
  // MLX specific metrics
  mlxModelLoadTime: new Histogram({
    name: 'mlx_model_load_time_ms',
    help: 'Time to load MLX model in milliseconds'
  }),
  
  mlxGPUUtilization: new Gauge({
    name: 'mlx_gpu_utilization_percent',
    help: 'MLX GPU utilization percentage'
  })
};
```

## 6. Remediation Action Items

### Critical (Must Fix Before Production)

1. **Implement MLX Client** [Priority: P0]
   - Create TypeScript MLX client with full error handling
   - Implement Python bridge server
   - Add comprehensive test coverage
   - Timeline: 2 weeks

2. **Memory Management** [Priority: P0]
   - Implement memory monitoring
   - Add automatic cleanup mechanisms
   - Test under memory pressure
   - Timeline: 1 week

3. **Failover System** [Priority: P0]
   - Implement MLX to Ollama failover
   - Add circuit breaker pattern
   - Test failover scenarios
   - Timeline: 1 week

4. **Security Hardening** [Priority: P0]
   - Add input validation
   - Implement rate limiting
   - Add prompt injection prevention
   - Timeline: 1 week

### Important (Should Fix Soon)

5. **Performance Optimization** [Priority: P1]
   - Implement embedding cache
   - Optimize batch processing
   - Add connection pooling
   - Timeline: 2 weeks

6. **Monitoring Setup** [Priority: P1]
   - Add Prometheus metrics
   - Create Grafana dashboards
   - Setup alerting rules
   - Timeline: 1 week

### Nice to Have (Future Improvements)

7. **Enhanced Features** [Priority: P2]
   - Streaming response support
   - Multi-modal capabilities
   - Fine-tuning integration
   - Timeline: 4 weeks

## 7. Testing Strategy

### Test Pyramid
```
         /\
        /E2E\        5% - Full system tests
       /------\
      /Integration\ 20% - Component integration
     /------------\
    /    Unit     \ 75% - Isolated unit tests
   /--------------\
```

### Test Environments
1. **Local Development**: Mock MLX, in-memory stores
2. **Integration**: Real MLX, test databases
3. **Staging**: Production-like with monitoring
4. **Production**: Gradual rollout with feature flags

### Continuous Testing
```yaml
# .github/workflows/rag-ci.yml
name: RAG CI Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: macos-latest  # For MLX support
    steps:
      - name: Unit Tests
        run: pnpm test:unit
        
      - name: Integration Tests
        run: pnpm test:integration
        
      - name: Performance Tests
        run: pnpm test:performance
        
      - name: Security Scan
        run: pnpm security:scan
        
      - name: Coverage Report
        run: pnpm test:coverage
        
      - name: MLX Compatibility
        run: pnpm test:mlx
```

## 8. Documentation Requirements

### API Documentation
- [ ] OpenAPI/Swagger specification
- [ ] TypeScript type definitions
- [ ] Python bridge protocol documentation
- [ ] Example code for all use cases

### Operational Documentation
- [ ] Deployment guide
- [ ] Troubleshooting runbook
- [ ] Performance tuning guide
- [ ] Disaster recovery procedures

### User Documentation
- [ ] Getting started guide
- [ ] Configuration reference
- [ ] Best practices guide
- [ ] Migration guide from v1

## 9. Success Metrics

### Technical Metrics
- Test coverage > 85%
- Zero critical vulnerabilities
- P95 latency < 2 seconds
- Uptime > 99.9%

### Business Metrics
- User satisfaction > 4.5/5
- Query success rate > 95%
- Cost per query < $0.001
- Time to first value < 5 minutes

## 10. Timeline & Milestones

| Week | Milestone | Deliverables | Success Criteria |
|------|-----------|--------------|------------------|
| 1-2  | Foundation | MLX client, Python bridge | All unit tests pass |
| 3-4  | Integration | Pipeline integration, failover | Integration tests pass |
| 5-6  | Hardening | Security, monitoring | Security scan clean |
| 7    | Performance | Optimization, caching | Meets latency targets |
| 8    | Documentation | Guides, API docs | Documentation complete |
| 9    | Testing | E2E tests, load tests | All tests green |
| 10   | Deployment | Staging deployment | Staging validation |
| 11   | Production | Production rollout | Monitoring active |
| 12   | Optimization | Performance tuning | SLA targets met |

## Appendix A: MLX Model Configuration

```json
{
  "recommended_models": {
    "generation": [
      {
        "name": "qwen2.5-coder-32b-instruct-q4",
        "path": "/Volumes/SSD500/Models/MLX/qwen2.5-coder-32b-instruct-q4",
        "memory_required": "16GB",
        "use_cases": ["code_generation", "technical_queries"]
      },
      {
        "name": "llama-3.2-1b-instruct-4bit",
        "path": "mlx-community/Llama-3.2-1B-Instruct-4bit",
        "memory_required": "2GB",
        "use_cases": ["fast_responses", "simple_queries"]
      }
    ],
    "embedding": [
      {
        "name": "bge-small-en-v1.5-mlx",
        "path": "mlx-community/bge-small-en-v1.5-mlx",
        "dimensions": 384,
        "memory_required": "500MB"
      }
    ],
    "reranking": [
      {
        "name": "qwen3-reranker-4b",
        "path": "custom/qwen3-reranker-4b",
        "memory_required": "4GB"
      }
    ]
  }
}
```

## Appendix B: Error Codes

| Code | Description | Retry | Action |
|------|-------------|-------|--------|
| MLX_001 | Model not found | No | Check model path |
| MLX_002 | Insufficient memory | Yes | Free memory and retry |
| MLX_003 | Generation timeout | Yes | Increase timeout |
| MLX_004 | Python bridge error | Yes | Restart bridge |
| MLX_005 | GPU unavailable | No | Use CPU fallback |

## Conclusion

The RAG system requires significant work to reach production readiness, particularly in MLX integration, error handling, and testing. Following this TDD plan with the outlined remediation actions will result in a robust, performant, and production-ready system optimized for Apple Silicon.

**Estimated Time to Production: 12 weeks**
**Recommended Team Size: 3-4 engineers**
**Critical Dependencies: Apple Silicon hardware, MLX framework updates**

---
*Document Version: 1.0*
*Last Updated: [Current Date]*
*Owner: Cortex-OS Team*
*Review Cycle: Bi-weekly until production ready*
