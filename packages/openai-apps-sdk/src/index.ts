export interface ConnectorServiceMap {
	id: string;
	brand: string;
	generatedAt: string;
	ttlSeconds: number;
	connectors: Array<Record<string, unknown>>;
	signature?: string;
}

export interface AppsClient {
	connectors: {
		serviceMap(): Promise<ConnectorServiceMap>;
	};
}

export interface AppsSDK {
	createClient(): AppsClient;
}

export const createClient = (): AppsClient => {
	return {
		connectors: {
			async serviceMap(): Promise<ConnectorServiceMap> {
				throw new Error(
					'OpenAI Apps SDK runtime client is not available. Provide window.openai.apps in ChatGPT Apps.',
				);
			},
		},
	};
};

export type { AppsClient as Client };
