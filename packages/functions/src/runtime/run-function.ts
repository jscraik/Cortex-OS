import { FunctionRegistry } from '../registry.js';

export async function runFunction(registry: FunctionRegistry, id: string, input: unknown) {
  return registry.run(id, input);
}
