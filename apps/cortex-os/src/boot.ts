import { TOKENS } from '@cortex-os/contracts';
import { provideMCP } from '@cortex-os/mcp/service';
import { provideMemories } from '@cortex-os/memories/service';
import { provideOrchestration } from '@cortex-os/orchestration/service';
import { tracer } from '@cortex-os/telemetry';
import { Container } from 'inversify';

export function createContainer(): Container {
  const container = new Container({
    defaultScope: 'Singleton',
    skipBaseClassChecks: true,
    autoBindInjectable: false,
  });

  container.bind(TOKENS.Memories).toConstantValue(provideMemories());
  container.bind(TOKENS.Orchestration).toConstantValue(provideOrchestration());
  container.bind(TOKENS.MCPGateway).toConstantValue(provideMCP());

  validateContainer(container);
  return container;
}

function validateContainer(container: Container): void {
  const span = tracer.startSpan('container.validation');
  try {
    const requiredTokens = [TOKENS.Memories, TOKENS.Orchestration, TOKENS.MCPGateway];
    for (const token of requiredTokens) {
      if (!container.isBound(token)) throw new Error(`Missing binding for ${token.toString()}`);
      const service = container.get(token as any);
      if (!service) throw new Error(`Failed to resolve ${token.toString()}`);
    }
    span.setStatus({ code: 1 });
  } catch (error: any) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error?.message });
    throw error;
  } finally {
    span.end();
  }
}

export const container = createContainer();
