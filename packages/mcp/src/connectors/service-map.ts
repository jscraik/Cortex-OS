import { type ServiceMapPayload, serviceMapResponseSchema, verifyServiceMapSignature } from '@cortex-os/protocol';

const DEFAULT_TIMEOUT_MS = 5_000;

export interface ConnectorServiceMapOptions {
        serviceMapUrl: string;
        apiKey?: string;
        signatureKey: string;
        fetchImpl?: typeof fetch;
        timeoutMs?: number;
}

export interface VerifiedServiceMap {
        payload: ServiceMapPayload & { signature: string };
        expiresAtMs: number;
}

export class ConnectorManifestError extends Error {
        constructor(message: string) {
                super(message);
                this.name = 'ConnectorManifestError';
        }
}

const buildHeaders = (apiKey?: string): HeadersInit => {
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (apiKey) {
                headers.Authorization = `Bearer ${apiKey}`;
        }
        return headers;
};

const executeRequest = async (options: ConnectorServiceMapOptions): Promise<Response> => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

        try {
                const response = await (options.fetchImpl ?? fetch)(options.serviceMapUrl, {
                        headers: buildHeaders(options.apiKey),
                        signal: controller.signal,
                });

                if (!response.ok) {
                        const detail = await response.text().catch(() => '');
                        throw new ConnectorManifestError(
                                `Unable to load connectors map (${response.status} ${detail})`,
                        );
                }

                return response;
        } catch (error) {
                if (error instanceof ConnectorManifestError) {
                        throw error;
                }

                throw new ConnectorManifestError(
                        error instanceof Error ? error.message : 'Unknown connectors manifest failure',
                );
        } finally {
                clearTimeout(timeout);
        }
};

const omitSignature = (manifest: ServiceMapPayload & { signature: string }): ServiceMapPayload => {
        const { signature: _unused, ...payload } = manifest;
        return payload;
};

export const loadConnectorServiceMap = async (
        options: ConnectorServiceMapOptions,
): Promise<VerifiedServiceMap> => {
        if (!options.signatureKey) {
                throw new ConnectorManifestError('CONNECTORS_SIGNATURE_KEY is required for verification');
        }

        const response = await executeRequest(options);
        const raw = (await response.json()) as unknown;
        const parsed = serviceMapResponseSchema.parse(raw);
        const expiresAt = new Date(parsed.generatedAt).getTime() + parsed.ttlSeconds * 1000;

        if (!Number.isFinite(expiresAt)) {
                throw new ConnectorManifestError('Invalid generatedAt/ttlSeconds combination');
        }

        if (!verifyServiceMapSignature(omitSignature(parsed), parsed.signature, options.signatureKey)) {
                throw new ConnectorManifestError('Connectors manifest signature mismatch');
        }

        return { payload: parsed, expiresAtMs: expiresAt };
};
