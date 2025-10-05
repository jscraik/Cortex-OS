import type { Envelope } from '@cortex-os/a2a-contracts/envelope.js';
import { Resource } from '@opentelemetry/resources';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { createCbomEmitter } from '../src/emitter.js';

function createSpan(attributes: Record<string, unknown>): ReadableSpan {
	return {
		name: 'llm.generate',
		attributes,
		events: [],
		links: [],
		status: { code: 0 },
		startTime: [Math.floor(Date.now() / 1000), 0],
		endTime: [Math.floor(Date.now() / 1000), 0],
		duration: [0, 0],
		resource: Resource.empty(),
		instrumentationLibrary: { name: 'test', version: '1' },
		spanContext: () => ({
			traceId: 'trace123',
			spanId: 'span123',
			traceFlags: 1,
			isRemote: false,
		}),
	} as ReadableSpan;
}

describe('CbomEmitter', () => {
	it('records tool calls with redacted pointers', () => {
		const emitter = createCbomEmitter();
		const envelope: Envelope = {
			id: '123',
			type: 'tool',
			payload: { foo: 'bar' },
		};
		emitter.recordToolCall(envelope);
		const snapshot = emitter.snapshot();
		expect(snapshot.context.tools).toHaveLength(1);
		expect(snapshot.context.tools[0]?.outputPointer).toMatch(/^redacted:\/\//);
		expect(snapshot.context.tools[0]?.inputHash).toMatch(/^sha256:/);
	});

	it('captures spans with gen-ai attributes', () => {
		const emitter = createCbomEmitter();
		const span = createSpan({
			'gen_ai.system': 'openai',
			'gen_ai.request.model': 'gpt-4.1',
			'gen_ai.request.temperature': 0,
		});
		emitter.captureSpan(span);
		const decision = emitter.snapshot().decisions.find((item) => item.spanId === 'span123');
		expect(decision?.model?.provider).toBe('openai');
		expect(decision?.model?.name).toBe('gpt-4.1');
	});

	it('registers evidence for spans', () => {
		const emitter = createCbomEmitter();
		const span = createSpan({ 'gen_ai.system': 'openai' });
		emitter.captureSpan(span);
		const evidence = emitter.listEvidence();
		expect(evidence.length).toBeGreaterThan(0);
		expect(evidence[0]?.hash).toMatch(/^sha256:/);
	});
});
