/**
 * @file Health Routes
 * @description Health check endpoints
 */

import type { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  // Basic health check
  fastify.get('/health', {
    schema: {
      tags: ['health'],
      summary: 'Health check',
      description: 'Basic health check endpoint',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  });

  // Detailed health check
  fastify.get('/health/detailed', {
    schema: {
      tags: ['health'],
      summary: 'Detailed health check',
      description: 'Detailed health check with system information',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            memory: { type: 'object' },
            registries: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const memoryUsage = process.memoryUsage();
    
    // Check registry health
    const registries = await fastify.registryService.listRegistries();
    const registryHealth = registries.reduce((acc, registry) => {
      acc[registry.name] = {
        healthy: registry.healthy,
        lastUpdated: registry.lastUpdated,
        serverCount: registry.serverCount
      };
      return acc;
    }, {} as Record<string, any>);
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      registries: registryHealth
    };
  });

  // Readiness check
  fastify.get('/ready', {
    schema: {
      tags: ['health'],
      summary: 'Readiness check',
      description: 'Check if service is ready to accept requests',
      response: {
        200: {
          type: 'object',
          properties: {
            ready: { type: 'boolean' },
            checks: { type: 'object' }
          }
        },
        503: {
          type: 'object',
          properties: {
            ready: { type: 'boolean' },
            checks: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const checks: Record<string, boolean> = {};
    let allReady = true;
    
    // Check if at least one registry is available
    try {
      const registries = await fastify.registryService.listRegistries();
      const healthyRegistries = registries.filter(r => r.healthy);
      checks.registries = healthyRegistries.length > 0;
      if (!checks.registries) allReady = false;
    } catch (error) {
      checks.registries = false;
      allReady = false;
    }
    
    // Check memory usage (fail if over 90% heap used)
    const memoryUsage = process.memoryUsage();
    const heapUsagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
    checks.memory = heapUsagePercent < 0.9;
    if (!checks.memory) allReady = false;
    
    const status = allReady ? 200 : 503;
    
    return reply.status(status).send({
      ready: allReady,
      checks
    });
  });
}