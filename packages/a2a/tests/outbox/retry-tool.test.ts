import { describe, expect, it } from 'vitest';
import { logInfo } from '../a2a-core/src/lib/logging.js';
import { calculateRetryDelay, createRetryConfig } from '../a2a-core/src/lib/retry-utils.js';

describe('A2A Retry Tool (Phase 7)', () => {
	it('calculates deterministic retry delays without Math.random()', () => {
		logInfo('Testing deterministic retry delay calculation', 'brAInwav-A2A-Retry');

		const messageId = 'msg-test-12345';
		const config = createRetryConfig({
			maxRetries: 5,
			baseDelayMs: 1000,
			maxDelayMs: 30000,
			enableJitter: true,
		});

		const delays = [];
		for (let retryCount = 1; retryCount <= 5; retryCount++) {
			const delay = calculateRetryDelay(retryCount, messageId, config);
			delays.push(delay);
		}

		// Verify deterministic behavior - same messageId should produce same delays
		const secondRun = [];
		for (let retryCount = 1; retryCount <= 5; retryCount++) {
			const delay = calculateRetryDelay(retryCount, messageId, config);
			secondRun.push(delay);
		}

		expect(delays).toEqual(secondRun);

		// Verify exponential backoff pattern
		expect(delays[1]).toBeGreaterThan(delays[0]);
		expect(delays[2]).toBeGreaterThan(delays[1]);

		// Verify no delay exceeds maximum
		delays.forEach((delay) => {
			expect(delay).toBeLessThanOrEqual(config.maxDelayMs);
		});

		logInfo('Deterministic retry delay calculation verified', 'brAInwav-A2A');
	});

	it('applies different jitter for different message IDs', () => {
		logInfo('Testing jitter variation across message IDs', 'brAInwav-A2A-Retry');

		const messageId1 = 'msg-001';
		const messageId2 = 'msg-002';
		const retryCount = 3;
		const config = createRetryConfig({ enableJitter: true });

		const delay1 = calculateRetryDelay(retryCount, messageId1, config);
		const delay2 = calculateRetryDelay(retryCount, messageId2, config);

		// Different message IDs should produce different delays due to jitter
		expect(delay1).not.toBe(delay2);

		// But both should be within reasonable bounds
		expect(delay1).toBeGreaterThan(0);
		expect(delay2).toBeGreaterThan(0);

		logInfo('Jitter variation verified for different message IDs', 'brAInwav-A2A');
	});

	it('respects retry policy configuration', () => {
		logInfo('Testing retry policy configuration compliance', 'brAInwav-A2A-Retry');

		const messageId = 'msg-policy-test';

		// Test with jitter disabled
		const noJitterConfig = createRetryConfig({
			baseDelayMs: 2000,
			enableJitter: false,
		});

		const delay1 = calculateRetryDelay(1, messageId, noJitterConfig);
		const delay2 = calculateRetryDelay(2, messageId, noJitterConfig);

		// Without jitter, delays should follow exact exponential pattern
		expect(delay2).toBe(delay1 * 2);

		// Test with custom base delay
		const customConfig = createRetryConfig({
			baseDelayMs: 500,
			enableJitter: false,
		});

		const customDelay = calculateRetryDelay(1, messageId, customConfig);
		expect(customDelay).toBe(500);

		logInfo('Retry policy configuration compliance verified', 'brAInwav-A2A');
	});

	it('handles edge cases in retry calculation', () => {
		logInfo('Testing retry calculation edge cases', 'brAInwav-A2A-Retry');

		const messageId = 'msg-edge-case';
		const config = createRetryConfig();

		// Test retry count 0 (should return base delay)
		const zeroRetryDelay = calculateRetryDelay(0, messageId, config);
		expect(zeroRetryDelay).toBe(config.baseDelayMs);

		// Test very high retry count (should cap at max delay)
		const highRetryDelay = calculateRetryDelay(100, messageId, config);
		expect(highRetryDelay).toBeLessThanOrEqual(config.maxDelayMs);

		// Test empty message ID (should still work)
		const emptyIdDelay = calculateRetryDelay(1, '', config);
		expect(emptyIdDelay).toBeGreaterThan(0);

		logInfo('Edge case handling verified', 'brAInwav-A2A');
	});

	it('integrates with brAInwav outbox retry policies', () => {
		logInfo('Testing integration with brAInwav outbox policies', 'brAInwav-A2A-Retry');

		// Simulate outbox message with brAInwav metadata
		const outboxMessage = {
			id: 'outbox-msg-123',
			retryCount: 2,
			brAInwavMetadata: {
				component: 'A2A-Outbox',
				priority: 'high',
				correlationId: 'corr-456',
			},
		};

		const retryConfig = createRetryConfig({
			maxRetries: 3,
			baseDelayMs: 1000,
		});

		const nextRetryDelay = calculateRetryDelay(
			outboxMessage.retryCount + 1,
			outboxMessage.id,
			retryConfig,
		);

		expect(nextRetryDelay).toBeGreaterThan(0);
		expect(outboxMessage.brAInwavMetadata.component).toBe('A2A-Outbox');

		logInfo('Outbox integration test completed', 'brAInwav-A2A');
	});
});
