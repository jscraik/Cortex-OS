import { describe, expect, expectTypeOf, it } from 'vitest';

import {
        observabilityMcpTools,
        type AlertQueryInput,
        type DashboardRequestInput,
        type LogSearchInput,
        type MetricRetrievalInput,
        type ObservabilityTool,
        type TraceQueryInput,
} from '../src/index.js';

describe('observability public index', () => {
        it('re-exports MCP tool contract and input types', () => {
                expectTypeOf<ObservabilityTool>().toBeObject();
                expectTypeOf<TraceQueryInput>().toBeObject();
                expectTypeOf<LogSearchInput>().toBeObject();
                expectTypeOf<MetricRetrievalInput>().toBeObject();
                expectTypeOf<AlertQueryInput>().toBeObject();
                expectTypeOf<DashboardRequestInput>().toBeObject();
        });

        it('exposes observability MCP tools for runtime usage', () => {
                expect(Array.isArray(observabilityMcpTools)).toBe(true);
        });
});
