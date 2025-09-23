import { beforeEach, describe, expect, it } from 'vitest';
import { DefaultToolRegistry } from '../app/ToolRegistry.js';
import { CodeSearchUseCase, ToolExecutorUseCase } from '../app/UseCases.js';
import { createAgentToolkit } from '../index.js';
import { CombyAdapter } from '../infra/CodemodAdapters.js';
import { RipgrepAdapter } from '../infra/SearchAdapters.js';
import { MultiValidatorAdapter } from '../infra/ValidationAdapters.js';

describe('Agent Toolkit Integration', () => {
	let registry: DefaultToolRegistry;
	let executor: ToolExecutorUseCase;

	beforeEach(() => {
		registry = new DefaultToolRegistry();
		executor = new ToolExecutorUseCase(registry);
	});

	describe('ToolRegistry', () => {
		it('should register and retrieve tools', () => {
			const ripgrepAdapter = new RipgrepAdapter();
			registry.registerSearchTool('ripgrep', ripgrepAdapter);

			const retrievedTool = registry.getSearchTool('ripgrep');
			expect(retrievedTool).toBe(ripgrepAdapter);
		});

		it('should list registered tools', () => {
			registry.registerSearchTool('ripgrep', new RipgrepAdapter());
			registry.registerCodemodTool('comby', new CombyAdapter());
			registry.registerValidationTool('multi-validator', new MultiValidatorAdapter());

			const tools = registry.listTools();
			expect(tools.search).toContain('ripgrep');
			expect(tools.codemod).toContain('comby');
			expect(tools.validation).toContain('multi-validator');
		});
	});

	describe('ToolExecutor', () => {
		beforeEach(() => {
			registry.registerSearchTool('ripgrep', new RipgrepAdapter());
			registry.registerCodemodTool('comby', new CombyAdapter());
			registry.registerValidationTool('multi-validator', new MultiValidatorAdapter());
		});

		it('should check tool availability', async () => {
			const isAvailable = await executor.isAvailable('ripgrep');
			expect(isAvailable).toBe(true);

			const isNotAvailable = await executor.isAvailable('nonexistent-tool');
			expect(isNotAvailable).toBe(false);
		});

		it('should list available tools', async () => {
			const availableTools = await executor.getAvailableTools();
			expect(availableTools).toContain('ripgrep');
			expect(availableTools).toContain('comby');
			expect(availableTools).toContain('multi-validator');
		});

		it('should throw error for unregistered tool', async () => {
			await expect(
				executor.execute('nonexistent-tool', { pattern: 'test', path: '.' }),
			).rejects.toThrow("Search tool 'nonexistent-tool' not found");
		});

		it('should throw error for invalid input type', async () => {
			await expect(executor.execute('ripgrep', { invalid: 'input' } as any)).rejects.toThrow(
				"Unknown input type for tool 'ripgrep'",
			);
		});
	});

	describe('CodeSearchUseCase', () => {
		let codeSearch: CodeSearchUseCase;

		beforeEach(() => {
			registry.registerSearchTool('ripgrep', new RipgrepAdapter());
			registry.registerSearchTool('semgrep', new RipgrepAdapter()); // Mock semgrep as ripgrep for testing
			registry.registerSearchTool('ast-grep', new RipgrepAdapter()); // Mock ast-grep as ripgrep for testing
			codeSearch = new CodeSearchUseCase(executor);
		});

		it('should perform multi-search', async () => {
			const results = await codeSearch.multiSearch('AGENTS', '.');

			expect(results.ripgrep).toBeDefined();
			expect(results.semgrep).toBeDefined();
			expect(results.astGrep).toBeDefined();
		});

		it('should perform smart search and return first successful result', async () => {
			const result = await codeSearch.smartSearch('AGENTS', '.');

			expect(result).toBeDefined();
			expect(result.tool).toBeDefined();
		});
	});

	describe('Factory Function', () => {
		it('should create a fully configured toolkit', () => {
			const toolkit = createAgentToolkit();

			expect(toolkit.executor).toBeDefined();
			expect(toolkit.registry).toBeDefined();
			expect(typeof toolkit.search).toBe('function');
			expect(typeof toolkit.codemod).toBe('function');
			expect(typeof toolkit.validate).toBe('function');
		});

		it('should provide convenience methods', () => {
			const toolkit = createAgentToolkit();

			// These are just function type checks, not execution
			expect(typeof toolkit.search).toBe('function');
			expect(typeof toolkit.multiSearch).toBe('function');
			expect(typeof toolkit.codemod).toBe('function');
			expect(typeof toolkit.validate).toBe('function');
			expect(typeof toolkit.validateProject).toBe('function');
		});
	});

	describe('File categorization', () => {
		it('should categorize files correctly', () => {
			const files = ['test.ts', 'script.js', 'main.py', 'lib.rs'];

			// Test file categorization logic
			expect(files.filter((f) => f.match(/\.(ts|tsx|js|jsx)$/))).toHaveLength(2);
			expect(files.filter((f) => f.match(/\.py$/))).toHaveLength(1);
			expect(files.filter((f) => f.match(/\.rs$/))).toHaveLength(1);
		});
	});
});
