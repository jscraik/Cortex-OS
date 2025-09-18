#!/usr/bin/env node
/**
 * Event Generator
 * Usage: pnpm gen:event <domain> <event-name>
 * Example: pnpm gen:event tasks task.created
 *
 * Generates (if absent):
 *  - libs/typescript/contracts/<domain>/events.ts (appends schema if file exists)
 *  - contracts/tests/<event-name>.contract.test.ts (skips if exists)
 *
 * Follows Playbook Section 15.* guidelines.
 */
import fs from 'node:fs';
import path from 'node:path';

const [, , domain, eventName] = process.argv;
if (!domain || !eventName) {
	console.error('Usage: pnpm gen:event <domain> <event-name>');
	process.exit(1);
}

// Basic validation
if (!/^[a-z0-9-]+$/.test(domain)) {
	console.error(
		'Domain must be kebab-case: lowercase letters, digits, hyphens',
	);
	process.exit(1);
}
if (!/^[a-z0-9-.]+$/.test(eventName)) {
	console.error(
		'Event name must be dot-separated lifecycle tokens (e.g., task.created)',
	);
	process.exit(1);
}

const root = process.cwd();
const contractsDir = path.join(root, 'libs', 'typescript', 'contracts', domain);
const eventsFile = path.join(contractsDir, 'events.ts');
const testsDir = path.join(root, 'contracts', 'tests');
const testFile = path.join(
	testsDir,
	`${eventName.replace(/\./g, '-')}.contract.test.ts`,
);

fs.mkdirSync(contractsDir, { recursive: true });
fs.mkdirSync(testsDir, { recursive: true });

let eventsContent = fs.existsSync(eventsFile)
	? fs.readFileSync(eventsFile, 'utf8')
	: `// ${domain} event contracts\n// Auto-generated scaffold; extend intentionally.\nimport { z } from 'zod';\n\n`;

const schemaConstName = `${eventName.replace(/\./g, '_')}Schema`;
if (
	eventsContent.includes(`const ${schemaConstName}`) ||
	eventsContent.includes(`export const ${schemaConstName}`)
) {
	console.log(
		`[gen-event] Schema already exists in ${eventsFile}, skipping schema append.`,
	);
} else {
	const schemaBlock = `\n// Schema for ${eventName}\nexport const ${schemaConstName} = z.object({\n  // REQUIRED FIELDS\n  // e.g. taskId: z.string(),\n});\n`;
	eventsContent += schemaBlock;
	fs.writeFileSync(eventsFile, eventsContent, 'utf8');
	console.log(`[gen-event] Added schema ${schemaConstName} to ${eventsFile}`);
}

if (fs.existsSync(testFile)) {
	console.log(`[gen-event] Test already exists: ${testFile}`);
} else {
	const testContent = `// Contract test for ${eventName}\nimport { ${schemaConstName} } from '../../libs/typescript/contracts/${domain}/events';\n\n// Minimal validation test; extend with domain-specific required fields.\ndescribe('contract: ${eventName}', () => {\n  it('accepts minimal shape (adjust once fields defined)', () => {\n    const sample: any = {}; // TODO: add required fields when schema updated\n    expect(() => ${schemaConstName}.parse(sample)).not.toThrow(); // will start failing once required fields added\n  });\n});\n`;
	fs.writeFileSync(testFile, testContent, 'utf8');
	console.log(`[gen-event] Created test ${testFile}`);
}

console.log('\nNext steps:');
console.log('- Fill in required fields in schema');
console.log('- Update test with valid + negative case');
console.log('- Add envelope production + handler tests if cross-feature');
console.log('- Update AsyncAPI / docs if applicable');
