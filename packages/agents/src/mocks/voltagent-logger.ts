// Mock implementations for @voltagent/logger

export interface Logger {
	info: (message: string, ...args: any[]) => void;
	warn: (message: string, ...args: any[]) => void;
	error: (message: string, ...args: any[]) => void;
	debug: (message: string, ...args: any[]) => void;
}

export function createLogger(name: string): Logger {
	return {
		info: (message: string, ...args: any[]) => {
			console.log(`[${name}] INFO: ${message}`, ...args);
		},
		warn: (message: string, ...args: any[]) => {
			console.warn(`[${name}] WARN: ${message}`, ...args);
		},
		error: (message: string, ...args: any[]) => {
			console.error(`[${name}] ERROR: ${message}`, ...args);
		},
		debug: (message: string, ...args: any[]) => {
			console.debug(`[${name}] DEBUG: ${message}`, ...args);
		},
	};
}
