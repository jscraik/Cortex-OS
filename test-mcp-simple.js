#!/usr/bin/env node

import { createServer } from 'http';
import { URL } from 'url';

const port = process.env.PORT || 3026;
const host = '127.0.0.1';

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'cortex-mcp-simple-test',
      timestamp: new Date().toISOString(),
      endpoints: ['/tools', '/tools/call', '/health']
    }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/tools') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      tools: [
        {
          name: 'test.echo',
          description: 'Echoes back the input'
        },
        {
          name: 'system.status',
          description: 'Get system status'
        }
      ]
    }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/tools/call') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('MCP Tool Call:', data);

        let response;
        if (data.name === 'test.echo') {
          response = {
            tool: data.name,
            content: [{
              type: 'text',
              text: `Echo: ${JSON.stringify(data.arguments || {})}`
            }]
          };
        } else if (data.name === 'system.status') {
          response = {
            tool: data.name,
            content: [{
              type: 'text',
              text: 'System Status: All systems operational'
            }]
          };
        } else {
          response = {
            tool: data.name,
            content: [{
              type: 'text',
              text: `Unknown tool: ${data.name}`
            }]
          };
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (e) {
        console.error('JSON parse error:', e);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: { code: 'invalid_request', message: 'Invalid JSON' }
        }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(port, host, () => {
  console.log(`✅ Simple MCP server listening on http://${host}:${port}`);
  console.log(`📍 Available endpoints:`);
  console.log(`   - GET  /health - Health check`);
  console.log(`   - GET  /tools  - List tools`);
  console.log(`   - POST /tools/call - Execute tool`);
});