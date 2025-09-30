import pino from 'pino';
import type { Memory } from '../domain/types.js';

const _rawFactory = (pino as unknown as { default?: unknown })?.default ?? pino;
const _pinoFactory = _rawFactory as unknown as (opts: unknown) => import('pino').Logger;

const errSerializer = (err: unknown) => {
	if (err instanceof Error) return { message: err.message, stack: err.stack };
	return { message: String(err) };
};

export const logger = _pinoFactory({
	level: process.env.LOG_LEVEL || 'info',
	formatters: {
		level: (label: string) => ({ level: label }),
	},
	serializers: {
		err: errSerializer,
		memory: (memory: Memory) => ({
			id: memory.id,
			kind: memory.kind,
			tags: memory.tags?.length,
			textLength: memory.text?.length ?? 0,
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
