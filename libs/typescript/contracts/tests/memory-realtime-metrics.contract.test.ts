import { describe, expect, it } from 'vitest';
import {
	RealtimeMemoryConnectionSummarySchema,
	RealtimeMemoryMetricsSnapshotSchema,
} from '../src/memory-realtime.js';

const buildConnectionSummary = () => {
	const timestamp = new Date().toISOString();
	return RealtimeMemoryConnectionSummarySchema.parse({
		connectionId: 'client-test',
		status: 'connected',
		subscriptions: ['default'],
		connectedAt: timestamp,
		lastActivityAt: timestamp,
		isReconnecting: false,
		client: {
			userAgent: 'vitest-suite',
			remoteAddress: '127.0.0.1',
		},
		metrics: {
			messagesSent: 1,
			messagesReceived: 2,
			bytesSent: 128,
			bytesReceived: 256,
			queueDepth: 0,
		},
	});
};

describe('RealtimeMemoryMetricsSnapshotSchema', () => {
	it('accepts contract-compliant realtime metrics snapshots', () => {
		const timestamp = new Date().toISOString();
		const snapshot = {
			snapshotId: 'snapshot-123',
			brand: 'brAInwav' as const,
			source: 'brAInwav.memories.realtime',
			timestamp,
			description: 'brAInwav realtime metrics snapshot for vitest validation',
			reason: 'connected',
			aggregate: {
				totalConnections: 1,
				activeConnections: 1,
				reconnections: 0,
				messagesSent: 1,
				messagesReceived: 2,
				bytesSent: 128,
				bytesReceived: 256,
				lastActivityAt: timestamp,
				connectionTimestamps: [timestamp],
			},
			connections: [buildConnectionSummary()],
		};

		const result = RealtimeMemoryMetricsSnapshotSchema.safeParse(snapshot);
		expect(result.success).toBe(true);
	});

	it('rejects snapshots missing brAInwav branding or metrics data', () => {
		const timestamp = new Date().toISOString();
		const invalidSnapshot = {
			snapshotId: 'snapshot-123',
			brand: 'Not-brAInwav',
			source: 'memories.realtime',
			timestamp,
			description: 'Missing branded context',
			reason: 'connected',
			aggregate: {
				totalConnections: 0,
				activeConnections: 0,
				reconnections: 0,
				messagesSent: 0,
				messagesReceived: 0,
				bytesSent: 0,
				bytesReceived: 0,
				connectionTimestamps: [timestamp],
			},
			connections: [
				{
					connectionId: 'missing-metrics',
					status: 'connected',
					subscriptions: [],
					connectedAt: timestamp,
					lastActivityAt: timestamp,
				},
			],
		};

		const result = RealtimeMemoryMetricsSnapshotSchema.safeParse(invalidSnapshot);
		expect(result.success).toBe(false);
	});
});
