# Multi-stage Python build for MCP package
FROM --platform=$BUILDPLATFORM python:3.12-slim AS base

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

# Install uv for fast Python package management
RUN pip install uv

# Set working directory
WORKDIR /app

FROM base AS deps

# Copy dependency files
COPY pyproject.toml uv.lock* ./

# Install dependencies with uv
RUN uv sync --frozen

FROM base AS build

# Copy dependencies from deps stage
COPY --from=deps /app/.venv /app/.venv

# Copy source code
COPY . .

# Activate virtual environment
ENV PATH="/app/.venv/bin:$PATH"

# Install the package
RUN uv pip install -e .

FROM python:3.12-slim AS runtime

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    tini \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r mcp && useradd -r -g mcp mcp

# Copy virtual environment and application
COPY --from=build /app/.venv /app/.venv
COPY --from=build /app/src /app/src
COPY --from=build /app/pyproject.toml /app/

# Set working directory
WORKDIR /app

# Change ownership
RUN chown -R mcp:mcp /app

# Switch to non-root user
USER mcp

# Expose MCP server port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Labels for OrbStack optimization
LABEL \
    org.opencontainers.image.title="MCP Server" \
    org.opencontainers.image.description="Model Context Protocol server and tools" \
    org.opencontainers.image.vendor="Cortex-OS" \
    org.opencontainers.image.source="https://github.com/your-org/cortex-os" \
    orbstack.optimize="true" \
    orbstack.python="true" \
    orbstack.service="mcp"

# Use tini as PID 1
ENTRYPOINT ["/usr/bin/tini", "--"]

# Default command
CMD ["python", "-m", "src.server", "--port", "8000"]
