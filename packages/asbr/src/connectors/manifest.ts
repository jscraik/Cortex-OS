import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	type ConnectorManifestEntry,
	type ConnectorServiceEntry,
	ConnectorServiceEntrySchema,
	type ConnectorServiceMap,
	type ConnectorServiceMapPayload,
	ConnectorServiceMapPayloadSchema,
	ConnectorServiceMapSchema,
	type ConnectorsManifest,
	ConnectorsManifestSchema,
} from '@cortex-os/asbr-schemas';
import { assertManifestDocument } from './schema.js';
import { signConnectorPayload } from './signature.js';

const BRAND = 'brAInwav' as const;
const MODULE_DIR = fileURLToPath(new URL('.', import.meta.url));
const FALLBACK_MANIFEST_PATH = resolve(MODULE_DIR, '../../../../config/connectors.manifest.json');
const WORKING_DIR_MANIFEST_PATH = resolve(process.cwd(), 'config', 'connectors.manifest.json');

export interface ManifestLoadAttempt {
	path: string;
	error: unknown;
}

export class ConnectorsManifestError extends Error {
	constructor(
		message: string,
		public readonly attempts: ManifestLoadAttempt[],
	) {
		super(message);
		this.name = 'ConnectorsManifestError';
	}
}

interface BuildConnectorServiceMapOptions {
	now?: () => Date;
}

export async function loadConnectorsManifest(manifestPath?: string): Promise<ConnectorsManifest> {
	const attempts: ManifestLoadAttempt[] = [];

	for (const candidate of buildCandidatePaths(
		manifestPath ?? process.env.CONNECTORS_MANIFEST_PATH,
	)) {
		try {
			const raw = await readFile(candidate, 'utf-8');
			const parsed = JSON.parse(raw) as unknown;
			assertManifestDocument(parsed);
			return ConnectorsManifestSchema.parse(parsed);
		} catch (error) {
			attempts.push({ path: candidate, error });
		}
	}

	throw new ConnectorsManifestError(
		'Unable to load connectors manifest from configured locations',
		attempts,
	);
}

export function buildConnectorServiceMap(
	manifest: ConnectorsManifest,
	options: BuildConnectorServiceMapOptions = {},
): ConnectorServiceMapPayload {
	const now = options.now?.() ?? new Date();
	const generatedAt = manifest.generatedAt ?? now.toISOString();

	const connectors = manifest.connectors
		.map((connector) => buildConnectorEntry(connector))
		.sort((left, right) => left.id.localeCompare(right.id));

	if (connectors.length === 0) {
		throw new ConnectorsManifestError(
			'Connectors manifest must include at least one connector',
			[],
		);
	}

	const connectorTtls = connectors.map((entry) => entry.ttlSeconds);
	const minConnectorTtl = connectorTtls.length ? Math.min(...connectorTtls) : 1;
	const manifestTtl = manifest.ttlSeconds ?? minConnectorTtl;
	const ttlSeconds = Math.max(1, Math.min(manifestTtl, minConnectorTtl));

	const payload = {
		id: manifest.id,
		brand: manifest.brand ?? BRAND,
		generatedAt,
		ttlSeconds,
		connectors,
		...(manifest.metadata ? { metadata: { ...manifest.metadata } } : {}),
	};

	return ConnectorServiceMapPayloadSchema.parse(payload);
}

export function signConnectorServiceMap(
	payload: ConnectorServiceMapPayload,
	secret: string,
): string {
	if (!secret) {
		throw new Error('CONNECTORS_SIGNATURE_KEY is required to sign the connectors service map');
	}

	return signConnectorPayload(payload, secret);
}

export function attachSignature(
	payload: ConnectorServiceMapPayload,
	signature: string,
): ConnectorServiceMap {
	return ConnectorServiceMapSchema.parse({ ...payload, signature });
}

function buildConnectorEntry(connector: ConnectorManifestEntry): ConnectorServiceEntry {
	const enabled = resolveEnabled(connector);
	const auth = connector.auth ?? deriveAuthFromAuthentication(connector);
	const headers = mergeHeaders(connector);
	const quotas = normalizeQuotas(connector);
	const timeouts = connector.timeouts ? { ...connector.timeouts } : undefined;
	const metadata = {
		brand: BRAND,
		...(connector.metadata ?? {}),
	};

	// Deep clone remoteTools if present and non-empty
	const remoteTools =
		connector.remoteTools && connector.remoteTools.length > 0
			? connector.remoteTools.map((tool) => ({
					...tool,
					...(tool.tags ? { tags: [...tool.tags] } : {}),
					...(tool.scopes ? { scopes: [...tool.scopes] } : {}),
				}))
			: undefined;

	const baseEntry: ConnectorServiceEntry = {
		id: connector.id,
		version: connector.version,
		displayName: connector.displayName ?? connector.name,
		endpoint: connector.endpoint,
		auth,
		scopes: [...connector.scopes],
		ttlSeconds: connector.ttlSeconds,
		enabled,
		metadata,
		...(quotas ? { quotas } : {}),
		...(headers ? { headers } : {}),
		...(connector.description ? { description: connector.description } : {}),
		...(connector.tags && connector.tags.length > 0 ? { tags: [...connector.tags] } : {}),
		...(timeouts ? { timeouts } : {}),
		...(remoteTools ? { remoteTools } : {}),
	};

	return ConnectorServiceEntrySchema.parse(baseEntry);
}

function resolveEnabled(connector: ConnectorManifestEntry): boolean {
	if (typeof connector.enabled === 'boolean') {
		return connector.enabled;
	}

	if (connector.status) {
		return connector.status !== 'disabled';
	}

	return true;
}

function deriveAuthFromAuthentication(
	connector: ConnectorManifestEntry,
): ConnectorServiceEntry['auth'] {
	const authConfig = connector.authentication;
	if (!authConfig || authConfig.headers.length === 0) {
		return { type: 'none' };
	}

	const primaryHeader = authConfig.headers[0];
	const headerName = primaryHeader.name;
	const normalized = headerName.toLowerCase();

	if (normalized === 'authorization' || primaryHeader.value.startsWith('Bearer ')) {
		return { type: 'bearer', headerName };
	}

	return { type: 'apiKey', headerName };
}

function mergeHeaders(
	connector: ConnectorManifestEntry,
): ConnectorServiceEntry['headers'] | undefined {
	const merged = new Map<string, string>();

	const authHeaders = connector.authentication?.headers ?? [];
	for (const header of authHeaders) {
		merged.set(header.name, header.value);
	}

	if (connector.headers) {
		for (const [key, value] of Object.entries(connector.headers)) {
			merged.set(key, value);
		}
	}

	return merged.size > 0 ? Object.fromEntries(merged.entries()) : undefined;
}

function normalizeQuotas(
	connector: ConnectorManifestEntry,
): ConnectorServiceEntry['quotas'] | undefined {
	const quotas = connector.quotas;
	if (!quotas) {
		return undefined;
	}

	const budget: NonNullable<ConnectorServiceEntry['quotas']> = {};

	if (typeof quotas.perMinute === 'number') {
		budget.perMinute = quotas.perMinute;
	} else if (typeof (quotas as Record<string, number>).per_minute === 'number') {
		budget.perMinute = (quotas as Record<string, number>).per_minute;
	}

	if (typeof quotas.perHour === 'number') {
		budget.perHour = quotas.perHour;
	} else if (typeof (quotas as Record<string, number>).per_hour === 'number') {
		budget.perHour = (quotas as Record<string, number>).per_hour;
	}

	if (typeof quotas.perDay === 'number') {
		budget.perDay = quotas.perDay;
	} else if (typeof (quotas as Record<string, number>).per_day === 'number') {
		budget.perDay = (quotas as Record<string, number>).per_day;
	}

	if (typeof quotas.concurrent === 'number') {
		budget.concurrent = quotas.concurrent;
	}

	return Object.keys(budget).length > 0 ? budget : undefined;
}

function buildCandidatePaths(manifestPath?: string): string[] {
	if (manifestPath) {
		return [resolve(manifestPath)];
	}

	const candidates = [WORKING_DIR_MANIFEST_PATH, FALLBACK_MANIFEST_PATH].map((path) =>
		resolve(path),
	);

	return Array.from(new Set(candidates));
}
