import { describe, expect, it } from 'vitest';
import {
	createAttentionBridge,
	createAttentionBridgeFromEnv,
} from '../../src/kv/attention-bridge.js';

const randomRunId = () => `run-${Math.random().toString(36).slice(2, 10)}`;

describe('AttentionBridge', () => {
	it('captures segments for retroinfer engine and writes receipt data', async () => {
		const bridge = createAttentionBridge({
			enabled: true,
			engine: 'retroinfer',
			budgets: { maxSegmentBytes: 1_024, maxOverheadMs: 20 },
		});
		const run = await bridge.prepareRun(randomRunId(), { model: 'retroinfer/test' });
		await bridge.captureKV({ step: 'decode', role: 'assistant' }, run, {
			tokensCaptured: 256,
			bytesCaptured: 512,
			source: 'retroinfer',
			metadata: { layer: 3 },
		});

		const receipt = await bridge.emitReceipt(run);
		expect(receipt).not.toBeNull();
		expect(receipt?.engine).toBe('retroinfer');
		expect(receipt?.segments).toHaveLength(1);
		expect(receipt?.segments[0]?.tokensCaptured).toBe(256);
		await bridge.close();
	});

	it('enforces segment budget limits', async () => {
		const bridge = createAttentionBridge({
			enabled: true,
			engine: 'retrievalattention',
			budgets: { maxSegmentBytes: 128, maxOverheadMs: 10 },
		});
		const run = await bridge.prepareRun(randomRunId());
		await bridge.captureKV({ step: 'large-step' }, run, { tokensCaptured: 32, bytesCaptured: 256 });
		const receipt = await bridge.emitReceipt(run);
		expect(receipt).not.toBeNull();
		expect(receipt?.segments).toHaveLength(0);
		expect(receipt?.warnings?.[0]).toContain('skipped');
		await bridge.close();
	});

	it('disables capture when env toggles are off', async () => {
		const bridge = createAttentionBridgeFromEnv();
		const run = await bridge.prepareRun(randomRunId());
		await bridge.captureKV({ step: 'noop' }, run, { tokensCaptured: 42, bytesCaptured: 84 });
		const receipt = await bridge.emitReceipt(run);
		expect(receipt).toBeNull();
		await bridge.close();
	});
});
