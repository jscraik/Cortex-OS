# Phase 7: Performance & Sustainability - Research

**Date**: 2025-01-04  
**Phase**: 7 - Performance & Sustainability  
**Status**: Research Phase

---

## Research Objectives

1. Understand k6 load testing framework
2. Define realistic SLO targets for Cortex-OS
3. Research energy monitoring tools (codecarbon)
4. Review rate limiting strategies

---

## 7.1: Performance Baseline & SLO Research

### k6 Load Testing

**What is k6**:
- Modern load testing tool written in Go
- JavaScript-based test scripts
- Built-in metrics and thresholds
- Supports HTTP/WebSocket/gRPC
- Grafana integration

**Installation**:
```bash
# macOS
brew install k6

# Verify
k6 version
```

**Basic Test Structure**:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 for 5 min
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<250'],  // 95% under 250ms
    http_req_failed: ['rate<0.005'],   // Less than 0.5% errors
  },
};

export default function() {
  const res = http.get('http://localhost:8000/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
```

### SLO Targets for Cortex-OS

**Industry Standards**:
- Web APIs: P95 < 200ms, P99 < 1s
- Health checks: P95 < 50ms
- Background processing: P95 < 2s
- Error rate: < 0.1% (three nines: 99.9%)

**Proposed Cortex-OS SLOs**:

| Endpoint | P50 | P95 | P99 | Error Rate |
|----------|-----|-----|-----|------------|
| GET /health | <5ms | <10ms | <20ms | <0.01% |
| GET /health/ready | <10ms | <20ms | <50ms | <0.1% |
| GET /health/live | <2ms | <5ms | <10ms | <0.01% |
| POST /embed/multimodal | <100ms | <200ms | <500ms | <0.5% |
| POST /agents/plan (CoT) | <500ms | <2s | <5s | <1% |
| POST /agents/plan (ToT) | <2s | <10s | <20s | <1% |
| POST /agents/reflect | <200ms | <500ms | <1s | <0.5% |
| GET /metrics | <20ms | <50ms | <100ms | <0.01% |

**SLO Budget Calculation**:
- Monthly uptime: 99.9% = 43.2 min downtime/month
- Error budget: 0.1% = 432 errors per 432,000 requests

### Metrics to Track

**Latency Metrics**:
- P50 (median)
- P90 (90th percentile)
- P95 (95th percentile)
- P99 (99th percentile)
- P99.9 (extreme tail)

**Success Metrics**:
- Request rate (req/sec)
- Success rate (%)
- Error rate (%)
- HTTP status code distribution

**Resource Metrics**:
- CPU utilization
- Memory usage
- Network throughput
- Concurrent connections

---

## 7.2: Energy Efficiency Research

### codecarbon Library

**What is codecarbon**:
- Python library for tracking CO2 emissions
- Measures energy consumption of code
- Supports CPU, GPU, RAM
- Online and offline modes
- Integrates with MLOps tools

**Installation**:
```bash
pip install codecarbon
```

**Basic Usage**:
```python
from codecarbon import EmissionsTracker

tracker = EmissionsTracker()
tracker.start()

# Your code here
run_inference()

emissions = tracker.stop()
print(f"Emissions: {emissions} kg CO2")
```

**Advanced Features**:
- Geographic location for grid carbon intensity
- Cloud provider integration (AWS, GCP, Azure)
- Project-level tracking
- Persistent storage
- API for custom integrations

### Energy Monitoring Strategies

**Baseline Measurement**:
1. Measure idle power consumption
2. Measure typical workload power
3. Measure peak load power
4. Calculate efficiency ratios

**Optimization Opportunities**:
- MLX low-power mode (already in fast test)
- Batch processing to reduce overhead
- Caching to avoid re-computation
- Model quantization (8-bit, 4-bit)
- Early stopping for inference

**Sustainability Targets**:
- Average power: <100W
- Peak power: <200W
- CO2 per request: <0.1g
- Energy efficiency: >10 req/Wh

### MLX Performance Modes

**Fast Test Mode** (current):
- Minimal model loading
- Cached responses
- ~5ms per operation
- <10W estimated power

**Production Mode**:
- Full CLIP model loading
- Real inference
- ~100-500ms per operation
- ~50-100W estimated power

**Low-Power Mode** (to implement):
- Quantized models (8-bit)
- Reduced batch sizes
- Lower precision (fp16)
- Target: 30% power reduction

---

## 7.3: Rate Limiting Research

### Rate Limiting Algorithms

**1. Token Bucket**:
- Tokens added at fixed rate
- Request consumes token
- Burst capacity allowed
- Most flexible

**2. Leaky Bucket**:
- Fixed rate output
- Smooths traffic
- No bursts
- Simpler implementation

**3. Fixed Window**:
- Count requests in time window
- Reset at window boundary
- Can have boundary issues
- Simplest to implement

**4. Sliding Window**:
- Weighted count across windows
- No boundary issues
- More accurate
- More complex

### Python Rate Limiting Libraries

**slowapi** (FastAPI integration):
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/endpoint")
@limiter.limit("5/minute")
async def limited_route():
    return {"status": "ok"}
```

**aiolimiter** (async-friendly):
```python
from aiolimiter import AsyncLimiter

limiter = AsyncLimiter(max_rate=60, time_period=60)

async def rate_limited_function():
    async with limiter:
        # Your code
        pass
```

**Custom Implementation**:
```python
from collections import defaultdict
from time import time

class TokenBucket:
    def __init__(self, rate: float, capacity: float):
        self.rate = rate
        self.capacity = capacity
        self.tokens = defaultdict(lambda: capacity)
        self.updated = defaultdict(lambda: time())
    
    def consume(self, client_id: str, tokens: float = 1) -> bool:
        now = time()
        elapsed = now - self.updated[client_id]
        
        # Add tokens based on elapsed time
        self.tokens[client_id] = min(
            self.capacity,
            self.tokens[client_id] + elapsed * self.rate
        )
        self.updated[client_id] = now
        
        # Try to consume tokens
        if self.tokens[client_id] >= tokens:
            self.tokens[client_id] -= tokens
            return True
        return False
```

### Rate Limit Configuration

**Proposed Limits**:
- `/embed/multimodal`: 60 req/min (1 req/sec sustained)
- `/agents/plan`: 10 req/min (expensive operations)
- `/agents/reflect`: 20 req/min (moderate cost)
- `/health/*`: unlimited (monitoring)
- `/metrics`: unlimited (internal)

**Response Headers**:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1704384000
Retry-After: 23
```

**429 Response**:
```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "brAInwav: Rate limit exceeded. Max 60 requests per minute.",
    "retry_after": 23
  }
}
```

---

## Implementation Strategy

### Phase 7.1: Performance (TDD)

**RED Tests**:
```python
# tests/performance/test_slo_baseline.py
def test_health_endpoint_latency():
    """Health endpoint should respond in <10ms P95"""
    latencies = []
    for _ in range(100):
        start = time.perf_counter()
        response = client.get("/health")
        latencies.append(time.perf_counter() - start)
    
    p95 = np.percentile(latencies, 95)
    assert p95 < 0.010  # 10ms
```

**GREEN Implementation**:
```python
# src/performance/slo_tracker.py
from collections import deque
import numpy as np

class SLOTracker:
    def __init__(self, window_size: int = 1000):
        self.latencies = defaultdict(lambda: deque(maxlen=window_size))
    
    def track(self, endpoint: str, latency_ms: float):
        self.latencies[endpoint].append(latency_ms)
    
    def get_percentile(self, endpoint: str, percentile: float) -> float:
        if not self.latencies[endpoint]:
            return 0.0
        return np.percentile(list(self.latencies[endpoint]), percentile)
```

### Phase 7.2: Energy (TDD)

**RED Tests**:
```python
# tests/sustainability/test_energy_monitor.py
def test_tracks_energy_per_request():
    """Should track energy consumption per request"""
    monitor = EnergyMonitor()
    monitor.start_tracking()
    
    # Simulate request
    response = client.post("/embed/multimodal", ...)
    
    energy = monitor.stop_tracking()
    assert energy > 0
    assert energy < 100  # Watt-seconds
```

**GREEN Implementation**:
```python
# src/sustainability/energy_monitor.py
from codecarbon import EmissionsTracker

class EnergyMonitor:
    def __init__(self):
        self.tracker = EmissionsTracker()
    
    def start_tracking(self):
        self.tracker.start()
    
    def stop_tracking(self) -> float:
        return self.tracker.stop()
```

### Phase 7.3: Rate Limiting (TDD)

**RED Tests**:
```python
# tests/middleware/test_rate_limiter.py
async def test_enforces_rate_limit():
    """Should return 429 after exceeding limit"""
    for i in range(61):  # 60/min limit
        response = await client.post("/embed/multimodal", ...)
        if i < 60:
            assert response.status_code == 200
        else:
            assert response.status_code == 429
```

**GREEN Implementation**:
```python
# src/middleware/rate_limiter.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/embed/multimodal")
@limiter.limit("60/minute")
async def multimodal_endpoint():
    pass
```

---

## Tools Required

### For Performance Testing
- [ ] k6 (brew install k6)
- [ ] Python libraries: numpy, scipy
- [ ] Grafana (optional, for dashboards)

### For Energy Monitoring
- [ ] codecarbon (pip install codecarbon)
- [ ] Hardware monitoring tools (macOS: powermetrics)

### For Rate Limiting
- [ ] slowapi (pip install slowapi)
- [ ] aiolimiter (pip install aiolimiter)

---

## Success Criteria

### Performance
- [ ] All endpoints meet SLO targets
- [ ] k6 tests pass under load
- [ ] SLO dashboard operational

### Energy
- [ ] Energy consumption tracked
- [ ] Baseline established
- [ ] Low-power mode reduces usage by 30%+

### Rate Limiting
- [ ] All endpoints protected
- [ ] 429 responses correct
- [ ] Retry-After headers present

---

## Timeline

- Phase 7.1: 60-75 minutes
- Phase 7.2: 45-60 minutes
- Phase 7.3: 45-60 minutes
- **Total**: 2.5-3 hours

---

## References

- k6 Documentation: https://k6.io/docs/
- codecarbon: https://codecarbon.io/
- FastAPI Rate Limiting: https://slowapi.readthedocs.io/
- SLO Best Practices: Google SRE Book

---

**Status**: Research complete, ready for implementation  
**Next**: Start Phase 7.1 TDD (RED phase)
