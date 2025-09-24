// GitHub A2A Events - Main Export
export const GITHUB_A2A_EVENTS_VERSION = '1.0.0';

// Event Envelope and Routing
export * from './envelope.js';
export * from './error.js';
export * from './issue.js';
export * from './pull-request.js';
// Core Event Types
export * from './repository.js';
export * from './routing.js';
export * from './workflow.js';

import { type A2AEventEnvelope, createA2AEventEnvelope, type GitHubEventData } from './envelope.js';
import { type ErrorEvent, isErrorEvent, validateErrorEvent } from './error.js';

import { type IssueEvent, isIssueEvent, validateIssueEvent } from './issue.js';
import {
	isPullRequestEvent,
	type PullRequestEvent,
	validatePullRequestEvent,
} from './pull-request.js';
// Type Guards and Validators
import { isRepositoryEvent, type RepositoryEvent, validateRepositoryEvent } from './repository.js';
import { isWorkflowEvent, validateWorkflowEvent, type WorkflowEvent } from './workflow.js';

// Union type for all GitHub events
export type GitHubEvent =
	| RepositoryEvent
	| PullRequestEvent
	| IssueEvent
	| WorkflowEvent
	| ErrorEvent;

type ActionableGitHubEvent = GitHubEvent & { action: string };

const hasAction = (event: GitHubEvent): event is ActionableGitHubEvent =>
	'event_type' in event &&
	'action' in event &&
	typeof (event as { action?: unknown }).action === 'string';

// Comprehensive event type guard
export function isGitHubEvent(data: unknown): data is GitHubEvent {
	return (
		isRepositoryEvent(data) ||
		isPullRequestEvent(data) ||
		isIssueEvent(data) ||
		isWorkflowEvent(data) ||
		isErrorEvent(data)
	);
}

// Comprehensive event validator
export function validateGitHubEvent(data: unknown): GitHubEvent {
	if (isRepositoryEvent(data)) {
		return validateRepositoryEvent(data);
	}
	if (isPullRequestEvent(data)) {
		return validatePullRequestEvent(data);
	}
	if (isIssueEvent(data)) {
		return validateIssueEvent(data);
	}
	if (isWorkflowEvent(data)) {
		return validateWorkflowEvent(data);
	}
	if (isErrorEvent(data)) {
		return validateErrorEvent(data);
	}

	throw new Error('Invalid GitHub event data: does not match any known event schema');
}

// Event type detection
export function getGitHubEventType(data: unknown): string | null {
	if (!data || typeof data !== 'object' || !('event_type' in data)) {
		return null;
	}

	const eventType = (data as { event_type: unknown }).event_type;
	if (typeof eventType !== 'string') {
		return null;
	}

	const validTypes = [
		'github.repository',
		'github.pull_request',
		'github.issue',
		'github.workflow',
		'github.error',
	];

	return validTypes.includes(eventType) ? eventType : null;
}

// Event Statistics and Analytics
export interface GitHubEventStats {
	totalEvents: number;
	eventsByType: Record<string, number>;
	eventsByAction: Record<string, number>;
	uniqueRepositories: number;
	uniqueActors: number;
	timeSpan: {
		earliest: string;
		latest: string;
		durationHours: number;
	};
	averageEventsPerHour: number;
	topRepositories: Array<{ name: string; count: number }>;
	topActors: Array<{ login: string; count: number }>;
}

export function analyzeGitHubEvents(events: GitHubEvent[]): GitHubEventStats {
	if (events.length === 0) {
		const now = new Date().toISOString();
		return {
			totalEvents: 0,
			eventsByType: {},
			eventsByAction: {},
			uniqueRepositories: 0,
			uniqueActors: 0,
			timeSpan: {
				earliest: now,
				latest: now,
				durationHours: 0,
			},
			averageEventsPerHour: 0,
			topRepositories: [],
			topActors: [],
		};
	}

	const stats: GitHubEventStats = {
		totalEvents: events.length,
		eventsByType: {},
		eventsByAction: {},
		uniqueRepositories: 0,
		uniqueActors: 0,
		timeSpan: {
			earliest: events[0].timestamp,
			latest: events[0].timestamp,
			durationHours: 0,
		},
		averageEventsPerHour: 0,
		topRepositories: [],
		topActors: [],
	};

	const repositories = new Set<string>();
	const actors = new Set<string>();
	const repoCount = new Map<string, number>();
	const actorCount = new Map<string, number>();

	let earliestTime = new Date(events[0].timestamp);
	let latestTime = new Date(events[0].timestamp);

	for (const event of events) {
		// Count by type
		stats.eventsByType[event.event_type] = (stats.eventsByType[event.event_type] || 0) + 1;

		// Count by action (if present)
		if (hasAction(event)) {
			const action = event.action;
			stats.eventsByAction[action] = (stats.eventsByAction[action] || 0) + 1;
		}

		// Track repositories
		if ('repository' in event && event.repository) {
			const repoName = event.repository.full_name;
			repositories.add(repoName);
			repoCount.set(repoName, (repoCount.get(repoName) || 0) + 1);
		}

		// Track actors
		if ('actor' in event && event.actor) {
			const actorLogin = event.actor.login;
			actors.add(actorLogin);
			actorCount.set(actorLogin, (actorCount.get(actorLogin) || 0) + 1);
		}

		// Track time span
		const eventTime = new Date(event.timestamp);
		if (eventTime < earliestTime) {
			earliestTime = eventTime;
			stats.timeSpan.earliest = event.timestamp;
		}
		if (eventTime > latestTime) {
			latestTime = eventTime;
			stats.timeSpan.latest = event.timestamp;
		}
	}

	// Calculate derived stats
	stats.uniqueRepositories = repositories.size;
	stats.uniqueActors = actors.size;
	stats.timeSpan.durationHours = (latestTime.getTime() - earliestTime.getTime()) / (1000 * 60 * 60);
	stats.averageEventsPerHour =
		stats.timeSpan.durationHours > 0 ? stats.totalEvents / stats.timeSpan.durationHours : 0;

	// Top repositories
	stats.topRepositories = Array.from(repoCount.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10)
		.map(([name, count]) => ({ name, count }));

	// Top actors
	stats.topActors = Array.from(actorCount.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10)
		.map(([login, count]) => ({ login, count }));

	return stats;
}

// Event Filtering Utilities
export interface GitHubEventFilter {
	eventTypes?: string[];
	actions?: string[];
	repositoryNames?: string[];
	actorLogins?: string[];
	dateRange?: {
		start: string;
		end: string;
	};
	labels?: Record<string, string>;
}

export function filterGitHubEvents(
	events: GitHubEvent[],
	filter: GitHubEventFilter,
): GitHubEvent[] {
	return events.filter((event) => {
		// Filter by event type
		if (filter.eventTypes && !filter.eventTypes.includes(event.event_type)) {
			return false;
		}

		// Filter by action
		if (filter.actions && hasAction(event)) {
			const action = event.action;
			if (!filter.actions.includes(action)) {
				return false;
			}
		}

		// Filter by repository
		if (filter.repositoryNames && 'repository' in event && event.repository) {
			if (!filter.repositoryNames.includes(event.repository.full_name)) {
				return false;
			}
		}

		// Filter by actor
		if (filter.actorLogins && 'actor' in event && event.actor) {
			if (!filter.actorLogins.includes(event.actor.login)) {
				return false;
			}
		}

		// Filter by date range
		if (filter.dateRange) {
			const eventTime = new Date(event.timestamp);
			const startTime = new Date(filter.dateRange.start);
			const endTime = new Date(filter.dateRange.end);

			if (eventTime < startTime || eventTime > endTime) {
				return false;
			}
		}

		return true;
	});
}

// Batch Processing Utilities
export function createGitHubEventBatch(
	events: GitHubEvent[],
	options?: {
		batchSize?: number;
		groupBy?: 'type' | 'repository' | 'actor';
		priority?: 'low' | 'normal' | 'high' | 'critical';
	},
): A2AEventEnvelope[] {
	const batchSize = options?.batchSize ?? 100;
	const batches: GitHubEvent[][] = [];

	// Group events if requested
	if (options?.groupBy) {
		const groups = groupEvents(events, options.groupBy);
		for (const group of Array.from(groups.values())) {
			// Split large groups into smaller batches
			for (let i = 0; i < group.length; i += batchSize) {
				batches.push(group.slice(i, i + batchSize));
			}
		}
	} else {
		// Simple batching
		for (let i = 0; i < events.length; i += batchSize) {
			batches.push(events.slice(i, i + batchSize));
		}
	}

	// Create envelopes for each batch
	return batches
		.filter((batch) => batch.length > 0)
		.map((batch) =>
			createA2AEventEnvelope(batch[0] as GitHubEventData, {
				priority: options?.priority,
				metadata: {
					labels: {
						batch_size: batch.length.toString(),
						batch_type: options?.groupBy || 'sequence',
					},
				},
			}),
		);
}

function groupEvents(
	events: GitHubEvent[],
	groupBy: 'type' | 'repository' | 'actor',
): Map<string, GitHubEvent[]> {
	const groups = new Map<string, GitHubEvent[]>();

	for (const event of events) {
		let key: string;

		switch (groupBy) {
			case 'type':
				key = event.event_type;
				break;
			case 'repository':
				key = 'repository' in event && event.repository ? event.repository.full_name : 'unknown';
				break;
			case 'actor':
				key = 'actor' in event && event.actor ? event.actor.login : 'unknown';
				break;
		}

		if (!groups.has(key)) {
			groups.set(key, []);
		}
		groups.get(key)?.push(event);
	}

	return groups;
}

// Event Stream Processing
export interface EventStreamProcessor {
	onRepositoryEvent?: (event: RepositoryEvent) => Promise<void>;
	onPullRequestEvent?: (event: PullRequestEvent) => Promise<void>;
	onIssueEvent?: (event: IssueEvent) => Promise<void>;
	onWorkflowEvent?: (event: WorkflowEvent) => Promise<void>;
	onErrorEvent?: (event: ErrorEvent) => Promise<void>;
	onUnknownEvent?: (data: unknown) => Promise<void>;
}

export async function processEventStream(
	events: unknown[],
	processor: EventStreamProcessor,
): Promise<{ processed: number; errors: number }> {
	let processed = 0;
	let errors = 0;

	for (const eventData of events) {
		try {
			if (isRepositoryEvent(eventData) && processor.onRepositoryEvent) {
				await processor.onRepositoryEvent(eventData);
			} else if (isPullRequestEvent(eventData) && processor.onPullRequestEvent) {
				await processor.onPullRequestEvent(eventData);
			} else if (isIssueEvent(eventData) && processor.onIssueEvent) {
				await processor.onIssueEvent(eventData);
			} else if (isWorkflowEvent(eventData) && processor.onWorkflowEvent) {
				await processor.onWorkflowEvent(eventData);
			} else if (isErrorEvent(eventData) && processor.onErrorEvent) {
				await processor.onErrorEvent(eventData);
			} else if (processor.onUnknownEvent) {
				await processor.onUnknownEvent(eventData);
			}

			processed++;
		} catch (error) {
			errors++;
			console.warn('Error processing GitHub event:', error, { eventData });
		}
	}

	return { processed, errors };
}

// Export type helpers for external consumers
export type {
	A2AEventEnvelope,
	ErrorEvent,
	GitHubEventData,
	IssueEvent,
	PullRequestEvent,
	RepositoryEvent,
	WorkflowEvent,
};
