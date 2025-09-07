#!/usr/bin/env node
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import readline from 'node:readline';

const BASELINE_PATH = 'reports/semgrep-baseline.json';
const CONFIG_ARGS = [
    '--config=.semgrep/owasp-precise.yaml',
    '--config=.semgrep/owasp-top-10-improved.yaml',
    '--config=.semgrep/owasp-llm-top-ten.yaml'
];

function run(cmd) {
    return execSync(cmd, { stdio: 'inherit', env: process.env });
}

function runCapture(cmd) {
    return execSync(cmd, { encoding: 'utf8' }).trim();
}

function ensureCleanTree() {
    const status = runCapture('git status --porcelain');
    if (status) {
        console.error('[baseline] Working tree not clean. Commit or stash changes first.');
        process.exit(1);
    }
}

function ensureOnMain() {
    const branch = runCapture('git rev-parse --abbrev-ref HEAD');
    if (branch !== 'main') {
        console.error(`[baseline] Must regenerate baseline from main (current: ${branch}).`);
        process.exit(1);
    }
}

function prompt(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(question, (answer) => { rl.close(); resolve(answer); });
    });
}

async function main() {
    console.log('[baseline] Regenerating Semgrep baseline');
    ensureCleanTree();
    ensureOnMain();

    if (!existsSync('reports')) {
        run('mkdir -p reports');
    }

    const issueRef = await prompt('Issue reference (e.g. #123) or NONE: ');
    const confirm = await prompt('This will overwrite reports/semgrep-baseline.json. Continue? (yes/no): ');
    if (!/^y(es)?$/i.test(confirm)) {
        console.log('Aborted.');
        process.exit(0);
    }

    const tempPath = `reports/semgrep-baseline.tmp.${Date.now()}.json`;
    const semgrepCmd = [
        'semgrep', 'scan',
        ...CONFIG_ARGS,
        '--exclude', 'tests',
        '--json', '--max-memory', '2048',
        '.',
        '>', tempPath
    ].join(' ');

    console.log('[baseline] Running:', semgrepCmd);
    let semgrepFailed = false;
    try {
        execSync(semgrepCmd, { stdio: 'inherit', shell: '/bin/bash' });
    } catch (e) {
        semgrepFailed = true;
        console.error(`[baseline] Semgrep exited non-zero (code may be partial). error=${e.message}`);
    }

    if (!existsSync(tempPath)) {
        console.error('[baseline] Temp baseline not created. Aborting.');
        process.exit(1);
    }
    if (semgrepFailed) {
        console.warn('[baseline] Proceeding with generated file despite Semgrep error (verify contents).');
    }

    const newData = readFileSync(tempPath, 'utf8');
    const hash = crypto.createHash('sha256').update(newData).digest('hex').slice(0, 12);
    writeFileSync(BASELINE_PATH, newData, 'utf8');
    run(`rm -f ${tempPath}`);

    const commitMsg = issueRef && issueRef.toUpperCase() !== 'NONE'
        ? `chore(security): refresh semgrep baseline (${hash}) ${issueRef}`
        : `chore(security): refresh semgrep baseline (${hash})`;

    run(`git add ${BASELINE_PATH}`);
    console.log('[baseline] Staged updated baseline. Suggested commit message:');
    console.log(commitMsg);
    console.log('\nNext steps:');
    console.log('- Review git diff to confirm expected changes');
    console.log('- Commit manually if acceptable');
    console.log('- Push and verify CI passes');
}

main().catch(e => { console.error(e); process.exit(1); });
