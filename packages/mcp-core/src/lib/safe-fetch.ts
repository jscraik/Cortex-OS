export interface SafeFetchOptions {
        allowedHosts?: string[];
        allowedProtocols?: string[];
        allowLocalhost?: boolean;
        timeout?: number;
        fetchOptions?: RequestInit;
}

function isLocalhost(host: string): boolean {
        return host === 'localhost' || host === '::1' || host.startsWith('127.');
}

export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<Response> {
        const parsed = new URL(url);
        const protocol = parsed.protocol.toLowerCase();
        const host = parsed.hostname.toLowerCase();

        const allowedProtocols = options.allowedProtocols?.map((value) => value.toLowerCase()) ?? ['https:', 'http:'];
        if (!allowedProtocols.includes(protocol)) {
                throw new Error(`Protocol ${protocol} is not allowed`);
        }

        const normalizedHosts = new Set((options.allowedHosts ?? []).map((value) => value.toLowerCase()));
        const allowLocalhost = options.allowLocalhost ?? false;

        const hostAllowed =
                normalizedHosts.size === 0 ||
                normalizedHosts.has(host) ||
                (allowLocalhost && isLocalhost(host));

        if (!hostAllowed) {
                throw new Error(`Host ${host} is not permitted`);
        }

        const controller = new AbortController();
        const timeoutMs = options.timeout ?? 0;
        let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
        if (timeoutMs > 0) {
                timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
        }

        try {
                const fetchOptions = options.fetchOptions ?? {};
                const signal = fetchOptions.signal ?? controller.signal;
                return await fetch(url, { ...fetchOptions, signal });
        } finally {
                if (timeoutHandle) clearTimeout(timeoutHandle);
        }
}
