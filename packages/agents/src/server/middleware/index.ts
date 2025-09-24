import { errorHandler } from './error-handler.js';
import { jsonParsingMiddleware } from './json-parsing.js';
import { requestId } from './request-id.js';
import { requestLimit } from './request-limit.js';

export { errorHandler, jsonParsingMiddleware, requestId, requestLimit };

// Common middleware stack
export const commonMiddleware = [requestId];

// Route-specific middleware
export const routeMiddleware = {
	'/agents/execute': [requestLimit, jsonParsingMiddleware],
};
