const http = require('node:http');
const { URL } = require('node:url');

const port = process.env.PORT || 3024;
const host = '127.0.0.1';

const server = http.createServer((req, res) => {
	// Set CORS headers
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
		res.end(
			JSON.stringify({
				status: 'healthy',
				service: 'cortex-mcp-test-server',
				timestamp: new Date().toISOString(),
				endpoints: ['/tools', '/tools/call', '/health'],
			}),
		);
		return;
	}

	if (req.method === 'GET' && url.pathname === '/tools') {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(
			JSON.stringify({
				tools: [
					{
						name: 'system.status',
						description: 'Get system status',
					},
					{
						name: 'test.echo',
						description: 'Echo back input',
					},
				],
			}),
		);
		return;
	}

	if (req.method === 'POST' && url.pathname === '/tools/call') {
		let body = '';
		req.on('data', (chunk) => {
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
						content: [
							{
								type: 'text',
								text: `Echo response: ${JSON.stringify(data.arguments || {})}`,
							},
						],
						metadata: {
							timestamp: new Date().toISOString(),
							service: 'cortex-mcp-test',
						},
					};
				} else if (data.name === 'system.status') {
					response = {
						tool: data.name,
						content: [
							{
								type: 'text',
								text: 'Cortex-OS System Status: All systems operational. Ready for ChatGPT integration.',
							},
						],
						metadata: {
							timestamp: new Date().toISOString(),
							service: 'cortex-mcp-test',
						},
					};
				} else {
					response = {
						error: {
							code: 'not_found',
							message: `Unknown tool: ${data.name}`,
						},
					};
				}

				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(response));
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

server.listen(port, host, () => {
	console.log(`✅ Cortex MCP Test Server running on http://${host}:${port}`);
	console.log(`📍 Available endpoints:`);
	console.log(`   - GET  /health - Health check`);
	console.log(`   - GET  /tools  - List available tools`);
	console.log(`   - POST /tools/call - Execute tool`);
	console.log(`🔗 Cloudflare Tunnel: https://cortex-mcp.brainwav.io`);
});
