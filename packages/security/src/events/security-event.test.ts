import { describe, it, expect, vi } from "vitest";
import { SecurityEventEmitter, type ContractRegistry, type PolicyRouter } from "./security-event.ts";

describe("SecurityEventEmitter", () => {
        it("emits event after registry validation and policy enforcement", async () => {
                const registry: ContractRegistry = {
                        validate: vi.fn().mockResolvedValue(true),
                };
                const policyRouter: PolicyRouter = {
                        enforce: vi.fn().mockResolvedValue(undefined),
                };
                const emitter = new SecurityEventEmitter({ registry, policyRouter });

                const event = await emitter.emit({
                        type: "security.test",
                        source: "urn:test",
                        schemaId: "https://cortex.test/schemas/security/test",
                        data: { foo: "bar" },
                        evidence: ["proof"],
                });

                expect(event.type).toBe("security.test");
                expect(registry.validate).toHaveBeenCalledWith(
                        "https://cortex.test/schemas/security/test",
                        { foo: "bar", evidence: ["proof"] },
                );
                expect(policyRouter.enforce).toHaveBeenCalled();
                expect(event.data).toEqual({ foo: "bar", evidence: ["proof"] });
        });

        it("throws when registry validation fails", async () => {
                const registry: ContractRegistry = {
                        validate: vi.fn().mockResolvedValue(false),
                };
                const policyRouter: PolicyRouter = {
                        enforce: vi.fn().mockResolvedValue(undefined),
                };
                const emitter = new SecurityEventEmitter({ registry, policyRouter });

                await expect(
                        emitter.emit({
                                type: "security.test",
                                source: "urn:test",
                                schemaId: "https://cortex.test/schemas/security/test",
                                data: {},
                        }),
                ).rejects.toThrow("Contract validation failed");
        });
});
