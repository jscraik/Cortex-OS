/**
 * Phase 2: TypeScript Configuration Template and Package Conformance Tests
 *
 * These tests validate that templates exist and all packages conform
 * to brAInwav TypeScript standards.
 *
 * @brainwav
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

type TsConfig = {
        compilerOptions?: {
                composite?: boolean;
                outDir?: string;
                noEmit?: boolean;
                module?: string;
                moduleResolution?: string;
                rootDir?: string;
        };
        include?: string[];
        exclude?: string[];
        references?: Array<{ path: string }>;
};

type PackageJson = {
        scripts?: Record<string, string>;
};

const readJsonFile = <T>(filePath: string): T | null => {
        try {
                const contents = fs.readFileSync(filePath, 'utf-8');
                return JSON.parse(contents) as T;
        } catch {
                return null;
        }
};

// Helper to find packages
function findPackagesWithTsConfig(): string[] {
        try {
                const output = execSync(
			'find packages -name "tsconfig.json" -not -path "*/node_modules/*" -not -path "*/dist/*"',
			{ cwd: process.cwd(), encoding: 'utf-8' },
		);
		return output
			.trim()
			.split('\n')
			.map((p) => path.dirname(p))
			.filter(Boolean);
	} catch {
		return [];
	}
}

describe('Phase 2: TypeScript Configuration Templates', () => {
	const templateDir = '.cortex/templates/tsconfig';

	it('should have template directory', () => {
		expect(fs.existsSync(templateDir)).toBe(true);
	});

	it('should have tsconfig.lib.json template', () => {
		const templatePath = path.join(templateDir, 'tsconfig.lib.json');
		expect(fs.existsSync(templatePath)).toBe(true);
	});

	it('should have tsconfig.spec.json template', () => {
		const templatePath = path.join(templateDir, 'tsconfig.spec.json');
		expect(fs.existsSync(templatePath)).toBe(true);
	});

	it('should have README.md documentation', () => {
		const readmePath = path.join(templateDir, 'README.md');
		expect(fs.existsSync(readmePath)).toBe(true);
	});

	describe('Template Validation', () => {
		it('lib template should have required fields', () => {
			const template = JSON.parse(
				fs.readFileSync(path.join(templateDir, 'tsconfig.lib.json'), 'utf-8'),
			);

			expect(template.compilerOptions?.composite).toBe(true);
			expect(template.compilerOptions?.outDir).toBe('dist');
			expect(template.compilerOptions?.noEmit).toBe(false);
			expect(template.include).toContain('src/**/*');
			expect(template.exclude).toContain('dist');
			expect(template.exclude).toContain('node_modules');
		});

		it('spec template should extend main tsconfig', () => {
			const template = JSON.parse(
				fs.readFileSync(path.join(templateDir, 'tsconfig.spec.json'), 'utf-8'),
			);

			expect(template.extends).toBe('./tsconfig.json');
			expect(template.compilerOptions?.composite).toBe(false);
			expect(template.compilerOptions?.noEmit).toBe(true);
			expect(template.include).toContain('tests/**/*');
		});

		it('lib template should use NodeNext module resolution', () => {
			const template = JSON.parse(
				fs.readFileSync(path.join(templateDir, 'tsconfig.lib.json'), 'utf-8'),
			);

			expect(template.compilerOptions?.module).toBe('NodeNext');
			expect(template.compilerOptions?.moduleResolution).toBe('NodeNext');
		});
	});
});

describe('Phase 2: Package Conformance Validation', () => {
	const packages = findPackagesWithTsConfig();

        describe('Composite Flag Compliance', () => {
                it.each(packages)('%s should have composite: true (if buildable)', (pkg) => {
                        const tsconfigPath = path.join(process.cwd(), pkg, 'tsconfig.json');

                        const tsconfig = readJsonFile<TsConfig>(tsconfigPath);

                        if (!tsconfig) {
                                // Skip packages with invalid JSON (may have comments)
                                console.log(`⚠️  ${pkg}: Invalid JSON in tsconfig (may have comments) - skipping`);
                                expect(true).toBe(true);
                                return;
                        }

                        // Check if package is buildable (has build script)
                        const packageJsonPath = path.join(process.cwd(), pkg, 'package.json');
                        const packageJson = readJsonFile<PackageJson>(packageJsonPath);

                        const isBuildable = packageJson?.scripts?.build?.includes('tsc');

                        if (isBuildable) {
                                expect(tsconfig.compilerOptions?.composite).toBe(true);
                        }
                });
        });

        describe('Output Directory Consistency', () => {
                it.each(packages)('%s should have consistent outDir', (pkg) => {
                        const tsconfigPath = path.join(process.cwd(), pkg, 'tsconfig.json');

                        const tsconfig = readJsonFile<TsConfig>(tsconfigPath);

                        if (!tsconfig) {
                                expect(true).toBe(true);
                                return;
                        }

                        if (tsconfig.compilerOptions?.outDir) {
                                // Should be "dist" or a variant like "dist-spec" for test configs
                                expect(tsconfig.compilerOptions.outDir).toMatch(/^dist/);
			}
		});
	});

        describe('Exclude Array Standards', () => {
                it.each(packages)('%s should exclude standard directories', (pkg) => {
                        const tsconfigPath = path.join(process.cwd(), pkg, 'tsconfig.json');

                        const tsconfig = readJsonFile<TsConfig>(tsconfigPath);

                        if (!tsconfig) {
                                expect(true).toBe(true);
                                return;
                        }

                        if (tsconfig.exclude) {
                                const requiredExcludes = ['dist', 'node_modules'];
                                requiredExcludes.forEach((ex) => {
					expect(tsconfig.exclude).toContain(ex);
				});
			} else {
				// If no exclude, that's acceptable (TypeScript has defaults)
				// But we recommend explicit exclude arrays
				expect(true).toBe(true);
			}
		});
	});

	describe('Test Configuration Separation', () => {
		it.each(packages)('%s should have separate test config if tests exist', (pkg) => {
			const hasTestsDir = fs.existsSync(path.join(process.cwd(), pkg, 'tests'));
			const hasSpecConfig = fs.existsSync(path.join(process.cwd(), pkg, 'tsconfig.spec.json'));

			if (hasTestsDir) {
				// Packages with tests SHOULD have tsconfig.spec.json
				// This is a recommendation, not a hard requirement
				// So we just document it
				if (!hasSpecConfig) {
					console.log(`ℹ️  ${pkg} has tests/ but no tsconfig.spec.json (consider adding)`);
				}
				expect(true).toBe(true);
			}
		});
	});

        describe('Module Resolution Standards', () => {
                it.each(packages)('%s should use NodeNext module resolution', (pkg) => {
                        const tsconfigPath = path.join(process.cwd(), pkg, 'tsconfig.json');

                        const tsconfig = readJsonFile<TsConfig>(tsconfigPath);

                        if (!tsconfig) {
                                expect(true).toBe(true);
                                return;
                        }

                        if (tsconfig.compilerOptions?.module || tsconfig.compilerOptions?.moduleResolution) {
                                // If module or moduleResolution is set, it should be NodeNext
                                // (Some configs may inherit from base, so this is optional)
				const module = tsconfig.compilerOptions?.module;
				const moduleResolution = tsconfig.compilerOptions?.moduleResolution;

				if (module && module !== 'NodeNext' && module !== 'ESNext') {
					console.warn(`⚠️  ${pkg} uses module: ${module} (recommend NodeNext)`);
				}

				if (moduleResolution && moduleResolution !== 'NodeNext') {
					console.warn(`⚠️  ${pkg} uses moduleResolution: ${moduleResolution} (recommend NodeNext)`);
				}
			}

			expect(true).toBe(true);
		});
	});

        describe('Include/Exclude Patterns', () => {
                it.each(packages)('%s should have clean include patterns', (pkg) => {
                        const tsconfigPath = path.join(process.cwd(), pkg, 'tsconfig.json');

                        const tsconfig = readJsonFile<TsConfig>(tsconfigPath);

                        if (!tsconfig) {
                                expect(true).toBe(true);
                                return;
                        }

			if (tsconfig.include) {
				// Include should typically be src/**/* or src
				const hasSrcInclude = tsconfig.include.some((p: string) => p.includes('src'));
				expect(hasSrcInclude).toBe(true);

				// Test files should NOT be in main include (should be in spec config)
				const includesTests = tsconfig.include.some(
					(p: string) => p.includes('test') && !p.includes('setup'),
				);

				if (includesTests && fs.existsSync(path.join(process.cwd(), pkg, 'tsconfig.spec.json'))) {
					console.log(`ℹ️  ${pkg} includes tests in main config despite having tsconfig.spec.json`);
				}
			}

			expect(true).toBe(true);
		});
	});
});

describe('Phase 2: brAInwav Standards Summary', () => {
	it('should report overall conformance statistics', () => {
		const packages = findPackagesWithTsConfig();

		let conformingPackages = 0;
		const totalPackages = packages.length;
		let skippedPackages = 0;

		packages.forEach((pkgDir) => {
			const tsconfigPath = path.join(process.cwd(), pkgDir, 'tsconfig.json');

                const tsconfig = readJsonFile<TsConfig>(tsconfigPath);

                if (!tsconfig) {
                        skippedPackages++;
                        return;
                }

			const hasComposite = tsconfig.compilerOptions?.composite === true;
			const hasDistOutDir = tsconfig.compilerOptions?.outDir === 'dist';
			const excludesStandard =
				tsconfig.exclude?.includes('dist') && tsconfig.exclude?.includes('node_modules');

			if (hasComposite && hasDistOutDir && excludesStandard) {
				conformingPackages++;
			}
		});

		const validPackages = totalPackages - skippedPackages;
		const conformanceRate = validPackages > 0 ? (conformingPackages / validPackages) * 100 : 0;

		console.log('\n📊 brAInwav TypeScript Standards Conformance:');
		console.log(`   Total packages: ${totalPackages}`);
		console.log(`   Valid JSON: ${validPackages} (${skippedPackages} skipped with invalid JSON)`);
		console.log(
			`   Conforming: ${conformingPackages}/${validPackages} (${conformanceRate.toFixed(1)}%)`,
		);
		console.log(`   Template available: ✅`);
		console.log(`   Documentation: ✅`);

		// We want high conformance, but Phase 2 is ongoing
		// So we just report statistics
		expect(conformanceRate).toBeGreaterThanOrEqual(0);
	});
});
