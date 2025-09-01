import { TOKENS } from '@cortex-os/contracts';
import { container } from './boot';

export async function startRuntime() {
  const memories = container.get(TOKENS.Memories) as any;
  const orchestration = container.get(TOKENS.Orchestration) as any;
  const mcp = container.get(TOKENS.MCPGateway) as any;
  return { memories, orchestration, mcp };
}
