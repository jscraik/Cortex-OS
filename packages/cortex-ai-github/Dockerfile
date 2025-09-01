FROM node:20-alpine
WORKDIR /app

# Enable corepack and install deps
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

COPY package.json .npmrc* ./
RUN pnpm install --no-frozen-lockfile

COPY . .
RUN pnpm build

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "dist/server/start.js"]
