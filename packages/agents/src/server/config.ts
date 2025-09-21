export interface ServerConfig {
	port: number;
	host: string;
	maxRequestSize: number;
	requestTimeout: number;
	version: string;
	environment: 'development' | 'production' | 'test';
}

export const defaultConfig: ServerConfig = {
	port: Number(process.env.PORT) || 3000,
	host: process.env.HOST || 'localhost',
	maxRequestSize: Number(process.env.MAX_REQUEST_SIZE) || 1024 * 1024, // 1MB
	requestTimeout: Number(process.env.REQUEST_TIMEOUT) || 30000, // 30 seconds
	version: process.env.npm_package_version || '0.1.0',
	environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
};

export function createServerConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
	return {
		...defaultConfig,
		...overrides,
	};
}
