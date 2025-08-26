import { Command } from 'commander';
import { ingestText } from '@cortex-os/rag-pipeline/ingest';
import { PyEmbedder } from '@cortex-os/rag-embed/python-client';
import { memoryStore } from '@cortex-os/rag-store/memory';
import { readFile } from 'node:fs/promises';

const ingest = new Command('ingest')
  .argument('<file>')
  .option('--endpoint <url>', 'embedder URL', 'http://127.0.0.1:8000')
  .option('--json', 'JSON output')
  .action(async (file: string, opts: any) => {
    const text = await readFile(file, 'utf8');
    await ingestText(`file://${file}`, text, new PyEmbedder(opts.endpoint), memoryStore());
    if (opts.json) process.stdout.write(JSON.stringify({ ok: true, source: `file://${file}` }, null, 2) + '\n');
    else process.stdout.write('ingested\n');
  });

export default ingest;
