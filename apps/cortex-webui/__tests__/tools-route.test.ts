import { describe, expect, it } from 'vitest';

describe('tools API route', () => {
	it('returns events for session', async () => {
		const { addToolEvent } = await import('../backend/src/utils/tool-store');
		const { getChatTools } = await import('../backend/src/controllers/toolController');

		const sid = 's-tools';
		addToolEvent(sid, { name: 'demo/tool', status: 'start', args: { a: 1 } });

		// Create mock request and response objects
		const req = {
			params: { sessionId: sid },
		};

		const res: any = {
			json: vi.fn(),
			status: vi.fn().mockReturnThis(),
		};

		// Call the controller function
		await getChatTools(req as any, res);

		// Check the response
		expect(res.json).toHaveBeenCalled();
		const responseBody = res.json.mock.calls[0][0];
		expect(Array.isArray(responseBody.events)).toBe(true);
		expect(responseBody.events.length).toBeGreaterThan(0);
		expect(responseBody.events[0].name).toBe('demo/tool');
	});
});
