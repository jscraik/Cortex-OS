# Multi-stage Docker build for Cortex OS Documentation
# Optimized for security, performance, and minimal attack surface

# Stage 1: Build Environment
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install system dependencies for building
RUN apk add --no-cache \
    python3 \
    py3-pip \
    git \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    && ln -sf python3 /usr/bin/python

# Install pnpm
RUN npm install -g pnpm@10.13.1

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/

# Install Node.js dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Install Python dependencies for MkDocs
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Generate API documentation
RUN pnpm run docs:generate || echo "API docs generation skipped"

# Build MkDocs documentation
RUN pnpm docs:mkdocs:build

# Optimize static assets
RUN find docs/site -name "*.html" -type f -exec sh -c 'htmlmin --remove-comments --remove-empty-space "$1" > "$1.tmp" && mv "$1.tmp" "$1"' _ {} \;
RUN find docs/site -name "*.css" -type f -exec sh -c 'cssnano "$1" "$1.tmp" && mv "$1.tmp" "$1"' _ {} \; 2>/dev/null || true
RUN find docs/site -name "*.js" -type f -exec sh -c 'terser "$1" -o "$1.tmp" --compress --mangle && mv "$1.tmp" "$1"' _ {} \; 2>/dev/null || true

# Stage 2: Python API Builder
FROM python:3.13-alpine AS api-builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    gcc \
    musl-dev \
    postgresql-dev \
    libffi-dev

# Install uv for fast Python package management
RUN pip install uv

# Copy API source code
COPY apps/docs-api/ ./

# Install Python dependencies with uv
RUN uv pip install --system --no-cache -r requirements.txt

# Stage 3: Production Runtime
FROM nginx:1.25-alpine AS production

# Install additional packages for production
RUN apk add --no-cache \
    curl \
    jq \
    tzdata \
    ca-certificates \
    python3 \
    py3-pip \
    supervisor \
    && rm -rf /var/cache/apk/*

# Install Python runtime dependencies
RUN pip3 install --no-cache-dir \
    fastapi \
    uvicorn \
    sqlalchemy \
    alembic \
    redis \
    asyncpg

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Copy built documentation from builder stage
COPY --from=builder --chown=appuser:appgroup /app/docs/site /usr/share/nginx/html

# Copy Python API from api-builder stage
COPY --from=api-builder --chown=appuser:appgroup /app /opt/docs-api

# Copy custom nginx configuration
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy supervisor configuration for multi-process management
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy health check script
COPY docker/scripts/healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Copy startup script
COPY docker/scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set up logging directories
RUN mkdir -p /var/log/nginx /var/log/supervisor /var/log/docs-api && \
    chown -R appuser:appgroup /var/log/nginx /var/log/supervisor /var/log/docs-api

# Set environment variables
ENV PYTHONPATH=/opt/docs-api \
    PYTHONUNBUFFERED=1 \
    DOCS_API_PORT=8001 \
    NGINX_PORT=80

# Expose ports
EXPOSE 80 8001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Security: Use non-root user
USER appuser

# Use supervisor to manage multiple processes
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

# Labels for metadata
LABEL maintainer="Cortex OS Team <team@cortex-os.dev>"
LABEL version="1.0.0"
LABEL description="Cortex OS Documentation with integrated API services"
LABEL org.opencontainers.image.source="https://github.com/cortex-os/cortex-os"
LABEL org.opencontainers.image.documentation="https://docs.cortex-os.dev"
LABEL org.opencontainers.image.licenses="MIT"