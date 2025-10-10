#!/usr/bin/env node

// Simple MCP server test for port 3024
import { createServer } from 'node:http';

const server = createServer((req, res) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	if (req.method === 'OPTIONS') {
		res.writeHead(204);
		res.end();
		return;
	}

	if (req.method === 'GET' && req.url === '/health') {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(
			JSON.stringify({
				status: 'healthy',
				service: 'cortex-mcp-test',
				timestamp: new Date().toISOString(),
				endpoints: ['/tools', '/tools/call', '/health'],
			}),
		);
		return;
	}

	if (req.method === 'GET' && req.url === '/tools') {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(
			JSON.stringify({
				tools: [
					{
						name: 'test.echo',
						description: 'Echoes back the input',
					},
				],
			}),
		);
		return;
	}

	if (req.method === 'POST' && req.url === '/tools/call') {
		let body = '';
		req.on('data', (chunk) => {
			body += chunk.toString();
		});
		req.on('end', () => {
			try {
				const data = JSON.parse(body);
				console.log('Received MCP call:', data);
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(
					JSON.stringify({
						tool: data.name,
						content: [
							{
								type: 'text',
								text: `Echo response: ${JSON.stringify(data.arguments || {})}`,
							},
						],
						_meta: {
							timestamp: new Date().toISOString(),
							service: 'cortex-mcp-test',
						},
					}),
				);
			} catch (e) {
				console.error('JSON parse error:', e);
				res.writeHead(400, { 'Content-Type': 'application/json' });
				res.end(
					JSON.stringify({
						error: { code: 'invalid_request', message: 'Invalid JSON' },
					}),
				);
			}
		});
		return;
	}

	res.writeHead(404);
	res.end();
});

server.listen(3024, '127.0.0.1', () => {
	console.log('Test MCP server listening on http://127.0.0.1:3024');
});
