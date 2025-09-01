import { Script, createContext } from 'vm';
import { z } from 'zod';

const sandboxSchema = z.object({
  code: z.string(),
  timeoutMs: z.number().int().positive().max(5000).default(1000)
});

export async function runSandboxed(input: { code: string; timeoutMs?: number }) {
  const { code, timeoutMs } = sandboxSchema.parse(input);
  const context = createContext({});
  const script = new Script(code, { filename: 'sandboxed.js' });
  return script.runInContext(context, { timeout: timeoutMs });
}
