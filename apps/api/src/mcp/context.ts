import type { ToolExecutionContext } from '@cortex-os/mcp-core';

import type { ApiService } from '../core/api-service.js';
import type {
	AuditLogger,
	MetricsCollector,
	StructuredLogger,
} from '../core/observability.js';
import type { RequestRouter } from '../core/request-router.js';
import type { RouteDefinition } from '../core/types.js';

export interface ApiToolExecutionContext extends ToolExecutionContext {
	readonly service: ApiService;
	readonly router: RequestRouter;
	readonly logger: StructuredLogger;
	readonly metrics: MetricsCollector;
	readonly audit: AuditLogger;
	readonly routeOverride?: RouteDefinition;
}
