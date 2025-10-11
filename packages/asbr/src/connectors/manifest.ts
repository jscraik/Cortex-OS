import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
        ConnectorServiceMapSchema,
        type ConnectorServiceEntry,
        ConnectorsManifestSchema,
        type ConnectorServiceMap,
        type ConnectorsManifest,
} from './manifest-schema.js';

const MODULE_DIR = fileURLToPath(new URL('.', import.meta.url));
const FALLBACK_MANIFEST_PATH = resolve(MODULE_DIR, '../../../../config/connectors.manifest.json');
const CWD_MANIFEST_PATH = resolve(process.cwd(), 'config', 'connectors.manifest.json');

const CONNECTOR_SERVICE_MAP_PAYLOAD_SCHEMA = ConnectorServiceMapSchema.omit({ signature: true });

export type ConnectorServiceMapPayload = z.infer<typeof CONNECTOR_SERVICE_MAP_PAYLOAD_SCHEMA>;

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
        const nowEpoch = Math.floor(Date.now() / 1000);
        const connectors = manifest.connectors
                .map((connector) => buildConnectorEntry(connector, nowEpoch))
                .sort((left, right) => left.id.localeCompare(right.id));

        const minConnectorTTL = connectors.length
                ? Math.min(...connectors.map((entry) => entry.ttl - nowEpoch))
                : undefined;
        const ttlSeconds = Math.max(1, manifest.ttlSeconds ?? minConnectorTTL ?? 1);

        const payload: ConnectorServiceMapPayload = {
                id: manifest.id,
                brand: manifest.brand ?? 'brAInwav',
                generatedAt: new Date().toISOString(),
                ttlSeconds,
                connectors,
        };

        return CONNECTOR_SERVICE_MAP_PAYLOAD_SCHEMA.parse(payload);
}

function buildConnectorEntry(
        connector: ConnectorsManifest['connectors'][number],
        nowEpoch: number,
): ConnectorServiceEntry {
        const entry: ConnectorServiceEntry = {
                id: connector.id,
                name: connector.name,
                version: connector.version,
                scopes: [...connector.scopes],
                status: connector.status,
                ttl: nowEpoch + connector.ttlSeconds,
        };

        if (Object.keys(connector.quotas).length > 0) {
                entry.quotas = { ...connector.quotas };
        }

        if (Object.keys(connector.timeouts).length > 0) {
                entry.timeouts = { ...connector.timeouts };
        }

        if (connector.metadata) {
                entry.metadata = { ...connector.metadata };
        }

        if (connector.endpoint) {
                entry.endpoint = connector.endpoint;
        }

        if (connector.auth) {
                entry.auth = { ...connector.auth };
        }

        return entry;
}

export function signConnectorServiceMap(payload: ConnectorServiceMapPayload, secret: string): string {
        if (!secret) {
                throw new Error('CONNECTORS_SIGNATURE_KEY is required to sign the connectors service map');
        }

        const canonical = JSON.stringify(payload);
        return createHmac('sha256', secret).update(canonical).digest('hex');
}

export function attachSignature(
        payload: ConnectorServiceMapPayload,
        signature: string,
): ConnectorServiceMap {
        return ConnectorServiceMapSchema.parse({ ...payload, signature });
}
