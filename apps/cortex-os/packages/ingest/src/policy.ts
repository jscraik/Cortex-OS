import fs from 'node:fs';

import yaml from 'js-yaml';

export interface IngestPolicy {
        allowMime: string[];
}

const DEFAULT_POLICY_PATH = 'configs/ingest.policy.yaml';

export interface LoadIngestPolicyOptions {
        policyPath?: string;
        readFile?: (filePath: string, encoding?: BufferEncoding) => string;
        loader?: (input: string) => unknown;
}

function toIngestPolicy(values: string[]): IngestPolicy {
        return { allowMime: values };
}

export function parseIngestPolicy(data: unknown): IngestPolicy {
        if (!data || typeof data !== 'object') {
                return toIngestPolicy([]);
        }

        const ingest = (data as { ingest?: unknown }).ingest;
        if (!ingest || typeof ingest !== 'object') {
                return toIngestPolicy([]);
        }

        const allowMime = (ingest as { allow_mime?: unknown }).allow_mime;
        if (!Array.isArray(allowMime)) {
                return toIngestPolicy([]);
        }

        const filtered = allowMime.filter((value): value is string => typeof value === 'string');
        return toIngestPolicy(filtered);
}

const defaultReadFile = (filePath: string, encoding?: BufferEncoding) => {
        if (encoding) {
                return fs.readFileSync(filePath, encoding);
        } else {
                // Default to utf8 if encoding is not provided
                return fs.readFileSync(filePath, 'utf8');
        }
};

const defaultLoader = (input: string) => yaml.load(input);

export function loadIngestPolicy(options: LoadIngestPolicyOptions = {}): IngestPolicy {
        const {
                policyPath = DEFAULT_POLICY_PATH,
                readFile = defaultReadFile,
                loader = defaultLoader,
        } = options;

        try {
                const raw = readFile(policyPath, 'utf8');
                const parsed = loader(raw);
                return parseIngestPolicy(parsed);
        } catch (_error) {
                return toIngestPolicy([]);
        }
}
