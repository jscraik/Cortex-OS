#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { resolve as resolvePath } from 'node:path';
import process from 'node:process';
import { Command } from 'commander';
import chalk from 'chalk';
import {
  buildManifestSummary,
  loadManifest,
  renderManifestSummary,
  validateManifest,
} from './lib/manifest.js';
import { evaluatePolicy, loadPolicy } from './lib/policy.js';
import { summarizeVerification, verifyStageProofs } from './lib/signatures.js';

export function createProgram(): Command {
  const program = new Command('prp');
  program.description('Cortex-OS PRP manifest and policy CLI');

  registerManifestCommands(program);
  registerPolicyCommands(program);
  registerSignatureCommands(program);

  return program;
}

function registerManifestCommands(program: Command) {
  const manifest = program.command('manifest').description('Inspect and validate PRP run manifests');

  manifest
    .command('inspect')
    .argument('<path>', 'Path to run-manifest JSON')
    .option('--json', 'Emit JSON summary', false)
    .option('--stage <stageKey>', 'Filter to a single stage key')
    .addHelpText('after', `

Examples:
  $ prp manifest inspect .cortex/run-manifests/run-abc123.json
  $ prp manifest inspect manifest.json --stage product-foundation
  $ prp manifest inspect manifest.json --json > summary.json
    `)
    .action(async (path: string, options: { json?: boolean; stage?: string }) => {
      try {
        const { manifest } = await loadManifest(resolvePath(path));
        const summary = buildManifestSummary(manifest);
        const output = renderManifestSummary(summary, { json: options.json, stage: options.stage });
        console.log(output);
      } catch (error) {
        console.error(chalk.red((error as Error).message));
        process.exitCode = 1;
      }
    });

  manifest
    .command('verify')
    .argument('<path>', 'Path to run-manifest JSON')
    .addHelpText('after', `

Examples:
  $ prp manifest verify .cortex/run-manifests/run-abc123.json
  $ prp manifest verify manifest.json
    `)
    .action(async (path: string) => {
      try {
        const { manifest } = await loadManifest(resolvePath(path));
        const result = validateManifest(manifest);
        if (!result.ok) {
          console.error(chalk.red('Manifest validation failed:'));
          result.issues.forEach((issue) => {
            const prefix = issue.level === 'error' ? chalk.red('ERROR') : chalk.yellow('WARN');
            console.error(`${prefix}: ${issue.message}`);
          });
          process.exitCode = 1;
          return;
        }
        console.log(chalk.green('Manifest validation passed'));
        result.issues.forEach((issue) => {
          const prefix = issue.level === 'error' ? chalk.red('ERROR') : chalk.yellow('WARN');
          console.log(`${prefix}: ${issue.message}`);
        });
      } catch (error) {
        console.error(chalk.red((error as Error).message));
        process.exitCode = 1;
      }
    });
}

function registerPolicyCommands(program: Command) {
  program
    .command('policy')
    .description('Evaluate manifest compliance against policy')
    .requiredOption('--manifest <path>', 'Path to run-manifest JSON')
    .requiredOption('--policy <path>', 'Path to policy JSON')
    .option('--json', 'Emit findings as JSON', false)
    .addHelpText('after', `

Examples:
  $ prp policy --manifest manifest.json --policy docs/prp/prp.policy.json
  $ prp policy --manifest .cortex/run-manifests/run-abc.json --policy policy.json --json
    `)
    .action(async (options: { manifest: string; policy: string; json?: boolean }) => {
      try {
        const [{ manifest }, policy] = await Promise.all([
          loadManifest(resolvePath(options.manifest)),
          loadPolicy(resolvePath(options.policy)),
        ]);
        const evaluation = evaluatePolicy(manifest, policy);
        if (options.json) {
          console.log(JSON.stringify(evaluation, null, 2));
        } else if (!evaluation.ok) {
          console.error(chalk.red('Policy violations detected:'));
          evaluation.findings.forEach((finding) => {
            const prefix = finding.level === 'error' ? chalk.red('ERROR') : chalk.yellow('WARN');
            console.error(`${prefix}: ${finding.message}`);
          });
        } else {
          console.log(chalk.green('Policy check passed'));
          if (evaluation.findings.length > 0) {
            evaluation.findings.forEach((finding) => console.log(`NOTE: ${finding.message}`));
          }
        }
        if (!evaluation.ok) {
          process.exitCode = 1;
        }
      } catch (error) {
        console.error(chalk.red((error as Error).message));
        process.exitCode = 1;
      }
    });
}

function registerSignatureCommands(program: Command) {
  program
    .command('signatures')
    .description('Verify stage proof signatures against a manifest')
    .requiredOption('--manifest <path>', 'Path to run-manifest JSON')
    .option('--proof <path...>', 'One or more proof files to verify', collectMultiple)
    .option('--all <dir>', 'Verify all *.proof.json files under directory')
    .addHelpText('after', `

Examples:
  $ prp signatures --manifest manifest.json --proof proofs/product-foundation.json
  $ prp signatures --manifest manifest.json --all proofs/
  $ prp signatures --manifest .cortex/run-manifests/run-abc.json --all .
    `)
    .action(async (options: { manifest: string; proof?: string[]; all?: string }) => {
      try {
        const proofPaths = await resolveProofList(options);
        if (proofPaths.length === 0) {
          console.warn('prp: no proof files provided');
          return;
        }
        const verification = await verifyStageProofs(options.manifest, proofPaths);
        if (!verification.ok) {
          console.error(chalk.red('Signature verification failed:'));
          console.error(summarizeVerification(verification));
          process.exitCode = 1;
        } else {
          console.log(chalk.green(summarizeVerification(verification)));
        }
      } catch (error) {
        console.error(chalk.red((error as Error).message));
        process.exitCode = 1;
      }
    });
}

async function resolveProofList(options: { proof?: string[]; all?: string }): Promise<string[]> {
  const proofs = options.proof ?? [];
  if (options.all) {
    const glob = await import('fast-glob');
    const matches = await glob.default('**/*.proof.json', { cwd: resolvePath(options.all), absolute: true });
    return [...proofs.map((p) => resolvePath(p)), ...matches];
  }
  return proofs.map((p) => resolvePath(p));
}

function collectMultiple(value: string, previous: string[] = []): string[] {
  return previous.concat(value);
}

const program = createProgram();

const modulePath = fileURLToPath(import.meta.url);
const invoked = process.argv[1] ? resolvePath(process.argv[1]) : undefined;

if (invoked && resolvePath(modulePath) === invoked) {
  program.parseAsync(process.argv).catch((error) => {
    console.error(chalk.red((error as Error).message));
    process.exitCode = 1;
  });
}

export default program;
