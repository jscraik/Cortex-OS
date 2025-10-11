import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
        ConnectorServiceMapSchema,
        ConnectorsManifestSchema,
        type ConnectorsManifest,
        type ConnectorServiceMapEntry,
} from './manifest-schema.js';
import { signConnectorPayload, type ConnectorServiceMapPayload } from './signature.js';

const MODULE_DIR = fileURLToPath(new URL('.', import.meta.url));
const FALLBACK_MANIFEST_PATH = resolve(MODULE_DIR, '../../../../config/connectors.manifest.json');
const CWD_MANIFEST_PATH = resolve(process.cwd(), 'config', 'connectors.manifest.json');
const BRAND = 'brAInwav' as const;
const ConnectorServiceMapPayloadSchema = ConnectorServiceMapSchema.omit({ signature: true });

export interface ManifestLoadAttempt {
        path: string;
        error: unknown;
}

export class ConnectorsManifestError extends Error {
        constructor(message: string, public readonly attempts: ManifestLoadAttempt[]) {
                super(message);
                this.name = 'ConnectorsManifestError';
        }
}

function buildCandidatePaths(manifestPath?: string): string[] {
        const paths = [manifestPath, CWD_MANIFEST_PATH, FALLBACK_MANIFEST_PATH];
        return Array.from(new Set(paths.filter((value): value is string => Boolean(value))));
}

export async function loadConnectorsManifest(manifestPath?: string): Promise<ConnectorsManifest> {
        const attempts: ManifestLoadAttempt[] = [];
        for (const candidate of buildCandidatePaths(manifestPath ?? process.env.CONNECTORS_MANIFEST_PATH)) {
                try {
                        const raw = await readFile(candidate, 'utf-8');
                        const json = JSON.parse(raw) as unknown;
                        return ConnectorsManifestSchema.parse(json);
                } catch (error) {
                        attempts.push({ path: candidate, error });
                }
        }

        throw new ConnectorsManifestError(
                'Unable to load connectors manifest from configured locations',
                attempts,
        );
}

export function buildConnectorServiceMap(manifest: ConnectorsManifest): ConnectorServiceMapPayload {
        const connectors = manifest.connectors
                .map((connector) => buildConnectorEntry(connector))
                .sort((left, right) => left.id.localeCompare(right.id));

        if (connectors.length === 0) {
                throw new ConnectorsManifestError('Connectors manifest must contain at least one connector', []);
        }

        const ttlSeconds = Math.max(1, Math.min(...connectors.map((connector) => connector.ttlSeconds)));

        const payload: ConnectorServiceMapPayload = {
                id: manifest.id,
                brand: BRAND,
                generatedAt: manifest.generated_at ?? new Date().toISOString(),
                ttlSeconds,
                connectors,
        };

        return ConnectorServiceMapPayloadSchema.parse(payload);
}

export function signConnectorServiceMap(serviceMap: ConnectorServiceMapPayload, secret: string): string {
        if (!secret) {
                throw new Error('CONNECTORS_SIGNATURE_KEY is required to sign the connectors service map');
        }

        return signConnectorPayload(serviceMap, secret);
}

function buildConnectorEntry(connector: ConnectorsManifest['connectors'][number]): ConnectorServiceMapEntry {
        const authHeaders = connector.authentication.headers;
        const primaryHeader = authHeaders[0];

        let authType: ConnectorServiceMapEntry['auth']['type'] = 'none';
        let headerName: string | undefined;
        if (primaryHeader) {
                headerName = primaryHeader.name;
                const normalizedName = primaryHeader.name.toLowerCase();
                if (normalizedName === 'authorization' || primaryHeader.value.startsWith('Bearer ')) {
                        authType = 'bearer';
                } else {
                        authType = 'apiKey';
                }
        }

        const metadata = {
                brand: BRAND,
                ...(connector.metadata ?? {}),
        };

        const quotas = normalizeQuotas(connector.quotas);
        const headers = buildHeadersRecord(connector.headers, authHeaders);

        return {
                id: connector.id,
                version: connector.version,
                displayName: connector.name,
                endpoint: connector.endpoint,
                auth: { type: authType, ...(headerName ? { headerName } : {}) },
                scopes: [...connector.scopes],
                ttlSeconds: connector.ttl_seconds,
                enabled: connector.status === 'enabled',
                metadata,
                ...(quotas ? { quotas } : {}),
                ...(headers ? { headers } : {}),
                ...(connector.description ? { description: connector.description } : {}),
                ...(connector.tags ? { tags: connector.tags } : {}),
        };
}

function normalizeQuotas(
        quotas: ConnectorsManifest['connectors'][number]['quotas'],
): ConnectorServiceMapEntry['quotas'] | undefined {
        if (!quotas) {
                return undefined;
        }

        const mapped: NonNullable<ConnectorServiceMapEntry['quotas']> = {};
        if (typeof quotas.per_minute === 'number') {
                mapped.perMinute = quotas.per_minute;
        }
        if (typeof quotas.per_hour === 'number') {
                mapped.perHour = quotas.per_hour;
        }
        if (typeof quotas.concurrent === 'number') {
                mapped.concurrent = quotas.concurrent;
        }

        return Object.keys(mapped).length > 0 ? mapped : undefined;
}

function buildHeadersRecord(
        headers: ConnectorsManifest['connectors'][number]['headers'],
        authHeaders: ConnectorsManifest['connectors'][number]['authentication']['headers'],
): ConnectorServiceMapEntry['headers'] | undefined {
        const merged = new Map<string, string>();

        for (const header of authHeaders) {
                merged.set(header.name, header.value);
        }

        if (headers) {
                for (const [key, value] of Object.entries(headers)) {
                        merged.set(key, value);
                }
        }

        return merged.size > 0 ? Object.fromEntries(merged.entries()) : undefined;
}
