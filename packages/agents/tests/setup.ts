/**
 * Test setup for the agents package
 *
 * Global setup and configuration for all tests
 */

import { afterEach, beforeEach, vi } from 'vitest';

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();

  // Reset environment variables
  process.env.NODE_ENV = 'test';

  // Mock console methods to avoid noise in test output
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Clean up any timers
  vi.clearAllTimers();

  // Restore mocked console methods
  vi.restoreAllMocks();
});

// Note: Node.js crypto is available in test environment, no mocking needed

// Global test utilities
// Vitest matcher type augmentation (avoid TS namespaces per lint rule)
declare module 'vitest' {
  interface Assertion {
    toBeUUID(): void;
    toBeValidDate(): void;
  }
  interface AsymmetricMatchersContaining {
    toBeUUID(): void;
    toBeValidDate(): void;
  }
}

// Custom matchers
expect.extend({
  toBeUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      message: () => `expected ${received} to be a valid UUID`,
      pass,
    };
  },

  toBeValidDate(received: string) {
    const date = new Date(received);
    const pass = !Number.isNaN(date.getTime());

    return {
      message: () => `expected ${received} to be a valid ISO date string`,
      pass,
    };
  },
});

// Note: Removed unused createMockResponse helper

// Mock event bus for testing
interface PublishedEvent {
  type: string;
  [key: string]: unknown;
}

type EventHandler = (event: PublishedEvent) => Promise<void> | void;

export const createMockEventBus = () => {
  const published: PublishedEvent[] = [];
  const subscribers: Map<string, EventHandler[]> = new Map();

  const publish = vi.fn(async (event: PublishedEvent) => {
    published.push(event);
    const handlers = subscribers.get(event.type) || [];
    await Promise.all(handlers.map((handler) => handler(event)));
  });

  const subscribe = vi.fn((eventType: string, handler: EventHandler) => {
    const handlers = subscribers.get(eventType) || [];
    handlers.push(handler);
    subscribers.set(eventType, handlers);
  });

  const unsubscribe = vi.fn((eventType: string, handler: EventHandler) => {
    const handlers = subscribers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) handlers.splice(index, 1);
  });

  return { publish, subscribe, unsubscribe, published, subscribers };
};

// Mock MCP client for testing
export const createMockMCPClient = () => {
  const calls: Array<{ server: string; tool: string; args: unknown }> = [];
  const responses = new Map<string, unknown>();
  const errors = new Map<string, Error>();

  const callTool = vi.fn(async (server: string, tool: string, args: unknown) => {
    const key = `${server}.${tool}`;
    calls.push({ server, tool, args });
    if (errors.has(key)) {
      const err = errors.get(key);
      if (err) throw err;
    }
    return responses.get(key) ?? { result: 'mock result' };
  });

  const callToolWithFallback = vi.fn(async (servers: string[], tool: string, args: unknown) => {
    let lastError: unknown;
    for (const server of servers) {
      try {
        return await callTool(server, tool, args);
      } catch (err) {
        // Record and attempt next server (fallback strategy)
        lastError = err;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('All servers failed');
  });

  const discoverServers = vi.fn(async () => [] as string[]);
  const isConnected = vi.fn(async () => true);
  const mockResponse = (server: string, tool: string, response: unknown) => {
    responses.set(`${server}.${tool}`, response);
  };
  const mockError = (server: string, tool: string, error: Error) => {
    errors.set(`${server}.${tool}`, error);
  };

  return {
    callTool,
    callToolWithFallback,
    discoverServers,
    isConnected,
    mockResponse,
    mockError,
    calls,
    responses,
    errors,
  };
};
