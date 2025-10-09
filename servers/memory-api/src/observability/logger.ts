import pino from 'pino';

export const logger = pino({
	level: process.env.LOG_LEVEL || 'info',
	base: {
		brand: 'brAInwav',
	},
	transport: {
		target: 'pino-pretty',
	},
});
