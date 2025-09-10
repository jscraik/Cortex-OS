/**
 * Comment formatting utilities - functional approach
 * Extracted from large generateScanComment method
 */

import type { SecurityScanResult } from './semgrep-scanner.js';

export interface ScanSummary {
	total: number;
	critical: number;
	high: number;
	medium: number;
	low: number;
}

export const summarizeResults = (
	results: SecurityScanResult[],
): ScanSummary => {
	return {
		total: results.length,
		critical: results.filter(
			(r) => r.severity === 'HIGH' && r.ruleId.includes('critical'),
		).length,
		high: results.filter((r) => r.severity === 'HIGH').length,
		medium: results.filter((r) => r.severity === 'MEDIUM').length,
		low: results.filter((r) => r.severity === 'LOW').length,
	};
};

export const formatScanSection = (
	title: string,
	items: SecurityScanResult[],
): string => {
	if (items.length === 0) return '';

	const section = items
		.slice(0, 5) // Limit to first 5 items
		.map(
			(item) =>
				`- **${item.ruleId}**: ${item.message} (${item.file}:${item.startLine})`,
		)
		.join('\n');

	const remaining =
		items.length > 5 ? `\n_... and ${items.length - 5} more_` : '';

	return `### ${title}\n${section}${remaining}\n`;
};

export const generateScanComment = (
	results: SecurityScanResult[],
	owner: string,
	repo: string,
	sha: string,
): string => {
	const summary = summarizeResults(results);

	if (results.length === 0) {
		return `## 🛡️ Security Scan Results

✅ **No security issues found!**

Repository: ${owner}/${repo} (${sha.substring(0, 7)})

Great job maintaining secure code! 🎉`;
	}

	const critical = results.filter(
		(r) => r.severity === 'HIGH' && r.ruleId.includes('critical'),
	);
	const high = results.filter(
		(r) => r.severity === 'HIGH' && !r.ruleId.includes('critical'),
	);
	const medium = results.filter((r) => r.severity === 'MEDIUM');
	const low = results.filter((r) => r.severity === 'LOW');

	const criticalSection = formatScanSection('🚨 Critical Issues', critical);
	const highSection = formatScanSection('⚠️ High Severity', high);
	const mediumSection = formatScanSection('⚡ Medium Severity', medium);
	const lowSection = formatScanSection('💡 Low Severity', low);

	return `## 🛡️ Security Scan Results

📊 **Summary**: ${summary.total} issues found
- 🚨 Critical: ${summary.critical}
- ⚠️ High: ${summary.high}
- ⚡ Medium: ${summary.medium}
- 💡 Low: ${summary.low}

Repository: ${owner}/${repo} (${sha.substring(0, 7)})

${criticalSection}${highSection}${mediumSection}${lowSection}

---
*Powered by Semgrep security analysis*`;
};
