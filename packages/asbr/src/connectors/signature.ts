import { createHmac } from 'node:crypto';
import type { ConnectorServiceMap } from '@cortex-os/asbr-schemas';

export type ConnectorServiceMapPayload = Omit<ConnectorServiceMap, 'signature'>;

export function canonicalizeConnectorPayload(payload: ConnectorServiceMapPayload): string {
        return canonicalStringify(payload);
}

export function signConnectorPayload(payload: ConnectorServiceMapPayload, key: string): string {
        const canonical = canonicalizeConnectorPayload(payload);
        return createHmac('sha256', key).update(canonical).digest('hex');
}

function canonicalStringify(value: unknown): string {
        if (value === null) {
                return 'null';
        }

        if (Array.isArray(value)) {
                const serialized = value.map((item) => canonicalStringify(item)).join(',');
                return `[${serialized}]`;
        }

        if (value && typeof value === 'object') {
                const entries = Object.entries(value as Record<string, unknown>)
                        .filter(([, v]) => v !== undefined)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([k, v]) => `${JSON.stringify(k)}:${canonicalStringify(v)}`)
                        .join(',');

                return `{${entries}}`;
        }

        return JSON.stringify(value);
}
