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
		// @ts-expect-error - crypto may not exist in test environment
		if (!global.crypto) {
			// @ts-expect-error - adding crypto stub to global
			global.crypto = {};
		}
		// @ts-expect-error - randomUUID may not exist on crypto stub
		if (!global.crypto.randomUUID) {
			// @ts-expect-error - adding randomUUID method to crypto stub
			global.crypto.randomUUID = () => '00000000-0000-4000-8000-000000000000';
		}
	});

	it('should have no accessibility violations', async () => {
		const { container } = render(<Chat />);
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});
});
