#!/usr/bin/env node

import { Command } from 'commander';
import {
    GDPRComplianceManager,
    RagasEvaluator,
    runEvaluationPipeline,
} from '../evaluation/index.js';
import { selectEmbeddingModel, selectRerankerModel } from '../retrieval/index.js';

/**
 * brAInwav Local Memory - Evaluation CLI
 * Command-line interface for running RAG evaluation and GDPR compliance
 */

const program = new Command();

program
    .name('local-eval')
    .description('brAInwav Local Memory evaluation and compliance CLI')
    .version('1.0.0');

program
    .command('ragas')
    .description('Run Ragas evaluation on dataset')
    .option('-d, --dataset <id>', 'Dataset ID to evaluate', 'default')
    .option('-o, --output <path>', 'Output directory for results', './local-eval/results')
    .option('--threshold <value>', 'Override minimum threshold', '0.75')
    .action(async (options) => {
        try {
            console.log('🚀 brAInwav Ragas evaluation starting...');

            // Auto-detect available models
            const embeddingModel = await selectEmbeddingModel();
            const rerankerModel = await selectRerankerModel();

            const modelConfig = {
                embedding_model: embeddingModel.name,
                reranker_model: rerankerModel?.name,
                generation_model: process.env.BRAINWAV_GENERATION_MODEL || 'glm-4.5',
            };

            console.log('📊 brAInwav model configuration:', modelConfig);

            const result = await runEvaluationPipeline(options.dataset, modelConfig);

            console.log('✅ brAInwav evaluation completed successfully!');
            console.log('📈 Results:', {
                overall_score: result.metrics.overall_score.toFixed(3),
                answer_relevancy: result.metrics.answer_relevancy.toFixed(3),
                context_precision: result.metrics.context_precision.toFixed(3),
                faithfulness: result.metrics.faithfulness.toFixed(3),
            });
        } catch (error) {
            console.error(
                '❌ brAInwav evaluation failed:',
                error instanceof Error ? error.message : error,
            );
            process.exit(1);
        }
    });

program
    .command('gdpr')
    .description('GDPR compliance operations')
    .option('-u, --user <id>', 'User ID for operations')
    .option('-r, --report', 'Generate compliance report')
    .option('-e, --erase', 'Execute erasure request')
    .option(
        '-t, --types <types>',
        'Data types to erase (comma-separated)',
        'memories,vectors,metadata',
    )
    .option('--reason <text>', 'Reason for erasure', 'User requested deletion')
    .action(async (options) => {
        try {
            const gdpr = new GDPRComplianceManager();
            await gdpr.initialize();

            if (options.report) {
                console.log('📋 brAInwav generating GDPR compliance report...');
                const report = await gdpr.generateComplianceReport(options.user);
                console.log('✅ brAInwav compliance report:', JSON.stringify(report, null, 2));
            }

            if (options.erase) {
                if (!options.user) {
                    throw new Error('brAInwav GDPR: User ID required for erasure');
                }

                console.log(`🗑️ brAInwav executing GDPR erasure for user: ${options.user}`);

                const result = await gdpr.executeErasure({
                    user_id: options.user,
                    data_types: options.types.split(',') as (
                        | 'memories'
                        | 'vectors'
                        | 'metadata'
                        | 'audit_logs'
                    )[],
                    reason: options.reason,
                    requested_by: options.user,
                });

                console.log('✅ brAInwav GDPR erasure completed:', {
                    status: result.status,
                    erased_types: result.erased_data_types,
                    audit_log: result.audit_log_entry,
                });
            }
        } catch (error) {
            console.error(
                '❌ brAInwav GDPR operation failed:',
                error instanceof Error ? error.message : error,
            );
            process.exit(1);
        }
    });

program
    .command('init')
    .description('Initialize evaluation environment')
    .option('-d, --dataset-dir <path>', 'Dataset directory', './local-eval/datasets')
    .action(async (options) => {
        try {
            console.log('🏗️ brAInwav initializing evaluation environment...');

            const evaluator = new RagasEvaluator();
            await evaluator.initialize();

            const gdpr = new GDPRComplianceManager();
            await gdpr.initialize();

            console.log('✅ brAInwav evaluation environment ready!');
            console.log('💡 Next steps:');
            console.log('  1. Add evaluation datasets to', options.datasetDir);
            console.log('  2. Run: local-eval ragas --dataset your-dataset');
            console.log('  3. Check results in ./local-eval/results/');
        } catch (error) {
            console.error(
                '❌ brAInwav initialization failed:',
                error instanceof Error ? error.message : error,
            );
            process.exit(1);
        }
    });

program.parse();

export { program };
