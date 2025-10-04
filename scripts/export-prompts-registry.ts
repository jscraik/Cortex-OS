#!/usr/bin/env tsx
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { capturePromptUsage, listPrompts, loadDefaultPrompts } from '@cortex-os/prompts';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const targetDir = resolve(root, '.cortex', 'prompts');

await mkdir(targetDir, { recursive: true });

loadDefaultPrompts();

const entries = listPrompts().map((p) => ({
	id: p.id,
	name: p.name,
	version: p.version,
	role: p.role,
	riskLevel: p.riskLevel,
	owners: p.owners,
	sha256: capturePromptUsage(p).sha256,
	variables: p.variables,
}));

await writeFile(join(targetDir, 'registry.json'), JSON.stringify(entries, null, 2), 'utf8');

console.log(`Prompt registry exported to ${join(targetDir, 'registry.json')}`);
