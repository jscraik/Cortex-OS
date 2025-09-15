import pino, { type DestinationStream } from 'pino';

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

export interface Logger {
	debug(message: string, ...args: unknown[]): void;
	info(message: string, ...args: unknown[]): void;
	warn(message: string, ...args: unknown[]): void;
	error(message: string, ...args: unknown[]): void;
}

export interface LoggerConfig {
	level?: LogLevel;
	stream?: DestinationStream;
}

const levelMap = {
	[LogLevel.DEBUG]: 'debug',
	[LogLevel.INFO]: 'info',
	[LogLevel.WARN]: 'warn',
	[LogLevel.ERROR]: 'error',
} as const;

export function createLogger(
	moduleName: string,
	config: LoggerConfig = {},
): Logger {
	const defaultLevel =
		process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
	const level = config.level ?? defaultLevel;

	const base = { module: moduleName };
	const logger = pino(
		{
			level: levelMap[level],
			base,
			timestamp: pino.stdTimeFunctions.isoTime,
		},
		config.stream,
	);

	const wrap =
		(method: 'debug' | 'info' | 'warn' | 'error') =>
		(message: string, ...args: unknown[]) => {
			const [context] = args;
			if (context && typeof context === 'object') {
				(logger as any)[method](context, message);
			} else {
				(logger as any)[method](message, ...args);
			}
		};

	return {
		debug: wrap('debug'),
		info: wrap('info'),
		warn: wrap('warn'),
		error: wrap('error'),
	};
}
