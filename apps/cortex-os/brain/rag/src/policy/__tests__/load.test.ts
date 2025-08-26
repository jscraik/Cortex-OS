import { describe, it, expect } from "vitest";
import path from "path";
import { loadRetrievalPolicy, applyPolicyOverrides } from "../load";
import { MimePolicyEngine, ProcessingStrategy } from "../mime";

describe("Retrieval Policy Loader", () => {
  it("loads and validates default policy", async () => {
    const configPath = path.join(process.cwd(), "config/retrieval.policy.json");
    const schemaPath = path.join(
      process.cwd(),
      "schemas/retrieval.policy.schema.json",
    );

    const { policy, engine } = await loadRetrievalPolicy(
      configPath,
      schemaPath,
    );

    expect(policy.mimePolicy.ocrMaxPages).toBeGreaterThan(0);
    expect(engine).toBeInstanceOf(MimePolicyEngine);
  });

  it("applies MIME-specific overrides to decisions", async () => {
    const { policy } = await loadRetrievalPolicy();
    const engine = new MimePolicyEngine(policy.mimePolicy);

    const base = engine.parseStrategy("application/pdf");
    expect(base.strategy).toBe(ProcessingStrategy.PDF_NATIVE);
    expect(base.processing?.maxPages).toBe(100); // default in engine map

    const overridden = applyPolicyOverrides(base, "application/pdf", policy);
    expect(overridden.processing?.maxPages).toBe(200); // from config override
  });

  it("applies wildcard overrides", async () => {
    const { policy } = await loadRetrievalPolicy();
    const engine = new MimePolicyEngine(policy.mimePolicy);

    const base = engine.parseStrategy("image/png");
    const overridden = applyPolicyOverrides(base, "image/png", policy);
    expect(overridden.processing?.maxPages).toBe(5); // from image/* override
  });

  it("creates dispatcher from policy config", async () => {
    const { policy } = await loadRetrievalPolicy();
    // ensure dispatcher fields are present in default policy
    expect(policy.dispatcher?.timeout).toBeGreaterThan(0);
    const { createDispatcherFromPolicy } = await import("../load");
    const dispatcher = createDispatcherFromPolicy(policy);
    expect(dispatcher.getConfig().timeout).toBe(policy.dispatcher?.timeout);
    expect(dispatcher.getConfig().maxChunkSize).toBe(
      policy.dispatcher?.maxChunkSize,
    );
    expect(dispatcher.getConfig().enableParallel).toBe(
      policy.dispatcher?.enableParallel,
    );
  });
});
