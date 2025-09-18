#!/usr/bin/env node
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { ESLint } from 'eslint';

async function runForDir(dir) {
	const name = path.basename(dir);
	const outPath = path.resolve(
		process.cwd(),
		'reports',
		`eslint-sonar-${name}.out`,
	);
	// ensure reports directory exists
	await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
	try {
		// Load the flat config (CJS file) and pass it as overrideConfig so ESLint
		// receives an object instead of an array/file path which avoids the
		// "configuration in --config is invalid" errors we hit earlier.
		const requireCJS = createRequire(import.meta.url);
		let scanCfg;
		try {
			// eslint.scan.config.cjs exports an array (flat config). Prefer the first
			// entry so overrideConfig is a plain object.
			// Use require to ensure resolution of plugin modules inside the config.
			scanCfg = requireCJS(
				path.resolve(process.cwd(), 'eslint.scan.config.cjs'),
			);
		} catch (err) {
			throw new Error(`Failed to load eslint.scan.config.cjs: ${err.message}`);
		}

		// The flat config file exports an array element that includes a `files`
		// matcher (ESLint flat config style). When using the programmatic API
		// we pass file patterns separately to `lintFiles`, so remove any top
		// level `files` property which is invalid in CLIOptions/overrideConfig.
		const overrideConfig = Array.isArray(scanCfg)
			? { ...scanCfg[0] }
			: { ...scanCfg };
		if (overrideConfig?.files) {
			// eslint-disable-next-line no-param-reassign
			delete overrideConfig.files;
		}

		// Convert ESLint flat config 'languageOptions' into the legacy
		// 'parser' + 'parserOptions' shape expected by the programmatic API.
		if (overrideConfig?.languageOptions) {
			const lo = overrideConfig.languageOptions;
			if (lo.parser) overrideConfig.parser = lo.parser;
			if (lo.parserOptions) overrideConfig.parserOptions = lo.parserOptions;
			// remove languageOptions to satisfy CLIOptions schema
			// eslint-disable-next-line no-param-reassign
			delete overrideConfig.languageOptions;
		}

		// If plugins are provided as module instances (from flat-config require),
		// convert them to plain plugin-name keys so the programmatic API will
		// resolve them using `resolvePluginsRelativeTo`.
		if (overrideConfig?.plugins && typeof overrideConfig.plugins === 'object') {
			// When the flat-config was required it may have returned plugin modules
			// as values. Convert to an array of plugin names so ESLint's
			// configuration schema accepts it (expects array of strings).
			overrideConfig.plugins = Object.keys(overrideConfig.plugins);
		}

		// DEBUG: dump the overrideConfig to help diagnose CLIOptions validation
		// eslint-disable-next-line no-console
		console.log(
			'DEBUG overrideConfig keys:',
			Object.keys(overrideConfig || {}),
		);

		// Ensure we don't analyze built artifacts. Honor ignorePatterns via overrideConfig
		overrideConfig.ignorePatterns = [
			'**/dist/**',
			'**/node_modules/**',
			'**/coverage/**',
			'**/build/**',
			'**/.turbo/**',
			'**/.next/**',
			'**/out/**',
		];

		const eslint = new ESLint({
			useEslintrc: false,
			resolvePluginsRelativeTo: path.resolve(process.cwd(), 'node_modules'),
			overrideConfig,
			extensions: ['.js', '.mjs', '.ts', '.tsx'],
			ignore: false,
		});

		// Prefer src globs; also include negated patterns to exclude build dirs explicitly
		const patterns = [
			path.join(dir, 'src/**/*.{js,mjs,ts,tsx}'),
			path.join(dir, '**/*.{js,mjs,ts,tsx}'),
			`!${path.join(dir, 'dist/**')}`,
			`!${path.join(dir, 'node_modules/**')}`,
			`!${path.join(dir, 'coverage/**')}`,
			`!${path.join(dir, 'build/**')}`,
			`!${path.join(dir, '.turbo/**')}`,
			`!${path.join(dir, '.next/**')}`,
			`!${path.join(dir, 'out/**')}`,
		];

		const results = await eslint.lintFiles(patterns);
		const formatter = await eslint.loadFormatter('unix');
		const output = formatter.format(results);
		await fs.promises.writeFile(outPath, output, 'utf8');
		console.log(`${name}: wrote ${outPath}`);
		return { name, outPath, results };
	} catch (err) {
		const msg = `ERROR running sonar scan for ${name}: ${err?.stack ? err.stack : String(err)}`;
		await fs.promises.writeFile(outPath, msg, 'utf8');
		console.error(msg);
		return { name, outPath, results: [] };
	}
}

async function findTargets() {
	const root = process.cwd();
	const dirs = [];
	const entries = await fs.promises.readdir(root, { withFileTypes: true });
	for (const e of entries) {
		if ((e.name === 'apps' || e.name === 'packages') && e.isDirectory()) {
			const d = path.join(root, e.name);
			const children = await fs.promises.readdir(d, { withFileTypes: true });
			for (const c of children) {
				if (c.isDirectory()) dirs.push(path.join(d, c.name));
			}
		}
	}
	return dirs;
}

async function main() {
	const targets = await findTargets();
	if (!targets.length) {
		console.log('No package or app directories found to scan.');
		process.exit(0);
	}

	const results = [];
	for (const t of targets) {
		// run sequentially to avoid heavy parallel load
		// eslint-disable-next-line no-await-in-loop
		const r = await runForDir(t);
		results.push(r);
	}

	// write an index of reports
	const indexPath = path.resolve(
		process.cwd(),
		'eslint-sonar-per-package-index.json',
	);
	await fs.promises.writeFile(
		indexPath,
		JSON.stringify(
			results.map((r) => ({ name: r.name, out: r.outPath })),
			null,
			2,
		),
	);
	console.log(`Wrote index to ${indexPath}`);
}

main().catch((err) => {
	console.error(err?.stack ? err.stack : String(err));
	process.exit(2);
});
