# Cortex Py MLX Server

Experimental FastAPI service showcasing MLX integration.

## Features

- `GET /ping` returns a simple liveness check
- `GET /health` reports service readiness
- Optional MLX example via `mlx_lib_example`

## Run

```bash
uvicorn py_mlx_server.main:app --host 0.0.0.0 --port 8000
```

## MLX Library Example

```python
from py_mlx_server.mlx_lib_example import build_array
print(build_array())  # `[1.0, 2.0, 3.0]` when MLX is available
```
