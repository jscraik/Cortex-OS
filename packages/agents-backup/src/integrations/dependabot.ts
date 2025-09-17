import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface DependabotProject {
	packageEcosystem: string;
	directory: string;
	scheduleInterval?: string;
}

export interface DependabotConfig {
	path: string;
	projects: DependabotProject[];
}

export const loadDependabotConfig = async (
	cwd: string = process.cwd(),
	path?: string,
): Promise<DependabotConfig | null> => {
	const filePath = path
		? resolve(cwd, path)
		: resolve(cwd, '.github/dependabot.yml');
	try {
		const raw = await readFile(filePath, 'utf8');
		let parsed: any = {};
		try {
			const mod = await import('yaml');
			parsed = (mod as any).parse
				? (mod as any).parse(raw)
				: (mod as any).default.parse(raw);
		} catch {
			// yaml module not available; unsupported in this environment
			return null;
		}
		const updates = Array.isArray(parsed.updates) ? parsed.updates : [];
		const projects: DependabotProject[] = updates
			.map((u: any) => ({
				packageEcosystem: String(
					u.package_ecosystem || u.packageEcosystem || '',
				),
				directory: String(u.directory || ''),
				scheduleInterval: u.schedule?.interval,
			}))
			.filter((p: DependabotProject) => p.packageEcosystem && p.directory);
		return { path: filePath, projects };
	} catch {
		return null;
	}
};

export interface DependabotAssessment {
	totalProjects: number;
	dailyOrWeekly: number;
	monthlyOrOther: number;
	hasGithubActions: boolean;
	hasJsEcosystem: boolean;
	weakProjects: DependabotProject[];
	score: number; // 0..100 simple heuristic
}

export const assessDependabotConfig = (
	cfg: DependabotConfig,
): DependabotAssessment => {
	const projects = cfg.projects;
	const totalProjects = projects.length;
	let dailyOrWeekly = 0;
	let monthlyOrOther = 0;
	const weakProjects: DependabotProject[] = [];
	let hasGithubActions = false;
	let hasJsEcosystem = false;

	for (const p of projects) {
		const interval = (p.scheduleInterval || '').toLowerCase();
		if (interval === 'daily' || interval === 'weekly') dailyOrWeekly++;
		else monthlyOrOther++;
		if (p.packageEcosystem === 'github-actions') hasGithubActions = true;
		if (['npm', 'pnpm', 'yarn', 'npm_and_yarn'].includes(p.packageEcosystem))
			hasJsEcosystem = true;
		if (!p.scheduleInterval || interval === 'monthly' || interval === '')
			weakProjects.push(p);
	}

	// Simple score: base 50 + 25 if daily/weekly majority + 15 if GH actions + 10 if JS covered - 10 per weak (capped)
	let score = 50;
	if (dailyOrWeekly >= monthlyOrOther) score += 25;
	if (hasGithubActions) score += 15;
	if (hasJsEcosystem) score += 10;
	score = Math.max(0, score - Math.min(30, weakProjects.length * 10));

	return {
		totalProjects,
		dailyOrWeekly,
		monthlyOrOther,
		hasGithubActions,
		hasJsEcosystem,
		weakProjects,
		score,
	};
};
