import { describe, expect, it } from 'vitest';
import { createTraceContext, type TraceContext } from '../../a2a-contracts/src/trace-context.js';
import {
	ensureTraceContext,
	getCurrentTraceContext,
	withTraceContext,
} from '../src/trace-context-manager.js';

describe('trace-context-manager', () => {
	it('propagates context across async boundaries', async () => {
		const context = createTraceContext();
		await withTraceContext(context, async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(getCurrentTraceContext()).toEqual(context);
		});
	});

	it('reuses existing context in ensureTraceContext', async () => {
		const context = createTraceContext();
		await withTraceContext(context, async () => {
			await ensureTraceContext(async () => {
				expect(getCurrentTraceContext()).toEqual(context);
			});
		});
	});

	it('creates and propagates context when absent', async () => {
		let captured: TraceContext | undefined;
		await ensureTraceContext(async () => {
			captured = getCurrentTraceContext();
			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(getCurrentTraceContext()).toEqual(captured);
		});
		expect(captured).toBeDefined();
	});
});
