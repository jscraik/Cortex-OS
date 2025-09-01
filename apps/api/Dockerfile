
# syntax=docker/dockerfile:1

FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1     PYTHONUNBUFFERED=1
WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Install Python deps if present
COPY pyproject.toml uv.lock ./ || true
RUN if [ -f pyproject.toml ]; then pip3 install uv && uv sync --frozen --system; fi

# Copy app
COPY . .

# Default to uvicorn app; can be overridden with build arg or env
ARG APP_MODULE=src.api.endpoints:app
ENV APP_MODULE=${APP_MODULE}
EXPOSE 8082
HEALTHCHECK --interval=10s --timeout=2s --retries=3 CMD curl -fsS http://localhost:8082/health || exit 1
CMD ["python","-m","uvicorn","--host","0.0.0.0","--port","8082","${APP_MODULE}"]
