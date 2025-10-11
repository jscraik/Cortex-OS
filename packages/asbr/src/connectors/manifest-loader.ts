import { constants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
        ConnectorsManifestSchema,
        ConnectorServiceMapSchema,
        type ConnectorsManifest,
        type ConnectorServiceEntry,
        type ConnectorServiceMap,
} from '@cortex-os/asbr-schemas';
import { ASBRError, ValidationError } from '../types/index.js';
import { signConnectorPayload, type ConnectorServiceMapPayload } from './signature.js';

const BRAND = 'brAInwav' as const;
const DEFAULT_MANIFEST_PATH = resolve(process.cwd(), 'config', 'connectors.manifest.json');

export async function loadConnectorServiceMap(): Promise<ConnectorServiceMap> {
        const manifestPath = resolveManifestPath();
        await ensureManifestReadable(manifestPath);
        const manifest = await readConnectorsManifest(manifestPath);
        const payload = buildConnectorServiceMap(manifest);
        const signatureKey = process.env.CONNECTORS_SIGNATURE_KEY;

        if (!signatureKey) {
                throw new ASBRError('CONNECTORS_SIGNATURE_KEY is not configured', 'CONNECTORS_SIGNATURE_KEY_MISSING', 503, {
                        brand: BRAND,
                        component: 'connectors',
                });
        }

        const signature = signConnectorPayload(payload, signatureKey);
        const signedPayload = { ...payload, signature };
        const validation = ConnectorServiceMapSchema.safeParse(signedPayload);

        if (!validation.success) {
                throw new ValidationError('Connector service map validation failed', {
                        errors: validation.error.errors,
                        brand: BRAND,
                        component: 'connectors',
                });
        }

        return validation.data;
}

function resolveManifestPath(): string {
        const configured = process.env.CONNECTORS_MANIFEST_PATH?.trim();
        if (configured) {
                return resolve(process.cwd(), configured);
        }

        return DEFAULT_MANIFEST_PATH;
}

async function ensureManifestReadable(path: string): Promise<void> {
        try {
                await access(path, constants.R_OK);
        } catch (error) {
                throw new ASBRError('Connectors manifest not found', 'CONNECTORS_MANIFEST_MISSING', 503, {
                        path,
                        brand: BRAND,
                        component: 'connectors',
                        error: error instanceof Error ? error.message : String(error),
                });
        }
}

async function readConnectorsManifest(path: string): Promise<ConnectorsManifest> {
        let raw: string;
        try {
                raw = await readFile(path, 'utf-8');
        } catch (error) {
                throw new ASBRError('Failed to read connectors manifest', 'CONNECTORS_MANIFEST_UNREADABLE', 503, {
                        path,
                        brand: BRAND,
                        component: 'connectors',
                        error: error instanceof Error ? error.message : String(error),
                });
        }

        let parsed: unknown;
        try {
                parsed = JSON.parse(raw);
        } catch (error) {
                throw new ValidationError('Connectors manifest JSON is invalid', {
                        path,
                        brand: BRAND,
                        component: 'connectors',
                        error: error instanceof Error ? error.message : String(error),
                });
        }

        const result = ConnectorsManifestSchema.safeParse(parsed);
        if (!result.success) {
                throw new ValidationError('Connectors manifest validation failed', {
                        errors: result.error.errors,
                        path,
                        brand: BRAND,
                        component: 'connectors',
                });
        }

        return result.data;
}

function buildConnectorServiceMap(manifest: ConnectorsManifest): ConnectorServiceMapPayload {
        const connectors = manifest.connectors
                .map((connector) => buildConnectorEntry(connector))
                .sort((left, right) => left.id.localeCompare(right.id));

        if (connectors.length === 0) {
                throw new ValidationError('Connectors manifest must contain at least one connector entry', {
                        brand: BRAND,
                        component: 'connectors',
                });
        }

        const ttlSeconds = Math.max(1, Math.min(...connectors.map((connector) => connector.ttlSeconds)));
        const generatedAt = manifest.generated_at ?? new Date().toISOString();

        return {
                id: manifest.id,
                brand: BRAND,
                generatedAt,
                ttlSeconds,
                connectors,
        };
}

function buildConnectorEntry(connector: ConnectorsManifest['connectors'][number]): ConnectorServiceEntry {
        const authHeaders = connector.authentication.headers;
        const primaryHeader = authHeaders[0];

        let authType: ConnectorServiceEntry['auth']['type'] = 'none';
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

function normalizeQuotas(quotas: ConnectorsManifest['connectors'][number]['quotas']):
        | ConnectorServiceEntry['quotas']
        | undefined {
        if (!quotas) {
                return undefined;
        }

        const mapped: NonNullable<ConnectorServiceEntry['quotas']> = {};
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
): ConnectorServiceEntry['headers'] | undefined {
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
