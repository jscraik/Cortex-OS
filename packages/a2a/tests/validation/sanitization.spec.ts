import { describe, expect, it } from 'vitest';
import type { A2AEventEnvelope } from '@cortex-os/a2a-events';

// Import the sanitization function (needs to be implemented)
import { sanitizeEventEnvelope } from '../../../a2a-core/src/validation/sanitizer.ts';

describe('A2A Event Envelope Sanitization', () => {
	it('removes malicious scripts while preserving safe fields', () => {
		const maliciousEnvelope: A2AEventEnvelope = {
			envelope_id: 'test-event-001',
			envelope_version: '1.0',
			created_at: new Date().toISOString(),
			expires_at: new Date(Date.now() + 3600000).toISOString(),
			event: {
				event_type: 'github.repository',
				action: 'push',
				repository: {
					id: 123,
					name: 'test-repo',
					full_name: 'test/repo',
					private: false,
					description: '<script>alert("xss")</script>brAInwav repo'
				}
			},
			routing: {
				topic: 'github.repository.push',
				partition_key: '123',
				routing_key: 'github_repository_test_repo',
				broadcast: false
			},
			priority: 'normal',
			delivery_mode: 'at_least_once',
			retry_policy: {
				max_attempts: 3,
				initial_delay_ms: 1000,
				max_delay_ms: 30000,
				backoff_multiplier: 2,
				jitter: true
			},
			correlation: {
				correlation_id: 'test-correlation-001'
			},
			metadata: {
				version: '1.0',
				schema_version: '1.0',
				content_type: 'application/json',
				encoding: 'utf-8',
				compression: 'none',
				tags: ['<script>malicious</script>tag1', 'safe-tag'],
				labels: {
					html: '<div onclick="steal()">Click me</div>',
					text: 'Normal text content'
				}
			},
			source_info: {
				service_name: 'brAInwav-test',
				service_version: '1.0.0'
			}
		};

		const sanitized = sanitizeEventEnvelope(maliciousEnvelope);

		// Should preserve envelope structure
		expect(sanitized.id).toBe('test-event-001');
		expect(sanitized.type).toBe('user_action');
		expect(sanitized.source).toBe('brAInwav-ui');
		expect(sanitized.timestamp).toBe(maliciousEnvelope.timestamp);

		// Should remove scripts from data fields
		expect(sanitized.data.userInput).toBe('Hello brAInwav');
		expect(sanitized.data.safeField).toBe('This should remain unchanged');

		// Should sanitize nested objects recursively
		expect(sanitized.data.nestedData.description).toBe('Safe description text');
		expect(sanitized.data.nestedData.tags).toEqual(['tag1', 'safe-tag']);
		expect(sanitized.data.nestedData.metadata.html).toBe('Click me');
		expect(sanitized.data.nestedData.metadata.text).toBe('Normal text content');

		// Should preserve safe metadata
		expect(sanitized.metadata.browser).toBe('Chrome/brAInwav');
		expect(sanitized.metadata.version).toBe('1.0.0');
	});

	it('handles deeply nested malicious content', () => {
		const deeplyNestedEnvelope: A2AEventEnvelope = {
			id: 'deep-test-001',
			type: 'complex_event',
			source: 'brAInwav-agent',
			timestamp: Date.now(),
			data: {
				level1: {
					level2: {
						level3: {
							level4: {
								maliciousScript: '<script>document.cookie="stolen"</script>',
								safeData: 'brAInwav processing complete'
							}
						}
					}
				}
			}
		};

		const sanitized = sanitizeEventEnvelope(deeplyNestedEnvelope);
		
		expect(sanitized.data.level1.level2.level3.level4.maliciousScript).toBe('');
		expect(sanitized.data.level1.level2.level3.level4.safeData).toBe('brAInwav processing complete');
	});

	it('preserves arrays and handles mixed content types', () => {
		const mixedContentEnvelope: A2AEventEnvelope = {
			id: 'mixed-test-001',
			type: 'data_collection',
			source: 'brAInwav-collector',
			timestamp: Date.now(),
			data: {
				items: [
					'Safe string',
					123,
					true,
					{ 
						name: '<script>evil()</script>Item Name',
						value: 42,
						active: true
					},
					null,
					'<iframe src="javascript:alert()">Content</iframe>'
				],
				count: 6,
				valid: true
			}
		};

		const sanitized = sanitizeEventEnvelope(mixedContentEnvelope);

		expect(sanitized.data.items).toHaveLength(6);
		expect(sanitized.data.items[0]).toBe('Safe string');
		expect(sanitized.data.items[1]).toBe(123);
		expect(sanitized.data.items[2]).toBe(true);
		expect(sanitized.data.items[3]).toEqual({
			name: 'Item Name',
			value: 42,
			active: true
		});
		expect(sanitized.data.items[4]).toBeNull();
		expect(sanitized.data.items[5]).toBe('Content');
		expect(sanitized.data.count).toBe(6);
		expect(sanitized.data.valid).toBe(true);
	});

	it('handles edge cases without breaking', () => {
		const edgeCaseEnvelope: A2AEventEnvelope = {
			id: 'edge-test-001',
			type: 'edge_case',
			source: 'brAInwav-test',
			timestamp: Date.now(),
			data: {
				emptyString: '',
				nullValue: null,
				undefinedValue: undefined,
				emptyObject: {},
				emptyArray: [],
				specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
				unicodeContent: '🚀 brAInwav 🤖 <script>hack()</script> 🎯'
			}
		};

		const sanitized = sanitizeEventEnvelope(edgeCaseEnvelope);

		expect(sanitized.data.emptyString).toBe('');
		expect(sanitized.data.nullValue).toBeNull();
		expect(sanitized.data.undefinedValue).toBeUndefined();
		expect(sanitized.data.emptyObject).toEqual({});
		expect(sanitized.data.emptyArray).toEqual([]);
		expect(sanitized.data.specialChars).toBe('!@#$%^&*()_+-=[]{}|;:,.<>?');
		expect(sanitized.data.unicodeContent).toBe('🚀 brAInwav 🤖  🎯');
	});
});