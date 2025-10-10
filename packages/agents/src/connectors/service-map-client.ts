import { type ServiceMapPayload, serviceMapResponseSchema, verifyServiceMapSignature } from '@cortex-os/protocol';

const DEFAULT_TIMEOUT_MS = 5_000;

export interface ConnectorServiceMapClientOptions {
        serviceMapUrl: string;
        apiKey?: string;
        signatureKey: string;
        fetchImpl?: typeof fetch;
        timeoutMs?: number;
}

export interface VerifiedConnectorServiceMap {
        map: ServiceMapPayload & { signature: string };
        expiresAtMs: number;
}

export class ConnectorServiceMapError extends Error {
        constructor(message: string) {
                super(message);
                this.name = 'ConnectorServiceMapError';
        }
}

const buildHeaders = (apiKey?: string): HeadersInit => {
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (apiKey) {
                headers.Authorization = `Bearer ${apiKey}`;
        }
        return headers;
};

const requestManifest = async (options: ConnectorServiceMapClientOptions): Promise<Response> => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

        try {
                const response = await (options.fetchImpl ?? fetch)(options.serviceMapUrl, {
                        headers: buildHeaders(options.apiKey),
                        signal: controller.signal,
                });

                if (!response.ok) {
                        const body = await response.text().catch(() => '');
                        throw new ConnectorServiceMapError(
                                `Failed to load connectors manifest (${response.status} ${body})`,
                        );
                }

                return response;
        } catch (error) {
                if (error instanceof ConnectorServiceMapError) {
                        throw error;
                }

                throw new ConnectorServiceMapError(
                        error instanceof Error ? error.message : 'Unknown connectors manifest failure',
                );
        } finally {
                clearTimeout(timeout);
        }
};

const toPayload = (map: { signature: string } & ServiceMapPayload): ServiceMapPayload => {
        const { signature: _unused, ...payload } = map;
        return payload;
};

export const fetchConnectorServiceMap = async (
        options: ConnectorServiceMapClientOptions,
): Promise<VerifiedConnectorServiceMap> => {
        if (!options.signatureKey) {
                throw new ConnectorServiceMapError('CONNECTORS_SIGNATURE_KEY is required to verify manifest payloads');
        }

        const response = await requestManifest(options);
        const raw = (await response.json()) as unknown;
        const parsed = serviceMapResponseSchema.parse(raw);
        const expiresAt = new Date(parsed.generatedAt).getTime() + parsed.ttlSeconds * 1000;

        if (!Number.isFinite(expiresAt)) {
                throw new ConnectorServiceMapError('Unable to compute manifest expiry from generatedAt/ttlSeconds');
        }

        if (!verifyServiceMapSignature(toPayload(parsed), parsed.signature, options.signatureKey)) {
                throw new ConnectorServiceMapError('Connectors manifest signature validation failed');
        }

        return { map: parsed, expiresAtMs: expiresAt };
};
