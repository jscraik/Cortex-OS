# @openai/apps-sdk

brAInwav Cortex-OS adapters for OpenAI Agents and Instructor libraries.

## Purpose

Provides protocol-based adapters for:
- **OpenAI Agents JS**: Thin wrapper around OpenAI Agents SDK
- **Instructor JS**: Schema-constrained output validation

## Architecture

This package uses **dependency injection** rather than direct dependencies:
- Adapters accept interface-conforming clients
- No hard dependencies on external SDKs (peer dependencies only)
- Consumers bring their own SDK implementations

## Usage

### OpenAI Agents Adapter

```typescript
import { createOpenAIAgentsAdapter } from '@openai/apps-sdk';
import { Agent } from '@openai/agents'; // Peer dependency

const agent = new Agent(/* config */);
const adapter = createOpenAIAgentsAdapter({ 
  client: agent,
  logger: customLogger // optional
});

const response = await adapter.chat({
  messages: [{ role: 'user', content: 'Hello' }],
  tools: [{ name: 'get_weather', description: 'Get weather' }]
});
```

### Instructor Adapter

```typescript
import { createInstructorAdapter } from '@openai/apps-sdk';
import { z } from 'zod';

const schema = z.object({ name: z.string(), age: z.number() });

const adapter = createInstructorAdapter({
  validate: (text) => {
    try {
      const data = schema.parse(JSON.parse(text));
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error };
    }
  }
});

const result = await adapter.parse('{"name":"Alice","age":30}');
```

### Runtime Client (ChatGPT Apps)

The `createClient` export is for ChatGPT Apps runtime integration:

```typescript
import { createClient } from '@openai/apps-sdk';

// In ChatGPT Apps runtime:
const client = window.openai?.apps?.createClient() || createClient();

// createClient() throws an error if runtime is unavailable
// This is intentional - use the runtime-provided client
```

## Peer Dependencies

Install these if you want to use the real SDKs:

```bash
pnpm add @openai/agents@^0.1.9  # Optional
pnpm add instructor@^1.0.0      # Optional
```

Or use your own implementations that conform to the interfaces.

## brAInwav Standards

- ✅ All errors branded with "brAInwav Cortex-OS"
- ✅ Functions ≤ 40 lines
- ✅ Named exports only
- ✅ async/await exclusively
- ✅ No placeholders, mocks, or stubs
- ✅ Production-ready implementations

## Testing

Tests use fake clients (no network calls):

```bash
pnpm test
```

## Related Packages

- `@cortex-os/model-gateway` - Providers that compose these adapters
- Python equivalents in `apps/cortex-py/src/agents/`
