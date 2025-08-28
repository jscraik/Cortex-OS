import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('MLXModelManager (dev mode mock)', () => {
  it('loads, generates, and unloads', () => {
    const code = `
import asyncio, os, json, sys
sys.path.append('docker')
from model_manager import MLXModelManager
class Dummy:
    def can_load_model_size(self, mb): return True
    def register_model_memory(self, *a): pass
    def free_model_memory(self, *a): pass
async def main():
    os.environ['MODEL_MANAGER_ENV']='dev'
    m = MLXModelManager(Dummy())
    # Ensure defaults are loaded (from registry)
    await m.ensure_defaults_loaded()
    # Use a model that exists in the registry (MLX) or inject a dummy
    target = 'qwen3-coder-30b'
    if not m.model_configs:
        m.model_configs['dummy'] = {'id': 'mlx/dummy', 'ram_gb': 1}
    if target not in m.model_configs:
        target = next(iter(m.model_configs.keys()))
    ok = await m.load_model(target)
    out = await m.generate(target,'hello world',max_tokens=8)
    await m.unload_model(target)
    print(json.dumps({'ok':ok,'has_text': 'text' in out, 'tokens': out.get('tokens',0)}))
asyncio.run(main())
`;
    const out = execSync('python -', { input: code }).toString().trim();
    const obj = JSON.parse(out);
    expect(obj.ok).toBe(true);
    expect(obj.has_text).toBe(true);
    expect(obj.tokens).toBeGreaterThan(0);
  });
});
