// A2A Events - Main Export
export const A2A_EVENTS_VERSION = '1.0.0';

export type { EnvelopeOptions } from './github/adapter';
// GitHub event adapters
export {
	adaptGitHubEventToEnvelope,
	extractGitHubEventType,
	isGitHubEventEnvelope,
} from './github/adapter';
// Core types and functions
export type { A2AEventEnvelope } from './types';
export {
	A2AEventEnvelopeSchema,
	createA2AEventEnvelope,
	isA2AEventEnvelope,
	validateA2AEventEnvelope,
} from './types';
