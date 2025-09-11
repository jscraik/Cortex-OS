# syntax=docker/dockerfile:1.4

# Base with pnpm enabled - OrbStack optimized
FROM --platform=$BUILDPLATFORM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Build full monorepo and deploy pruned app
FROM base AS build
WORKDIR /workspace
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install
# Build only the target package and its workspace deps
RUN pnpm -r --filter @cortex-os/model-gateway... build
# Create pruned, production-only package for model-gateway
RUN pnpm --filter @cortex-os/model-gateway --prod deploy /out/model-gateway

# Runtime image
FROM node:20-slim AS runner
ENV NODE_ENV=production
ENV OLLAMA_AVAILABLE=true
WORKDIR /app
RUN groupadd -r nodegrp && useradd -r -g nodegrp nodeusr \
    && apt-get update && apt-get install -y --no-install-recommends \
        tini curl python3 python3-pip \
    && pip3 install --no-cache-dir numpy mlx mlx-lm mlx-vlm torch instructor openai \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /out/model-gateway .
USER nodeusr
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=2s --retries=3 CMD curl -fsS http://localhost:8080/health || exit 1

# Labels for OrbStack optimization
LABEL \
    org.opencontainers.image.title="Model Gateway" \
    org.opencontainers.image.description="AI model routing and policy enforcement gateway" \
    org.opencontainers.image.vendor="Cortex-OS" \
    org.opencontainers.image.source="https://github.com/your-org/cortex-os" \
    orbstack.optimize="true" \
    orbstack.node="true" \
    orbstack.service="model-gateway"

ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["node","src/server.js"]
