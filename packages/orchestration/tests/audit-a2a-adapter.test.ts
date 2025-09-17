import { describe, expect, it, vi } from 'vitest';

import { makeA2APublisher } from '../src/lib/audit-a2a-adapter.js';

describe('audit A2A adapter', () => {
	it('wraps payloads in audit events before publishing', async () => {
		const publish = vi.fn();
		const publisher = makeA2APublisher(publish);

		const payload = { id: 'evt-1', severity: 'info' as const };
		await publisher(payload);

		expect(publish).toHaveBeenCalledWith({
			type: 'audit.event',
			payload,
		});
	});
});
