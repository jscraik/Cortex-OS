#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import yaml from 'js-yaml';

function loadJsonSummary(pkgPath) {
	const covPath = path.join(pkgPath, 'coverage', 'coverage-summary.json');
	if (!fs.existsSync(covPath)) return null;
	try {
		const data = JSON.parse(fs.readFileSync(covPath, 'utf-8'));
		const total = data.total || data; // vitest coverage summary
		return {
			statements: total.statements?.pct ?? 0,
			branches: total.branches?.pct ?? 0,
			functions: total.functions?.pct ?? 0,
			lines: total.lines?.pct ?? 0,
		};
	} catch (_e) {
		return null;
	}
}

const schema = JSON.parse(
	fs.readFileSync(new URL('./readiness.schema.json', import.meta.url), 'utf-8'),
);
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

const pkgsDir = path.resolve(process.cwd(), 'packages');
const packages = fs
	.readdirSync(pkgsDir)
	.filter((p) => fs.statSync(path.join(pkgsDir, p)).isDirectory());
let failed = false;

for (const pkg of packages) {
	const pkgPath = path.join(pkgsDir, pkg);
	const readinessPath = path.join(pkgPath, 'readiness.yml');
	if (!fs.existsSync(readinessPath)) {
		console.error(`[fail] Missing readiness.yml for ${pkg}`);
		failed = true;
		continue;
	}
	const doc = yaml.load(fs.readFileSync(readinessPath, 'utf-8')) || {};
	const valid = validate(doc);
	if (!valid) {
		console.error(`[fail] ${pkg} readiness.yml invalid: ${ajv.errorsText(validate.errors)}`);
		failed = true;
		continue;
	}
        const thresholdsSource = doc.thresholds || {};
        const thresholds = {
                statements: Math.max(95, thresholdsSource.statements ?? 95),
                branches: Math.max(95, thresholdsSource.branches ?? 95),
                functions: Math.max(95, thresholdsSource.functions ?? 95),
                lines: Math.max(95, thresholdsSource.lines ?? 95),
        };
        if (
                thresholdsSource.statements !== undefined &&
                thresholdsSource.statements < 95
        ) {
                console.warn(
                        `[warn] ${pkg} thresholds.statements < 95 overridden to 95`,
                );
        }
        if (thresholdsSource.branches !== undefined && thresholdsSource.branches < 95) {
                console.warn(
                        `[warn] ${pkg} thresholds.branches < 95 overridden to 95`,
                );
        }
        if (
                thresholdsSource.functions !== undefined &&
                thresholdsSource.functions < 95
        ) {
                console.warn(
                        `[warn] ${pkg} thresholds.functions < 95 overridden to 95`,
                );
        }
        if (thresholdsSource.lines !== undefined && thresholdsSource.lines < 95) {
                console.warn(
                        `[warn] ${pkg} thresholds.lines < 95 overridden to 95`,
                );
        }

        const coverage = loadJsonSummary(pkgPath) ||
                doc.coverage || { statements: 0, branches: 0, functions: 0, lines: 0 };

        if (!loadJsonSummary(pkgPath) && !doc.coverage) {
                console.warn(
                        `[warn] ${pkg} coverage summary missing; consider running package tests with coverage to refresh readiness data.`,
                );
        }

	const checks = [
		['statements', coverage.statements, thresholds.statements],
		['branches', coverage.branches, thresholds.branches],
		['functions', coverage.functions, thresholds.functions],
		['lines', coverage.lines, thresholds.lines],
	];

	for (const [name, actual, min] of checks) {
                if (actual < min) {
			console.error(`[fail] ${pkg} ${name} coverage ${actual}% < ${min}%`);
			failed = true;
		} else {
			console.log(`[ok]   ${pkg} ${name} coverage ${actual}% >= ${min}%`);
		}
	}
}

if (failed) {
	console.error('Readiness check failed. Raise coverage or adjust thresholds intentionally.');
	process.exit(1);
} else {
	console.log('All packages meet readiness thresholds.');
}
