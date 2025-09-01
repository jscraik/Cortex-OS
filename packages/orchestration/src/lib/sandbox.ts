import { Script, createContext } from 'vm';
import { z } from 'zod';

const sandboxSchema = z.object({
  code: z.string(),
  timeoutMs: z.number().int().positive().max(5000).default(1000)
});

  // Create a restricted context to prevent access to Node.js globals
  const context = createContext(Object.freeze({
    global: undefined,
    globalThis: undefined,
    process: undefined,
    Buffer: undefined,
    require: undefined,
    console: console // Optionally allow console
  }));
  const script = new Script(code, { filename: 'sandboxed.js' });
  return script.runInContext(context, { timeout: timeoutMs });
}
