
# syntax=docker/dockerfile:1

FROM python:3.11.6-slim AS builder
WORKDIR /app
COPY python/pyproject.toml python/uv.lock ./
RUN pip install uv && uv sync --frozen --system --no-install-project

FROM python:3.11.6-slim
WORKDIR /app
COPY --from=builder /usr/local /usr/local
RUN apt-get update && apt-get install -y --no-install-recommends curl     && rm -rf /var/lib/apt/lists/*
COPY mcp_server.py ./
ENV MCP_SERVER_PORT=8765
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD curl -f http://localhost:${MCP_SERVER_PORT}/health || exit 1
CMD ["python", "mcp_server.py"]
