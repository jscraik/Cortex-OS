# Multi-stage Docker build for ML Inference Service
# Stage 1: Base Python environment with dependencies
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

# Stage 2: Development dependencies and tools
FROM base as dev

# Install development tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    vim \
    htop \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
WORKDIR /app
COPY pyproject.toml .
RUN pip install --upgrade pip && \
    pip install -e .[dev]

# Copy source code
COPY src/ ./src/
COPY tests/ ./tests/

# Change ownership to app user
RUN chown -R appuser:appuser /app
USER appuser

# Development command
CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Stage 3: Production build
FROM base as production

# Install only production dependencies
WORKDIR /app
COPY pyproject.toml .
RUN pip install --upgrade pip && \
    pip install -e . && \
    pip cache purge

# Copy source code only (no tests)
COPY src/ ./src/

# Create necessary directories
RUN mkdir -p /app/logs /app/data && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Production command
CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

# Stage 4: GPU-enabled production (for Apple Silicon/MLX)
FROM production as gpu

# Install MLX and GPU-specific dependencies
RUN pip install --upgrade mlx mlx-lm

# GPU-optimized command with single worker (MLX recommendation)
CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
