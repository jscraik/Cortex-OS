import type { Envelope } from '@cortex-os/a2a-contracts';
import type { GitHubEventData } from './types.js';

export interface EnvelopeOptions {
	correlationId?: string;
	causationId?: string;
	ttlMs?: number;
	headers?: Record<string, string>;
}

export function adaptGitHubEventToEnvelope(
	githubEvent: GitHubEventData,
	options?: EnvelopeOptions,
): Envelope {
	return {
		id: crypto.randomUUID(),
		type: `github.${githubEvent.event_type}`,
		source: `urn:github:${githubEvent.repository.full_name}`,
		specversion: '1.0',
		time: new Date().toISOString(),
		data: githubEvent,
		headers: {
			'github-delivery': githubEvent.delivery_id,
			'github-event': githubEvent.event_type,
			...options?.headers,
		},
		correlationId: options?.correlationId,
		causationId: options?.causationId,
		ttlMs: options?.ttlMs || 300000, // 5 min for GitHub events
	};
}

export function extractGitHubEventType(envelope: Envelope): string | null {
	if (envelope.type.startsWith('github.')) {
		return envelope.type.substring(7); // Remove 'github.' prefix
	}
	return null;
}

export function isGitHubEventEnvelope(envelope: Envelope): boolean {
	return (
		envelope.type.startsWith('github.') &&
		envelope.headers?.['github-delivery'] !== undefined &&
		envelope.headers?.['github-event'] !== undefined
	);
}
