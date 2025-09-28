import { describe, expect, it, vi } from 'vitest';
import {
	type EventSourceLike,
	type LangGraphClientEnvelope,
	type MessageEventLike,
	observeLangGraphStream,
} from '../utils/langgraph-stream.js';

class MockEventSource implements EventSourceLike {
	#listener: ((event: MessageEventLike<string>) => void) | null = null;
	closed = false;

	addEventListener(_type: 'message', listener: (event: MessageEventLike<string>) => void): void {
		this.#listener = listener;
	}

	removeEventListener(): void {
		this.#listener = null;
	}

	close(): void {
		this.closed = true;
	}

	emit(envelope: LangGraphClientEnvelope): void {
		this.#listener?.({ data: JSON.stringify(envelope) });
	}

	emitRaw(data: string): void {
		this.#listener?.({ data });
	}
}

describe('observeLangGraphStream', () => {
	it('dispatches events, completion, and stops cleanly', () => {
		const source = new MockEventSource();
		const events: LangGraphClientEnvelope[] = [];
		const complete = vi.fn();
		const errors: Error[] = [];

		const subscription = observeLangGraphStream(source, {
			onEvent: (envelope) => events.push(envelope),
			onComplete: complete,
			onError: (error) => errors.push(error),
		});

		const updateEnvelope: LangGraphClientEnvelope = {
			type: 'brAInwav.langgraph.event',
			event: 'updates',
			payload: { respond: { output: 'ok' } },
			runId: 'ui-run',
			branding: 'brAInwav',
			timestamp: new Date().toISOString(),
			sequence: 1,
			metadata: { surface: 'ui' },
		};

		source.emit(updateEnvelope);

		const afterUpdate = events.length;
		expect(afterUpdate).toBeGreaterThan(0);
		expect(events[0].event).toBe('updates');
		expect(events[0].branding).toBe('brAInwav');

		const completionEnvelope: LangGraphClientEnvelope<{ emitted: number }> = {
			type: 'brAInwav.langgraph.complete',
			event: 'complete',
			payload: { emitted: 1 },
			runId: 'ui-run',
			branding: 'brAInwav',
			timestamp: new Date().toISOString(),
			sequence: 2,
			aborted: false,
		};

		source.emit(completionEnvelope);

		expect(complete).toHaveBeenCalledWith(completionEnvelope);
		expect(events.length).toBe(afterUpdate + 1);
		expect(errors).toHaveLength(0);

		subscription.stop();
		expect(source.closed).toBe(true);

		source.emit(updateEnvelope);
		expect(events.length).toBe(afterUpdate + 1);
	});

	it('reports parsing errors and error envelopes', () => {
		const source = new MockEventSource();
		const errors: Error[] = [];

		observeLangGraphStream(source, {
			onError: (error) => errors.push(error),
		});

		source.emitRaw('not-json');

		const errorEnvelope: LangGraphClientEnvelope = {
			type: 'brAInwav.langgraph.error',
			event: 'error',
			payload: { message: 'downstream failure', name: 'Error' },
			runId: 'ui-run',
			branding: 'brAInwav',
			timestamp: new Date().toISOString(),
			sequence: 99,
		};

		source.emit(errorEnvelope);

		expect(errors.length).toBeGreaterThanOrEqual(2);
		expect(errors.at(-1)?.message).toBe('downstream failure');
	});
});
