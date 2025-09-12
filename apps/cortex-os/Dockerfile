# syntax=docker/dockerfile:1.4

FROM --platform=$BUILDPLATFORM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /workspace
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install
# Build only the app and its deps
RUN pnpm build
RUN pnpm deploy /out/cortex-os

FROM node:20-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd -r nodegrp && useradd -r -g nodegrp nodeusr \
    && apt-get update && apt-get install -y --no-install-recommends tini curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /out/cortex-os .
USER nodeusr
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=2s --retries=3 CMD curl -fsS http://localhost:3000/health || exit 1

# Labels for OrbStack optimization
LABEL \
    org.opencontainers.image.title="Cortex OS Runtime" \
    org.opencontainers.image.description="ASBR Runtime orchestrator" \
    org.opencontainers.image.vendor="Cortex-OS" \
    org.opencontainers.image.source="https://github.com/your-org/cortex-os" \
    orbstack.optimize="true" \
    orbstack.node="true" \
    orbstack.platform="linux/arm64,linux/amd64"

ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["node","dist/server.js"]
