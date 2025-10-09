// A2A Events - Main Export
export const A2A_EVENTS_VERSION = '1.0.0';

export * from './cortex/index.js';
export type { EnvelopeOptions } from './github/adapter.js';
// GitHub event adapters
export {
	adaptGitHubEventToEnvelope,
	extractGitHubEventType,
	isGitHubEventEnvelope,
} from './github/adapter.js';
// Core types and functions
export type { A2AEventEnvelope } from './types.js';
export {
	A2AEventEnvelopeSchema,
	createA2AEventEnvelope,
	isA2AEventEnvelope,
	validateA2AEventEnvelope,
} from './types.js';
