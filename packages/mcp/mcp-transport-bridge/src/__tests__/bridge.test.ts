import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpBridge } from '../bridge';
import type { BridgeConfig } from '../bridge';

// Mock the SDK and transports
const mockClient = {
  connect: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  sendRequest: vi.fn().mockResolvedValue({ result: 'ok' }),
};
const mockServer = {
  connect: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  setRequestHandler: vi.fn(),
};

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(() => mockClient),
}));
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn(() => mockServer),
}));
vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn(),
}));
vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: vi.fn(),
}));
vi.mock('../streamable-http-server-transport.js', () => ({
  StreamableHTTPServerTransport: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('mcp-transport-bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a bridge with valid config', () => {
    const config: BridgeConfig = {
      source: { type: 'stdio', command: 'echo' },
      target: { type: 'streamableHttp', port: 8080, host: 'localhost', tls: { key: 'k', cert: 'c' } },
    };
    const bridge = new McpBridge(config);
    expect(bridge).toBeInstanceOf(McpBridge);
  });

  it('should throw an error with invalid config (same transport)', () => {
    const config: BridgeConfig = {
      source: { type: 'stdio', command: 'echo' },
      target: { type: 'stdio' },
    };
    expect(() => new McpBridge(config)).toThrow(
      'Source and target must be different transport types',
    );
  });

  it('should start and stop the bridge', async () => {
    const config: BridgeConfig = {
      source: { type: 'stdio', command: 'echo' },
      target: { type: 'streamableHttp', port: 8081, host: 'localhost', tls: { key: 'k', cert: 'c' } },
    };
    const bridge = new McpBridge(config);
    await bridge.start();
    expect(mockClient.connect).toHaveBeenCalled();
    expect(mockServer.connect).toHaveBeenCalled();

    await bridge.stop();
    expect(mockClient.close).toHaveBeenCalled();
    expect(mockServer.close).toHaveBeenCalled();
  });

  it('should return a healthy status when running', async () => {
    const config: BridgeConfig = {
      source: { type: 'stdio', command: 'echo' },
      target: { type: 'streamableHttp', port: 8082, host: 'localhost', tls: { key: 'k', cert: 'c' } },
    };
    const bridge = new McpBridge(config);
    await bridge.start();

    const health = await bridge.healthCheck();
    expect(health.healthy).toBe(true);
    expect(health.details.running).toBe(true);
    expect(health.details.clientConnected).toBe(true);

    await bridge.stop();
  });
});
