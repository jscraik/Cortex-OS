import http from 'http';

const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/health') {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
            status: 'ok',
            service: 'mcp-health',
            port: 3000,
            timestamp: new Date().toISOString(),
            message: 'MCP server health check endpoint'
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found', path: req.url }));
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`MCP Health Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down MCP health service...');
    server.close(() => {
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\nShutting down MCP health service...');
    server.close(() => {
        process.exit(0);
    });
});
