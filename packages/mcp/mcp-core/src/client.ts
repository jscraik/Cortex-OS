import type { ServerInfo } from './contracts.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Rate limiting implementation
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private cleanupInterval: NodeJS.Timeout;
  
  constructor(windowMs: number = 60000, maxRequests: number = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Add periodic cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);
  }
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let requests = this.requests.get(key) || [];
    
    // Filter out requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if we're under the limit
    if (requests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    requests.push(now);
    this.requests.set(key, requests);
    
    return true;
  }
  
  getRemaining(key: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    const requests = this.requests.get(key) || [];
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    
    return Math.max(0, this.maxRequests - recentRequests.length);
  }
  
  private cleanup() {
    const now = Date.now();
    const cutoff = now - (2 * this.windowMs); // Keep 2 windows worth of data
    
    for (const [key, timestamps] of this.requests.entries()) {
      const recent = timestamps.filter(ts => ts > cutoff);
      if (recent.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recent);
      }
    }
  }
  
  dispose() {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter(60000, 60); // 60 requests per minute

// Data redaction patterns
const SENSITIVE_PATTERNS = [
  // API key patterns
  /(["']?(?:apiKey|api_key|api-key)["']?\s*[:=]\s*["']?)([^"'}\s,)]+)(["']?)/gi,
  // Token patterns
  /(["']?(?:token|auth)["']?\s*[:=]\s*["']?)([^"'}\s,)]+)(["']?)/gi,
  // Password/secrets patterns
  /(["']?(?:password|secret|credential)["']?\s*[:=]\s*["']?)([^"'}\s,)]+)(["']?)/gi,
  // Authorization patterns
  /(["']?authorization["']?\s*[:=]\s*["']?bearer\s+)([^"'}\s,)]+)(["']?)/gi,
];

// Redact sensitive data from strings
export function redactSensitiveData(data: string): string {
  let redacted = data;
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, '$1[REDACTED]$3');
  }
  return redacted;
}

// Create client using official SDK with security enhancements
export async function createClient(si: ServerInfo) {
  // Create the appropriate transport based on the server info
  let transport;
  
  switch (si.transport) {
    case 'stdio':
      if (!si.command) throw new Error('stdio requires command');
      transport = new StdioClientTransport({
        command: si.command,
        args: si.args,
        env: si.env,
      });
      break;
    case 'sse':
      if (!si.endpoint) throw new Error('sse requires endpoint');
      transport = new SSEClientTransport(new URL(si.endpoint));
      break;
    case 'https':
      if (!si.endpoint) throw new Error('https requires endpoint');
      transport = new StreamableHTTPClientTransport(new URL(si.endpoint));
      break;
    default:
      throw new Error(`Unsupported transport: ${si.transport}`);
  }
  
  // Create the client with basic capabilities
  const client = new Client(
    {
      name: 'cortex-os-mcp-client',
      version: '1.0.0',
    },
    {
      capabilities: {
        // Add basic capabilities
        experimental: {},
      },
    },
  );
  
  // Connect the client to the transport
  await client.connect(transport);
  
  // Add security enhancements to the client
  const enhancedClient = {
    ...client,
    transport,
    
    // Add rate limiting
    async callToolWithRateLimit(name: string, payload: unknown) {
      // Create a rate limiting key based on endpoint and tool name
      const rateKey = `tool-${si.name}-${name}`;
      
      // Check rate limit
      if (!rateLimiter.isAllowed(rateKey)) {
        throw new Error(`Rate limit exceeded for tool ${name}`);
      }
      
      // Call the tool
      return await client.callTool(name, payload);
    },
    
    // Add data redaction
    async sendWithRedaction(message: unknown) {
      // Redact sensitive data before sending
      const serialized = JSON.stringify(message);
      const redacted = redactSensitiveData(serialized);
      const parsed = JSON.parse(redacted);
      
      // Send the redacted message
      return await client.sendRequest(parsed);
    },
    
    // Get rate limit info
    getRateLimitInfo(toolName: string) {
      const rateKey = `tool-${si.name}-${toolName}`;
      return {
        remaining: rateLimiter.getRemaining(rateKey),
        windowMs: 60000,
        maxRequests: 60,
      };
    },
    
    // Enhanced close method that also disposes of resources
    async close() {
      await transport.close();
      client.close();
    },
  };
  
  return enhancedClient;
}

// Dispose of global resources
export function disposeClientResources() {
  rateLimiter.dispose();
}