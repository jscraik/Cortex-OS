# Cortex Py MLX Server

The Cortex Py MLX server is an experimental FastAPI service that mirrors the HTTP interface of the traditional Python stack while enabling optional MLX acceleration.

## Endpoints

- `GET /ping` – basic liveness probe returning `{"message": "pong"}`
- `GET /health` – reports service status and readiness

## Running

```bash
uvicorn py_mlx_server.main:app --host 0.0.0.0 --port 8000
```

## MLX Example

```python
from py_mlx_server.mlx_lib_example import build_array
print(build_array())
```
When the `mlx` library is installed, the example returns a small array. If the library is missing, `None` is returned so the server can still operate.
