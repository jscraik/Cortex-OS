FROM node:22-slim AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages
COPY libs ./libs
RUN corepack enable pnpm \
 && pnpm install --filter @cortex-os/local-memory... \
 && pnpm --filter @cortex-os/local-memory build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/cortex-os/packages/local-memory/dist ./dist
COPY --from=builder /app/apps/cortex-os/packages/local-memory/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN corepack enable pnpm \
 && pnpm install --prod --filter @cortex-os/local-memory...
CMD ["node", "./dist/server.js"]
