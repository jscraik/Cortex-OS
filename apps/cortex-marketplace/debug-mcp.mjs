import { build } from './src/app.js';

async function debugMcp() {
    const app = build({
        logger: false,
        registries: { test: 'http://localhost:3001/test.json' },
        cacheDir: '/tmp/test',
        cacheTtl: 1000
    });
    
    await app.ready();
    
    // Test 1: Unknown tool
    console.log('=== Testing unknown tool ===');
    const response1 = await app.inject({
        method: 'POST',
        url: '/api/v1/mcp/execute',
        payload: { tool: 'unknown.tool', params: {} }
    });
    
    console.log('Status:', response1.statusCode);
    console.log('Body:', JSON.parse(response1.body));
    console.log();
    
    // Test 2: Missing required parameter
    console.log('=== Testing missing required parameter ===');
    const response2 = await app.inject({
        method: 'POST',
        url: '/api/v1/mcp/execute',
        payload: {
            tool: 'marketplace.get_server',
            params: {} // Missing serverId
        }
    });
    
    console.log('Status:', response2.statusCode);
    console.log('Body:', JSON.parse(response2.body));
    
    await app.close();
}

debugMcp().catch(console.error);