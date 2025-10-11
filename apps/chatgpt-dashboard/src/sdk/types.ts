export interface ConnectorAuth {
	type: 'bearer' | 'apiKey' | 'none';
	headerName?: string;
}

export interface ConnectorQuota {
	perMinute?: number;
	perHour?: number;
	perDay?: number;
	concurrent?: number;
}

export interface ConnectorServiceEntry {
	id: string;
	displayName: string;
	version: string;
	description?: string;
	endpoint: string;
	scopes: string[];
	auth: ConnectorAuth;
	headers?: Record<string, string>;
	quotas?: ConnectorQuota;
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
	timeouts?: Record<string, number>;
}
