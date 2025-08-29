export interface McpRequest {
  jsonrpc: '2.0';
  id: string | number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
}

export interface Transport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(
    message: McpRequest,
    onError?: (err: unknown, msg: McpRequest) => void,

  ): void;

  isConnected(): boolean;
}

export interface StdioTransportConfig {
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  timeoutMs?: number;
}

export interface HttpTransportConfig {
  type: 'http';
  url: string;
  timeoutMs?: number;
}

export interface SSETransportConfig {
  type: 'sse';
  url: string;
  timeoutMs?: number;
  retryDelayMs?: number;
  maxRetries?: number;
  heartbeatIntervalMs?: number;
}

export type TransportConfig = StdioTransportConfig | HttpTransportConfig | SSETransportConfig;
