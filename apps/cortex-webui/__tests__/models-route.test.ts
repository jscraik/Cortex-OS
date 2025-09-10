import { describe, expect, it, vi } from 'vitest';

describe('models route', () => {
	it('returns models list with default and minimal shape', async () => {
		// Mock the file system read to return a sample config
		vi.mock('node:fs', () => {
			return {
				promises: {
					readFile: vi.fn().mockResolvedValue(
						JSON.stringify({
							chat_models: {
								'gpt-4': { label: 'GPT-4' },
								'gpt-3.5-turbo': { label: 'GPT-3.5 Turbo' },
							},
							default_models: {
								chat: 'gpt-4',
							},
						}),
					),
				},
			};
		});

		const { getUiModels } = await import(
			'../backend/src/controllers/uiModelsController'
		);

		// Create mock request and response objects
		const req = {};

		const res: any = {
			json: vi.fn(),
			status: vi.fn().mockReturnThis(),
		};

		// Call the controller function
		await getUiModels(req as any, res);

		// Check the response
		expect(res.json).toHaveBeenCalled();
		const body = res.json.mock.calls[0][0];
		expect(Array.isArray(body.models)).toBe(true);

		// must have id + label per contract
		if (body.models.length > 0) {
			const m = body.models[0];
			expect(typeof m.id).toBe('string');
			expect(typeof m.label).toBe('string');
		}

		// default should be present and exist in the set when config provides it
		expect(typeof body.default === 'string' || body.default === null).toBe(
			true,
		);
		if (body.default) {
			const ids = new Set(body.models.map((m: any) => m.id));
			expect(ids.has(body.default)).toBe(true);
		}
	});
});
