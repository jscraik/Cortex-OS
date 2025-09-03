import '@testing-library/jest-dom';

// Mock crypto.randomUUID for jsdom
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
  // @ts-expect-error - we're adding a mock
  crypto.randomUUID = () => '00000000-0000-4000-8000-000000000000';
}

// Mock window for client-side code
if (typeof window !== 'undefined') {
  // Ensure localStorage is available
  if (!window.localStorage) {
    window.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    } as any;
  }
}
