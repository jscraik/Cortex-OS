/**
 * Context-Aware Command Processing - Copilot-inspired intelligence
 * Analyzes repository context to provide smarter command responses
 */

import * as path from 'node:path';
import * as fs from 'fs-extra';

export interface RepositoryContext {
	framework: string;
	language: string;
	packageManager: string;
	hasTests: boolean;
	hasTypeScript: boolean;
	projectType: 'frontend' | 'backend' | 'fullstack' | 'library' | 'unknown';
	buildTool?: string;
	dependencies: string[];
	devDependencies: string[];
}

export interface CommandContext {
	repository: RepositoryContext;
	pullRequest?: PRContext;
	changedFiles: string[];
	commandType: 'analyze' | 'fix' | 'scaffold' | 'help';
	targetArea: 'frontend' | 'backend' | 'general';
}

export interface PRContext {
	number: number;
	title: string;
	body: string;
	base: string;
	head: string;
	labels: string[];
}

export class ContextAnalyzer {
	/**
	 * Analyze repository context from file system
	 */
	async analyzeRepository(repoPath: string): Promise<RepositoryContext> {
		const packageJsonPath = path.join(repoPath, 'package.json');
		const pyprojectPath = path.join(repoPath, 'pyproject.toml');
		const cargoPath = path.join(repoPath, 'Cargo.toml');
		const goModPath = path.join(repoPath, 'go.mod');

		// JavaScript/TypeScript ecosystem
		if (await fs.pathExists(packageJsonPath)) {
			return await this.analyzeJavaScriptProject(repoPath, packageJsonPath);
		}

		// Python ecosystem
		if (await fs.pathExists(pyprojectPath)) {
			return await this.analyzePythonProject(repoPath, pyprojectPath);
		}

		// Rust ecosystem
		if (await fs.pathExists(cargoPath)) {
			return await this.analyzeRustProject(repoPath, cargoPath);
		}

		// Go ecosystem
		if (await fs.pathExists(goModPath)) {
			return await this.analyzeGoProject(repoPath, goModPath);
		}

		// Default unknown context
		return {
			framework: 'unknown',
			language: 'unknown',
			packageManager: 'unknown',
			hasTests: false,
			hasTypeScript: false,
			projectType: 'unknown',
			dependencies: [],
			devDependencies: [],
		};
	}

	private async analyzeJavaScriptProject(
		repoPath: string,
		packageJsonPath: string,
	): Promise<RepositoryContext> {
		const packageJson = await fs.readJson(packageJsonPath);
		const dependencies = Object.keys(packageJson.dependencies || {});
		const devDependencies = Object.keys(packageJson.devDependencies || {});

		// Detect package manager
		const packageManager = await this.detectPackageManager(repoPath);

		// Detect framework
		const framework = this.detectJavaScriptFramework(
			dependencies,
			devDependencies,
		);

		// Detect TypeScript
		const hasTypeScript =
			(await fs.pathExists(path.join(repoPath, 'tsconfig.json'))) ||
			devDependencies.includes('typescript') ||
			dependencies.includes('typescript');

		// Detect tests
		const hasTests = await this.detectTests(repoPath, [
			'test',
			'tests',
			'__tests__',
			'spec',
			'cypress',
			'playwright',
		]);

		// Determine project type
		const projectType = this.determineProjectType(
			dependencies,
			devDependencies,
			framework,
		);

		// Detect build tool
		const buildTool = this.detectBuildTool(
			dependencies,
			devDependencies,
			packageJson.scripts,
		);

		return {
			framework,
			language: hasTypeScript ? 'typescript' : 'javascript',
			packageManager,
			hasTests,
			hasTypeScript,
			projectType,
			buildTool,
			dependencies,
			devDependencies,
		};
	}

	private async analyzePythonProject(
		repoPath: string,
		_pyprojectPath: string,
	): Promise<RepositoryContext> {
		// Basic Python project analysis
		const hasTests = await this.detectTests(repoPath, [
			'tests',
			'test',
			'spec',
		]);

		return {
			framework: 'python',
			language: 'python',
			packageManager: 'pip',
			hasTests,
			hasTypeScript: false,
			projectType: 'backend',
			dependencies: [],
			devDependencies: [],
		};
	}

	private async analyzeRustProject(
		repoPath: string,
		_cargoPath: string,
	): Promise<RepositoryContext> {
		const hasTests = await this.detectTests(repoPath, ['tests']);

		return {
			framework: 'rust',
			language: 'rust',
			packageManager: 'cargo',
			hasTests,
			hasTypeScript: false,
			projectType: 'backend',
			dependencies: [],
			devDependencies: [],
		};
	}

	private async analyzeGoProject(
		repoPath: string,
		_goModPath: string,
	): Promise<RepositoryContext> {
		const hasTests = await this.detectTests(repoPath, ['tests']);

		return {
			framework: 'go',
			language: 'go',
			packageManager: 'go mod',
			hasTests,
			hasTypeScript: false,
			projectType: 'backend',
			dependencies: [],
			devDependencies: [],
		};
	}

	private async detectPackageManager(repoPath: string): Promise<string> {
		if (await fs.pathExists(path.join(repoPath, 'pnpm-lock.yaml')))
			return 'pnpm';
		if (await fs.pathExists(path.join(repoPath, 'yarn.lock'))) return 'yarn';
		if (await fs.pathExists(path.join(repoPath, 'package-lock.json')))
			return 'npm';
		if (await fs.pathExists(path.join(repoPath, 'bun.lockb'))) return 'bun';
		return 'npm'; // default
	}

	private detectJavaScriptFramework(
		dependencies: string[],
		devDependencies: string[],
	): string {
		const allDeps = [...dependencies, ...devDependencies];

		// React ecosystem
		if (allDeps.includes('react')) {
			if (allDeps.includes('next')) return 'next.js';
			if (allDeps.includes('gatsby')) return 'gatsby';
			if (allDeps.includes('remix')) return 'remix';
			return 'react';
		}

		// Vue ecosystem
		if (allDeps.includes('vue')) {
			if (allDeps.includes('nuxt')) return 'nuxt.js';
			return 'vue';
		}

		// Angular
		if (allDeps.includes('@angular/core')) return 'angular';

		// Svelte
		if (allDeps.includes('svelte')) {
			if (allDeps.includes('sveltekit')) return 'sveltekit';
			return 'svelte';
		}

		// Backend frameworks
		if (allDeps.includes('express')) return 'express';
		if (allDeps.includes('fastify')) return 'fastify';
		if (allDeps.includes('koa')) return 'koa';
		if (allDeps.includes('nestjs')) return 'nestjs';

		return 'vanilla';
	}

	private async detectTests(
		repoPath: string,
		testDirs: string[],
	): Promise<boolean> {
		for (const testDir of testDirs) {
			const testPath = path.join(repoPath, testDir);
			if (await fs.pathExists(testPath)) {
				return true;
			}
		}

		// Check for test files in src directory
		const srcPath = path.join(repoPath, 'src');
		if (await fs.pathExists(srcPath)) {
			const files = await fs.readdir(srcPath, { recursive: true });
			return files.some(
				(file) =>
					typeof file === 'string' &&
					(file.includes('.test.') ||
						file.includes('.spec.') ||
						file.includes('__tests__')),
			);
		}

		return false;
	}

	private determineProjectType(
		dependencies: string[],
		devDependencies: string[],
		framework: string,
	): 'frontend' | 'backend' | 'fullstack' | 'library' | 'unknown' {
		const allDeps = [...dependencies, ...devDependencies];

		// Frontend frameworks
		const frontendFrameworks = [
			'react',
			'vue',
			'angular',
			'svelte',
			'next.js',
			'nuxt.js',
			'gatsby',
			'remix',
		];
		const hasFrontend = frontendFrameworks.includes(framework);

		// Backend frameworks/tools
		const backendDeps = [
			'express',
			'fastify',
			'koa',
			'nestjs',
			'prisma',
			'sequelize',
			'mongoose',
		];
		const hasBackend = backendDeps.some((dep) => allDeps.includes(dep));

		// Library indicators
		const isLibrary =
			allDeps.includes('rollup') ||
			allDeps.includes('microbundle') ||
			allDeps.includes('tsdx') ||
			(devDependencies.includes('typescript') && !hasFrontend && !hasBackend);

		if (hasFrontend && hasBackend) return 'fullstack';
		if (hasFrontend) return 'frontend';
		if (hasBackend) return 'backend';
		if (isLibrary) return 'library';
		return 'unknown';
	}

	private detectBuildTool(
		dependencies: string[],
		devDependencies: string[],
		scripts: Record<string, string> = {},
	): string | undefined {
		const allDeps = [...dependencies, ...devDependencies];

		if (allDeps.includes('vite') || scripts.dev?.includes('vite'))
			return 'vite';
		if (allDeps.includes('webpack') || scripts.build?.includes('webpack'))
			return 'webpack';
		if (allDeps.includes('rollup') || scripts.build?.includes('rollup'))
			return 'rollup';
		if (allDeps.includes('parcel') || scripts.build?.includes('parcel'))
			return 'parcel';
		if (allDeps.includes('esbuild') || scripts.build?.includes('esbuild'))
			return 'esbuild';
		if (allDeps.includes('turbo') || scripts.build?.includes('turbo'))
			return 'turbo';

		return undefined;
	}

	/**
	 * Build command context from GitHub payload and repository analysis
	 */
	async buildCommandContext(
		payload: any,
		repoPath: string,
		commandType: 'analyze' | 'fix' | 'scaffold' | 'help' = 'analyze',
		targetArea: 'frontend' | 'backend' | 'general' = 'general',
	): Promise<CommandContext> {
		const repository = await this.analyzeRepository(repoPath);

		// Extract changed files from PR
		const changedFiles: string[] = [];
		if (payload.pull_request) {
			// This would be populated by the caller with actual PR file changes
		}

		// Build PR context
		let pullRequest: PRContext | undefined;
		if (payload.pull_request) {
			pullRequest = {
				number: payload.pull_request.number,
				title: payload.pull_request.title,
				body: payload.pull_request.body || '',
				base: payload.pull_request.base.ref,
				head: payload.pull_request.head.ref,
				labels:
					payload.pull_request.labels?.map((label: any) => label.name) || [],
			};
		}

		return {
			repository,
			pullRequest,
			changedFiles,
			commandType,
			targetArea,
		};
	}

	/**
	 * Generate context-aware response based on repository analysis
	 */
	generateContextAwareResponse(context: CommandContext, user: string): string {
		const { repository, commandType, targetArea } = context;

		let response = `@${user} **Context-Aware ${targetArea.toUpperCase()} ${commandType.toUpperCase()}**\n\n`;

		// Repository intelligence
		response += `🏗️ **Repository Context:**\n`;
		response += `- **Framework**: ${repository.framework}\n`;
		response += `- **Language**: ${repository.language}\n`;
		response += `- **Type**: ${repository.projectType}\n`;
		response += `- **Package Manager**: ${repository.packageManager}\n`;

		if (repository.buildTool) {
			response += `- **Build Tool**: ${repository.buildTool}\n`;
		}

		response += `- **Tests**: ${repository.hasTests ? '✅ Available' : '❌ Not detected'}\n\n`;

		// Context-specific suggestions
		response += `💡 **Smart Suggestions:**\n`;

		if (commandType === 'analyze') {
			response += this.generateAnalysisContextSuggestions(
				repository,
				targetArea,
			);
		} else if (commandType === 'fix') {
			response += this.generateFixContextSuggestions(repository, targetArea);
		} else if (commandType === 'scaffold') {
			response += this.generateScaffoldContextSuggestions(
				repository,
				targetArea,
			);
		}

		return response;
	}

	private generateAnalysisContextSuggestions(
		repository: RepositoryContext,
		targetArea: string,
	): string {
		let suggestions = '';

		if (targetArea === 'frontend' || repository.projectType === 'frontend') {
			if (repository.framework === 'react') {
				suggestions += `- Analyzing React component structure and hooks\n`;
				suggestions += `- Checking for proper component composition\n`;
				suggestions += `- Validating state management patterns\n`;
			} else if (repository.framework === 'vue') {
				suggestions += `- Analyzing Vue component composition\n`;
				suggestions += `- Checking for proper reactivity patterns\n`;
				suggestions += `- Validating template structure\n`;
			} else if (repository.framework === 'angular') {
				suggestions += `- Analyzing Angular component architecture\n`;
				suggestions += `- Checking for proper service injection\n`;
				suggestions += `- Validating module structure\n`;
			}

			if (repository.hasTypeScript) {
				suggestions += `- Enhanced TypeScript analysis available\n`;
			}
		}

		if (targetArea === 'backend' || repository.projectType === 'backend') {
			if (repository.framework === 'express') {
				suggestions += `- Analyzing Express.js route structure\n`;
				suggestions += `- Checking middleware organization\n`;
				suggestions += `- Validating API design patterns\n`;
			} else if (repository.framework === 'nestjs') {
				suggestions += `- Analyzing NestJS module structure\n`;
				suggestions += `- Checking decorator usage\n`;
				suggestions += `- Validating dependency injection\n`;
			}

			if (repository.dependencies.includes('prisma')) {
				suggestions += `- Prisma schema analysis available\n`;
			}
		}

		if (!repository.hasTests) {
			suggestions += `- ⚠️ No tests detected - consider adding test coverage\n`;
		}

		return suggestions || '- Standard analysis patterns will be applied\n';
	}

	private generateFixContextSuggestions(
		repository: RepositoryContext,
		targetArea: string,
	): string {
		let suggestions = '';

		if (repository.projectType === 'frontend' || targetArea === 'frontend') {
			suggestions += `- Component naming convention fixes\n`;
			suggestions += `- Hook dependency optimization\n`;
			suggestions += `- Import statement organization\n`;

			if (repository.framework === 'react') {
				suggestions += `- React-specific linting fixes\n`;
			}
		}

		if (repository.projectType === 'backend' || targetArea === 'backend') {
			suggestions += `- API route organization\n`;
			suggestions += `- Error handling improvements\n`;
			suggestions += `- Security best practices\n`;
		}

		if (repository.hasTypeScript) {
			suggestions += `- TypeScript type safety improvements\n`;
			suggestions += `- Interface optimization\n`;
		}

		return suggestions || '- General code quality improvements\n';
	}

	private generateScaffoldContextSuggestions(
		repository: RepositoryContext,
		targetArea: string,
	): string {
		let suggestions = '';

		if (repository.framework === 'react' && targetArea === 'frontend') {
			suggestions += `- React component templates\n`;
			suggestions += `- Custom hook generators\n`;
			suggestions += `- Page structure scaffolds\n`;
		} else if (repository.framework === 'vue' && targetArea === 'frontend') {
			suggestions += `- Vue component templates\n`;
			suggestions += `- Composable generators\n`;
			suggestions += `- Page scaffolds\n`;
		} else if (repository.framework === 'express' && targetArea === 'backend') {
			suggestions += `- Express route templates\n`;
			suggestions += `- Middleware generators\n`;
			suggestions += `- API endpoint scaffolds\n`;
		}

		if (repository.hasTypeScript) {
			suggestions += `- TypeScript-first templates\n`;
		}

		if (!repository.hasTests) {
			suggestions += `- Test suite scaffolding available\n`;
		}

		return suggestions || '- Basic project templates available\n';
	}
}
