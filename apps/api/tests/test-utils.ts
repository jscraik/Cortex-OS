import { createDefaultApiService, type ApiHandler, type ApiService } from '../src/core/api-service.js';
import { createDefaultRouter } from '../src/core/request-router.js';
import type { RequestRouter } from '../src/core/request-router.js';
import { ResponseCache } from '../src/core/cache.js';
import { RateLimiter } from '../src/core/rate-limiter.js';
import { SecurityGuard } from '../src/core/security.js';
import { AuditLogger, MetricsCollector, PerformanceMonitor, StructuredLogger } from '../src/core/observability.js';
import { TransactionManager } from '../src/core/transaction.js';
import type { ApiToolExecutionContext } from '../src/mcp/context.js';
import { ApiGatewayTool, ApiRequestRoutingTool, ApiResponseHandlingTool } from '../src/mcp/tools.js';

export interface TestEnvironment {
  readonly service: ApiService;
  readonly router: RequestRouter;
  readonly logger: StructuredLogger;
  readonly metrics: MetricsCollector;
  readonly audit: AuditLogger;
  readonly context: ApiToolExecutionContext;
  readonly gatewayTool: ApiGatewayTool;
  readonly routingTool: ApiRequestRoutingTool;
  readonly responseTool: ApiResponseHandlingTool;
}

export interface SeedData {
  readonly users: Array<{ id: string; name: string }>;
}

export function createTestEnvironment(seed: SeedData = { users: [{ id: 'user-1', name: 'Test' }] }): TestEnvironment {
  const router = createDefaultRouter();
  const logger = new StructuredLogger();
  const metrics = new MetricsCollector();
  const audit = new AuditLogger();
  const performance = new PerformanceMonitor();
  const transactions = new TransactionManager();
  const handlers: Record<string, ApiHandler> = {
    'system.health': async () => ({
      statusCode: 200,
      body: { status: 'ok', uptime: 1 },
      headers: { 'content-type': 'application/json' },
    }),
    'users.listUsers': async () => ({
      statusCode: 200,
      body: { users: seed.users },
      headers: { 'content-type': 'application/json' },
    }),
    'orders.createOrder': async (request) => ({
      statusCode: 201,
      body: {
        orderId: `order-${request.metadata.requestId}`,
        payload: request.payload,
      },
      headers: { 'content-type': 'application/json' },
    }),
  };

  const service = createDefaultApiService({
    router,
    logger,
    metrics,
    audit,
    performance,
    transactions,
    security: new SecurityGuard({ acceptedApiKeys: ['valid-key'] }),
    rateLimiter: new RateLimiter({ windowMs: 1_000, maxRequests: 2 }),
    cache: new ResponseCache(60),
    handlers,
  });

  const context: ApiToolExecutionContext = {
    service,
    router,
    logger,
    metrics,
    audit,
  };

  return {
    service,
    router,
    logger,
    metrics,
    audit,
    context,
    gatewayTool: new ApiGatewayTool(),
    routingTool: new ApiRequestRoutingTool(),
    responseTool: new ApiResponseHandlingTool(),
  };
}
