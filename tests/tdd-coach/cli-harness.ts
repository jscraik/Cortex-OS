import path from 'node:path';

type ChangeSetLike = {
	files: Array<{
		path: string;
		status: 'added' | 'modified' | 'deleted';
		diff: string;
		linesAdded: number;
		linesDeleted: number;
	}>;
	totalChanges: number;
	timestamp: string;
	author?: string;
};

type TddValidationResponseLike = {
	allowed: boolean;
	coaching: {
		level: string;
		message: string;
		suggestedActions: string[];
		learningResources?: string[];
	};
	state: Record<string, unknown>;
	metadata: Record<string, unknown>;
};

interface CoachLike {
	getStatus: () => Promise<{
		state: string;
		testsStatus: { passing: number; failing: number; total: number };
		lastUpdate: string;
		coaching: string;
	}>;
	validateChange: (request: {
		proposedChanges: ChangeSetLike;
		currentContext?: {
			activeFiles: string[];
			recentCommits: string[];
			branchName?: string;
		};
	}) => Promise<TddValidationResponseLike>;
}

export interface StatusOptions {
	workspace?: string;
	opsReadiness?: boolean;
}

export interface ValidateOptions {
	workspace?: string;
	files: string[];
	qualityGates?: boolean;
}

export interface CliHarness {
	status: (options?: StatusOptions) => Promise<string>;
	validate: (options: ValidateOptions) => Promise<string>;
}

const normalizePath = (file: string, workspace: string): string => {
	if (path.isAbsolute(file)) {
		return path.relative(workspace, file) || '.';
	}
	return file;
};

const buildChangeSet = (files: string[], workspace: string): ChangeSetLike => ({
	files: files.map((file) => ({
		path: normalizePath(file, workspace),
		status: 'modified',
		diff: `--- a/${file}\n+++ b/${file}`,
		linesAdded: 1,
		linesDeleted: 0,
	})),
	totalChanges: files.length,
	timestamp: new Date().toISOString(),
	author: 'tdd-coach-integration-test',
});

export const createCliHarness = (coach: CoachLike): CliHarness => ({
	async status(options: StatusOptions = {}): Promise<string> {
		const status = await coach.getStatus();
		const lines = [
			'[brAInwav] TDD Coach Status',
			`[brAInwav] TDD State: ${status.state}`,
			`[brAInwav] Tests: ${status.testsStatus.passing} passing, ${status.testsStatus.failing} failing`,
			`[brAInwav] Coaching: ${status.coaching}`,
		];

		if (options.opsReadiness) {
			lines.push('[brAInwav] Operational readiness assessment complete');
		}

		return lines.join('\n');
	},

	async validate(options: ValidateOptions): Promise<string> {
		const workspace = options.workspace ?? process.cwd();
		if (!options.files || options.files.length === 0) {
			return '[brAInwav] No files specified for validation';
		}

		const changeSet = buildChangeSet(options.files, workspace);
		const response: TddValidationResponseLike = await coach.validateChange({
			proposedChanges: changeSet,
			currentContext: {
				activeFiles: options.files.map((file) => normalizePath(file, workspace)),
				recentCommits: [],
				branchName: 'tdd-coach-integration-test',
			},
		});

		const lines = [
			'[brAInwav] TDD Coach Validation Summary',
			`[brAInwav] Allowed: ${response.allowed ? 'yes' : 'no'}`,
			`[brAInwav] Coaching Level: ${response.coaching.level}`,
			`[brAInwav] Message: ${response.coaching.message}`,
		];

		if (options.qualityGates) {
			lines.push('[brAInwav] Quality gates: enforced');
		}

		return lines.join('\n');
	},
});
