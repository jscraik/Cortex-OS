export type MemoryBackendKind = 'sqlite' | 'prisma' | 'local-memory';

export type SqliteHealthConfig = {
	connectionString?: string;
	readonly?: boolean;
	uri?: boolean;
};

export type PrismaHealthConfig = {
	connectionString?: string;
};

export type LocalMemoryHealthConfig = {
	baseUrl?: string;
	apiKey?: string;
	healthPath?: string;
	timeoutMs?: number;
};

export type DatabaseHealthConfig = {
	backend: MemoryBackendKind;
	sqlite?: SqliteHealthConfig;
	prisma?: PrismaHealthConfig;
	localMemory?: LocalMemoryHealthConfig;
};

export type DatabaseHealthResult = {
	backend: MemoryBackendKind;
	healthy: boolean;
	checkedAt: string;
	latencyMs: number;
	error?: string;
};

export type ServiceMetadata = {
	brand: 'brAInwav';
	service: 'memories';
	backend: {
		kind: MemoryBackendKind;
		healthy: boolean;
	};
	timestamp: string;
};
