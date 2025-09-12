# Getting Started

## Prerequisites
- Python 3.11+
- [uv](https://github.com/astral-sh/uv) for dependency management

## Installation
```bash
uv sync
uv add mlx mlx-lm mlx-vlm transformers torch numpy faiss-cpu qdrant-client chromadb
uv sync
```

## First Launch
```bash
.venv/bin/python -m apps.cortex-py.src.app
```
The server starts on `http://localhost:8000` and exposes the `/embed` endpoint.
