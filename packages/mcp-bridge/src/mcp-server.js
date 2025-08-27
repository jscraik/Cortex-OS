#!/usr/bin/env node

/**
 * Minimal MCP server implementation
 * Exposes /sse endpoint for Model Context Protocol
 * Includes a ping test tool
 */

import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// In-memory store for tools
const tools = new Map();

// Register a simple ping tool for testing
tools.set('ping', {
  name: 'ping',
  description: 'A simple ping tool to test the MCP connection',
  inputSchema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Optional message to echo back',
      },
    },
  },
  execute: async (input) => {
    const message = input.message || 'pong';
    return {
      content: [{ type: 'text', text: `Ping response: ${message}` }],
    };
  },
});

// HTTP server for health check and SSE endpoint
const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        uptime_ms: Math.floor(process.uptime() * 1000),
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  // SSE endpoint for MCP
  if (req.url === '/sse') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial connection message
    res.write(
      `data: ${JSON.stringify({
        method: 'initialize',
        params: {
          protocolVersion: 1,
          capabilities: {
            tools: {},
          },
        },
      })}\n\n`,
    );

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(`data: ${JSON.stringify({ method: 'ping' })}\n\n`);
    }, 30000);

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(keepAlive);
    });

    return;
  }

  // Serve static files for testing
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code, 'utf-8');
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });
      res.end(content, 'utf-8');
    }
  });
});

// WebSocket server for MCP
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('MCP client connected');

  // Send initialization message
  ws.send(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: 1,
        capabilities: {
          tools: {},
        },
      },
    }),
  );

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      // Handle tool list request
      if (data.method === 'tools/list') {
        const toolList = Array.from(tools.values()).map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));

        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: data.id,
            result: { tools: toolList },
          }),
        );
        return;
      }

      // Handle tool call
      if (data.method === 'tools/call') {
        const { name, arguments: args } = data.params;
        const tool = tools.get(name);

        if (tool) {
          try {
            const result = await tool.execute(args);
            ws.send(
              JSON.stringify({
                jsonrpc: '2.0',
                id: data.id,
                result: result,
              }),
            );
          } catch (error) {
            ws.send(
              JSON.stringify({
                jsonrpc: '2.0',
                id: data.id,
                error: {
                  code: -32603,
                  message: error.message,
                },
              }),
            );
          }
        } else {
          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: data.id,
              error: {
                code: -32601,
                message: `Tool not found: ${name}`,
              },
            }),
          );
        }
        return;
      }

      // Echo other messages
      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: data.id,
          result: { message: 'Received' },
        }),
      );
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: 'Parse error',
          },
        }),
      );
    }
  });

  ws.on('close', () => {
    console.log('MCP client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║        MCP SERVER - Model Context Protocol     ║
╠════════════════════════════════════════╣
║                                        ║
║  Server running at:                    ║
║  http://localhost:${PORT}                 ║
║                                        ║
║  Endpoints:                            ║
║  - Health: http://localhost:${PORT}/health ║
║  - SSE:    http://localhost:${PORT}/sse    ║
║  - WS:     ws://localhost:${PORT}/ws     ║
║                                        ║
║  Press Ctrl+C to stop                  ║
║                                        ║
╚════════════════════════════════════════╝
  `);
});
