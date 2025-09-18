import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the api and sse utilities via project aliases so no real fetch or EventSource
// is used during module initialization or test runtime.
vi.mock('@/utils/api-client', () => ({
	apiFetch: vi.fn().mockImplementation((url: string) => {
		if (url === '/api/models/ui') {
			return Promise.resolve({
				models: [
					{ id: 'model1', label: 'Model 1' },
					{ id: 'model2', label: 'Model 2' },
				],
				default: 'model1',
			});
		}
		return Promise.resolve({});
	}),
}));

vi.mock('@/utils/sse', () => ({
	openSSE: vi.fn().mockImplementation((_url: string, _options: unknown, callbacks: any) => {
		setTimeout(() => callbacks.onMessage(JSON.stringify({ type: 'token', data: 'Hello' })), 50);
		setTimeout(() => callbacks.onMessage(JSON.stringify({ type: 'done' })), 100);
		return vi.fn();
	}),
}));

import Chat from '@/components/Chat/Chat';

describe('Chat Component', () => {
	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();

		// jsdom lacks crypto.randomUUID in older versions; provide a stub if missing
		if (!(global as any).crypto) {
			(global as any).crypto = {};
		}
		if (!(global as any).crypto.randomUUID) {
			(global as any).crypto.randomUUID = () => '00000000-0000-4000-8000-000000000000';
		}
	});

	it('renders without crashing', () => {
		render(<Chat />);
		expect(screen.getByText('Chat')).toBeInTheDocument();
	});

	it('displays model selector', async () => {
		render(<Chat />);
		await waitFor(() => {
			expect(screen.getByText('Model:')).toBeInTheDocument();
		});
	});

	it('allows sending a message', async () => {
		render(<Chat />);

		// Wait for models to load and check the select element
		await waitFor(() => {
			const selectElement = screen.getByLabelText('Model');
			expect(selectElement).toBeInTheDocument();
		});

		// Type a message
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: 'Hello, AI!' } });

		// Submit the message
		const sendButton = screen.getByRole('button', { name: /send message/i });
		fireEvent.click(sendButton);

		// Check that the message is displayed
		await waitFor(() => {
			expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
		});
	});
});
