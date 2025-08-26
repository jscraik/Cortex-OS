import { Command } from 'commander';
import { query as doQuery } from '@cortex-os/rag-pipeline/query';
import { PyEmbedder } from '@cortex-os/rag-embed/python-client';
import { memoryStore } from '@cortex-os/rag-store/memory';

const query = new Command('query')
  .requiredOption('-q, --q <text>')
  .option('--endpoint <url>', 'embedder URL', 'http://127.0.0.1:8000')
  .action(async (opts: any) => {
    const hits = await doQuery({ q: opts.q, topK: 5 }, new PyEmbedder(opts.endpoint), memoryStore());
    process.stdout.write(JSON.stringify(hits, null, 2) + '\n');
  });

export default query;
