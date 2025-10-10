import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ulid } from 'ulid';

import {
	type ConnectorManifestEntry,
	type ConnectorsManifest,
	type ConnectorsServiceMap,
	connectorManifestEntrySchema,
	connectorsManifestSchema,
} from '../types/connectors.js';

const BRAND = 'brAInwav';
const DEFAULT_MANIFEST_PATH = resolve(process.cwd(), 'config', 'connectors.manifest.json');

export interface ServiceMapOptions {
	manifestPath?: string;
	signatureKey?: string;
	now?: () => Date;
	generateUlid?: () => string;
}

interface ConnectorBuildInput {
	entry: ConnectorManifestEntry;
	generatedAt: Date;
	ttlSeconds: number;
}

export function createConnectorsServiceMap(
	manifest: ConnectorsManifest,
	options: Omit<ServiceMapOptions, 'manifestPath'> & { signatureKey: string },
): ConnectorsServiceMap {
	const clock = options.now ?? (() => new Date());
	const now = clock();
	const mapId = options.generateUlid ? options.generateUlid() : ulid();
	const connectors = manifest.connectors.map((entry) =>
		buildConnectorEntry({ entry, generatedAt: now, ttlSeconds: manifest.ttlSeconds }),
	);

	const payload: Omit<ConnectorsServiceMap, 'signature'> = {
		id: mapId,
		brand: BRAND,
		generatedAt: now.toISOString(),
		ttlSeconds: manifest.ttlSeconds,
		connectors,
		metadata: manifest.metadata,
	};

	if (payload.metadata === undefined) {
		delete payload.metadata;
	}

	const signature = signPayload(payload, options.signatureKey);
	return { ...payload, signature } satisfies ConnectorsServiceMap;
}

export async function getConnectorsServiceMap(
	options: ServiceMapOptions = {},
): Promise<ConnectorsServiceMap> {
	const manifest = await loadManifest(options.manifestPath);
	const signatureKey = resolveSignatureKey(options.signatureKey);
	return createConnectorsServiceMap(manifest, {
		signatureKey,
		now: options.now,
		generateUlid: options.generateUlid,
	});
}

function buildConnectorEntry({ entry, generatedAt, ttlSeconds }: ConnectorBuildInput) {
	const parsed = connectorManifestEntrySchema.parse(entry);
	const expiresAt = new Date(generatedAt.getTime() + ttlSeconds * 1000);
	const status = parsed.enabled ? 'online' : 'offline';
	const availability = parsed.enabled
		? { status: 'unknown' as const }
		: {
				status: 'offline' as const,
				failureReason: 'Connector disabled in manifest',
			};

	return {
		id: parsed.id,
		displayName: parsed.displayName,
		version: parsed.version,
		endpoint: parsed.endpoint,
		auth: parsed.auth,
		scopes: parsed.scopes,
		quotas: parsed.quotas,
		enabled: parsed.enabled,
		metadata: parsed.metadata,
		tags: parsed.tags ?? [],
		timeouts: parsed.timeouts,
		availability,
		status,
		ttlSeconds,
		expiresAt: expiresAt.toISOString(),
	} satisfies ConnectorsServiceMap['connectors'][number];
}

async function loadManifest(manifestPath?: string): Promise<ConnectorsManifest> {
	const target = manifestPath ?? process.env.CONNECTORS_MANIFEST_PATH ?? DEFAULT_MANIFEST_PATH;
	try {
		const payload = await readFile(target, 'utf-8');
		const json = JSON.parse(payload) as unknown;
		return connectorsManifestSchema.parse(json);
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new Error(`[${BRAND}] Failed to load connectors manifest at ${target}: ${reason}`);
	}
}

function resolveSignatureKey(signatureKey?: string): string {
	const key = signatureKey ?? process.env.CONNECTORS_SIGNATURE_KEY;
	if (!key) {
		throw new Error(`[${BRAND}] CONNECTORS_SIGNATURE_KEY is not configured`);
	}
	return key;
}

function signPayload(
	payload: Omit<ConnectorsServiceMap, 'signature'>,
	signatureKey: string,
): string {
	const serialized = JSON.stringify(payload);
	return createHmac('sha256', signatureKey).update(serialized).digest('hex');
}
