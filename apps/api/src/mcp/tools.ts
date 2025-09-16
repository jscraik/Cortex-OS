import type { McpTool } from '@cortex-os/mcp-core';
import { ToolExecutionError, ToolValidationError } from '@cortex-os/mcp-core';
import { z } from 'zod';

import { ApiServiceError } from '../core/api-service.js';
import { sanitizeHeaders, sanitizePayload } from '../core/sanitizer.js';
import { RateLimitError } from '../core/rate-limiter.js';
import { SecurityError } from '../core/security.js';
import type { ApiToolExecutionContext } from './context.js';
import {
  errorResponseSchema,
  gatewayRequestSchema,
  gatewayResponseSchema,
  responseHandlingInputSchema,
  responseHandlingResultSchema,
  routingRequestSchema,
  routingResponseSchema,
  type GatewayToolInput,
  type GatewayToolResult,
  type ResponseHandlingInput,
  type ResponseHandlingResult,
  type RoutingToolInput,
  type RoutingToolResult,
} from './schemas.js';
import {
  McpApiError,
  McpHandlerError,
  McpRateLimitError,
  McpRouteNotFoundError,
  McpSecurityError,
  McpValidationError,
} from './errors.js';

function assertContext(context: ApiToolExecutionContext | undefined): asserts context is ApiToolExecutionContext {
  if (!context) {
    throw new ToolExecutionError('API MCP tools require an ApiToolExecutionContext.', { code: 'E_API_CONTEXT' });
  }
}

export class ApiGatewayTool implements McpTool<GatewayToolInput, GatewayToolResult> {
  readonly name = 'api-gateway';
  readonly description = 'Executes API gateway operations via the Cortex-OS service layer.';
  readonly inputSchema = gatewayRequestSchema;

  async execute(input: GatewayToolInput, context?: ApiToolExecutionContext): Promise<GatewayToolResult> {
    assertContext(context);
    const parsed = this.parseInput(input);

    try {
      const result = await context.service.execute(parsed);
      context.metrics.increment('mcp.tools.api-gateway.success');
      return gatewayResponseSchema.parse(result);
    } catch (error) {
      context.metrics.increment('mcp.tools.api-gateway.failure');
      if (error instanceof SecurityError) {
        throw new McpSecurityError(error.message);
      }
      if (error instanceof RateLimitError) {
        throw new McpRateLimitError(error.message);
      }
      if (error instanceof ApiServiceError) {
        if (error.code === 'E_ROUTE_NOT_FOUND') {
          throw new McpRouteNotFoundError(error.details ?? {});
        }
        throw new McpHandlerError(error.message, error);
      }
      if (error instanceof ToolValidationError) {
        throw error;
      }
      throw new McpApiError('Unexpected failure during API execution.', { cause: error });
    }
  }

  private parseInput(input: GatewayToolInput): GatewayToolInput {
    const parsed = gatewayRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new McpValidationError('Invalid payload for api-gateway tool.', parsed.error.issues);
    }
    return parsed.data;
  }
}

export class ApiRequestRoutingTool implements McpTool<RoutingToolInput, RoutingToolResult> {
  readonly name = 'api-request-routing';
  readonly description = 'Resolves HTTP requests to their registered API routes and schemas.';
  readonly inputSchema = routingRequestSchema;

  async execute(input: RoutingToolInput, context?: ApiToolExecutionContext): Promise<RoutingToolResult> {
    assertContext(context);
    const parsed = routingRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new McpValidationError('Invalid routing request payload.', parsed.error.issues);
    }

    try {
      const route = parsed.data.operationId
        ? context.router.resolveById(parsed.data.operationId)
        : context.router.resolve(parsed.data.method, parsed.data.path);
      context.metrics.increment('mcp.tools.api-routing.success');
      return routingResponseSchema.parse(route);
    } catch (error) {
      context.metrics.increment('mcp.tools.api-routing.failure');
      throw new McpRouteNotFoundError({ input });
    }
  }
}

export class ApiResponseHandlingTool implements McpTool<ResponseHandlingInput, ResponseHandlingResult> {
  readonly name = 'api-response-handler';
  readonly description = 'Normalizes API responses and extracts MCP-ready metadata.';
  readonly inputSchema = responseHandlingInputSchema;

  async execute(input: ResponseHandlingInput, context?: ApiToolExecutionContext): Promise<ResponseHandlingResult> {
    assertContext(context);
    const parsed = responseHandlingInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new McpValidationError('Invalid response payload.', parsed.error.issues);
    }

    const route = context.router.resolveById(parsed.data.routeId);
    const sanitizedBody = sanitizePayload(parsed.data.rawBody);
    const headers = sanitizeHeaders(parsed.data.headers);

    const metadata = {
      requestId: parsed.data.requestId,
      correlationId: parsed.data.correlationId,
      routeId: route.route.id,
      durationMs: parsed.data.durationMs,
    } satisfies Record<string, unknown>;

    const normalized =
      parsed.data.statusCode >= 200 && parsed.data.statusCode < 300
        ? ({
            status: 'success',
            body: sanitizedBody,
            headers,
            metadata,
          } satisfies ResponseHandlingResult)
        : ({
            status: 'error',
            body: errorResponseSchema.parse({
              code: 'E_API_HANDLER',
              message: 'API responded with non-success status code.',
              details: {
                statusCode: parsed.data.statusCode,
                body: sanitizedBody,
              },
            }),
            headers,
            metadata,
          } satisfies ResponseHandlingResult);

    context.metrics.increment('mcp.tools.api-response.handled');
    return responseHandlingResultSchema.parse(normalized);
  }
}

export const apiTools: readonly McpTool[] = [
  new ApiGatewayTool(),
  new ApiRequestRoutingTool(),
  new ApiResponseHandlingTool(),
];

export type ApiGatewayToolType = ApiGatewayTool;
export type ApiRequestRoutingToolType = ApiRequestRoutingTool;
export type ApiResponseHandlingToolType = ApiResponseHandlingTool;
