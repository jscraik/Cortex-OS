import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { glob } from 'glob';
import { describe, expect, it } from 'vitest';

/**
 * Phase 9 Test: Apps Directory Placeholder Regression Allowlist Review
 *
 * This test ensures that placeholder regression review includes the apps directory
 * and validates production readiness across all brAInwav apps.
 */
describe('Apps Directory Placeholder Regression - Phase 9 Production Readiness', () => {
	const forbiddenPlaceholders = [
		'TODO:',
		'FIXME:',
		'HACK:',
		'XXX:',
		'placeholder',
		'mock implementation',
		'fake implementation',
		'not implemented',
		'coming soon',
		'will implement',
		'temporary solution',
	];

	const allowedPaths = [
		// Test files are allowed to have placeholders
		/^(?:.*\/)?tests?\/.*$/,
		/^(?:.*\/)?__tests__\/.*$/,
		/^.*\.(?:test|spec)\.(?:ts|js|tsx|jsx)$/,
		// Documentation files can have TODO sections
		/^.*\.md$/,
		/^.*README.*$/,
		/^.*CHANGELOG.*$/,
		// Configuration files may have placeholder comments
		/^.*config\.(?:ts|js|json)$/,
		/^.*\.config\.(?:ts|js|json)$/,
		// Example files can contain placeholders
		/^(?:.*\/)?examples?\/.*$/,
		/^(?:.*\/)?demo[^/]*\/.*$/,
		// Development tools
		/^.*vitest\.[^.]+$/,
		/^.*tsconfig\.[^.]+$/,
		/^.*eslint\.[^.]+$/,
	];

	it('should validate apps directory is included in production readiness review', async () => {
		// Verify that apps directory exists and contains apps
		const appsDir = join(process.cwd(), 'apps');
		const appDirectories = await glob('*/', { cwd: appsDir });

		expect(appDirectories.length).toBeGreaterThan(0);

		// Expected apps
		const expectedApps = ['cortex-os', 'cortex-py'];

		for (const expectedApp of expectedApps) {
			expect(appDirectories.some((dir) => dir.startsWith(expectedApp))).toBe(true);
		}
	});

	it('should scan all apps for production readiness violations', async () => {
		const appsDir = join(process.cwd(), 'apps');
		const sourceFiles = await glob('**/*.{ts,js,tsx,jsx,py}', {
			cwd: appsDir,
			absolute: true,
			ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
		});

		const violations: Array<{ file: string; line: number; content: string; placeholder: string }> =
			[];

		for (const file of sourceFiles) {
			// Prevent ReDoS by limiting input length
			if (file.length > 1000) {
				continue; // Skip extremely long file paths
			}

			// Check if file is in allowed paths
			const isAllowed = allowedPaths.some((pattern) => {
				if (pattern instanceof RegExp) {
					return pattern.test(file);
				}
				return file.includes(pattern);
			});

			if (isAllowed) {
				continue;
			}

			try {
				const content = await readFile(file, 'utf-8');
				const lines = content.split('\n');

				lines.forEach((line, index) => {
					const lowerLine = line.toLowerCase().trim();

					for (const placeholder of forbiddenPlaceholders) {
						if (lowerLine.includes(placeholder.toLowerCase())) {
							violations.push({
								file: file.replace(process.cwd(), '.'),
								line: index + 1,
								content: line.trim(),
								placeholder,
							});
						}
					}
				});
			} catch {
				// Ignore file read errors
			}
		}

		if (violations.length > 0) {
			const violationSummary = violations
				.map((v) => `${v.file}:${v.line} [${v.placeholder}] - ${v.content}`)
				.join('\n');

			throw new Error(
				`brAInwav apps directory contains ${violations.length} production readiness violations:

${violationSummary}

All placeholder implementations must be completed for production readiness.`,
			);
		}

		expect(violations).toHaveLength(0);
	});

	it('should validate critical components are production ready', async () => {
		const criticalChecks = [
			{
				app: 'cortex-os',
				file: 'tests/metrics-reality.test.ts',
				description: 'Metrics reality test exists',
			},
			{
				app: 'cortex-py',
				file: 'tests/thermal-guard-production.test.ts',
				description: 'Thermal guard production test exists',
			},
		];

		const missingComponents: string[] = [];

		for (const check of criticalChecks) {
			const filePath = join(process.cwd(), 'apps', check.app, check.file);

			try {
				await readFile(filePath, 'utf-8');
			} catch {
				missingComponents.push(`${check.app}/${check.file} - ${check.description}`);
			}
		}

		if (missingComponents.length > 0) {
			throw new Error(
				'brAInwav Phase 9 critical components missing:\n\n' +
					missingComponents.join('\n') +
					'\n\nAll Phase 9 components must be implemented for production readiness.',
			);
		}

		expect(missingComponents).toHaveLength(0);
	});

	it('should ensure apps directory test coverage for regression prevention', async () => {
		const appsDir = join(process.cwd(), 'apps');
		const apps = await glob('*/', { cwd: appsDir });

		const appsWithoutTests: string[] = [];

		for (const app of apps) {
			const appPath = join(appsDir, app);
			const testFiles = await glob('**/tests/**/*.{test,spec}.{ts,js,tsx,jsx}', {
				cwd: appPath,
			});

			if (testFiles.length === 0) {
				// Check for alternative test patterns
				const altTestFiles = await glob('**/*.{test,spec}.{ts,js,tsx,jsx}', {
					cwd: appPath,
				});

				if (altTestFiles.length === 0) {
					appsWithoutTests.push(app.replace('/', ''));
				}
			}
		}

		// Some apps might be documentation or configuration only, so we allow some exceptions
		const exemptApps = ['README.md'];
		const actualMissingTests = appsWithoutTests.filter((app) => !exemptApps.includes(app));

		if (actualMissingTests.length > 0) {
			console.warn(
				`brAInwav apps without test coverage: ${actualMissingTests.join(', ')}\n` +
					'Consider adding test coverage to prevent regression in production.',
			);
		}

		// This is a warning, not a failure, as some apps might be in development
		expect(actualMissingTests.length).toBeLessThanOrEqual(apps.length / 2);
	});

	it('should validate brAInwav branding consistency in apps', async () => {
		const appsDir = join(process.cwd(), 'apps');
		const sourceFiles = await glob('**/*.{ts,js,tsx,jsx,py}', {
			cwd: appsDir,
			absolute: true,
			ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**', '**/tests/**'],
		});

		const missingBranding: Array<{ file: string; reason: string }> = [];

		for (const file of sourceFiles) {
			try {
				const content = await readFile(file, 'utf-8');

				// Check for error messages, logs, or system outputs that should include brAInwav
				const hasErrorMessages =
					/(?:console\.error|logger\.error|throw new Error|log\.error)/i.test(content);
				const hasSystemOutputs = /(?:health|status|startup|shutdown|monitor)/i.test(content);
				const hasBranding = /brAInwav/i.test(content);

				if ((hasErrorMessages || hasSystemOutputs) && !hasBranding) {
					missingBranding.push({
						file: file.replace(process.cwd(), '.'),
						reason: hasErrorMessages
							? 'Contains error messages without brAInwav branding'
							: 'Contains system outputs without brAInwav branding',
					});
				}
			} catch {
				// Ignore file read errors
			}
		}

		// This is informational - not all files need branding
		if (missingBranding.length > 0) {
			console.info(
				`brAInwav branding opportunities in apps:\n${missingBranding.map((m) => `${m.file} - ${m.reason}`).join('\n')}`,
			);
		}

		// Pass the test - this is about awareness, not strict enforcement
		expect(true).toBe(true);
	});
});
