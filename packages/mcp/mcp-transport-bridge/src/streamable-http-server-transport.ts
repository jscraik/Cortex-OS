import { Server as HttpsServer, createServer, IncomingMessage, ServerResponse } from 'https';
import { EventEmitter } from 'events';

// Guessed interface for server transport
export interface McpServerTransport extends EventEmitter {
  connect(): Promise<void>;
  close(): Promise<void>;
  send(message: unknown): void;
}

export interface TlsConfig {
  key: string | Buffer;
  cert: string | Buffer;
  ca?: string | Buffer;
}

export class StreamableHTTPServerTransport
  extends EventEmitter
  implements McpServerTransport
{
  private server: HttpsServer;
  private host: string;
  private port: number;
  private responseStream: ServerResponse | null = null;

  constructor(port: number, host = 'localhost', tls: TlsConfig) {
    super();
    this.port = port;
    this.host = host;
    this.server = createServer(
      { ...tls, minVersion: 'TLSv1.3' },
      this.handleRequest.bind(this),
    );
  }

  async connect(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, this.host, () => {
        console.log(
          `[StreamableHTTPServerTransport] Listening on https://${this.host}:${this.port}`,
        );
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

  send(message: unknown): void {
    if (this.responseStream && !this.responseStream.writableEnded) {
      this.responseStream.write(JSON.stringify(message) + '\n');
    } else {
      console.error(
        '[StreamableHTTPServerTransport] Cannot send message, no response stream available.',
      );
    }
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    if (req.method !== 'POST' || req.url !== '/') {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    console.log('[StreamableHTTPServerTransport] Received request');

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
        console.error(
          '[StreamableHTTPServerTransport] Error parsing request body:',
          error,
        );
        res.statusCode = 400;
        res.end('Bad Request');
      }
    });

    req.on('close', () => {
      console.log('[StreamableHTTPServerTransport] Request connection closed');
      this.responseStream = null;
    });
  }
}
