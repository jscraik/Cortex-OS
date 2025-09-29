import { createEnvelope } from '@cortex-os/a2a-contracts';
import { describe, expect, it } from 'vitest';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('A2A Envelope Contract Compliance', () => {
	it('should enforce CloudEvents 1.0 specification', () => {
		const envelope = createEnvelope({
			type: 'test.event',
			source: 'urn:cortex:test',
			data: { test: true },
		});

		expect(envelope).toBeDefined();
		expect(envelope.specversion).toBe('1.0');
		expect(envelope.id).toMatch(UUID_REGEX);
		expect(envelope.type).toBe('test.event');
		expect(envelope.source).toBe('urn:cortex:test');
		expect(envelope.time).toBeDefined();
	});

	it('should reject envelopes missing required fields', () => {
		expect(() =>
			createEnvelope({
				type: 'test.event',
				// Missing required 'source'
				data: { test: true },
			} as any),
		).toThrow();
	});

	it('should validate source as proper URI', () => {
		expect(() =>
			createEnvelope({
				type: 'test.event',
				source: 'not-a-uri',
				data: { test: true },
			}),
		).toThrow('Source must be a valid URI');
	});

	it('should set default values correctly', () => {
		const envelope = createEnvelope({
			type: 'test.event',
			source: 'urn:cortex:test',
			data: { test: true },
		});

		expect(envelope.ttlMs).toBe(60000);
		expect(envelope.headers).toEqual({});
		expect(envelope.specversion).toBe('1.0');
	});

	it('should accept custom headers and metadata', () => {
		const envelope = createEnvelope({
			type: 'test.event',
			source: 'urn:cortex:test',
			data: { test: true },
			headers: {
				authorization: 'Bearer token123',
				'x-custom': 'value',
			},
		});

		expect(envelope.headers?.authorization).toBe('Bearer token123');
		expect(envelope.headers?.['x-custom']).toBe('value');
	});

	it('should handle correlation and causation IDs', () => {
		const envelope = createEnvelope({
			type: 'test.event',
			source: 'urn:cortex:test',
			data: { test: true },
			correlationId: '123e4567-e89b-12d3-a456-426614174000',
			causationId: '123e4567-e89b-12d3-a456-426614174001',
		});

		expect(envelope.correlationId).toBe('123e4567-e89b-12d3-a456-426614174000');
		expect(envelope.causationId).toBe('123e4567-e89b-12d3-a456-426614174001');
	});
});
