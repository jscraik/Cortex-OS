import { promises as fs } from 'node:fs';
import * as path from 'node:path';

// Read MLX chat models as a starting point for the UI model picker.
// Align shape with UI expectations: { id, label } minimal contract.
export async function GET() {
  try {
    const cfgPath = path.join(process.cwd(), 'config', 'mlx-models.json');
    const txt = await fs.readFile(cfgPath, 'utf8');
    const cfg = JSON.parse(txt);
    const models = Object.entries(cfg.chat_models || {}).map(([key, v]: any) => ({
      id: key,
      label: v.name || key,
    }));
    const def = cfg.default_models?.chat ?? null;
    return new Response(JSON.stringify({ models, default: def }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ models: [], error: e.message }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
}
