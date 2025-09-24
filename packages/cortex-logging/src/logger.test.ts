import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger, LogLevel } from './logger.js';

type LogRecord = Record<string, any>;

function setup(level: LogLevel = LogLevel.DEBUG) {
	const stream = new PassThrough();
	const logs: LogRecord[] = [];
	stream.on('data', (chunk) => {
		const lines = chunk.toString().trim().split('\n');
		for (const line of lines) {
			logs.push(JSON.parse(line));
		}
	});
	const logger = createLogger('test-module', { level, stream } as any);
	return { logger, logs };
}

describe('Logger', () => {
	it('emits JSON with level, timestamp, and context', () => {
		const { logger, logs } = setup();
		logger.info('user action', { userId: 1 });
		expect(logs.length).toBe(1);
		const entry = logs[0];
		expect(typeof entry.level).toBe('number');
		expect(entry.time).toBeDefined();
		expect(entry).toMatchObject({
			module: 'test-module',
			msg: 'user action',
			userId: 1,
		});
	});

	it('respects log level', () => {
		const { logger, logs } = setup(LogLevel.ERROR);
		logger.info('ignored');
		expect(logs).toHaveLength(0);
		logger.error('failure');
		expect(logs).toHaveLength(1);
		expect(logs[0].msg).toBe('failure');
	});
});
