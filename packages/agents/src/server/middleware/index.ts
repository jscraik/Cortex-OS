import { errorHandler } from './error-handler';
import { jsonParsingMiddleware } from './json-parsing';
import { requestId } from './request-id';
import { requestLimit } from './request-limit';

export { errorHandler, jsonParsingMiddleware, requestId, requestLimit };

// Common middleware stack
export const commonMiddleware = [requestId];

// Route-specific middleware
export const routeMiddleware = {
	'/agents/execute': [requestLimit, jsonParsingMiddleware],
};
