#!/usr/bin/env node

/**
 * ChatGPT-Compatible MCP Proxy Server
 *
 * This proxy sits in front of your FastMCP server and adds the
 * "text/event-stream" Accept header that ChatGPT Desktop's MCP connector
 * doesn't send, allowing ChatGPT to connect successfully.
 *
 * Usage:
 *   node dist/chatgpt-proxy.js
 *
 * The proxy will listen on port 3025 and forward to your MCP server on port 3024.
 */

import type { Request, Response } from 'express';
import express from 'express';
import { pino } from 'pino';
import { fetch } from 'undici';

const logger = pino({ level: process.env.PROXY_LOG_LEVEL || 'info' });

const PROXY_PORT = Number.parseInt(process.env.CHATGPT_PROXY_PORT || '3025', 10);
const TARGET_PORT = Number.parseInt(process.env.MCP_PORT || '3024', 10);
const TARGET_HOST = process.env.MCP_HOST || 'localhost';
const TARGET_URL = `http://${TARGET_HOST}:${TARGET_PORT}`;

const app = express();

// Parse JSON body
app.use(express.json());

// ChatGPT compatibility proxy
app.use(async (req: Request, res: Response) => {
	try {
		// Prepare headers with added Accept header
		const headers: Record<string, string> = {};

		// Copy all headers
		for (const [key, value] of Object.entries(req.headers)) {
			if (typeof value === 'string') {
				headers[key] = value;
			} else if (Array.isArray(value)) {
				headers[key] = value[0];
			}
		}

		// Add or modify Accept header for ChatGPT compatibility
		const accept = headers['accept'] || headers['Accept'] || '';
		if (!accept.includes('text/event-stream')) {
			headers['accept'] = accept
				? `${accept}, text/event-stream`
				: 'application/json, text/event-stream';
			logger.info({ original: accept, modified: headers['accept'] }, 'Modified Accept header');
		}

		// Remove host header to avoid conflicts
		delete headers['host'];

		// Proxy the request
		const targetUrl = `${TARGET_URL}${req.url}`;
		logger.info({ method: req.method, url: targetUrl }, 'Proxying request');

		const response = await fetch(targetUrl, {
			method: req.method,
			headers,
			body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
		});

		// Forward response headers
		response.headers.forEach((value, key) => {
			res.setHeader(key, value);
		});

		// Forward status code
		res.status(response.status);

		// Forward body
		const body = await response.text();
		res.send(body);
	} catch (error: any) {
		logger.error({ error: error.message, url: req.url }, 'Proxy error');
		res.status(500).json({ error: 'Proxy error', message: error.message });
	}
});

app.listen(PROXY_PORT, () => {
	logger.info(
		{
			proxyPort: PROXY_PORT,
			targetUrl: TARGET_URL,
		},
		'brAInwav ChatGPT-compatible MCP proxy server started',
	);
	logger.info(`ChatGPT should connect to: http://localhost:${PROXY_PORT}/mcp`);
	logger.info(`Or configure Cloudflare tunnel to forward to port ${PROXY_PORT}`);
});
