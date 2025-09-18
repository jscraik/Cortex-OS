import { raspMiddleware } from '../rasp-middleware.js';

test('rasp middleware is a function', () => {
	expect(typeof raspMiddleware).toBe('function');
});
