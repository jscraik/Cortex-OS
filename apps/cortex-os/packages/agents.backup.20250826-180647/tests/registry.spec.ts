import { describe, it, expect } from "vitest";
import { createAgentRegistry } from "../src/service/AgentRegistry.js";
import { EchoAgent } from "../src/adapters/agents/EchoAgent.js";

describe("AgentRegistry", () => {
  it("registers and lists agents", () => {
    const reg = createAgentRegistry();
    reg.register(new EchoAgent());
    const list = reg.list();
    expect(list.length).toBe(1);
    expect(reg.get("agent.echo")?.spec().id).toBe("agent.echo");
  });
});

