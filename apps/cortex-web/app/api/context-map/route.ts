import { readdirSync, statSync } from 'fs';
import { join } from 'path';

function walk(dir: string, base = '', files: string[] = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name.startsWith('.next') || name === 'node_modules' || name === '.git') continue;
      walk(full, rel, files);
    } else {
      files.push(rel);
    }
  }
  return files;
}

export async function GET() {
  // limit to a subset for MVP to avoid huge responses
  const root = process.cwd();
  const files = walk(root)
    .filter((p) => p.startsWith('apps/cortex-web/') || p.endsWith('.md'))
    .slice(0, 500)
    .map((path) => ({ path }));

  return new Response(JSON.stringify({ files }), {
    headers: { 'content-type': 'application/json' },
  });
}
