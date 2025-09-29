// src/index.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
function renderRule(rulePath, vars) {
	try {
		const s = fs.readFileSync(rulePath, 'utf8');
		return s
			.replace(/\{\{\s*USER_TIMEZONE\s*\}\}/g, vars.USER_TIMEZONE)
			.replace(/\{\{\s*TODAY\s*\}\}/g, vars.TODAY);
	} catch (_error) {
		return `Very important: The user's timezone is ${vars.USER_TIMEZONE}. Today's date is ${vars.TODAY}.

Treat dates before this as past and after this as future. When asked for "latest", "most recent", "today's", etc., do not assume knowledge is current; verify freshness or ask the user.`;
	}
}
function getCurrentTime() {
	const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	const now = /* @__PURE__ */ new Date();
	return {
		tz: userTz,
		isoDate: now.toISOString().split('T')[0],
		isoTime: now.toISOString().split('T')[1].split('.')[0],
		timestamp: now.getTime(),
	};
}
function findRuleFile() {
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
function getFreshnessRule(options = {}) {
	const userTz = options.userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	const today =
		options.today ||
		/* @__PURE__ */ new Date()
			.toISOString()
			.slice(0, 10);
	if (options.rulePath) {
		return renderRule(options.rulePath, {
			USER_TIMEZONE: userTz,
			TODAY: today,
		});
	}
	const rulePath = findRuleFile();
	if (rulePath) {
		return renderRule(rulePath, {
			USER_TIMEZONE: userTz,
			TODAY: today,
		});
	}
	return `Very important: The user's timezone is ${userTz}. Today's date is ${today}.

Treat dates before this as past and after this as future. When asked for "latest", "most recent", "today's", etc., do not assume knowledge is current; verify freshness or ask the user.`;
}
export { getCurrentTime, getFreshnessRule, renderRule };
