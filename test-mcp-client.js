#!/usr/bin/env node

// Test MCP connection using fetch and proper MCP protocol

const sessionId = 'test-session-' + Date.now();
const baseUrl = 'https://cortex-mcp.brainwav.io/mcp';

async function testMcpConnection() {
  console.log(`Testing MCP connection with sessionId: ${sessionId}`);

  try {
    // 1. Initialize connection
    console.log('\n1. Initializing MCP connection...');
    const initResponse = await fetch(`${baseUrl}?sessionId=${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            roots: {
              listChanged: true,
            },
            sampling: {}
          },
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      })
    });

    console.log(`Status: ${initResponse.status}`);
    const initText = await initResponse.text();
    console.log(`Response: ${initText}`);

    if (initResponse.status === 200) {
      console.log('\n✅ MCP connection successful!');

      // 2. List available tools
      console.log('\n2. Listing available tools...');
      const toolsResponse = await fetch(`${baseUrl}?sessionId=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {}
        })
      });

      console.log(`Status: ${toolsResponse.status}`);
      const toolsText = await toolsResponse.text();
      console.log(`Tools: ${toolsText}`);
    } else {
      console.log('\n❌ MCP connection failed');
      console.log(`Response headers:`, Object.fromEntries(initResponse.headers.entries()));
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run the test
testMcpConnection().then(() => {
  console.log('\nTest completed');
}).catch(console.error);