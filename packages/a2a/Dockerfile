# A2A Protocol Server - Production Container
# Multi-stage build for optimal image size and security

# Stage 1: Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY tsconfig.json vitest.docker.config.ts ./

# Install pnpm
RUN npm install -g pnpm@10.13.1

# Install dependencies
RUN pnpm install

# Copy source code
COPY src/ ./src/

# Build the application
RUN pnpm build

# Stage 2: Production runtime
FROM node:22-alpine AS runtime

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S a2a && \
    adduser -S a2a -u 1001 -G a2a

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install pnpm and production dependencies only
RUN npm install -g pnpm@10.13.1 && \
    pnpm install --prod && \
    npm cache clean --force && \
    pnpm store prune

# Copy built application from builder stage
COPY --from=builder --chown=a2a:a2a /app/dist ./dist
COPY --from=builder --chown=a2a:a2a /app/src ./src

# Create app server script
COPY --chown=a2a:a2a <<EOF ./server.js
#!/usr/bin/env node

import { createServer } from 'http';
import { handleA2A } from './dist/index.js';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = createServer(async (req, res) => {
  // Handle health check first
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'a2a-protocol-server',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const jsonRpcRequest = JSON.parse(body);
        const response = await handleA2A(jsonRpcRequest);
        
        res.writeHead(200);
        res.end(response);
      } catch (error) {
        console.error('Request processing error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32603,
            message: 'Internal server error',
            data: { error: error.message }
          }
        }));
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

server.listen(PORT, HOST, () => {
  console.log(\`A2A Protocol Server running on http://\${HOST}:\${PORT}\`);
  console.log('Health check available at /health');
  console.log('A2A JSON-RPC endpoint available at /');
});
EOF

RUN chmod +x ./server.js

# Switch to non-root user
USER a2a

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.setTimeout(2000, () => process.exit(1));"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "server.js"]

# Metadata
LABEL maintainer="Cortex-OS Team" \
      version="1.0.0" \
      description="A2A Protocol Server - JSON-RPC 2.0 compliant agent-to-agent communication" \
      org.opencontainers.image.source="https://github.com/cortex-os/a2a" \
      org.opencontainers.image.documentation="https://docs.cortex-os.dev/a2a" \
      org.opencontainers.image.version="1.0.0"