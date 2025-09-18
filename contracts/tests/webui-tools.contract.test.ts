import {
	createWebuiErrorResponse,
	validateWebuiToolInput,
	WebuiToolError,
	webuiMcpTools,
} from '@cortex-os/contracts';
import { describe, expect, it } from 'vitest';

describe('webui MCP tool contracts', () => {
	it('exports tool registry with expected tool names', () => {
		const names = webuiMcpTools.map((t) => t.name).sort();
		// Ensure a minimal invariant set
		for (const required of [
			'open_panel',
			'update_component_state',
			'navigate',
			'simulate_click',
			'submit_form',
			'send_chat_message',
			'render_chart',
			'generate_timeline',
			'render_tree',
		]) {
			expect(names).toContain(required);
		}
	});

	it('validates open_panel input and trims not required fields untouched', () => {
		const input = { panelId: 'settings', focus: false };
		const parsed = validateWebuiToolInput<typeof input>('open_panel', input);
		expect(parsed).toEqual(input);
	});

	it('rejects unknown tool', () => {
		expect(() => validateWebuiToolInput('nope', {})).toThrowError(WebuiToolError);
	});

	it('enforces submit_form fields non-empty', () => {
		expect(() => validateWebuiToolInput('submit_form', { formId: 'f1', fields: {} })).toThrowError(
			WebuiToolError,
		);
	});

	it('validates render_chart series structure', () => {
		const parsed = validateWebuiToolInput('render_chart', {
			chartId: 'c1',
			type: 'line',
			data: { series: [{ name: 'Latency', points: [{ x: 1, y: 20 }] }] },
		});
		expect(parsed).toMatchObject({ chartId: 'c1', type: 'line' });
	});

	it('produces structured error response for validation failure', () => {
		let err: unknown;
		try {
			validateWebuiToolInput('open_panel', { panelId: '' });
		} catch (e) {
			err = e;
		}
		const resp = createWebuiErrorResponse('open_panel', err, 'corr-1');
		expect(resp.isError).toBe(true);
		expect(resp.metadata).toMatchObject({
			tool: 'open_panel',
			correlationId: 'corr-1',
		});
		const payload = JSON.parse(resp.content[0].text);
		expect(payload.success).toBe(false);
		expect(payload.error.code).toBeDefined();
	});
});
