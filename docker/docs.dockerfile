# Multi-stage Docker build for Cortex OS Documentation
# Optimized for security, performance, and minimal attack surface

# Stage 1: Build Environment
FROM node:20-alpine AS builder

# Metadata
LABEL maintainer="brAInwav LLC <team@brainwav.dev>"
LABEL description="Cortex OS Documentation - MkDocs Material with accessibility and performance optimization"
LABEL version="1.0.0"

# Build arguments
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

# Environment variables for build optimization
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies for building
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    curl \
    nodejs \
    npm \
RUN apk add --no-cache \
    build-base \
    git \
    curl

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash mkdocs
USER mkdocs
WORKDIR /home/mkdocs

# Copy requirements and install Python dependencies
COPY --chown=mkdocs:mkdocs requirements-docs.txt .
RUN pip install --user --no-cache-dir -r requirements-docs.txt

# Install Node.js dependencies for optimization tools
COPY --chown=mkdocs:mkdocs package*.json ./
RUN npm ci --only=production

# Copy source code
COPY --chown=mkdocs:mkdocs . .

# Generate documentation
RUN ~/.local/bin/mkdocs build --strict --site-dir build/

# Optimize assets
RUN find build/ -name "*.html" -exec gzip -k {} \; \
    && find build/ -name "*.css" -exec gzip -k {} \; \
    && find build/ -name "*.js" -exec gzip -k {} \;

# Stage 2: Nginx Production Server
FROM nginx:1.25-alpine as production

# Metadata for production image
LABEL maintainer="brAInwav LLC <team@brainwav.dev>"
LABEL description="Cortex OS Documentation - Production server with Nginx"
LABEL version="1.0.0"

# Build metadata
LABEL org.opencontainers.image.created=$BUILD_DATE
LABEL org.opencontainers.image.url="https://docs.cortex-os.dev"
LABEL org.opencontainers.image.source="https://github.com/cortex-os/cortex-os"
LABEL org.opencontainers.image.version=$VERSION
LABEL org.opencontainers.image.revision=$VCS_REF
LABEL org.opencontainers.image.vendor="brAInwav LLC"
LABEL org.opencontainers.image.title="Cortex OS Documentation"
LABEL org.opencontainers.image.description="AI-native agent orchestration platform documentation"
LABEL org.opencontainers.image.licenses="MIT"

# Install security updates and required packages
RUN apk update && apk upgrade && apk add --no-cache \
    bash \
    curl \
    && rm -rf /var/cache/apk/*

# Create nginx user and directories
RUN addgroup -g 1001 -S nginx-docs && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx-docs -g nginx-docs nginx-docs

# Copy built documentation from builder stage
COPY --from=builder --chown=nginx-docs:nginx-docs /home/mkdocs/build/ /usr/share/nginx/html/

# Copy optimized Nginx configuration
COPY --chown=root:root nginx/nginx.conf /etc/nginx/nginx.conf
COPY --chown=root:root nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chown=root:root nginx/security-headers.conf /etc/nginx/conf.d/security-headers.conf
COPY --chown=root:root nginx/performance.conf /etc/nginx/conf.d/performance.conf

# Copy health check script
COPY --chown=root:root scripts/healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Security hardening
RUN chown -R nginx-docs:nginx-docs /var/cache/nginx /var/log/nginx \
    && chown -R nginx-docs:nginx-docs /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html

# Remove default nginx config and unnecessary files
RUN rm -f /etc/nginx/conf.d/default.conf.disabled \
    && rm -rf /usr/share/nginx/html/index.html

# Create necessary directories with proper permissions
RUN mkdir -p /var/cache/nginx/client_temp \
            /var/cache/nginx/proxy_temp \
            /var/cache/nginx/fastcgi_temp \
            /var/cache/nginx/uwsgi_temp \
            /var/cache/nginx/scgi_temp \
    && chown -R nginx-docs:nginx-docs /var/cache/nginx

# Switch to non-root user
USER nginx-docs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Stage 3: Development Environment (multi-target build)
FROM python:3.11-slim as development

# Development-specific packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Create development user
RUN useradd --create-home --shell /bin/bash --uid 1000 developer
USER developer
WORKDIR /workspace

# Install development dependencies
COPY --chown=developer:developer requirements-docs.txt requirements-dev.txt ./
RUN pip install --user -r requirements-docs.txt -r requirements-dev.txt

# Development server setup
EXPOSE 8000

# Development command
CMD ["mkdocs", "serve", "--dev-addr", "0.0.0.0:8000", "--livereload"]

# Stage 4: Testing Environment
FROM python:3.11-slim as testing

# Install testing dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    nodejs \
    npm \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Create test user
RUN useradd --create-home --shell /bin/bash --uid 1000 tester
USER tester
WORKDIR /tests

# Install test dependencies
COPY --chown=tester:tester requirements-test.txt package*.json ./
RUN pip install --user -r requirements-test.txt
RUN npm ci

# Copy test files
COPY --chown=tester:tester tests/ ./tests/
COPY --chown=tester:tester docs/ ./docs/
COPY --chown=tester:tester mkdocs.yml ./

# Test command
CMD ["python", "-m", "pytest", "tests/", "-v", "--cov=.", "--cov-report=html"]