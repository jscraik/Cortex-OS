#!/usr/bin/env node
import process from 'node:process';
import { createAgentToolkit } from '@cortex-os/agent-toolkit';

async function main() {
	const patterns = process.argv.slice(2);
	const files = patterns.length
		? patterns
		: ['apps/**/src/**/*.{ts,tsx}', 'packages/**/src/**/*.{ts,tsx}'];
	const tk = createAgentToolkit();
	const start = Date.now();
	let hadError = false;
	try {
		const result = await tk.validateProject(files);
		if (result?.errors?.length) {
			console.error('[toolkit:validate] Failures detected:', result.errors.length);
			for (const err of result.errors.slice(0, 25)) {
				console.error('-', err.message || err);
			}
			hadError = true;
		} else {
			console.log('[toolkit:validate] No validation errors.');
		}
	} catch (e) {
		hadError = true;
		console.error('[toolkit:validate] Exception during validation:', e?.message || e);
	} finally {
		const dur = Date.now() - start;
		console.log(`[toolkit:validate] Completed in ${dur}ms`);
	}
	if (hadError) process.exit(1);
}

main();
