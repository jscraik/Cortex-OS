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
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeUUID(): void;
      toBeValidDate(): void;
    }
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
    const pass = !isNaN(date.getTime());

    return {
      message: () => `expected ${received} to be a valid ISO date string`,
      pass,
    };
  },
});

// Note: Removed unused createMockResponse helper

// Mock event bus for testing
export const createMockEventBus = () => {
  const published: any[] = [];
  const subscribers: Map<string, Function[]> = new Map();

  return {
    publish: vi.fn(async (event: any) => {
      published.push(event);
      const handlers = subscribers.get(event.type) || [];
      await Promise.all(handlers.map((handler) => handler(event)));
    }),
    subscribe: vi.fn((eventType: string, handler: Function) => {
      const handlers = subscribers.get(eventType) || [];
      handlers.push(handler);
      subscribers.set(eventType, handlers);
    }),
    unsubscribe: vi.fn((eventType: string, handler: Function) => {
      const handlers = subscribers.get(eventType) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }),
    published,
    subscribers,
  };
};

// Mock MCP client for testing
export const createMockMCPClient = () => {
  const calls: any[] = [];
  const responses = new Map<string, any>();
  const errors = new Map<string, Error>();

  return {
    callTool: vi.fn(async (server: string, tool: string, args: any) => {
      const key = `${server}.${tool}`;
      calls.push({ server, tool, args });

      if (errors.has(key)) {
        throw errors.get(key);
      }

      return responses.get(key) || { result: 'mock result' };
    }),
    callToolWithFallback: vi.fn(async function (servers: string[], tool: string, args: any) {
      // Try each server in order
      for (const server of servers) {
        try {
          return await this.callTool(server, tool, args);
        } catch (error) {
          // Continue to next server
        }
      }
      throw new Error('All servers failed');
    }),
    discoverServers: vi.fn(async () => []),
    isConnected: vi.fn(async () => true),
    mockResponse: (server: string, tool: string, response: any) => {
      responses.set(`${server}.${tool}`, response);
    },
    mockError: (server: string, tool: string, error: Error) => {
      errors.set(`${server}.${tool}`, error);
    },
    calls,
    responses,
    errors,
  };
};
