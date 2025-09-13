#!/usr/bin/env node
/**
 * Unified CLI wrapper for agent-toolkit operations.
 * Ensures all search, codemod, and validation actions go through the contract-driven API.
 */
import { agentToolkit } from './packages/agent-toolkit/dist/index.js';

const args = process.argv.slice(2);
const [command, ...rest] = args;

function usage(code = 0) {
    console.log(`Agent Toolkit CLI

Usage:
  node scripts/agent-toolkit.mjs search <pattern> <path>
  node scripts/agent-toolkit.mjs multi-search <pattern> <path>
  node scripts/agent-toolkit.mjs codemod <find> <replace> <path>
  node scripts/agent-toolkit.mjs validate <file...>
  node scripts/agent-toolkit.mjs validate:project <glob1> [glob2 ...]
  node scripts/agent-toolkit.mjs validate:changed

Examples:
  pnpm at:search TODO src/
  pnpm at:codemod 'foo' 'bar' packages/agent-toolkit/src
  pnpm at:validate:project "**/*.{ts,tsx,js,jsx}" "**/*.py"
`);
    process.exit(code);
}

async function main() {
    if (!command || command === '--help' || command === '-h') usage(0);

    switch (command) {
        case 'search': {
            if (rest.length < 2) return usage(1);
            const [pattern, target] = rest;
            const result = await agentToolkit.search(pattern, target);
            console.log(JSON.stringify(result, null, 2));
            break;
        }
        case 'multi-search': {
            if (rest.length < 2) return usage(1);
            const [pattern, target] = rest;
            const result = await agentToolkit.multiSearch(pattern, target);
            console.log(JSON.stringify(result, null, 2));
            break;
        }
        case 'codemod': {
            if (rest.length < 3) return usage(1);
            const [find, replace, target] = rest;
            const result = await agentToolkit.codemod(find, replace, target);
            console.log(JSON.stringify(result, null, 2));
            break;
        }
        case 'validate': {
            if (rest.length < 1) return usage(1);
            const files = rest;
            const result = await agentToolkit.validate(files);
            console.log(JSON.stringify(result, null, 2));
            break;
        }
        case 'validate:project': {
            if (rest.length < 1) return usage(1);
            const globs = rest;
            const result = await agentToolkit.validateProject(globs);
            console.log(JSON.stringify(result, null, 2));
            break;
        }
        case 'validate:changed': {
            // gather changed files vs HEAD
            const diff = await new Promise((resolve, reject) => {
                const { exec } = require('node:child_process');
                exec('git --no-pager diff --name-only --diff-filter=ACMRTUXB HEAD', (err, stdout) => {
                    if (err) return reject(err);
                    resolve(stdout.trim().split('\n').filter(Boolean));
                });
            });
            const changed = diff.filter(f => /\.(ts|tsx|js|jsx|py|rs)$/.test(f));
            if (changed.length === 0) {
                console.log('No changed source files to validate.');
                break;
            }
            const result = await agentToolkit.validate(changed);
            console.log(JSON.stringify(result, null, 2));
            break;
        }
        default:
            usage(1);
    }
}

main().catch(err => {
    console.error('[agent-toolkit] error:', err);
    process.exit(1);
});
