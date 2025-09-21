import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Type definitions for template variables
 */
type Vars = {
	USER_TIMEZONE: string;
	TODAY: string;
};

/**
 * Render the rule template with provided variables
 * @param rulePath - Path to the rule template file
 * @param vars - Variables to replace in the template
 * @returns Rendered rule content
 */
export function renderRule(rulePath: string, vars: Vars): string {
	try {
		const s = fs.readFileSync(rulePath, 'utf8');
		return s
			.replace(/\{\{\s*USER_TIMEZONE\s*\}\}/g, vars.USER_TIMEZONE)
			.replace(/\{\{\s*TODAY\s*\}\}/g, vars.TODAY);
	} catch (_error) {
		// If we can't read the file, return a default rule
		return `Very important: The user's timezone is ${vars.USER_TIMEZONE}. Today's date is ${vars.TODAY}.

Treat dates before this as past and after this as future. When asked for "latest", "most recent", "today's", etc., do not assume knowledge is current; verify freshness or ask the user.`;
	}
}

/**
 * Options for getting the freshness rule
 */
type GetFreshnessRuleOptions = {
	userTimezone?: string;
	today?: string;
	rulePath?: string;
};

/**
 * Get current time information
 * @returns Current time information
 */
export function getCurrentTime(): {
	tz: string;
	isoDate: string;
	isoTime: string;
	timestamp: number;
} {
	const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	const now = new Date();

	return {
		tz: userTz,
		isoDate: now.toISOString().split('T')[0],
		isoTime: now.toISOString().split('T')[1].split('.')[0],
		timestamp: now.getTime(),
	};
}

/**
 * Find the rule file path by trying multiple possible locations
 * @returns Path to the rule file or null if not found
 */
function findRuleFile(): string | null {
	// Try multiple possible paths for the rule file
	const possiblePaths = [
		path.join(__dirname, '..', '..', '.cortex', 'rules', '_time-freshness.md'),
		path.join(__dirname, '..', '..', '..', '.cortex', 'rules', '_time-freshness.md'),
		path.join(__dirname, '..', '..', '..', '..', '.cortex', 'rules', '_time-freshness.md'),
		path.join(process.cwd(), '.cortex', 'rules', '_time-freshness.md'),
	];

	for (const possiblePath of possiblePaths) {
		if (fs.existsSync(possiblePath)) {
			return possiblePath;
		}
	}

	return null;
}

/**
 * Get the freshness rule with user's timezone and today's date
 * @param options - Options for getting the rule
 * @returns Rendered freshness rule
 */
export function getFreshnessRule(options: GetFreshnessRuleOptions = {}): string {
	// Default values
	const userTz = options.userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

	const today = options.today || new Date().toISOString().slice(0, 10); // YYYY-MM-DD

	// If a rule path is explicitly provided, use it
	if (options.rulePath) {
		return renderRule(options.rulePath, {
			USER_TIMEZONE: userTz,
			TODAY: today,
		});
	}

	// Try to find the rule file
	const rulePath = findRuleFile();

	if (rulePath) {
		return renderRule(rulePath, {
			USER_TIMEZONE: userTz,
			TODAY: today,
		});
	}

	// If we can't find the file, return a default rule
	return `Very important: The user's timezone is ${userTz}. Today's date is ${today}.

Treat dates before this as past and after this as future. When asked for "latest", "most recent", "today's", etc., do not assume knowledge is current; verify freshness or ask the user.`;
}
