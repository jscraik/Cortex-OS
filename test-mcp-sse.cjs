#!/usr/bin/env node

// Test MCP SSE connection
const { EventSource } = require('eventsource');
const crypto = require('crypto');
const sessionId = 'test-session-' + crypto.randomBytes(9).toString('hex');
const url = `https://cortex-mcp.brainwav.io/mcp?sessionId=${sessionId}`;

console.log(`Connecting to MCP server at: ${url}`);
console.log(`Session ID: ${sessionId}`);

const eventSource = new EventSource(url, {
  headers: {
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache',
  }
});

eventSource.onopen = () => {
  console.log('✅ Connected to MCP server');

  // Send a test message
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    })
  }).then(response => {
    console.log('Initialize response status:', response.status);
    return response.text();
  }).then(text => {
    console.log('Initialize response:', text);
  }).catch(error => {
    console.error('Initialize error:', error);
  });
};

eventSource.onmessage = (event) => {
  console.log('📨 Received message:', event.data);

  try {
    const data = JSON.parse(event.data);
    if (data.method === 'ping') {
      // Respond to ping
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: data.id,
          result: {}
        })
      });
    }
  } catch (e) {
    console.log('Non-JSON message:', event.data);
  }
};

eventSource.onerror = (error) => {
  console.error('❌ Error:', error);
  if (eventSource.readyState === EventSource.CLOSED) {
    console.log('Connection closed');
  } else if (eventSource.readyState === EventSource.CONNECTING) {
    console.log('Connecting...');
  }
};

// Keep alive for 10 seconds
setTimeout(() => {
  console.log('Closing connection...');
  eventSource.close();
  process.exit(0);
}, 10000);