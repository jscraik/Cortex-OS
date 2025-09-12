# Deployment

## Docker
```bash
docker build -t cortex-py apps/cortex-py
docker run -p 8000:8000 cortex-py
```

The image uses the provided `Dockerfile` and starts the FastAPI server. Mount model caches as volumes for faster startup.
