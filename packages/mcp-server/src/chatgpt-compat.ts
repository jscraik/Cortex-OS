/**
 * ChatGPT Compatibility Middleware
 *
 * This module patches the MCP SDK's Accept header validation to allow
 * ChatGPT Desktop connector to connect without sending the
 * "text/event-stream" Accept header.
 *
 * Based on research from Perplexity showing that ChatGPT's MCP connector
 * doesn't send the SSE Accept header, causing 403 Forbidden errors.
 */

import type { NextFunction, Request, Response } from 'express';
import express from 'express';

/**
 * Middleware that modifies the Accept header on incoming requests
 * to include text/event-stream if it's missing.
 *
 * This allows ChatGPT Desktop's MCP connector to work with FastMCP
 * servers that require the SSE Accept header.
 */
export function chatGPTCompatibilityMiddleware(
	req: Request,
	_res: Response,
	next: NextFunction,
): void {
	// Check if request has Accept header
	const accept = req.headers['accept'] || req.headers['Accept'];

	// If Accept header exists but doesn't include text/event-stream, add it
	if (accept && typeof accept === 'string') {
		if (!accept.includes('text/event-stream')) {
			// Add text/event-stream to the Accept header
			req.headers['accept'] = `${accept}, text/event-stream`;
			req.headers['Accept'] = `${accept}, text/event-stream`;
		}
	} else if (!accept) {
		// If no Accept header at all, add both
		req.headers['accept'] = 'application/json, text/event-stream';
		req.headers['Accept'] = 'application/json, text/event-stream';
	}

	next();
}

/**
 * Create an Express app with ChatGPT compatibility middleware
 * that can be used with FastMCP's custom server option.
 */
export function createChatGPTCompatibleApp(): express.Application {
	const app = express();

	// Add CORS headers for remote connections
	app.use((_req, res, next) => {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
		res.header('Access-Control-Allow-Credentials', 'true');
		next();
	});

	// Add ChatGPT compatibility middleware
	app.use(chatGPTCompatibilityMiddleware);

	return app;
}
