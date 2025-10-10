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
        const generatedAt = new Date().toISOString();
        const nowEpoch = Math.floor(Date.now() / 1000);
        const connectors = manifest.connectors.map((connector) => buildConnectorEntry(connector, nowEpoch));
        let minConnectorTTL: number | undefined = undefined;
        if (manifest.connectors.length > 0) {
                minConnectorTTL = Math.min(...manifest.connectors.map((connector) => connector.ttlSeconds));
        }
        const ttlSeconds = Math.max(
                1,
                manifest.ttlSeconds ?? minConnectorTTL ?? 1,
        );

        return {
                id: manifest.id,
                brand: BRAND,
                generatedAt,
                ttlSeconds,
                connectors,
        };
}

function buildConnectorEntry(
        connector: ConnectorsManifest['connectors'][number],
        nowEpoch: number,
): ConnectorServiceEntry {
        const entry: ConnectorServiceEntry = {
                id: connector.id,
                name: connector.name,
                version: connector.version,
                scopes: connector.scopes,
                status: connector.status,
                ttl: nowEpoch + connector.ttlSeconds,
        };

        if (Object.keys(connector.quotas).length > 0) {
                entry.quotas = connector.quotas;
        }

        if (Object.keys(connector.timeouts).length > 0) {
                entry.timeouts = connector.timeouts;
        }

        if (connector.metadata) {
                entry.metadata = connector.metadata;
        }

        if (connector.endpoint) {
                entry.endpoint = connector.endpoint;
        }

        if (connector.auth) {
                entry.auth = connector.auth;
        }

        return entry;
}
