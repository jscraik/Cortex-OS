import { describe, expect, it } from 'vitest';

import { loadIngestPolicy, parseIngestPolicy } from '../src/policy';

describe('loadIngestPolicy', () => {
        it('returns default policy when file is missing', () => {
                const result = loadIngestPolicy({
                        policyPath: 'missing.yaml',
                        readFile: () => {
                                const error = new Error('not found');
                                (error as NodeJS.ErrnoException).code = 'ENOENT';
                                throw error;
                        },
                });

                expect(result).toEqual({ allowMime: [] });
        });

        it('returns parsed MIME types when loader succeeds', () => {
                const result = loadIngestPolicy({
                        policyPath: 'configs/ingest.policy.yaml',
                        readFile: () => 'ignored',
                        loader: () => ({
                                ingest: {
                                        allow_mime: ['text/plain', 'application/pdf'],
                                },
                        }),
                });

                expect(result).toEqual({
                        allowMime: ['text/plain', 'application/pdf'],
                });
        });

        it('filters non-string entries when parsing the policy', () => {
                const result = loadIngestPolicy({
                        policyPath: 'configs/ingest.policy.yaml',
                        readFile: () => 'ignored',
                        loader: () => ({
                                ingest: {
                                        allow_mime: ['text/plain', 42, false, 'application/pdf'],
                                },
                        }),
                });

                expect(result).toEqual({
                        allowMime: ['text/plain', 'application/pdf'],
                });
        });

        it('returns default policy when loader throws', () => {
                const result = loadIngestPolicy({
                        policyPath: 'configs/ingest.policy.yaml',
                        readFile: () => 'ignored',
                        loader: () => {
                                throw new Error('bad yaml');
                        },
                });

                expect(result).toEqual({ allowMime: [] });
        });
});

describe('parseIngestPolicy', () => {
        it('returns default when YAML structure is missing', () => {
                expect(parseIngestPolicy(undefined)).toEqual({ allowMime: [] });
                expect(parseIngestPolicy({})).toEqual({ allowMime: [] });
        });

        it('parses allow_mime entries into camelCase allowMime', () => {
                expect(
                        parseIngestPolicy({
                                ingest: {
                                        allow_mime: ['text/plain', 'application/pdf'],
                                },
                        }),
                ).toEqual({ allowMime: ['text/plain', 'application/pdf'] });
        });
});
