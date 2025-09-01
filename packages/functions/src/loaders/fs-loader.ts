import { promises as fs } from 'node:fs';
import path from 'node:path';
import { FunctionManifest } from '../types.js';
import { FunctionRegistry } from '../registry.js';

export async function loadFunctionsFromDir(dir: string, registry: FunctionRegistry) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.js')) {
      const modPath = path.join(dir, entry.name);
      const mod = await import(modPath);
      if (mod.manifest && mod.run) {
        const manifest = FunctionManifest.parse(mod.manifest);
        registry.register(manifest, mod.run);
      }
    }
  }
}
