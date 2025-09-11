# MLX Local Inference Docker Container
# Optimized for Apple Silicon M4 Max with 36GB RAM

FROM python:3.13-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies for MLX
RUN pip install --no-cache-dir \
    mlx \
    mlx-lm \
    transformers \
    torch \
    numpy \
    fastapi \
    uvicorn \
    pydantic \
    aiofiles

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN useradd -r -s /bin/false -u 1001 mlxuser && \
    chown -R mlxuser:mlxuser /app

# Copy MLX server implementation
COPY --chown=mlxuser:mlxuser mlx-server.py .
COPY --chown=mlxuser:mlxuser model_manager.py .
COPY --chown=mlxuser:mlxuser memory_manager.py .

# Create models directory with proper ownership
RUN mkdir -p /app/models && \
    chown -R mlxuser:mlxuser /app/models

# Switch to non-root user
USER mlxuser

# Environment variables
ENV MLX_MEMORY_LIMIT=28672
ENV MLX_MODELS_DIR=/app/models
ENV MLX_PORT=8000

# Expose the server port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the MLX server
CMD ["python", "mlx-server.py"]
