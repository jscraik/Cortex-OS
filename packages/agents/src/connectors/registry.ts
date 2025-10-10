import type { ConnectorEntry } from '@cortex-os/protocol';
import {
        ConnectorServiceMapError,
        type ConnectorServiceMapClientOptions,
        fetchConnectorServiceMap,
} from './service-map-client.js';
import { recordConnectorTtl, setConnectorAvailability } from './telemetry.js';

export interface ConnectorRegistryOptions extends ConnectorServiceMapClientOptions {
        connectorsApiKey?: string;
        now?: () => number;
}

export interface ConnectorDefinition extends ConnectorEntry {
        headers: Record<string, string>;
        expiresAtMs: number;
}

const resolveAuthHeader = (entry: ConnectorEntry, apiKey?: string): Record<string, string> => {
        if (entry.auth.type === 'none') {
                return {};
        }

        if (!apiKey) {
                throw new ConnectorServiceMapError(
                        `Connector "${entry.id}" requires CONNECTORS_API_KEY to establish MCP proxy`,
                );
        }

        if (entry.auth.type === 'bearer') {
                return { Authorization: `Bearer ${apiKey}` };
        }

        const headerName = entry.auth.headerName ?? 'Authorization';
        if (headerName.toLowerCase() === 'authorization') {
                return { Authorization: `Bearer ${apiKey}` };
        }

        return { [headerName]: apiKey };
};

export class ConnectorRegistry {
        private readonly options: ConnectorRegistryOptions;
        private readonly connectors = new Map<string, ConnectorDefinition>();
        private expiresAtMs = 0;

        constructor(options: ConnectorRegistryOptions) {
                this.options = options;
        }

        async refresh(force = false): Promise<void> {
                const now = this.options.now?.() ?? Date.now();
                if (!force && now < this.expiresAtMs) {
                        return;
                }

                const result = await fetchConnectorServiceMap(this.options);
                this.expiresAtMs = result.expiresAtMs;
                this.connectors.clear();

                for (const entry of result.map.connectors) {
                        const headers = {
                                ...entry.headers,
                                ...resolveAuthHeader(entry, this.options.connectorsApiKey),
                        };

                        const definition: ConnectorDefinition = {
                                ...entry,
                                headers,
                                expiresAtMs: this.expiresAtMs,
                        };

                        this.connectors.set(entry.id, definition);
                        setConnectorAvailability(entry.id, entry.enabled);
                        recordConnectorTtl(entry.id, this.expiresAtMs);
                }
        }

        list(): ConnectorDefinition[] {
                return Array.from(this.connectors.values());
        }

        get(id: string): ConnectorDefinition | undefined {
                return this.connectors.get(id);
        }

        getExpiry(): number {
                return this.expiresAtMs;
        }
}
