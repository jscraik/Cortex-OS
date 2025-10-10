// Preload hook to inject the MCP API key header for tools/validators/mcp-status.mjs
const apiKey = process.env.MCP_STATUS_API_KEY;

if (apiKey && typeof fetch === 'function') {
	const originalFetch = fetch;
	global.fetch = async (input, init = {}) => {
		const headers = new Headers(init.headers ?? {});
		if (!headers.has('X-API-Key')) {
			headers.set('X-API-Key', apiKey);
		}
		if (!headers.has('Accept')) {
			headers.set('Accept', 'application/json, text/event-stream');
		}
		return originalFetch(input, { ...init, headers });
	};
}
