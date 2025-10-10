export interface ConnectorServiceEntry {
	id: string;
	displayName: string;
	version: string;
	endpoint: string;
	scopes: string[];
	auth: Record<string, unknown>;
	quotas?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
	enabled: boolean;
	status?: 'online' | 'offline' | 'degraded' | 'unknown';
	ttlSeconds: number;
	tags?: string[];
	availability?: {
		lastCheckedAt?: string;
		lastSuccessAt?: string;
		lastFailureAt?: string;
		failureReason?: string;
	};
}
