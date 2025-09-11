# Multi-stage Node.js build for Agents package
FROM --platform=$BUILDPLATFORM node:20-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /workspace
# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Copy all package.json files for dependency resolution
COPY packages/*/package.json ./packages/*/
COPY packages/agents/package.json ./packages/agents/
# Install all dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /workspace
# Copy dependencies and workspace
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/packages ./packages
COPY packages/agents ./packages/agents
# Build the agents package
RUN pnpm --filter @cortex-os/agents build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    tini \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r agents && useradd -r -g agents agents

# Copy built application from build stage
COPY --from=build /workspace/packages/agents/dist ./dist
COPY --from=build /workspace/packages/agents/package.json ./
COPY --from=build /workspace/packages/agents/node_modules ./node_modules

# Set ownership
RUN chown -R agents:agents /app

# Switch to non-root user
USER agents

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

# Labels for OrbStack optimization
LABEL \
    org.opencontainers.image.title="Cortex Agents" \
    org.opencontainers.image.description="AI agent workers and orchestration" \
    org.opencontainers.image.vendor="Cortex-OS" \
    org.opencontainers.image.source="https://github.com/your-org/cortex-os" \
    orbstack.optimize="true" \
    orbstack.node="true" \
    orbstack.service="agents"

# Use tini as PID 1
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start the agents worker
CMD ["node", "dist/worker.js"]
