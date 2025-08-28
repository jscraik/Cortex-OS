import { Server as HttpServer, createServer, IncomingMessage, ServerResponse } from 'http';
import { EventEmitter } from 'events';

// This is a guessed interface based on how server transports are typically used.
// The real interface is in the @modelcontextprotocol/sdk package.
export interface McpServerTransport extends EventEmitter {
  connect(): Promise<void>;
  close(): Promise<void>;
  send(message: any): void;
}

export class StreamableHTTPServerTransport extends EventEmitter implements McpServerTransport {
  private server: HttpServer;
  private host: string;
  private port: number;
  private responseStream: ServerResponse | null = null;

  constructor(port: number, host: string = 'localhost') {
    super();
    this.port = port;
    this.host = host;
    this.server = createServer(this.handleRequest.bind(this));
  }

  async connect(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, this.host, () => {
        console.log(`[StreamableHTTPServerTransport] Listening on ${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('[StreamableHTTPServerTransport] Closed');
        resolve();
      });
    });
  }

  send(message: any): void {
    if (this.responseStream && !this.responseStream.writableEnded) {
      this.responseStream.write(JSON.stringify(message) + '\n');
    } else {
      console.error('[StreamableHTTPServerTransport] Cannot send message, no response stream available.');
    }
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    if (req.method !== 'POST' || req.url !== '/') {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    console.log(`[StreamableHTTPServerTransport] Received request`);

    // Set up the response for streaming
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    this.responseStream = res;

    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const message = JSON.parse(body);
        this.emit('message', message);
      } catch (error) {
        console.error('[StreamableHTTPServerTransport] Error parsing request body:', error);
        res.statusCode = 400;
        res.end('Bad Request');
      }
    });

    req.on('close', () => {
      console.log(`[StreamableHTTPServerTransport] Request connection closed`);
      this.responseStream = null;
    });
  }
}
