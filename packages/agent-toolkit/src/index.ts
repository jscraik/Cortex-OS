// Domain exports
export type {
	ToolExecutor,
	ToolExecutionContext,
	ToolExecutionEvents,
} from './domain/ToolExecutor.js';

export type {
	SearchTool,
	CodemodTool,
	ValidationTool,
	ToolRegistry,
} from './domain/ToolInterfaces.js';

// Application layer exports
export {
	ToolExecutorUseCase,
	BatchToolExecutorUseCase,
	CodeSearchUseCase,
	CodeQualityUseCase,
} from './app/UseCases.js';

export { DefaultToolRegistry } from './app/ToolRegistry.js';

// Infrastructure adapters
export {
	RipgrepAdapter,
	SemgrepAdapter,
	AstGrepAdapter,
} from './infra/SearchAdapters.js';

export { CombyAdapter } from './infra/CodemodAdapters.js';

export {
	ESLintAdapter,
	RuffAdapter,
	CargoAdapter,
	AutoValidatorAdapter,
} from './infra/ValidationAdapters.js';

// Convenience factory function
import { DefaultToolRegistry } from './app/ToolRegistry.js';
import { ToolExecutorUseCase } from './app/UseCases.js';
import {
	RipgrepAdapter,
	SemgrepAdapter,
	AstGrepAdapter,
} from './infra/SearchAdapters.js';
import { CombyAdapter } from './infra/CodemodAdapters.js';
import {
	ESLintAdapter,
	RuffAdapter,
	CargoAdapter,
	AutoValidatorAdapter,
} from './infra/ValidationAdapters.js';

/**
 * Factory function to create a fully configured agent toolkit instance
 */
export function createAgentToolkit(toolsPath?: string) {
	const registry = new DefaultToolRegistry();

	// Register search tools
	registry.registerSearchTool('ripgrep', new RipgrepAdapter(toolsPath));
	registry.registerSearchTool('semgrep', new SemgrepAdapter(toolsPath));
	registry.registerSearchTool('ast-grep', new AstGrepAdapter(toolsPath));

	// Register codemod tools
	registry.registerCodemodTool('comby', new CombyAdapter(toolsPath));

	// Register validation tools
	registry.registerValidationTool('eslint', new ESLintAdapter(toolsPath));
	registry.registerValidationTool('ruff', new RuffAdapter(toolsPath));
	registry.registerValidationTool('cargo', new CargoAdapter(toolsPath));
	registry.registerValidationTool('auto-validator', new AutoValidatorAdapter(toolsPath));

	const executor = new ToolExecutorUseCase(registry);

	return {
		executor,
		registry,
		// Convenience methods
		search: (pattern: string, path: string) =>
			executor.execute('ripgrep', { pattern, path }),
		multiSearch: (pattern: string, path: string) =>
			new CodeSearchUseCase(executor).multiSearch(pattern, path),
		codemod: (find: string, replace: string, path: string) =>
			executor.execute('comby', { find, replace, path }),
		validate: (files: string[]) =>
			executor.execute('auto-validator', { files }),
		validateProject: (files: string[]) =>
			new CodeQualityUseCase(executor).validateProject(files),
	};
}

/**
 * Default instance using standard tools path
 */
export const agentToolkit = createAgentToolkit();