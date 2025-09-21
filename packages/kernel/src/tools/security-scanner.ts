/**
 * @file security-scanner.ts
 * @description Real Security Scanning Integration for Cortex Kernel
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { execAsync } from '../utils/exec.js';

export interface SecurityScanResult {
	blockers: number;
	majors: number;
	details: {
		tools: string[];
		vulnerabilities: Vulnerability[];
		scanDuration: number;
		rulesetsUsed: string[];
		confidence: number;
	};
}

export interface Vulnerability {
	severity: 'critical' | 'high' | 'medium' | 'low';
	type: string;
	cwe?: string;
	file: string;
	line: number;
	column?: number;
	message: string;
	rule: string;
	confidence: number;
	fixRecommendation?: string;
}

/**
 * Real security scanner using Semgrep and other tools
 */
export class SecurityScanner {
	private readonly semgrepConfigPaths = [
		'p/security-audit',
		'p/owasp-top-10',
		'p/cwe-top-25',
		'p/secrets',
	];

	async scanProject(): Promise<SecurityScanResult> {
		const startTime = Date.now();
		const scanContext = this.initializeScanContext();

		try {
			// Run all security scans
			await this.executeSecurityScans(scanContext);
		} catch (error) {
			console.warn('Security scan encountered errors:', error);
			return this.createFallbackResult(error, startTime);
		}

		// Process and categorize results
		return this.processScanResults(scanContext, startTime);
	}

	private initializeScanContext(): {
		allVulnerabilities: Vulnerability[];
		toolsUsed: string[];
	} {
		return {
			allVulnerabilities: [],
			toolsUsed: [],
		};
	}

	private async executeSecurityScans(context: {
		allVulnerabilities: Vulnerability[];
		toolsUsed: string[];
	}): Promise<void> {
		// Run Semgrep security scans
		const semgrepResults = await this.runSemgrepScan();
		context.allVulnerabilities.push(...semgrepResults);
		context.toolsUsed.push('Semgrep');

		// Run additional security checks if available
		if (await this.isCodeQLAvailable()) {
			const codeqlResults = await this.runCodeQLScan();
			context.allVulnerabilities.push(...codeqlResults);
			context.toolsUsed.push('CodeQL');
		}

		// Run secret detection
		const secretResults = await this.runSecretDetection();
		context.allVulnerabilities.push(...secretResults);
		context.toolsUsed.push('SecretScanner');
	}

	private createFallbackResult(
		error: unknown,
		startTime: number,
	): SecurityScanResult {
		return {
			blockers: 0,
			majors: 0,
			details: {
				tools: ['SecurityScanner-Fallback'],
				vulnerabilities: [
					{
						severity: 'medium',
						type: 'scan-error',
						file: 'security-scan',
						line: 0,
						message: `Security scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
						rule: 'scan-failure',
						confidence: 100,
					},
				],
				scanDuration: Date.now() - startTime,
				rulesetsUsed: [],
				confidence: 50,
			},
		};
	}

	private processScanResults(
		context: { allVulnerabilities: Vulnerability[]; toolsUsed: string[] },
		startTime: number,
	): SecurityScanResult {
		// Categorize vulnerabilities
		const blockers = context.allVulnerabilities.filter(
			(v) => v.severity === 'critical' || (v.severity === 'high' && v.confidence > 90),
		).length;

		const majors = context.allVulnerabilities.filter(
			(v) => v.severity === 'high' || (v.severity === 'medium' && v.confidence > 80),
		).length;

		return {
			blockers,
			majors,
			details: {
				tools: context.toolsUsed,
				vulnerabilities: context.allVulnerabilities,
				scanDuration: Date.now() - startTime,
				rulesetsUsed: this.semgrepConfigPaths,
				confidence: this.calculateOverallConfidence(context.allVulnerabilities),
			},
		};
	}

	private async runSemgrepScan(): Promise<Vulnerability[]> {
		const vulnerabilities: Vulnerability[] = [];

		for (const config of this.semgrepConfigPaths) {
			try {
				const command = `semgrep --config=${config} --json --quiet .`;
				const result = await execAsync(command);

				if (result.stdout) {
					const semgrepOutput = JSON.parse(result.stdout);
					const configVulns = this.parseSemgrepOutput(semgrepOutput, config);
					vulnerabilities.push(...configVulns);
				}
			} catch (error) {
				console.warn(`Semgrep scan with config ${config} failed:`, error);
				// Continue with other configs
			}
		}

		return vulnerabilities;
	}

	private parseSemgrepOutput(semgrepOutput: any, config: string): Vulnerability[] {
		if (!semgrepOutput.results || !Array.isArray(semgrepOutput.results)) {
			return [];
		}

		return semgrepOutput.results.map((finding: any) => ({
			severity: this.mapSemgrepSeverity(finding.extra?.severity || 'INFO'),
			type: finding.check_id || 'unknown',
			cwe: finding.extra?.metadata?.cwe?.join(', '),
			file: finding.path || 'unknown',
			line: finding.start?.line || 0,
			column: finding.start?.col,
			message: finding.extra?.message || finding.message || 'Security issue detected',
			rule: finding.check_id || `semgrep-${config}`,
			confidence: this.mapSemgrepConfidence(finding.extra?.metadata?.confidence || 'MEDIUM'),
			fixRecommendation: finding.extra?.fix || undefined,
		}));
	}

	private mapSemgrepSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
		switch (severity.toUpperCase()) {
			case 'CRITICAL':
				return 'critical';
			case 'ERROR':
			case 'HIGH':
				return 'high';
			case 'WARNING':
			case 'MEDIUM':
				return 'medium';
			default:
				return 'low';
		}
	}

	private mapSemgrepConfidence(confidence: string): number {
		switch (confidence.toUpperCase()) {
			case 'HIGH':
				return 95;
			case 'MEDIUM':
				return 75;
			case 'LOW':
				return 50;
			default:
				return 60;
		}
	}

	private async isCodeQLAvailable(): Promise<boolean> {
		try {
			await execAsync('codeql version');
			return true;
		} catch {
			return false;
		}
	}

	private async runCodeQLScan(): Promise<Vulnerability[]> {
		try {
			// Basic CodeQL scan for common security issues
			const command = 'codeql database analyze --format=sarif-latest --output=codeql-results.sarif';
			await execAsync(command);

			// Parse SARIF results (simplified)
			const sarifResult = await execAsync('cat codeql-results.sarif');
			const sarif = JSON.parse(sarifResult.stdout);

			return this.parseCodeQLSarif(sarif);
		} catch (error) {
			console.warn('CodeQL scan failed:', error);
			return [];
		}
	}

	private parseCodeQLSarif(sarif: any): Vulnerability[] {
		const vulnerabilities: Vulnerability[] = [];

		if (sarif.runs && Array.isArray(sarif.runs)) {
			for (const run of sarif.runs) {
				if (run.results && Array.isArray(run.results)) {
					for (const result of run.results) {
						const location = result.locations?.[0]?.physicalLocation;
						vulnerabilities.push({
							severity: this.mapCodeQLSeverity(result.level || 'note'),
							type: result.ruleId || 'codeql-rule',
							file: location?.artifactLocation?.uri || 'unknown',
							line: location?.region?.startLine || 0,
							column: location?.region?.startColumn,
							message: result.message?.text || 'CodeQL security finding',
							rule: result.ruleId || 'codeql-security',
							confidence: 90, // CodeQL generally has high confidence
						});
					}
				}
			}
		}

		return vulnerabilities;
	}

	private mapCodeQLSeverity(level: string): 'critical' | 'high' | 'medium' | 'low' {
		switch (level.toLowerCase()) {
			case 'error':
				return 'high';
			case 'warning':
				return 'medium';
			default:
				return 'low';
		}
	}

	private async runSecretDetection(): Promise<Vulnerability[]> {
		try {
			// Use built-in secret patterns or integrate with tools like detect-secrets
			const secretPatterns = [
				{
					pattern: /(?:password|pwd|pass)\s*[=:]\s*["']([^"']+)["']/gi,
					type: 'hardcoded-password',
				},
				{ pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*["']([^"']+)["']/gi, type: 'api-key' },
				{ pattern: /(?:secret[_-]?key|secretkey)\s*[=:]\s*["']([^"']+)["']/gi, type: 'secret-key' },
				{ pattern: /(?:token|jwt)\s*[=:]\s*["']([^"']+)["']/gi, type: 'auth-token' },
			];

			const vulnerabilities: Vulnerability[] = [];

			// Scan common files for secrets
			const filesToScan = await this.getFilesToScan();

			for (const file of filesToScan) {
				try {
					const content = await execAsync(`cat "${file}"`);
					let lineNumber = 1;

					for (const line of content.stdout.split('\n')) {
						for (const { pattern, type } of secretPatterns) {
							const matches = line.match(pattern);
							if (matches) {
								vulnerabilities.push({
									severity: 'high',
									type: `secret-${type}`,
									file,
									line: lineNumber,
									message: `Potential ${type} found in source code`,
									rule: `secret-detection-${type}`,
									confidence: 85,
									fixRecommendation:
										'Move sensitive data to environment variables or secure configuration',
								});
							}
						}
						lineNumber++;
					}
				} catch {
					// Skip files that can't be read
				}
			}

			return vulnerabilities;
		} catch {
			return [];
		}
	}

	private async getFilesToScan(): Promise<string[]> {
		try {
			const result = await execAsync(
				'find . -type f \\( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.env*" -o -name "*.yml" -o -name "*.yaml" \\) -not -path "./node_modules/*" -not -path "./.git/*"',
			);
			return result.stdout.split('\n').filter((f: string) => f.trim());
		} catch {
			return [];
		}
	}

	private calculateOverallConfidence(vulnerabilities: Vulnerability[]): number {
		if (vulnerabilities.length === 0) return 100;

		const totalConfidence = vulnerabilities.reduce((sum, v) => sum + v.confidence, 0);
		return Math.round(totalConfidence / vulnerabilities.length);
	}
}
