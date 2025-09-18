import { afterEach, describe, expect, test, vi } from 'vitest';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { withRuntimeSpan } from '../../src/telemetry/tracing';
import { createRuntimeHttpServer } from '../../src/http/runtime-server';
import { createEventManager } from '../../src/events';
import { TaskRepository } from '../../src/persistence/task-repository';
import { ProfileRepository } from '../../src/persistence/profile-repository';
import { ArtifactRepository } from '../../src/persistence/artifact-repository';
import { EvidenceRepository } from '../../src/persistence/evidence-repository';

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
		const startActiveSpan = vi.fn((name: string, fn: (span: typeof span) => unknown) => {
			return fn(span);
		});
		vi.spyOn(trace, 'getTracer').mockReturnValue({
			startActiveSpan,
		} as any);

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
		const startActiveSpan = vi.fn((name: string, fn: (span: typeof span) => unknown) => {
			return fn(span);
		});
		vi.spyOn(trace, 'getTracer').mockReturnValue({
			startActiveSpan,
		} as any);

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
