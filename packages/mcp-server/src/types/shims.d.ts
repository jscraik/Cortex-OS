// Temporary type shims to allow building against MCP SDK v1.17.x in NodeNext
declare module '@modelcontextprotocol/sdk/types' {
  export const CallToolRequestSchema: any;
  export const ListToolsRequestSchema: any;
  export const ErrorCode: any;
  export class McpError extends Error {
    constructor(code: any, message: string, data?: any);
  }
}

declare module '@modelcontextprotocol/sdk/server' {
  export class Server {
    constructor(info: any, options?: any);
    setRequestHandler: (...args: any[]) => void;
    setNotificationHandler: (...args: any[]) => void;
  }
}
