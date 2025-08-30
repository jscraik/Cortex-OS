import { Command } from 'commander';

export const ragEval = new Command('eval')
  .description('Evaluate RAG retrieval metrics over a golden dataset')
  .requiredOption('--dataset <path>', 'Path to eval dataset JSON')
  .option('-k, --k <n>', 'Top-K for retrieval metrics', '2')
  .option('--min-ndcg <f>', 'Minimum average NDCG@K to pass', '0.8')
  .option('--min-recall <f>', 'Minimum average Recall@K to pass', '0.8')
  .option('--min-precision <f>', 'Minimum average Precision@K to pass', '0.5')
  .option('--json', 'Output JSON only', false)
  .action(async (opts: any) => {
    const k = Number.parseInt(opts.k, 10) || 2;
    const thresholds = {
      ndcg: Number.parseFloat(opts.minNdcg ?? opts['min-ndcg']) || 0,
      recall: Number.parseFloat(opts.minRecall ?? opts['min-recall']) || 0,
      precision: Number.parseFloat(opts.minPrecision ?? opts['min-precision']) || 0,
    };

    const fs = await import('fs/promises');
    const path = await import('path');
    const { runRetrievalEval, prepareStore } = await import('@cortex-os/rag/eval/harness');
    const { memoryStore } = await import('@cortex-os/rag/store/memory');

    // Simple static embedder for offline eval consistency unless an endpoint is provided later.
    const E = { embed: async (texts: string[]) => texts.map((t) => [t.length, 0, 0]) };
    const S = memoryStore();

    const datasetPath = path.resolve(String(opts.dataset));
    const raw = await fs.readFile(datasetPath, 'utf8');
    const dataset = JSON.parse(raw);

    await prepareStore(dataset, E as any, S as any);
    const summary = await runRetrievalEval(dataset, E as any, S as any, { k });

    const result = {
      dataset: summary.dataset ?? path.basename(datasetPath),
      k: summary.k,
      metrics: {
        ndcg: summary.ndcg,
        recall: summary.recall,
        precision: summary.precision,
      },
      totalQueries: summary.totalQueries,
    };

    const pass =
      summary.ndcg >= thresholds.ndcg &&
      summary.recall >= thresholds.recall &&
      summary.precision >= thresholds.precision;

    if (opts.json) {
      process.stdout.write(JSON.stringify({ ...result, pass }, null, 2) + '\n');
    } else {
      const pretty =
        `RAG Eval (dataset=${result.dataset})\n` +
        `  k=${result.k}, queries=${result.totalQueries}\n` +
        `  ndcg@${k}: ${summary.ndcg.toFixed(3)} (min ${thresholds.ndcg})\n` +
        `  recall@${k}: ${summary.recall.toFixed(3)} (min ${thresholds.recall})\n` +
        `  precision@${k}: ${summary.precision.toFixed(3)} (min ${thresholds.precision})\n` +
        `  pass: ${pass ? 'YES' : 'NO'}`;
      process.stdout.write(pretty + '\n');
    }

    process.exitCode = pass ? 0 : 1;
  });

// no default export
