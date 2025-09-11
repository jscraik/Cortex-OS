# Multi-stage Dockerfile for ASBR with security optimization
# Based on distroless images for minimal attack surface

# Stage 1: Build dependencies and compile TypeScript
FROM node:20-alpine AS builder

# Install security updates and build tools
RUN apk update && apk upgrade && \
    apk add --no-cache \
        python3 \
        make \
        g++ \
        git \
        curl && \
    rm -rf /var/cache/apk/*

# Create non-root user for build process
RUN addgroup -g 1001 -S builduser && \
    adduser -S builduser -u 1001 -G builduser

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/asbr/package.json ./packages/asbr/

# Install pnpm and dependencies
RUN npm install -g pnpm@10.13.1 && \
    pnpm install --frozen-lockfile --prod=false

# Copy source code
COPY packages/asbr ./packages/asbr/
COPY apps/cortex-os/packages/sdk ./packages/sdk/
COPY packages/orchestration ./packages/orchestration/
COPY packages/mcp ./packages/mcp/
COPY packages/security ./packages/security/
COPY packages/accessibility ./packages/accessibility/
COPY turbo.json tsconfig.json ./

# Build the ASBR package
RUN pnpm -F @cortex-os/asbr build

# Verify build outputs
RUN test -f packages/asbr/dist/index.js && \
    test -f packages/asbr/dist/api.js && \
    test -f packages/asbr/dist/sdk.js

# Stage 2: Production dependencies only
FROM node:20-alpine AS deps

# Install security updates
RUN apk update && apk upgrade && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/asbr/package.json ./packages/asbr/

# Install production dependencies only
RUN npm install -g pnpm@10.13.1 && \
    pnpm install --frozen-lockfile --prod=true && \
    pnpm store prune

# Stage 3: Security scanning base
FROM aquasec/trivy:latest AS security-scanner

# Stage 4: Runtime image with distroless base
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS runtime

# Set labels for container metadata
LABEL org.opencontainers.image.title="ASBR - Agentic Second-Brain Runtime"
LABEL org.opencontainers.image.description="Brain-only orchestration and knowledge runtime for Cortex-OS"
LABEL org.opencontainers.image.vendor="Cortex-OS"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/cortex-os/cortex-os"
LABEL org.opencontainers.image.documentation="https://docs.cortex-os.com/asbr/"

# Security labels
LABEL security.scan="enabled"
LABEL security.owasp-llm="v2.0"
LABEL security.wcag="2.2-AA"

# Set working directory
WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=deps --chown=nonroot:nonroot /app/packages/asbr/node_modules ./packages/asbr/node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nonroot:nonroot /app/packages/asbr/dist ./packages/asbr/dist
COPY --from=builder --chown=nonroot:nonroot /app/packages/asbr/package.json ./packages/asbr/

# Create XDG directories for ASBR runtime
USER nonroot:nonroot
RUN mkdir -p /home/nonroot/.config/cortex-asbr && \
    mkdir -p /home/nonroot/.local/share/cortex-asbr && \
    mkdir -p /home/nonroot/.cache/cortex-asbr

# Set XDG environment variables
ENV XDG_CONFIG_HOME=/home/nonroot/.config
ENV XDG_DATA_HOME=/home/nonroot/.local/share
ENV XDG_CACHE_HOME=/home/nonroot/.cache

# Application environment
ENV NODE_ENV=production
ENV PORT=7439
ENV ASBR_BIND_HOST=0.0.0.0
ENV ASBR_LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD ["/nodejs/bin/node", "-e", "require('http').get('http://localhost:7439/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]

# Expose ASBR API port
EXPOSE 7439

# Use explicit entry point for security
ENTRYPOINT ["/nodejs/bin/node"]
CMD ["packages/asbr/dist/index.js"]

# Stage 5: Development image with debugging tools
FROM node:20-alpine AS development

# Install debugging and development tools
RUN apk update && apk upgrade && \
    apk add --no-cache \
        curl \
        netcat-openbsd \
        htop \
        vim \
        git && \
    rm -rf /var/cache/apk/*

# Create development user
RUN addgroup -g 1001 -S devuser && \
    adduser -S devuser -u 1001 -G devuser

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.13.1

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/asbr/package.json ./packages/asbr/

# Install all dependencies including dev dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/asbr ./packages/asbr/
COPY apps/cortex-os/packages/sdk ./packages/sdk/
COPY packages/orchestration ./packages/orchestration/
COPY packages/mcp ./packages/mcp/
COPY packages/security ./packages/security/
COPY packages/accessibility ./packages/accessibility/
COPY turbo.json tsconfig.json ./

# Change ownership to dev user
RUN chown -R devuser:devuser /app

USER devuser:devuser

# Create XDG directories
RUN mkdir -p /home/devuser/.config/cortex-asbr && \
    mkdir -p /home/devuser/.local/share/cortex-asbr && \
    mkdir -p /home/devuser/.cache/cortex-asbr

# Development environment
ENV NODE_ENV=development
ENV PORT=7439
ENV ASBR_BIND_HOST=0.0.0.0
ENV ASBR_LOG_LEVEL=debug
ENV XDG_CONFIG_HOME=/home/devuser/.config
ENV XDG_DATA_HOME=/home/devuser/.local/share
ENV XDG_CACHE_HOME=/home/devuser/.cache

EXPOSE 7439 9229

# Development command with hot reload
CMD ["pnpm", "-F", "@cortex-os/asbr", "dev"]

# Stage 6: Testing image for CI/CD
FROM node:20-alpine AS testing

# Install test dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
        curl \
        git && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.13.1

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/asbr/package.json ./packages/asbr/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source and test files
COPY packages/asbr ./packages/asbr/
COPY apps/cortex-os/packages/sdk ./packages/sdk/
COPY packages/orchestration ./packages/orchestration/
COPY packages/mcp ./packages/mcp/
COPY packages/security ./packages/security/
COPY packages/accessibility ./packages/accessibility/
COPY turbo.json tsconfig.json ./

# Create test user
RUN addgroup -g 1001 -S testuser && \
    adduser -S testuser -u 1001 -G testuser && \
    chown -R testuser:testuser /app

USER testuser:testuser

# Test environment
ENV NODE_ENV=test
ENV CI=true

# Default test command
CMD ["pnpm", "-F", "@cortex-os/asbr", "test:coverage"]
