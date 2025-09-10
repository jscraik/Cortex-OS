import type { Handler } from '@cortex-os/a2a-core/bus';
import { meter } from '@cortex-os/telemetry';

const counter = meter.createCounter('a2a.handler.calls');
export function withMetrics(handler: Handler): Handler {
	return {
		type: handler.type,
		handle: async (m) => {
			counter.add(1, { type: handler.type });
			return handler.handle(m);
		},
	};
}
