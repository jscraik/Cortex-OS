import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Chat from '../../../app/components/chat/Chat';

// Mock the API calls
vi.mock('../../../utils/api-client', () => ({
  apiFetch: vi.fn().mockImplementation((url) => {
    if (url === '/api/models') {
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

vi.mock('../../../utils/sse', () => ({
  openSSE: vi.fn().mockImplementation((url, options, callbacks) => {
    // Simulate receiving a message
    setTimeout(() => {
      callbacks.onMessage(
        JSON.stringify({
          type: 'token',
          data: 'Hello',
        }),
      );
    }, 100);

    // Simulate stream completion
    setTimeout(() => {
      callbacks.onMessage(
        JSON.stringify({
          type: 'done',
          messageId: 'msg2',
          text: 'Hello, how can I help you?',
        }),
      );
    }, 200);

    return vi.fn(); // close function
  }),
}));

describe('Chat Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

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

    // Wait for models to load
    await waitFor(() => {
      expect(screen.getByText('Model 1')).toBeInTheDocument();
    });

    // Type a message
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Hello, AI!' } });

    // Submit the message
    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    // Check that the message is displayed
    await waitFor(() => {
      expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
    });
  });
});
