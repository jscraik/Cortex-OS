import { describe, expect, it } from 'vitest';
import {
	ArtifactRefSchema,
	ConfigSchema,
	EventSchema,
	ProfileSchema,
	TaskInputSchema,
	TaskSchema,
	ValidationError,
	VersionPinsSchema,
} from '../src/index.js';

describe('ASBR schema exports', () => {
	it('validates task input payloads', () => {
		const parsed = TaskInputSchema.parse({
			title: 'Add telemetry spans',
			brief: 'Ensure runtime surfaces are traced',
			inputs: [{ kind: 'text', value: 'See ticket ABC-123' }],
			scopes: ['runtime'],
			schema: 'cortex.task.input@1',
		});
		expect(parsed.title).toBe('Add telemetry spans');
	});
	it('rejects invalid artifact kinds', () => {
		expect(() =>
			ArtifactRefSchema.parse({
				id: crypto.randomUUID(),
				kind: 'unknown',
				path: '/tmp/file.txt',
				digest: 'sha-256:deadbeef',
				createdAt: new Date().toISOString(),
				schema: 'cortex.artifact@1',
			}),
		).toThrowError();
	});
	it('parses task with approvals and artifacts', () => {
		const task = TaskSchema.parse({
			id: crypto.randomUUID(),
			status: 'queued',
			artifacts: [],
			evidenceIds: [],
			approvals: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			schema: 'cortex.task@1',
		});
		expect(task.status).toBe('queued');
	});
	it('validates runtime configuration schema', () => {
		const config = ConfigSchema.parse({
			events: {
				transport: 'sse',
				heartbeat_ms: 5000,
				idle_timeout_ms: 60_000,
				max_task_events: 100,
				max_global_events: 1000,
			},
			determinism: {
				max_normalize_bytes: 1_000_000,
				max_concurrency: 4,
				normalize: {
					newline: 'LF',
					trim_trailing_ws: true,
					strip_dates: true,
				},
			},
			cache_ttl_ms: 30_000,
		});
		expect(config.events.transport).toBe('sse');
	});
	it('validates version pins map', () => {
		const pins = VersionPinsSchema.parse({
			'@cortex-os/asbr': '1.0.0',
			'@cortex-os/agents': '2.3.4-alpha',
		});
		expect(Object.keys(pins)).toHaveLength(2);
	});
	it('parses event with optional traceparent', () => {
		const event = EventSchema.parse({
			id: crypto.randomUUID(),
			type: 'PlanStarted',
			taskId: crypto.randomUUID(),
			timestamp: new Date().toISOString(),
			traceparent: `00-${'a'.repeat(32)}-${'b'.repeat(16)}-01`,
		});
		expect(event.type).toBe('PlanStarted');
	});
	it('parses profile schema', () => {
		const profile = ProfileSchema.parse({
			id: crypto.randomUUID(),
			skill: 'intermediate',
			tools: ['filesystem'],
			a11y: {},
			schema: 'cortex.profile@1',
		});
		expect(profile.tools).toContain('filesystem');
	});
	it('exposes ValidationError class', () => {
		const err = new ValidationError('bad input');
		expect(err.statusCode).toBe(400);
		expect(err.code).toBe('VALIDATION_ERROR');
	});
});
//# sourceMappingURL=schemas.test.js.map
