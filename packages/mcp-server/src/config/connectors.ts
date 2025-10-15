import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Logger } from 'pino';

import { parseBooleanEnv } from '../utils/config.js';

const DEFAULT_MANIFEST_PATH = resolve(process.cwd(), 'config', 'connectors.manifest.json');
const require = createRequire(import.meta.url);

export type ConnectorManifestEntry = {
	id: string;
	displayName: string;
	endpoint: string;
	enabled?: boolean;
	auth?: {
		type?: 'bearer' | 'apiKey';
		headerName?: string;
		queryParam?: string;
	};
	timeouts?: {
		connectMs?: number;
	};
};

export type ConnectorsManifest = {
	connectors: ConnectorManifestEntry[];
};

export interface ConnectorsConfig {
	enabled: boolean;
	manifest: ConnectorsManifest;
	manifestPath: string;
	apiKey?: string;
}

export function loadConnectorsConfig(logger: Logger): ConnectorsConfig {
	const manifestPath = process.env.CONNECTORS_MANIFEST_PATH ?? DEFAULT_MANIFEST_PATH;
	const connectorsFlag = process.env.CONNECTORS_ENABLED;

	const connectorsModule = loadConnectorsModule(logger);
	if (!connectorsModule) {
		return {
			enabled: false,
			manifest: { connectors: [] },
			manifestPath,
			apiKey: process.env.CONNECTORS_API_KEY,
		};
	}

	const { connectorsManifestSchema } = connectorsModule;

	let manifest: ConnectorsManifest;
	try {
		const content = readFileSync(manifestPath, 'utf-8');
		const parsed = JSON.parse(content) as unknown;
		manifest = connectorsManifestSchema.parse(parsed);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error({ manifestPath, error: message }, 'Failed to load connectors manifest');
		throw new Error(`Failed to load connectors manifest at ${manifestPath}: ${message}`);
	}

	const connectorsEnabled =
		connectorsFlag !== undefined
			? parseBooleanEnv(connectorsFlag, true)
			: manifest.connectors.length > 0;

	if (!connectorsEnabled) {
		logger.info({ manifestPath }, 'Connectors proxy disabled by configuration or empty manifest');
	}

	return {
		enabled: connectorsEnabled,
		manifest,
		manifestPath,
		apiKey: process.env.CONNECTORS_API_KEY,
	};
}

function loadConnectorsModule(
	logger: Logger,
): { connectorsManifestSchema: { parse(value: unknown): ConnectorsManifest } } | null {
	try {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
		const mod = require('@cortex-os/asbr/types');
		if (mod?.connectorsManifestSchema?.parse) {
			return mod;
		}
		logger.warn(
			{ brand: 'brAInwav', component: 'connectors' },
			'@cortex-os/asbr/types module does not export connectorsManifestSchema; disabling connectors',
		);
	} catch (error) {
		logger.warn(
			{ brand: 'brAInwav', component: 'connectors', error: error instanceof Error ? error.message : String(error) },
			'@cortex-os/asbr/types module unavailable; disabling connectors',
		);
	}
	return null;
}
