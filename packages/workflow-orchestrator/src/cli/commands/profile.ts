/**
 * @file packages/workflow-orchestrator/src/cli/commands/profile.ts
 * @description Manage enforcement profile (YAML-based quality standards)
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 */

import { readFile, writeFile } from 'node:fs/promises';
import {
	diffEnforcementProfileFromDefaults,
	enforcementProfileDefaults,
	enforcementProfileSchema,
} from '@cortex-os/workflow-common';
import { parse, stringify } from 'yaml';
import { formatError, formatInfo, formatSuccess } from '../banner.js';

const PROFILE_PATH = 'enforcement-profile.yml';

/**
 * Initialize enforcement profile with brAInwav defaults
 */
export async function initProfile(): Promise<void> {
	const defaults = enforcementProfileDefaults();
	const yaml = stringify(defaults);

	await writeFile(PROFILE_PATH, yaml);
	console.log(formatSuccess('Created enforcement-profile.yml with brAInwav defaults'));
	console.log(formatInfo('Coverage: 95% (lines, branches, functions, statements)'));
	console.log(formatInfo('Security: 0 critical, 0 high, ≤5 medium'));
	console.log(formatInfo('Accessibility: WCAG 2.2 AA (score ≥90)'));
	console.log(formatInfo('Performance: LCP ≤2500ms, TBT ≤300ms'));
}

/**
 * Show current enforcement profile
 */
export async function showProfile(): Promise<void> {
	try {
		const yaml = await readFile(PROFILE_PATH, 'utf-8');
		const profile = enforcementProfileSchema.parse(parse(yaml));

		console.log('');
		console.log('╔══════════════════════════════════════════════════════╗');
		console.log('║  brAInwav Cortex-OS Enforcement Profile             ║');
		console.log('╚══════════════════════════════════════════════════════╝');
		console.log('');
		console.log(`Version: ${profile.version}`);
		console.log('');
		console.log('Coverage Requirements:');
		console.log(`  Lines:      ${profile.budgets.coverage.lines}%`);
		console.log(`  Branches:   ${profile.budgets.coverage.branches}%`);
		console.log(`  Functions:  ${profile.budgets.coverage.functions}%`);
		console.log(`  Statements: ${profile.budgets.coverage.statements}%`);
		console.log('');
		console.log('Security Policy:');
		console.log(`  Critical: ${profile.budgets.security.maxCritical}`);
		console.log(`  High:     ${profile.budgets.security.maxHigh}`);
		console.log(`  Medium:   ≤${profile.budgets.security.maxMedium}`);
		console.log('');
		console.log('Performance Budgets:');
		console.log(`  LCP: ≤${profile.budgets.performance.lcp}ms`);
		console.log(`  TBT: ≤${profile.budgets.performance.tbt}ms`);
		console.log('');
		console.log('Accessibility:');
		console.log(`  Score:   ≥${profile.budgets.accessibility.score}`);
		console.log(
			`  WCAG:    ${profile.budgets.accessibility.wcagLevel} ${profile.budgets.accessibility.wcagVersion}`,
		);
		console.log('');

		// Show diffs from defaults
		const diffs = diffEnforcementProfileFromDefaults(profile);
		if (diffs.length > 0) {
			console.log('Customizations from brAInwav defaults:');
			for (const diff of diffs) {
				console.log(`  • ${diff}`);
			}
			console.log('');
		}
	} catch (_error) {
		console.log(formatError('Profile not found. Run: cortex-workflow profile init'));
	}
}

/**
 * Set a profile value
 */
export async function setProfileValue(path: string, value: string): Promise<void> {
	try {
		const yaml = await readFile(PROFILE_PATH, 'utf-8');
		const profile = enforcementProfileSchema.parse(parse(yaml));

		// Parse the path (e.g., "coverage.lines" -> navigate to budgets.coverage.lines)
		const parts = path.split('.');

		// Navigate to the parent object
		let current: any = profile.budgets;
		for (let i = 0; i < parts.length - 1; i++) {
			current = current[parts[i]];
		}

		// Set the value
		const lastPart = parts[parts.length - 1];
		const numValue = parseFloat(value);
		current[lastPart] = Number.isNaN(numValue) ? value : numValue;

		// Validate and save
		const validated = enforcementProfileSchema.parse(profile);
		await writeFile(PROFILE_PATH, stringify(validated));

		console.log(formatSuccess(`Updated ${path} to ${value}`));
	} catch (error) {
		console.log(formatError(`Failed to update profile: ${error}`));
	}
}

/**
 * Validate enforcement profile
 */
export async function validateProfile(): Promise<boolean> {
	try {
		const yaml = await readFile(PROFILE_PATH, 'utf-8');
		const profile = enforcementProfileSchema.parse(parse(yaml));

		console.log(formatSuccess('Profile validation passed'));
		console.log(formatInfo(`Branding: ${profile.branding}`));

		return true;
	} catch (error) {
		console.log(formatError('Profile validation failed'));
		if (error instanceof Error) {
			console.log(formatError(error.message));
		}
		return false;
	}
}
