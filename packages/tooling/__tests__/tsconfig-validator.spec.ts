// brAInwav TypeScript configuration validator tests

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

describe('TypeScript Configuration Validator', () => {
	const validatorScript = path.resolve(__dirname, '../../../scripts/ci/validate-tsconfig.mjs');
	const testReportDir = path.resolve(__dirname, '../../../reports/logs');

	beforeAll(() => {
		// Ensure test reports directory exists
		fs.mkdirSync(testReportDir, { recursive: true });
	});

	it('should pass when all tsconfig files have aligned module and moduleResolution', () => {
		// Run validator on the repository with a longer timeout
		const result = execSync(`node ${validatorScript}`, {
			encoding: 'utf8',
			cwd: path.resolve(__dirname, '../../..'),
			timeout: 30000, // 30 seconds timeout
		});

		expect(result).toContain('brAInwav: tsconfig validator passed — no issues found.');
	});

	it('should generate a validation report', () => {
		// Run validator
		execSync(`node ${validatorScript}`, {
			encoding: 'utf8',
			cwd: path.resolve(__dirname, '../../..'),
		});

		// Check that report was generated
		const reportPath = path.join(testReportDir, 'tsconfig-validator.txt');
		expect(fs.existsSync(reportPath)).toBe(true);

		const reportContent = fs.readFileSync(reportPath, 'utf8');
		expect(reportContent).toContain('brAInwav: tsconfig validator report');
	});

	it('should validate NodeNext alignment in key tsconfig files', () => {
		const keyFiles = [
			'tsconfig.base.json',
			'tsconfig.json',
			'packages/mcp-core/tsconfig.json',
			'apps/cortex-os/tsconfig.json',
		];

		keyFiles.forEach((relativePath) => {
			const fullPath = path.resolve(__dirname, '../../..', relativePath);
			if (fs.existsSync(fullPath)) {
				const content = fs.readFileSync(fullPath, 'utf8');

				// Parse JSON (ignore comments)
				const strippedContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

				const config = JSON.parse(strippedContent);

				if (config.compilerOptions?.moduleResolution === 'NodeNext') {
					expect(config.compilerOptions.module).toBe('NodeNext');
				}
			}
		});
	});

	it('should enforce ignoreDeprecations is not "6.0"', () => {
		const keyFiles = ['tsconfig.base.json', 'tsconfig.json', 'packages/mcp-core/tsconfig.json'];

		keyFiles.forEach((relativePath) => {
			const fullPath = path.resolve(__dirname, '../../..', relativePath);
			if (fs.existsSync(fullPath)) {
				const content = fs.readFileSync(fullPath, 'utf8');

				// Parse JSON (ignore comments)
				const strippedContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

				const config = JSON.parse(strippedContent);

				if (config.compilerOptions?.ignoreDeprecations) {
					expect(config.compilerOptions.ignoreDeprecations).not.toBe('6.0');
				}
			}
		});
	});
});
