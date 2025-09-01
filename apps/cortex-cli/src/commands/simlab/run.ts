// SimLab command implementation with proper error handling
import { tracer } from '@cortex-os/telemetry';
import { Command } from 'commander';

export const simlabRun = new Command('run')
  .description('Run a simlab scenario')
  .requiredOption('--id <id>')
  .option('--steps <n>', 'max steps', '50')
  .option('--seed <n>', 'seed', '42')
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const span = tracer.startSpan('cli.simlab.run');
    try {
      // Check if simlab-mono package is available
      try {
        // Use relative path to avoid TypeScript module resolution issues
        const simLabModule = await import('../../../../../packages/simlab-mono/src/index.js');
        const { SimRunner } = simLabModule;

        const runner = new SimRunner({
          seed: parseInt(opts.seed, 10),
          maxTurns: parseInt(opts.steps, 10),
          debug: !opts.json,
        });

        // Create a basic scenario for the given ID
        const scenario = {
          id: opts.id,
          description: `SimLab scenario ${opts.id}`,
          goal: `Execute and complete scenario ${opts.id} successfully`,
          persona: {
            locale: 'en-US',
            tone: 'professional',
            tech_fluency: 'med' as const,
            attributes: {
              role: 'user',
              experience_level: 'intermediate',
              urgency: 'medium' as const,
            },
          },
          initial_context: {
            scenario_id: opts.id,
            max_steps: parseInt(opts.steps, 10),
            seed: parseInt(opts.seed, 10),
          },
          sop_refs: [],
          kb_refs: [],
          success_criteria: [`Complete scenario ${opts.id} within ${opts.steps} steps`],
        };

        const result = await runner.runScenario(scenario);

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`SimLab scenario ${opts.id} completed successfully`);
          console.log(`Turns executed: ${result.turns?.length || 0}`);
          console.log(
            `Scores: Goal=${result.scores.goal}, SOP=${result.scores.sop}, Brand=${result.scores.brand}, Factual=${result.scores.factual}`
          );
          console.log(`Passed: ${result.passed ? 'Yes' : 'No'}`);
        }
      } catch (importError) {
        console.error('SimLab functionality is not available');
        console.error('Please ensure @cortex-os/simlab-mono package is installed');
        if (opts.json) {
          console.log(
            JSON.stringify({ error: 'SimLab not available', details: String(importError) })
          );
        }
        process.exit(1);
      }
    } catch (error) {
      console.error('Failed to run SimLab scenario:', error);
      if (opts.json) {
        console.log(JSON.stringify({ error: 'Execution failed', details: String(error) }));
      }
      process.exit(1);
    } finally {
      span.end();
    }
  });
// no default export
