# Performance & Benchmarking

Use [k6](https://k6.io) or similar tools to stress test the gateway.

Example k6 script:
```javascript
import http from 'k6/http';
export default function () {
  http.post('http://localhost:3333/rag', JSON.stringify({ query: 'ping' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

Run with:
```bash
k6 run script.js
```
Monitor latency and throughput via Prometheus metrics.
