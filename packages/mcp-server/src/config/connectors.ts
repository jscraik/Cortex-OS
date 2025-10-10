import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	type ConnectorsManifest,
	connectorsManifestSchema,
} from '@cortex-os/asbr/src/types/connectors.js';
import type { Logger } from 'pino';

import { parseBooleanEnv } from '../utils/config.js';

const DEFAULT_MANIFEST_PATH = resolve(process.cwd(), 'config', 'connectors.manifest.json');

export interface ConnectorsConfig {
	enabled: boolean;
	manifest: ConnectorsManifest;
	manifestPath: string;
	apiKey?: string;
}

export function loadConnectorsConfig(logger: Logger): ConnectorsConfig {
	const manifestPath = process.env.CONNECTORS_MANIFEST_PATH ?? DEFAULT_MANIFEST_PATH;
	let manifest: ConnectorsManifest;
	try {
		const content = readFileSync(manifestPath, 'utf-8');
		const parsed = JSON.parse(content) as unknown;
		manifest = connectorsManifestSchema.parse(parsed);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.warn({ manifestPath, error: message }, 'Failed to load connectors manifest');
		manifest = {
			brand: 'brAInwav',
			version: '0',
			ttlSeconds: 300,
			connectors: [],
		};
	}

	const connectorsFlag = process.env.CONNECTORS_ENABLED;
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
