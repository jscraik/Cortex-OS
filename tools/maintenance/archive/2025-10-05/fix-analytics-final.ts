import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const baseDir = '/Users/jamiecraik/.Cortex-OS/apps/cortex-os/packages/evidence/analytics/src';

const files = [
	'metrics-collector.ts',
	'analytics-engine.ts',
	'optimization-engine.ts',
	'pattern-analyzer.ts',
	'system-probe.ts',
];

async function fixFile(filename: string) {
	const filePath = join(baseDir, filename);
	let content = await readFile(filePath, 'utf-8');

	// Fix 1: Logger patterns with single quotes and objects
	content = content.replace(
		/this\.logger\.(info|warn|error|debug)\('([^']+)',\s*({[^}]+})\)/g,
		'this.logger.$1({ msg: $2, ...$3 })',
	);

	// Fix 2: Logger patterns with double quotes and objects
	content = content.replace(
		/this\.logger\.(info|warn|error|debug)\("([^"]+)",\s*({[^}]+})\)/g,
		'this.logger.$1({ msg: $2, ...$3 })',
	);

	// Fix 3: Logger patterns with single quotes only
	content = content.replace(
		/this\.logger\.(info|warn|error|debug)\('([^']+)'\)/g,
		'this.logger.$1({ msg: $2 })',
	);

	// Fix 4: Logger patterns with double quotes only
	content = content.replace(
		/this\.logger\.(info|warn|error|debug)\("([^"]+)"\)/g,
		'this.logger.$1({ msg: $2 })',
	);

	// Fix 5: Multi-line logger patterns (handle indentation)
	content = content.replace(
		/this\.logger\.(info|warn|error|debug)\(\s*'([^']+)'\s*,\s*\n\s*({[\s\S]*?})\s*\)/g,
		'this.logger.$1({ msg: $2, ...$3 })',
	);

	// Fix 6: Multi-line logger patterns with double quotes
	content = content.replace(
		/this\.logger\.(info|warn|error|debug)\(\s*"([^"]+)"\s*,\s*\n\s*({[\s\S]*?})\s*\)/g,
		'this.logger.$1({ msg: $2, ...$3 })',
	);

	// Fix 7: Error.message references (avoid double replacements)
	content = content.replace(
		/\berror\.message\b(?!.*: String\(error\))/g,
		'error instanceof Error ? error.message : String(error)',
	);

	// Fix 8: The broken spread syntax from previous fixes
	content = content.replace(/\{\s*msg:\s*([^,}]+),\s*\.\.\.\s*\{([^}]+)\s*\}/g, '{ msg: $1, $2 }');

	// Fix 9: The broken spread syntax with single property
	content = content.replace(
		/\{\s*msg:\s*([^,}]+)\s*,\s*\.\.\.\s*\{([^}]+)\s*\}/g,
		'{ msg: $1, $2 }',
	);

	await writeFile(filePath, content);
	console.log(`Fixed ${filename}`);
}

async function main() {
	for (const file of files) {
		try {
			await fixFile(file);
		} catch (error) {
			console.error(`Error fixing ${file}:`, error);
		}
	}
}

main().catch(console.error);
