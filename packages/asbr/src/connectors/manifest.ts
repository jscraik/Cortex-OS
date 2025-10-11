import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
        ConnectorServiceMapPayloadSchema,
        ConnectorsManifestSchema,
        type ConnectorServiceMap,
        type ConnectorServiceMapPayload,
        type ConnectorsManifest,
} from './manifest-schema.js';
import { canonicalizeConnectorPayload } from './signature.js';

const MODULE_DIR = fileURLToPath(new URL('.', import.meta.url));
const FALLBACK_MANIFEST_PATH = resolve(MODULE_DIR, '../../../../config/connectors.manifest.json');
const CWD_MANIFEST_PATH = resolve(process.cwd(), 'config', 'connectors.manifest.json');

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
                .map((connector) => ({
                        id: connector.id,
                        version: connector.version,
                        displayName: connector.displayName ?? connector.name,
                        endpoint: connector.endpoint,
                        auth: connector.auth,
                        scopes: [...connector.scopes],
                        ttlSeconds: connector.ttlSeconds,
                        enabled: connector.enabled ?? (connector.status ? connector.status !== 'disabled' : true),
                        metadata: connector.metadata ? { ...connector.metadata } : undefined,
                        quotas: connector.quotas ? { ...connector.quotas } : undefined,
                        timeouts: connector.timeouts ? { ...connector.timeouts } : undefined,
                        description: connector.description,
                        ...(connector.tags && connector.tags.length > 0
                                ? { tags: [...connector.tags] }
                                : {}),
                }))
                .sort((left, right) => left.id.localeCompare(right.id));

        const minConnectorTTL = connectors.length > 0 ? Math.min(...connectors.map((connector) => connector.ttlSeconds)) : 1;
        const ttlSeconds = Math.max(1, manifest.ttlSeconds ?? minConnectorTTL);

        const serviceMap: ConnectorServiceMapPayload = {
                id: manifest.id,
                brand: 'brAInwav',
                generatedAt: manifest.generatedAt ?? new Date().toISOString(),
                ttlSeconds,
                connectors,
        };

        return ConnectorServiceMapPayloadSchema.parse(serviceMap);
}

export function signConnectorServiceMap(serviceMap: ConnectorServiceMap, secret: string): string {
        if (!secret) {
                throw new Error('CONNECTORS_SIGNATURE_KEY is required to sign the connectors service map');
        }

        const payload = ConnectorServiceMapPayloadSchema.parse({
                id: serviceMap.id,
                brand: serviceMap.brand,
                generatedAt: serviceMap.generatedAt,
                ttlSeconds: serviceMap.ttlSeconds,
                connectors: serviceMap.connectors,
        });

        const canonical = canonicalizeConnectorPayload(payload);
        return createHmac('sha256', secret).update(canonical).digest('hex');
}
