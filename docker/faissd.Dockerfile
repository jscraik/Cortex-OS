# syntax=docker/dockerfile:1.7

FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    FAISSD_SNAPSHOTS_DIR=/data/snapshots \
    FAISSD_VERSION=1.0.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates build-essential && \
    rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    ln -s /root/.local/bin/uv /usr/local/bin/uv

WORKDIR /app

# Copy Python project and proto
COPY packages/faissd/pyproject.toml packages/faissd/
COPY packages/faissd/server.py packages/faissd/
COPY packages/rag/src/index/faissd.proto packages/rag/src/index/

WORKDIR /app/packages/faissd

# Sync dependencies
RUN uv sync --no-dev -p 3.11

# Pre-generate protobufs inside image for faster start
RUN FAISSD_PROTO_PATH=/app/packages/rag/src/index/faissd.proto \
    uv run python -c "from grpc_tools import protoc; import os; import sys; from pathlib import Path; here=str(Path('.').resolve()); proto='/app/packages/rag/src/index/faissd.proto'; protoc.main(['protoc', f'-I{os.path.dirname(proto)}', f'--python_out={here}', f'--grpc_python_out={here}', os.path.basename(proto)])"

EXPOSE 50051
VOLUME ["/data/snapshots"]

ENV PYTHONPATH=/app/packages/faissd

CMD ["uv", "run", "python", "server.py"]

