import { container } from './boot';
import { TOKENS } from '@cortex-os/contracts';
import type { MemoryService } from '@cortex-os/memories';

interface Orchestration {
  engine: unknown;
  run: (...args: unknown[]) => unknown;
}

type MCPGateway = unknown;

export interface RuntimeServices {
  memories: MemoryService;
  orchestration: Orchestration;
  mcp: MCPGateway;
}

export function startRuntime(): RuntimeServices {
  const memories = container.get<MemoryService>(TOKENS.Memories);
  const orchestration = container.get<Orchestration>(TOKENS.Orchestration);
  const mcp = container.get<MCPGateway>(TOKENS.MCPGateway);
  return { memories, orchestration, mcp };
}
