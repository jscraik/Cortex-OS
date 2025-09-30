#!/usr/bin/env node

// Simple test MCP server that responds to basic requests
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.MCP_PORT || 3024;

// Basic health check endpoint
app.get('/healthz', (req, res) => {
  res.json({
    healthy: true,
    details: { service: 'cortex-mcp', port: PORT }
  });
});

// MCP endpoint placeholder
app.post('/mcp', (req, res) => {
  const { jsonrpc, method, params } = req.body;

  if (jsonrpc === '2.0' && method === 'initialize') {
    res.json({
      jsonrpc: '2.0',
      id: req.body.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          logging: {}
        },
        serverInfo: {
          name: 'cortex-mcp',
          version: '0.1.0'
        }
      }
    });
  } else {
    res.json({
      jsonrpc: '2.0',
      id: req.body.id,
      result: null
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] Test MCP server running on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] Health check: http://localhost:${PORT}/healthz`);
});