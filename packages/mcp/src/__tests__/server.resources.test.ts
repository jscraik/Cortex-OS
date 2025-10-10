import { describe, expect, it, vi } from 'vitest';
import { Server } from '../server.js';

const RESOURCE_URI = 'resource://test/example';

describe('Server resources/read', () => {
	it('returns persisted resource content with metadata', async () => {
		const server = new Server();
		const resourceContent = {
			contents: [
				{
					uri: RESOURCE_URI,
					mimeType: 'text/plain',
					text: 'Hello from resource store',
				},
			],
		};

		server.registerResource({
			uri: RESOURCE_URI,
			name: 'Test Resource',
			description: 'Resource with persisted payload',
			mimeType: 'text/plain',
			content: resourceContent,
		} as any);

		const response = await server.handleRequest({
			method: 'resources/read',
			params: { uri: RESOURCE_URI },
			id: 'resource-1',
		});

		expect(response.result.contents).toHaveLength(1);
		expect(response.result.contents[0]).toMatchObject({
			uri: RESOURCE_URI,
			mimeType: 'text/plain',
			text: 'Hello from resource store',
		});
	});

	it('surfaces provider errors with branded HTTPException', async () => {
		const server = new Server();
		const provider = vi.fn().mockRejectedValue(new Error('storage offline'));

		server.registerResource({
			uri: `${RESOURCE_URI}/errors`,
			name: 'Error Resource',
			mimeType: 'text/plain',
			read: provider,
		} as any);

		const response = await server.handleRequest({
			method: 'resources/read',
			params: { uri: `${RESOURCE_URI}/errors` },
			id: 'resource-2',
		});

		expect(provider).toHaveBeenCalledTimes(1);
		expect(response.error).toBeDefined();
		expect(response.error?.message).toContain('[brAInwav] Resource read failed');
		expect(response.error?.message).toContain('storage offline');
	});

	it('rejects non-string URIs before invoking provider', async () => {
		const server = new Server();
		const provider = vi.fn();

		server.registerResource({
			uri: RESOURCE_URI,
			name: 'Validation Resource',
			mimeType: 'text/plain',
			read: provider,
		} as any);

		const response = await server.handleRequest({
			method: 'resources/read',
			params: { uri: 42 as unknown as string },
			id: 'resource-3',
		});

		expect(provider).not.toHaveBeenCalled();
		expect(response.error).toBeDefined();
		expect(response.error?.message).toContain(
			'[brAInwav] Invalid params: resource URI must be a string',
		);
	});
});
