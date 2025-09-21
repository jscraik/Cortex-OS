/**
 * @file quality-scanner.ts
 * @description Real Quality Metrics Integration (Lighthouse, Axe)
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { execAsync } from '../utils/exec.js';

export interface QualityResult {
	lighthouse: number;
	axe: number;
	details: {
		lighthouse?: {
			performance: number;
			accessibility: number;
			bestPractices: number;
			seo: number;
		};
		axe?: {
			violations: number;
			severity: string;
		};
		reason?: string;
		scanDuration: number;
	};
}

/**
 * Real quality metrics scanner using Lighthouse and Axe
 */
export class QualityScanner {
	async scanQuality(hasUIRequirement: boolean, serverUrl?: string): Promise<QualityResult> {
		const startTime = Date.now();

		if (!hasUIRequirement) {
			return this.createBackendOnlyResult(startTime);
		}

		try {
			// Execute quality scans
			const scanResults = await this.executeQualityScans(serverUrl);

			return this.createQualityResult(scanResults, startTime);
		} catch (error) {
			console.warn('Quality scan encountered errors:', error);
			return this.createErrorResult(error, startTime);
		}
	}

	private createBackendOnlyResult(startTime: number): QualityResult {
		return {
			lighthouse: 100, // Backend-only passes UI metrics
			axe: 100,
			details: {
				reason: 'backend-only project',
				scanDuration: Date.now() - startTime,
			},
		};
	}

	private async executeQualityScans(serverUrl?: string): Promise<{
		lighthouseResults: { score: number; details?: any };
		axeResults: { score: number; details?: any };
	}> {
		const lighthouseResults = await this.runLighthouseScan(serverUrl);
		const axeResults = await this.runAxeScan(serverUrl);

		return { lighthouseResults, axeResults };
	}

	private createQualityResult(
		scanResults: {
			lighthouseResults: { score: number; details?: any };
			axeResults: { score: number; details?: any };
		},
		startTime: number,
	): QualityResult {
		const lighthouseScore = this.calculateLighthouseScore(scanResults.lighthouseResults);
		const axeScore = this.calculateAxeScore(scanResults.axeResults);

		return {
			lighthouse: lighthouseScore,
			axe: axeScore,
			details: {
				lighthouse: scanResults.lighthouseResults.details,
				axe: scanResults.axeResults.details,
				scanDuration: Date.now() - startTime,
			},
		};
	}

	private createErrorResult(error: unknown, startTime: number): QualityResult {
		return {
			lighthouse: 0,
			axe: 0,
			details: {
				reason: `Quality scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				scanDuration: Date.now() - startTime,
			},
		};
	}

	private async runLighthouseScan(url?: string): Promise<{
		score: number;
		details?: {
			performance: number;
			accessibility: number;
			bestPractices: number;
			seo: number;
		};
	}> {
		try {
			// Use provided URL or try to detect local server
			const targetUrl = url || (await this.detectLocalServer());

			if (!targetUrl) {
				throw new Error('No URL provided and no local server detected');
			}

			// Check if Lighthouse CLI is available
			const lighthouseCheck = await execAsync('lighthouse --version');
			if (lighthouseCheck.exitCode !== 0) {
				throw new Error('Lighthouse CLI not available');
			}

			// Run Lighthouse with JSON output
			const command = `lighthouse ${targetUrl} --output=json --quiet --chrome-flags="--headless"`;
			const result = await execAsync(command, { timeout: 120000 }); // 2 minutes

			if (result.exitCode !== 0) {
				throw new Error(`Lighthouse scan failed: ${result.stderr}`);
			}

			const report = JSON.parse(result.stdout);
			const categories = report.categories;

			return {
				score: Math.round(
					Object.values(categories).reduce((sum: number, cat: any) => sum + cat.score * 100, 0) /
						Object.keys(categories).length,
				),
				details: {
					performance: Math.round((categories.performance?.score || 0) * 100),
					accessibility: Math.round((categories.accessibility?.score || 0) * 100),
					bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
					seo: Math.round((categories.seo?.score || 0) * 100),
				},
			};
		} catch (error) {
			console.warn('Lighthouse scan failed:', error);
			return { score: 0 };
		}
	}

	private async runAxeScan(url?: string): Promise<{
		score: number;
		details?: {
			violations: number;
			severity: string;
		};
	}> {
		try {
			// Use provided URL or try to detect local server
			const targetUrl = url || (await this.detectLocalServer());

			if (!targetUrl) {
				throw new Error('No URL provided and no local server detected');
			}

			// Check if axe-core CLI is available
			const axeCheck = await execAsync('npx @axe-core/cli --version');
			if (axeCheck.exitCode !== 0) {
				// Try alternative approach with Playwright/Puppeteer
				return await this.runAxeWithPlaywright(targetUrl);
			}

			// Run Axe with JSON output
			const command = `npx @axe-core/cli ${targetUrl} --format=json`;
			const result = await execAsync(command, { timeout: 60000 });

			if (result.exitCode !== 0) {
				throw new Error(`Axe scan failed: ${result.stderr}`);
			}

			const report = JSON.parse(result.stdout);
			const violations = report.violations || [];

			// Calculate score based on violations (fewer = better)
			const criticalViolations = violations.filter((v: any) => v.impact === 'critical').length;
			const seriousViolations = violations.filter((v: any) => v.impact === 'serious').length;
			const moderateViolations = violations.filter((v: any) => v.impact === 'moderate').length;

			// Score calculation: start at 100, subtract points for violations
			let score = 100;
			score -= criticalViolations * 20; // -20 points per critical
			score -= seriousViolations * 10; // -10 points per serious
			score -= moderateViolations * 5; // -5 points per moderate

			const finalScore = Math.max(0, score);
			const severity =
				criticalViolations > 0
					? 'critical'
					: seriousViolations > 0
						? 'serious'
						: moderateViolations > 0
							? 'moderate'
							: 'minor';

			return {
				score: finalScore,
				details: {
					violations: violations.length,
					severity,
				},
			};
		} catch (error) {
			console.warn('Axe scan failed:', error);
			return { score: 0 };
		}
	}

	private async runAxeWithPlaywright(url: string): Promise<{
		score: number;
		details?: {
			violations: number;
			severity: string;
		};
	}> {
		try {
			// Check if Playwright is available
			const playwrightCheck = await execAsync('npx playwright --version');
			if (playwrightCheck.exitCode !== 0) {
				throw new Error('Neither Axe CLI nor Playwright available');
			}

			// Create a simple Playwright script for Axe testing
			const script = `
const { chromium } = require('playwright');
const { injectAxe, checkA11y } = require('axe-playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('${url}');
  await injectAxe(page);
  
  try {
    const violations = await page.evaluate(() => axe.run());
    console.log(JSON.stringify(violations));
  } catch (error) {
    console.error('Axe scan failed:', error);
  }
  
  await browser.close();
})();`;

			// Write and execute the script
			await execAsync(`echo '${script}' > temp-axe-test.js`);
			const result = await execAsync('node temp-axe-test.js', { timeout: 60000 });
			await execAsync('rm -f temp-axe-test.js');

			if (result.exitCode !== 0) {
				throw new Error('Playwright Axe scan failed');
			}

			const violations = JSON.parse(result.stdout);
			const violationCount = violations.violations?.length || 0;

			return {
				score: Math.max(0, 100 - violationCount * 10),
				details: {
					violations: violationCount,
					severity: violationCount > 0 ? 'detected' : 'none',
				},
			};
		} catch (error) {
			console.warn('Playwright Axe scan failed:', error);
			return { score: 0 };
		}
	}

	private async detectLocalServer(): Promise<string | null> {
		const commonPorts = [3000, 3001, 4000, 5000, 8000, 8080, 8081];

		for (const port of commonPorts) {
			try {
				const testUrl = `http://localhost:${port}`;
				const result = await execAsync(`curl -f -s --max-time 5 ${testUrl} > /dev/null`, {
					timeout: 6000,
				});
				if (result.exitCode === 0) {
					return testUrl;
				}
			} catch {
				// Continue to next port
			}
		}

		return null;
	}

	private calculateLighthouseScore(results: { score: number; details?: any }): number {
		return results.score || 0;
	}

	private calculateAxeScore(results: { score: number; details?: any }): number {
		return results.score || 0;
	}
}
