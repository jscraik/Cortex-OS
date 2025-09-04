import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CertificateBundle, TrustDomainConfig } from "../types.js";
import * as clientModule from "./client";
import { SpiffeClient } from "./client";

describe("SpiffeClient", () => {
        const config: TrustDomainConfig = {
                name: "example",
                spireServerAddress: "localhost",
                spireServerPort: 8081,
                workloadSocketPath: "/var/run/spire-agent/public/api.sock",
        };

        const originalFetch = global.fetch;

        beforeEach(() => {
                vi.resetAllMocks();
        });

        afterEach(() => {
                global.fetch = originalFetch;
        });

        it("fetches workload identity using fetch", async () => {
                const mockResponse = {
                        spiffe_id: "spiffe://example.org/my/service",
                        trust_domain: "example.org",
                        selectors: [{ type: "env", value: "prod" }],
                };

                global.fetch = vi.fn().mockResolvedValue({
                        ok: true,
                        json: () => Promise.resolve(mockResponse),
                }) as unknown as typeof fetch;

                const client = new SpiffeClient(config);
                const identity = await client.fetchWorkloadIdentity();

                expect(global.fetch).toHaveBeenCalledWith(
                        "https://localhost:8081/workload/identity",
                        expect.objectContaining({
                                method: "GET",
                                headers: { "Content-Type": "application/json" },
                        }),
                );
                expect(identity.spiffeId).toBe(mockResponse.spiffe_id);
                expect(identity.trustDomain).toBe(mockResponse.trust_domain);
                expect(identity.selectors).toEqual({ env: "prod" });
        });

        it("fetches trust bundle and splits certificates", async () => {
                const pem = `-----BEGIN CERTIFICATE-----\nCERT1\n-----END CERTIFICATE-----\n-----BEGIN CERTIFICATE-----\nCERT2\n-----END CERTIFICATE-----`;
                global.fetch = vi.fn().mockResolvedValue({
                        ok: true,
                        json: () => Promise.resolve({ trust_bundle: pem }),
                }) as unknown as typeof fetch;
                const client = new SpiffeClient(config);
                const certs = await client.fetchTrustBundle();
                const expected = clientModule.splitPEMCertificates(pem);
                expect(certs).toEqual(expected);
                expect(certs).toHaveLength(2);
        });

        it("expires cached certificates after TTL", () => {
                const bundle: CertificateBundle = {
                        certificates: ["cert"],
                        privateKey: "key",
                        trustBundle: ["ca"],
                };
                const client = new SpiffeClient(config, 1);
                (client as any).certificateCache.set("spiffe://example.org/foo", {
                        bundle,
                        expiresAt: Date.now() - 1000,
                });
                expect(client.getCachedCertificate("spiffe://example.org/foo")).toBeUndefined();
        });
});
