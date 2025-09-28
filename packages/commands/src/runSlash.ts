import { createDefaultAdapters } from './adapters.js';
import { createBuiltinCommands } from './builtins.js';
import { loadCommands } from './loader.js';
import { runCommand } from './runner.js';
import type {
	BuiltinsApi,
	CommandsMap,
	LoadedCommand,
	LoadOptions,
	ModelStore,
	RenderContext,
	RunResult,
	SlashParseResult,
} from './types.js';

export interface SlashSessionOptions {
	id?: string;
	cwd?: string;
	projectDir?: string;
	userDir?: string;
	modelStore?: ModelStore;
}

export interface RunSlashOptions {
	session?: SlashSessionOptions;
	builtinsApi?: BuiltinsApi;
	builtins?: LoadedCommand[];
	commands?: CommandsMap;
	loadOptions?: LoadOptions;
	renderContext?: Partial<RenderContext>;
}

export async function runSlash(
	parsed: SlashParseResult,
	options: RunSlashOptions = {},
): Promise<RunResult> {
	const cwd = options.renderContext?.cwd ?? options.session?.cwd ?? process.cwd();
	const loadOptions: LoadOptions = {
		projectDir: options.loadOptions?.projectDir ?? options.session?.projectDir ?? cwd,
		userDir: options.loadOptions?.userDir ?? options.session?.userDir,
	};

	const commandMap = new Map<string, LoadedCommand>();
	if (options.commands) {
		for (const [name, cmd] of options.commands.entries()) {
			commandMap.set(name, cmd);
		}
	} else {
		const loaded = await loadCommands(loadOptions);
		for (const [name, cmd] of loaded.entries()) {
			commandMap.set(name, cmd);
		}
	}

	const builtins =
		options.builtins ??
		createBuiltinCommands(
			options.builtinsApi ??
				createDefaultAdapters(options.session?.id ?? 'default', options.session?.modelStore),
		);
	for (const builtin of builtins) {
		commandMap.set(builtin.name, builtin);
	}

	const target = commandMap.get(parsed.cmd);
	if (!target) {
		return { text: `brAInwav: Unknown command "/${parsed.cmd}"` };
	}

	const ctx: RenderContext = {
		cwd,
		...options.renderContext,
	};

	return runCommand(target, parsed.args, ctx);
}
