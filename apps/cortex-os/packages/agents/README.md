# @cortex-os/agents

Agents kernel for ASBR: schema-first contracts, hexagonal ports, swappable tools, and minimal sample agents (Echo, RAG).

- ESM-only TypeScript package
- Contracts: Task/Result (JSON Schema + Zod)
- Ports: Agent, Tool, Planner, EventBus
- Services: AgentRegistry, Executor, Middleware (timeout)
- Adapters: MCP tool, HTTP tool, Memories tool, Local in-proc bus

## Scripts

- `pnpm -F @cortex-os/agents dev`
- `pnpm -F @cortex-os/agents build`
- `pnpm -F @cortex-os/agents test`

## Integration (example)

```ts
import { createAgentRegistry, createExecutor, withTimeout, EchoAgent, RagAgent, MemoriesTool } from "@cortex-os/agents";
import { MemoryService } from "@cortex-os/memories";

const registry = createAgentRegistry();
const exec = createExecutor((h)=>withTimeout()(h));

// Provide a MemoryService implementation (e.g., from your app)
const memoriesSvc = { async search(i:any){ return { hits: [] }; } } as unknown as MemoryService;

registry.register(new EchoAgent());
registry.register(new RagAgent({ memories: new MemoriesTool(memoriesSvc) }));
```
