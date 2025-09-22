// Mock @opentelemetry/api types to avoid missing declaration file error
const SpanStatusCode = { OK: 1, ERROR: 2 };
const trace = {
	getTracer: () => ({
		startActiveSpan: <T>(_spanName: string, fn: (span: unknown) => T): T => {
			const mockSpan = {
				setAttribute: vi.fn(),
				setStatus: vi.fn(),
				recordException: vi.fn(),
				end: vi.fn(),
			};
			return fn(mockSpan);
		},
	}),
} as const;

import { afterEach, describe, expect, test, vi } from 'vitest';
import { createEventManager } from '../../src/events';
import { createRuntimeHttpServer } from '../../src/http/runtime-server';
import { ArtifactRepository } from '../../src/persistence/artifact-repository';
import { EvidenceRepository } from '../../src/persistence/evidence-repository';
import { ProfileRepository } from '../../src/persistence/profile-repository';
import { TaskRepository } from '../../src/persistence/task-repository';
import { withRuntimeSpan } from '../../src/telemetry/tracing';

function createMockSpan() {
	return {
		setAttribute: vi.fn(),
		setStatus: vi.fn(),
		recordException: vi.fn(),
		end: vi.fn(),
	};
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('telemetry tracing', () => {
	test('withRuntimeSpan records spans with attributes and closes span', async () => {
		const span = createMockSpan();
		const startActiveSpan = vi.fn(
			(_name: string, fn: (span: ReturnType<typeof createMockSpan>) => unknown) => {
				return fn(span);
			},
		);
		vi.spyOn(trace, 'getTracer').mockReturnValue({ startActiveSpan } as unknown as {
			startActiveSpan: <T>(name: string, fn: (span: unknown) => T) => T;
		});

		await withRuntimeSpan('telemetry.test', async (activeSpan) => {
			activeSpan.setAttribute('test.attr', 'value');
		});

		expect(startActiveSpan).toHaveBeenCalledWith('telemetry.test', expect.any(Function));
		expect(span.setAttribute).toHaveBeenCalledWith('test.attr', 'value');
		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
		expect(span.end).toHaveBeenCalled();
	});

	test('event manager emits telemetry span with event attributes', async () => {
		const span = createMockSpan();
		const startActiveSpan = vi.fn(
			(_name: string, fn: (span: ReturnType<typeof createMockSpan>) => unknown) => {
				return fn(span);
			},
		);
		vi.spyOn(trace, 'getTracer').mockReturnValue({ startActiveSpan } as unknown as {
			startActiveSpan: <T>(name: string, fn: (span: unknown) => T) => T;
		});

		const httpServer = createRuntimeHttpServer({
			tasks: new TaskRepository(),
			profiles: new ProfileRepository(),
			artifacts: new ArtifactRepository(),
			evidence: new EvidenceRepository(),
		});
		const eventManager = createEventManager({ httpServer });
		await eventManager.emitEvent({
			type: 'telemetry.event',
			data: { foo: 'bar' },
		});

		expect(startActiveSpan).toHaveBeenCalledWith('events.emit', expect.any(Function));
		expect(span.setAttribute).toHaveBeenCalledWith('event.type', 'telemetry.event');
		expect(span.end).toHaveBeenCalled();
	});
});
