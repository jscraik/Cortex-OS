import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
        ConnectorServiceMapSchema,
        ConnectorsManifestSchema,
        type ConnectorServiceMap,
        type ConnectorsManifest,
} from './manifest-schema.js';

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

export function buildConnectorServiceMap(manifest: ConnectorsManifest): ConnectorServiceMap {
        const connectors = manifest.connectors
                .map((connector) => ({
                        id: connector.id,
                        version: connector.version,
                        status: connector.status,
                        scopes: [...connector.scopes],
                        quotas: { ...connector.quotas },
                        ttl_seconds: connector.ttl_seconds,
                }))
                .sort((left, right) => left.id.localeCompare(right.id));

        const serviceMap: ConnectorServiceMap = {
                schema_version: manifest.schema_version,
                generated_at: manifest.generated_at,
                connectors,
        };

        return ConnectorServiceMapSchema.parse(serviceMap);
}

export function signConnectorServiceMap(serviceMap: ConnectorServiceMap, secret: string): string {
        if (!secret) {
                throw new Error('CONNECTORS_SIGNATURE_KEY is required to sign the connectors service map');
        }

        const payload = JSON.stringify(serviceMap);
        return createHmac('sha256', secret).update(payload).digest('hex');
}
