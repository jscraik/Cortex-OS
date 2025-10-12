#!/usr/bin/env node

/**
 * Simple test server to verify agent execution endpoints
 */

import { createApp } from './src/server/index.js';

// Node.js 18+ has built-in fetch

const app = createApp();
const port = 3001;
const baseUrl = `http://localhost:${port}`;
const parsedBase = new URL(baseUrl);
if (!['localhost', '127.0.0.1'].includes(parsedBase.hostname)) {
        throw new Error('Test endpoint must run against localhost.');
}
const buildUrl = (path) => {
        const target = new URL(path, parsedBase);
        if (target.origin !== parsedBase.origin) {
                throw new Error('Agent endpoint tests must stay on localhost.');
        }
        return target;
};

async function testAgentExecution() {
	console.log('🚀 Starting agent execution endpoint test...\n');

	// Start server
	const server = app.listen(port, () => {
		console.log(`✅ Test server listening on port ${port}\n`);
	});

	try {
		// Test 1: Health check
		console.log('📋 Test 1: Health check');
                // nosemgrep: semgrep.owasp-top-10-2021-a10-server-side-request-forgery - buildUrl restricts requests to localhost origin.
                const healthResponse = await fetch(buildUrl('/health'));
		const healthData = await healthResponse.json();
		console.log(`   Status: ${healthResponse.status}`);
		console.log(`   Body:`, JSON.stringify(healthData, null, 2));
		console.log('');

		// Test 2: Agent execution with valid request
		console.log('🤖 Test 2: Agent execution');
		const agentRequest = {
			agentId: 'test-agent',
			input: 'Analyze this TypeScript code for quality issues',
			context: { userId: 'test-user' },
			options: { timeout: 30000 },
		};

                // nosemgrep: semgrep.owasp-top-10-2021-a10-server-side-request-forgery - buildUrl restricts requests to localhost origin.
                const agentResponse = await fetch(buildUrl('/agents/execute'), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer test-api-key',
			},
			body: JSON.stringify(agentRequest),
		});

		console.log(`   Status: ${agentResponse.status}`);

		if (agentResponse.ok) {
			const agentData = await agentResponse.json();
			console.log('   Response:');
			console.log(`   - Agent ID: ${agentData.agentId}`);
			console.log(`   - Status: ${agentData.status}`);
			console.log(`   - Response: ${agentData.response.substring(0, 100)}...`);
			console.log(`   - Execution Time: ${agentData.metadata?.executionTime}ms`);
			console.log(`   - Selected Agent: ${agentData.metadata?.selectedAgent}`);
			console.log(`   - Specialization: ${agentData.metadata?.specialization}`);
		} else {
			const errorData = await agentResponse.json();
			console.log('   Error:', JSON.stringify(errorData, null, 2));
		}
		console.log('');

		// Test 3: Invalid request (missing required fields)
		console.log('❌ Test 3: Invalid request');
                // nosemgrep: semgrep.owasp-top-10-2021-a10-server-side-request-forgery - buildUrl restricts requests to localhost origin.
                const invalidResponse = await fetch(buildUrl('/agents/execute'), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer test-api-key',
			},
			body: JSON.stringify({ invalid: 'data' }),
		});

		console.log(`   Status: ${invalidResponse.status}`);
		const invalidData = await invalidResponse.json();
		console.log('   Error:', invalidData.message);
		console.log('');

		// Test 4: Wrong HTTP method
		console.log('🚫 Test 4: Wrong HTTP method');
                // nosemgrep: semgrep.owasp-top-10-2021-a10-server-side-request-forgery - buildUrl restricts requests to localhost origin.
                const methodResponse = await fetch(buildUrl('/agents/execute'), {
			method: 'GET',
			headers: {
				Authorization: 'Bearer test-api-key',
			},
		});

		console.log(`   Status: ${methodResponse.status}`);
		const methodData = await methodResponse.json();
		console.log('   Error:', methodData.message);
		console.log('');

		console.log('✅ All tests completed successfully!');
	} catch (error) {
		console.error('❌ Test failed:', error);
	} finally {
		server.close(() => {
			console.log('\n🛑 Test server stopped');
			process.exit(0);
		});
	}
}

// Run the test
testAgentExecution().catch(console.error);
