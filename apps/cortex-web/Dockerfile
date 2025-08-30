# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* package-lock.json* yarn.lock* ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev || npm ci --omit=dev --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm run build || npm run build:prod || true

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp
RUN apk add --no-cache tini curl
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app .
USER nodeusr
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=2s --retries=3 CMD curl -fsS http://localhost:3000/health || exit 1
ENTRYPOINT ["/sbin/tini","--"]
CMD ["npm","run","start"]

