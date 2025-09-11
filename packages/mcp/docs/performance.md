# Performance & Benchmarking

Use the `performance` optional dependencies to profile:
```bash
uv pip install .[performance]
locust -f performance/locustfile.py
```

For quick checks, run `pytest-benchmark` suites and monitor CPU/memory via `psutil`.
