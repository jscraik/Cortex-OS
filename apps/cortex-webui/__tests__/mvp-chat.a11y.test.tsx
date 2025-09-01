import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

// Mock client utilities used by the page
vi.mock('../utils/api-client', () => ({
  apiFetch: vi.fn(async (url: string) => {
    if (url === '/api/models') {
      return { models: [{ id: 'gpt-4o', label: 'GPT-4o' }], default: 'gpt-4o' };
    }
    if (url.includes('/tools')) {
      return { events: [] };
    }
    return {};
  }),
}));

vi.mock('../utils/sse', () => ({
  openSSE: () => () => {},
}));

// Import the page under test
import Page from '../app/mvp/chat/page';

describe('MVP Chat page accessibility', () => {
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

  it('renders with proper roles and has no axe violations', async () => {
    const { container } = render(<Page />);

    // Key landmarks/labels
    expect(await screen.findByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main', { name: /chat interface/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/select model/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message composer/i)).toBeInTheDocument();

    const results = await axe(container, {
      rules: {
        // Keep defaults; we can disable noisy rules later with rationale if needed
      },
    });
    expect(results).toHaveNoViolations();
  });
});
