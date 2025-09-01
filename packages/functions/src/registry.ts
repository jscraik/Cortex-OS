import { FunctionManifest } from './types.js';

export type CortexFunction = (args: unknown) => Promise<unknown> | unknown;

export class FunctionRegistry {
  private functions = new Map<string, { manifest: FunctionManifest; handler: CortexFunction }>();

  register(manifest: FunctionManifest, handler: CortexFunction) {
    const parsed = FunctionManifest.parse(manifest);
    this.functions.set(parsed.id, { manifest: parsed, handler });
  }

  async run(id: string, input: unknown) {
    const entry = this.functions.get(id);
    if (!entry) {
      throw new Error(`Function ${id} not registered`);
    }
    return await entry.handler(input);
  }
}
