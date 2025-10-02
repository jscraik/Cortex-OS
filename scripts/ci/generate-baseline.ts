#!/usr/bin/env ts-node
import { generateBaselineReport } from './baseline-metrics';

interface CliOptions {
	metricsDir?: string;
	outputDir?: string;
	codemapPath?: string;
	packageAuditPath?: string;
	flakeStatsPath?: string;
}

function parseArgs(argv: string[]): CliOptions {
	const [, , ...rest] = argv;
	const options: CliOptions = {};

	for (let index = 0; index < rest.length; index += 1) {
		const arg = rest[index];
		if (!arg.startsWith('--')) {
			continue;
		}

		const value = rest[index + 1];
		switch (arg) {
			case '--metrics-dir':
				options.metricsDir = value;
				index += 1;
				break;
			case '--output-dir':
				options.outputDir = value;
				index += 1;
				break;
			case '--codemap':
				options.codemapPath = value;
				index += 1;
				break;
			case '--package-audit':
				options.packageAuditPath = value;
				index += 1;
				break;
			case '--flake-stats':
				options.flakeStatsPath = value;
				index += 1;
				break;
			default:
				break;
		}
	}

	return options;
}

async function main() {
	try {
		const cliOptions = parseArgs(process.argv);
		const summary = await generateBaselineReport(cliOptions);
		const outputDir = cliOptions.outputDir ?? 'reports/baseline';
		console.log('[brAInwav] Baseline metrics captured');
		console.log(`  • Output directory: ${outputDir}`);
		console.log(`  • Coverage source: ${summary.coverage.line.source ?? 'unavailable'}`);
		console.log(`  • Codemap source: ${summary.codemap.source ?? 'unavailable'}`);
		console.log(`  • Package audit source: ${summary.packageAudit.source ?? 'unavailable'}`);
		console.log(`  • Flake metrics source: ${summary.flakes.source ?? 'unavailable'}`);
	} catch (error) {
		console.error('[brAInwav] ❌ Failed to generate baseline metrics');
		console.error((error as Error).message);
		process.exitCode = 1;
	}
}

main();
