import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock api-client and sse before importing Chat
vi.mock('@/utils/api-client', () => ({
	apiFetch: vi.fn().mockResolvedValue({
		models: [{ id: 'model1', label: 'Model 1' }],
		default: 'model1',
	}),
}));

vi.mock('@/utils/sse', () => ({
	openSSE: vi.fn().mockReturnValue(vi.fn()),
}));

import Chat from '@/components/Chat/Chat';

expect.extend(toHaveNoViolations);

describe('Chat Component Accessibility', () => {
	beforeEach(() => {
		// jsdom lacks crypto.randomUUID in older versions; provide a stub if missing
		// @ts-expect-error
		if (!global.crypto) {
			// @ts-expect-error
			global.crypto = {};
		}
		// @ts-expect-error
		if (!global.crypto.randomUUID) {
			// @ts-expect-error
			global.crypto.randomUUID = () => '00000000-0000-4000-8000-000000000000';
		}
	});

	it('should have no accessibility violations', async () => {
		const { container } = render(<Chat />);
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});
});
