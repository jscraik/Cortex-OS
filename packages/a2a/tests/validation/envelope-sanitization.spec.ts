import { describe, expect, it } from 'vitest';
import { createA2AEventEnvelope, type A2AEventEnvelope } from '../../a2a-events/src/github/envelope.ts';

// Import the sanitization function
import { sanitizeEventEnvelope } from '../../a2a-core/src/validation/sanitizer.ts';

describe('A2A Event Envelope Sanitization (TDD)', () => {
	it('removes malicious scripts from repository descriptions', () => {
		const maliciousRepo = createA2AEventEnvelope({
			event_type: 'github.repository',
			action: 'push',
			repository: {
				id: 123,
				name: 'test-repo',
				full_name: 'test/repo',
				private: false,
				description: '<script>alert("xss")</script>brAInwav test repository'
			}
		});

		const sanitized = sanitizeEventEnvelope(maliciousRepo);

		expect(sanitized.event.repository?.description).toBe('brAInwav test repository');
		expect(sanitized.event.repository?.description).not.toContain('<script>');
		expect(sanitized.event.repository?.name).toBe('test-repo');
	});

	it('sanitizes malicious content in metadata labels', () => {
		const envelope = createA2AEventEnvelope(
			{
				event_type: 'github.issue',
				action: 'opened',
				issue: {
					id: 456,
					number: 1,
					title: 'Test Issue',
					body: 'Clean issue body'
				}
			},
			{
				metadata: {
					labels: {
						malicious: '<script>document.cookie="stolen"</script>',
						safe: 'brAInwav issue processing',
						onclick: '<div onclick="steal()">Click me</div>'
					},
					tags: ['<script>evil</script>security', 'safe-tag', 'brAInwav']
				}
			}
		);

		const sanitized = sanitizeEventEnvelope(envelope);

		expect(sanitized.metadata.labels.malicious).toBe('');
		expect(sanitized.metadata.labels.safe).toBe('brAInwav issue processing');
		expect(sanitized.metadata.labels.onclick).toBe('Click me');
		expect(sanitized.metadata.tags).toEqual(['security', 'safe-tag', 'brAInwav']);
	});

	it('preserves envelope structure and safe content', () => {
		const envelope = createA2AEventEnvelope({
			event_type: 'github.workflow',
			action: 'completed',
			workflow: {
				id: 789,
				name: 'brAInwav CI Pipeline',
				conclusion: 'success'
			}
		});

		const sanitized = sanitizeEventEnvelope(envelope);

		// Structure should be preserved
		expect(sanitized.envelope_id).toBe(envelope.envelope_id);
		expect(sanitized.envelope_version).toBe(envelope.envelope_version);
		expect(sanitized.event.event_type).toBe('github.workflow');
		expect(sanitized.event.action).toBe('completed');
		expect(sanitized.source_info.service_name).toBe('github-client');

		// Safe content should remain unchanged
		expect(sanitized.event.workflow?.name).toBe('brAInwav CI Pipeline');
		expect(sanitized.event.workflow?.conclusion).toBe('success');
	});

	it('handles null and undefined values safely', () => {
		const envelope = createA2AEventEnvelope(
			{
				event_type: 'github.error',
				error_message: 'Test error',
				error_code: 'TEST_ERROR'
			},
			{
				metadata: {
					labels: {
						nullValue: null,
						undefinedValue: undefined,
						emptyString: '',
						validString: 'brAInwav error handling'
					}
				}
			}
		);

		const sanitized = sanitizeEventEnvelope(envelope);

		expect(sanitized.metadata.labels.nullValue).toBeNull();
		expect(sanitized.metadata.labels.undefinedValue).toBeUndefined();
		expect(sanitized.metadata.labels.emptyString).toBe('');
		expect(sanitized.metadata.labels.validString).toBe('brAInwav error handling');
	});
});