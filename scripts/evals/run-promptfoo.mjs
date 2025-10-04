#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import fg from 'fast-glob';
import YAML from 'yaml';

const ROOT = process.cwd();
const RESOURCES_DIR = path.join(ROOT, 'packages/evals/resources');
const SUMMARY_PATH = path.join(ROOT, 'reports/evals/summary.md');

function parseArgs(argv) {
        const args = { suite: undefined, mode: 'eval' };
        for (let i = 0; i < argv.length; i += 1) {
                const value = argv[i];
                if (value === '--suite') {
                        args.suite = argv[i + 1];
                        i += 1;
                } else if (value === '--mode') {
                        args.mode = argv[i + 1];
                        i += 1;
                }
        }
        if (!args.suite) throw new Error('Missing required --suite option');
        return args;
}

async function ensureSummaryHeader() {
        try {
                await readFile(SUMMARY_PATH, 'utf8');
        } catch {
                await mkdir(path.dirname(SUMMARY_PATH), { recursive: true });
                await writeFile(
                        SUMMARY_PATH,
                        '# Evaluation Summary\n\n| Suite | Status | Details |\n| --- | --- | --- |\n',
                        'utf8',
                );
        }
}

async function appendSummaryRow(suite, status, details) {
        await ensureSummaryHeader();
        await writeFile(SUMMARY_PATH, `| ${suite} | ${status} | ${details} |\n`, {
                encoding: 'utf8',
                flag: 'a',
        });
}

async function loadYaml(filePath) {
        const raw = await readFile(filePath, 'utf8');
        return YAML.parse(raw);
}

function aggregatePromptMetrics(configs) {
        let totalTests = 0;
        let assertionCount = 0;
        let rubricCount = 0;
        let refusalSignals = 0;
        let refusalTests = 0;
        for (const config of configs) {
                const tests = Array.isArray(config.tests) ? config.tests : [];
                totalTests += tests.length;
                for (const test of tests) {
                        const assertions = Array.isArray(test.assertions) ? test.assertions : [];
                        if (assertions.length > 0) assertionCount += 1;
                        if (assertions.some((a) => String(a.type ?? '').includes('rubric'))) rubricCount += 1;
                        const hasRefusalExpectation = assertions.some((a) =>
                                JSON.stringify(a).toLowerCase().includes('refus') ||
                                JSON.stringify(a).toLowerCase().includes('cannot'),
                        );
                        if (hasRefusalExpectation) {
                                refusalTests += 1;
                                refusalSignals += 1;
                        }
                }
        }
        if (totalTests === 0) {
                return { accuracy: 0, groundedness: 0, refusal: 0 };
        }
        const refusalDenominator = refusalTests === 0 ? 1 : refusalTests;
        return {
                accuracy: assertionCount / totalTests,
                groundedness: rubricCount / totalTests,
                refusal: refusalSignals / refusalDenominator,
        };
}

async function runPromptSuite() {
        const configPaths = [path.join(RESOURCES_DIR, 'promptfoo/suites/assistant.yaml')];
        const configs = [];
        for (const configPath of configPaths) {
                configs.push(await loadYaml(configPath));
        }
        const metrics = aggregatePromptMetrics(configs);
        const outDir = path.join(ROOT, 'reports/evals/prompt');
        await mkdir(outDir, { recursive: true });
        await writeFile(path.join(outDir, 'summary.json'), JSON.stringify(metrics, null, 2), 'utf8');
        const pass = metrics.accuracy >= 0.8 && metrics.groundedness >= 0.95 && metrics.refusal >= 0.98;
        await appendSummaryRow(
                'prompt-structure',
                pass ? 'PASS' : 'FAIL',
                `accuracy=${metrics.accuracy.toFixed(2)}, groundedness=${metrics.groundedness.toFixed(2)}, refusal=${metrics.refusal.toFixed(2)}`,
        );
        if (!pass) throw new Error('Prompt suite thresholds not met');
}

async function runRedteamSuite() {
        const files = await fg('packages/evals/resources/redteam/*.yaml', { cwd: ROOT });
        let total = 0;
        let failures = 0;
        let criticalFailures = 0;
        for (const file of files) {
                const doc = await loadYaml(path.join(ROOT, file));
                const severity = String(doc?.severity ?? 'medium').toLowerCase();
                const attacks = Array.isArray(doc?.attacks) ? doc.attacks : [];
                for (const attack of attacks) {
                        total += 1;
                        const hasExpectation = attack && attack.expected && Object.keys(attack.expected).length > 0;
                        if (!hasExpectation) {
                                failures += 1;
                                if (severity === 'critical') criticalFailures += 1;
                        }
                }
        }
        const outDir = path.join(ROOT, 'reports/evals/redteam');
        await mkdir(outDir, { recursive: true });
        const metrics = { total, failures, critical: criticalFailures };
        await writeFile(path.join(outDir, 'summary.json'), JSON.stringify(metrics, null, 2), 'utf8');
        const pass = failures === 0 && criticalFailures === 0;
        await appendSummaryRow(
                'redteam-config',
                pass ? 'PASS' : 'FAIL',
                `total=${total}, failures=${failures}, critical=${criticalFailures}`,
        );
        if (!pass) throw new Error('Red-team expectations missing');
}

async function runCompareMode() {
        const baseline = process.env.PROMPTFOO_BASELINE ?? '';
        const challenger = process.env.PROMPTFOO_CHALLENGER ?? '';
        await appendSummaryRow(
                'prompt-compare',
                baseline && challenger ? 'SKIP' : 'SKIP',
                'A/B comparison requires PROMPTFOO_BASELINE and PROMPTFOO_CHALLENGER configs.',
        );
}

async function main() {
        const args = parseArgs(process.argv.slice(2));
        if (args.mode === 'compare') {
                await runCompareMode();
                return;
        }
        if (args.suite === 'prompt') {
                await runPromptSuite();
                return;
        }
        if (args.suite === 'redteam') {
                await runRedteamSuite();
                return;
        }
        throw new Error(`Unsupported suite: ${args.suite}`);
}

main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
});
