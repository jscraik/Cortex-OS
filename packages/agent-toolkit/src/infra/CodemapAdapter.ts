import { execFile } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access, mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import type { AgentToolkitCodemapInput, AgentToolkitCodemapResult } from '@cortex-os/contracts';
import type { CodemapTool } from '../domain/ToolInterfaces.js';
import { resolveToolsDirFromOverride } from './paths.js';

const execFileAsync = promisify(execFile);

export interface CodemapAdapterOptions {
	scriptPath?: string;
	pythonExecutable?: string;
	workingDirectory?: string;
	timeoutMs?: number;
}

export class CodemapAdapter implements CodemapTool {
	private readonly defaultScriptPathPromise: Promise<string>;

	constructor(private readonly options: CodemapAdapterOptions = {}) {
		this.defaultScriptPathPromise = resolveToolsDirFromOverride(undefined).then((dir) =>
			resolve(dir, 'codemap.py'),
		);
	}

	public async generate(inputs: AgentToolkitCodemapInput): Promise<AgentToolkitCodemapResult> {
		const cwd = this.options.workingDirectory ?? process.cwd();
		const scriptPath = await this.resolveScriptPath(cwd);
		const pythonExecutable = this.options.pythonExecutable ?? 'python3';
                const normalizedInputs = this.normalizeInputs(inputs, cwd);
                const outputPaths = await this.prepareOutputPaths(normalizedInputs, cwd);

		await this.ensureDependencies({ pythonExecutable, scriptPath, cwd });

		const args = this.buildArguments(normalizedInputs, outputPaths, scriptPath);
		try {
			await execFileAsync(pythonExecutable, args, {
				cwd,
				timeout: this.options.timeoutMs ?? 120_000,
				env: process.env,
			});
		} catch (error) {
			throw this.wrapExecutionError(error, { pythonExecutable, scriptPath });
		}

		const codemap = await this.readCodemap(outputPaths.jsonPath);
		return {
			tool: 'codemap',
			op: 'codemap',
			inputs: normalizedInputs,
			results: {
				codemap,
				jsonPath: outputPaths.jsonPath,
				markdownPath: outputPaths.markdownPath,
			},
		};
	}

	private async resolveScriptPath(cwd: string): Promise<string> {
		if (this.options.scriptPath) {
			return resolve(cwd, this.options.scriptPath);
		}
		return this.defaultScriptPathPromise;
	}

        private normalizeInputs(inputs: AgentToolkitCodemapInput, cwd: string): NormalizedCodemapInput {
                return {
                        scope: inputs.scope ?? 'repo',
                        repoPath: resolve(cwd, inputs.repoPath ?? '.'),
			sinceDays: inputs.sinceDays,
			sections: inputs.sections,
			tools: inputs.tools,
			jsonOut: inputs.jsonOut,
			markdownOut: inputs.markdownOut,
		};
	}

        private async prepareOutputPaths(
                inputs: NormalizedCodemapInput,
                cwd: string,
        ): Promise<{ jsonPath: string; markdownPath: string }> {
		if (inputs.jsonOut && inputs.markdownOut) {
			const jsonPath = resolve(cwd, inputs.jsonOut);
			const markdownPath = resolve(cwd, inputs.markdownOut);
			await Promise.all([
				mkdir(dirname(jsonPath), { recursive: true }),
				mkdir(dirname(markdownPath), { recursive: true }),
			]);
			return { jsonPath, markdownPath };
		}

		const tempDir = await mkdtemp(`${tmpdir()}/codemap-`);
		const jsonPath = resolve(tempDir, 'codemap.json');
		const markdownPath = resolve(tempDir, 'codemap.md');
		return { jsonPath, markdownPath };
	}

        private buildArguments(
                inputs: NormalizedCodemapInput,
                outputs: { jsonPath: string; markdownPath: string },
                scriptPath: string,
	): string[] {
		const args = [
			scriptPath,
			'--repo',
			inputs.repoPath,
			'--out',
			outputs.jsonPath,
			'--md',
			outputs.markdownPath,
		];

		if (inputs.scope) {
			args.push('--scope', inputs.scope);
		}
		if (inputs.sinceDays) {
			args.push('--since-days', String(inputs.sinceDays));
		}
		if (inputs.sections?.length) {
			args.push('--sections', inputs.sections.join(','));
		}
		if (inputs.tools?.length) {
			args.push('--tools', inputs.tools.join(','));
		}
		return args;
	}

	private async readCodemap(jsonPath: string): Promise<Record<string, unknown>> {
		try {
			const raw = await readFile(jsonPath, 'utf-8');
			return JSON.parse(raw) as Record<string, unknown>;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(
				`Codemap adapter failed: unable to parse JSON output at ${jsonPath}. ${message}`,
			);
		}
	}

	private async ensureDependencies({
		pythonExecutable,
		scriptPath,
		cwd,
	}: {
		pythonExecutable: string;
		scriptPath: string;
		cwd: string;
	}): Promise<void> {
		try {
			await access(scriptPath, fsConstants.F_OK | fsConstants.R_OK);
		} catch {
			throw new Error(
				`Codemap adapter dependency missing: codemap script not found or unreadable at ${scriptPath}`,
			);
		}

		try {
			await execFileAsync(pythonExecutable, ['--version'], {
				cwd,
				timeout: Math.min(this.options.timeoutMs ?? 120_000, 10_000),
			});
		} catch (error) {
			const err = error as NodeJS.ErrnoException;
			if (err?.code === 'ENOENT') {
				throw new Error(
					`Codemap adapter dependency missing: python executable '${pythonExecutable}' not found. Install python3 or configure codemap.pythonExecutable.`,
				);
			}
			const message = err?.message ?? String(error);
			throw new Error(
				`Codemap adapter dependency check failed when invoking '${pythonExecutable} --version': ${message}`,
			);
		}
	}

	private wrapExecutionError(
		error: unknown,
		context: { pythonExecutable: string; scriptPath: string },
	): Error {
		const err = error as NodeJS.ErrnoException & { stderr?: string; stdout?: string };
		if (err?.code === 'ENOENT') {
			return new Error(
				`Codemap adapter failed: python executable '${context.pythonExecutable}' is not available. Install python3 or configure codemap.pythonExecutable.`,
			);
		}
		const stderr = typeof err?.stderr === 'string' ? err.stderr.trim() : '';
		const stdout = typeof err?.stdout === 'string' ? err.stdout.trim() : '';
		const details = stderr || stdout ? ` Details: ${stderr || stdout}` : '';
		return new Error(
			`Codemap adapter failed while executing '${context.pythonExecutable} ${context.scriptPath}'. ${err?.message ?? ''}${details}`,
		);
	}
}
type NormalizedCodemapInput = AgentToolkitCodemapInput & {
        repoPath: string;
        scope: string;
};
