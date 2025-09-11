# Performance & Benchmarking

Measure throughput with [hyperfine](https://github.com/sharkdp/hyperfine):
```bash
hyperfine "echo '{\"msg\":\"hi\"}' | mcp-bridge --outbound-url http://localhost:8000"
```
Adjust `--rate` to meet target latency; monitor queue size to avoid drops.
