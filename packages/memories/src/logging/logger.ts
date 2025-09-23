import pino from 'pino';
import type { Memory } from '../domain/types.js';

export const logger = pino({
	level: process.env.LOG_LEVEL || 'info',
	formatters: {
		level: (label) => ({ level: label }),
	},
	serializers: {
		err: pino.stdSerializers.err,
		memory: (memory: Memory) => ({
			id: memory.id,
			kind: memory.kind,
			tags: memory.tags?.length,
			textLength: memory.text.length,
			createdAt: memory.createdAt,
		}),
	},
	mixin: () => ({
		service: 'memories',
		version: process.env.npm_package_version || '0.1.0',
	}),
});

export const createChildLogger = (bindings: Record<string, unknown>) => {
	return logger.child(bindings);
};
