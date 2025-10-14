export type { Bus, EmitterOpts } from './emitter';
export { Telemetry } from './emitter';
export {
	createAdvancedRedaction,
	createRedactionFilter,
	DEFAULT_REDACTION_CONFIG,
} from './redaction';
export type { AgentEvent } from './types';
export {
	AgentEventSchema,
	EventName,
	isValidAgentEvent,
	Phase,
	validateAgentEvent,
} from './types';
export { createCompleteEvent, extractErrorMessage, generateCorrelationId } from './utils';
export { tracer, meter } from './otel-config.js';

