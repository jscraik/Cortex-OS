import http from 'node:http';

const server = http.createServer((req, res) => {
	let body = '';
	req.on('data', (c) => {
		body += c;
	});
	req.on('end', () => {
		try {
			const msg = JSON.parse(body || '{}');
			const result = {
				id: msg.id ?? 'n/a',
				result: { tool: msg.method || msg.name, ok: true },
			};
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify(result));
		} catch (e) {
			res.statusCode = 400;
			res.end(String(e));
		}
	});
});

server.listen(0, () => {
	const { port } = server.address();
	// communicate chosen port to parent (stdout line protocol)
	process.stdout.write(`${JSON.stringify({ serverPort: port })}\n`);
});
