/**
 * @file Marketplace API Application
 * @description Fastify app setup for MCP marketplace API
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { MarketplaceService } from './services/marketplace-service.js';
import { RegistryService } from './services/registry-service.js';
import { healthRoutes } from './routes/health.js';
import { serverRoutes } from './routes/servers.js';
import { registryRoutes } from './routes/registries.js';
import { categoryRoutes } from './routes/categories.js';
import { statsRoutes } from './routes/stats.js';

export interface AppConfig {
  logger?: boolean;
  registries: Record<string, string>;
  cacheDir: string;
  cacheTtl: number;
  port?: number;
  host?: string;
}

const AppConfigSchema = z.object({
  logger: z.boolean().optional().default(true),
  registries: z.record(z.string().url()),
  cacheDir: z.string().min(1),
  cacheTtl: z.number().positive(),
  port: z.number().optional().default(3000),
  host: z.string().optional().default('0.0.0.0')
});

export function build(config: AppConfig): FastifyInstance {
  // Validate configuration
  const validatedConfig = AppConfigSchema.parse(config);

  // Create Fastify instance
  const fastify = Fastify({
    logger: validatedConfig.logger ? {
      level: 'info',
      transport: {
        target: 'pino-pretty'
      }
    } : false
  });

  // Initialize services
  const registryService = new RegistryService({
    registries: validatedConfig.registries,
    cacheDir: validatedConfig.cacheDir,
    cacheTtl: validatedConfig.cacheTtl
  });

  const marketplaceService = new MarketplaceService(registryService);

  // Add context to fastify instance
  fastify.decorate('registryService', registryService);
  fastify.decorate('marketplaceService', marketplaceService);

  // Register plugins
  registerPlugins(fastify);

  // Register routes
  registerRoutes(fastify);

  // Error handler
  fastify.setErrorHandler(async (error, request, reply) => {
    const statusCode = error.statusCode || 500;
    
    fastify.log.error(error, 'Request failed');

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  });

  // 404 handler
  fastify.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`
      }
    });
  });

  return fastify;
}

function registerPlugins(fastify: FastifyInstance): void {
  // Security
  fastify.register(helmet, {
    contentSecurityPolicy: false // Disable for Swagger UI
  });

  // CORS
  fastify.register(cors, {
    origin: [
      'https://cortex-os.dev',
      'https://claude.ai',
      'https://cline.bot',
      'https://devin.ai',
      /^https:\/\/.*\.anthropic\.com$/,
      /^http:\/\/localhost:\d+$/
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
  });

  // Rate limiting
  fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => ({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Too many requests. Try again in ${context.ttl} seconds.`,
        retryAfter: context.ttl
      }
    })
  });

  // Swagger documentation
  fastify.register(swagger, {
    swagger: {
      info: {
        title: 'Cortex MCP Marketplace API',
        description: 'API for discovering and managing MCP servers',
        version: '1.0.0'
      },
      host: 'api.cortex-os.dev',
      schemes: ['https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'servers', description: 'MCP server operations' },
        { name: 'registries', description: 'Registry management' },
        { name: 'categories', description: 'Server categories' },
        { name: 'stats', description: 'Marketplace statistics' },
        { name: 'health', description: 'Health checks' }
      ]
    }
  });

  fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      }
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });
}

function registerRoutes(fastify: FastifyInstance): void {
  // API routes
  fastify.register(healthRoutes);
  fastify.register(serverRoutes, { prefix: '/api/v1' });
  fastify.register(registryRoutes, { prefix: '/api/v1' });
  fastify.register(categoryRoutes, { prefix: '/api/v1' });
  fastify.register(statsRoutes, { prefix: '/api/v1' });

  // Root redirect to documentation
  fastify.get('/', async (request, reply) => {
    return reply.redirect('/documentation');
  });
}

// Extend Fastify instance types
declare module 'fastify' {
  interface FastifyInstance {
    registryService: RegistryService;
    marketplaceService: MarketplaceService;
  }
}