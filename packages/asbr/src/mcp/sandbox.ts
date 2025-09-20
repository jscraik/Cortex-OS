/**
 * MCP Tool Sandboxing System
 * Implements security policies and sandboxing for MCP tools
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import pidusage from 'pidusage';
import { PolicyRegistry } from '@cortex-os/asbr-policy';
import { loadMCPAllowlist, loadSecurityPolicies } from '../core/config.js';
import type { MCPAllowlistEntry, SecurityPolicy, SecurityRule } from '../types/index.js';
import { AuthorizationError, ValidationError } from '../types/index.js';
import { getCachePath, getTempPath } from '../xdg/index.js';

export interface SandboxContext {
	toolName: string;
	version: string;
	args: unknown[];
	workingDir: string;
	environment: Record<string, string>;
	timeout: number;
}

export interface SandboxResult {
	success: boolean;
	output?: unknown;
	error?: string;
	duration: number;
	resourceUsage: {
		memory: number;
		cpu: number;
	};
}

/**
 * MCP Tool Sandbox Manager
 */
export class MCPSandbox {
	private allowlist: MCPAllowlistEntry[] = [];
	private policies: SecurityPolicy[] = [];
	private readonly policyRegistry = new PolicyRegistry();
	private runningProcesses = new Map<string, ChildProcess>();
	private idCounter = 0;

	async initialize(): Promise<void> {
		[this.allowlist, this.policies] = await Promise.all([
			loadMCPAllowlist(),
			loadSecurityPolicies(),
		]);

		this.registerSecurityPolicies();
	}

	/**
	 * Check if a tool is allowed to run
	 */
	isToolAllowed(name: string, version: string): boolean {
		const entry = this.allowlist.find((e) => e.name === name);
		if (!entry) {
			return false;
		}

		// Check version match (exact or semver range)
		if (entry.version !== version && entry.version !== '*') {
			return false;
		}

		// Check TTL if specified
		if (entry.ttl) {
			// In a real implementation, check timestamp
			return true;
		}

		return true;
	}

	/**
	 * Get scopes for a tool
	 */
	getToolScopes(name: string): string[] {
		const entry = this.allowlist.find((e) => e.name === name);
		return entry?.scopes || [];
	}

	/**
	 * Execute a tool in a sandboxed environment
	 */
	async executeTool(context: SandboxContext): Promise<SandboxResult> {
		const startTime = Date.now();

		try {
			// Validate tool is allowed
			if (!this.isToolAllowed(context.toolName, context.version)) {
				throw new AuthorizationError(
					`Tool ${context.toolName}@${context.version} not in allowlist`,
				);
			}

			// Apply security policies via registry
			const decision = this.policyRegistry.evaluate({
				kind: 'mcp.tool.execute',
				payload: {
					toolName: context.toolName,
					version: context.version,
					args: context.args,
					workingDir: context.workingDir,
					environment: context.environment,
				},
			});
			if (!decision.allowed) {
				throw new AuthorizationError(
					decision.reason ?? 'Tool execution denied by security policy',
				);
			}

			// Create sandboxed execution environment
			const sandbox = await this.createSandbox(context);

			// Execute the tool
			const result = await this.runInSandbox(sandbox, context);

			return {
				success: true,
				output: result,
				duration: Date.now() - startTime,
				resourceUsage: await this.getResourceUsage(sandbox.processId),
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				duration: Date.now() - startTime,
				resourceUsage: { memory: 0, cpu: 0 },
			};
		}
	}

	/**
	 * Kill a running tool process
	 */
	async killTool(processId: string): Promise<void> {
		const process = this.runningProcesses.get(processId);
		if (process) {
			process.kill('SIGTERM');

			// Force kill after 5 seconds
			setTimeout(() => {
				if (!process.killed) {
					process.kill('SIGKILL');
				}
			}, 5000);

			this.runningProcesses.delete(processId);
		}
	}

	private registerSecurityPolicies(): void {
		for (const policy of this.policies) {
			this.policyRegistry.register(policy.id, {
				id: policy.id,
				description: policy.name,
				evaluate: (context) => this.evaluateSecurityPolicy(policy, context),
			});
			if (!policy.enabled) {
				this.policyRegistry.disable(policy.id);
			}
		}
	}

	private evaluateSecurityPolicy(
		policy: SecurityPolicy,
		context: Parameters<PolicyRegistry['evaluate']>[0],
	): ReturnType<PolicyRegistry['evaluate']> {
		if (context.kind !== 'mcp.tool.execute') {
			return { allowed: true };
		}

		const execution = context.payload as SandboxContext | undefined;
		if (!execution) {
			return { allowed: true };
		}

		for (const rule of policy.rules) {
			const decision = this.evaluateRule(rule, execution);
			if (!decision.allowed) {
				return {
					allowed: false,
					reason: decision.reason ?? `${policy.name} denied tool execution`,
				};
			}
		}

		return { allowed: true };
	}

	private evaluateRule(rule: SecurityRule, context: SandboxContext): {
		allowed: boolean;
		reason?: string;
	} {
		switch (rule.type) {
			case 'shell_deny':
				if (context.args.some((arg) => typeof arg === 'string' && arg.includes('shell'))) {
					return { allowed: false, reason: 'Shell execution denied by security policy' };
				}
				return { allowed: true };

			case 'egress_deny':
				return { allowed: true };

			case 'file_access':
				if (rule.allowlist) {
					const workingDir = context.workingDir;
					const isAllowed = rule.allowlist.some((path) => workingDir.startsWith(path));
					if (!isAllowed) {
						return { allowed: false, reason: `File access denied to ${workingDir}` };
					}
				}
				return { allowed: true };

			case 'api_rate_limit':
				return { allowed: true };
		}

		return { allowed: true };
	}

	private async createSandbox(context: SandboxContext): Promise<{
		processId: string;
		workingDir: string;
		environment: Record<string, string>;
	}> {
		const processId = `sandbox_${Date.now()}_${++this.idCounter}`;
		const sandboxDir = getTempPath(`sandbox_${processId}`);
		await mkdir(sandboxDir, { recursive: true });
		const nodeDir = dirname(process.execPath);

		// Create isolated environment
		const environment = {
			// Strip most environment variables for security
			PATH: `${nodeDir}:/root/.nvm/versions/node/${process.version}/bin:/usr/local/bin:/usr/bin:/bin`,
			HOME: sandboxDir,
			TMPDIR: sandboxDir,
			...this.getSafeEnvironmentVariables(context.environment),
		};

		return {
			processId,
			workingDir: sandboxDir,
			environment,
		};
	}

	private async runInSandbox(
		sandbox: {
			processId: string;
			workingDir: string;
			environment: Record<string, string>;
		},
		context: SandboxContext,
	): Promise<unknown> {
		return new Promise((resolve, reject) => {
			const cgexecPath = '/usr/bin/cgexec';
			const useCgroup = existsSync(cgexecPath);
			const baseCmd = context.toolName === 'node' ? process.execPath : context.toolName;
			const command = useCgroup ? cgexecPath : baseCmd;
			const args = useCgroup
				? ['-g', 'cpu,memory:cortex-sandbox', baseCmd, ...(context.args as string[])]
				: (context.args as string[]);

			const child = spawn(command, args, {
				cwd: sandbox.workingDir,
				env: sandbox.environment,
				uid: 65534,
				gid: 65534,
				stdio: ['ignore', 'pipe', 'pipe'],
			});

			if (!child.pid) {
				reject(new Error('Failed to start process'));
				return;
			}

			sandbox.processId = String(child.pid);
			this.runningProcesses.set(sandbox.processId, child);

			let stdout = '';
			let stderr = '';
			child.stdout?.on('data', (chunk) => {
				stdout += chunk.toString();
			});
			child.stderr?.on('data', (chunk) => {
				stderr += chunk.toString();
			});

			const timeout = setTimeout(() => {
				child.kill('SIGTERM');
			}, context.timeout);

			child.on('error', (err) => {
				clearTimeout(timeout);
				this.runningProcesses.delete(sandbox.processId);
				reject(err);
			});

			child.on('close', (code) => {
				clearTimeout(timeout);
				this.runningProcesses.delete(sandbox.processId);
				if (code === 0) {
					resolve(stdout.trim());
				} else {
					reject(new Error(stderr.trim() || `Process exited with code ${code}`));
				}
			});
		});
	}

	private async getResourceUsage(processId: string): Promise<{ memory: number; cpu: number }> {
		try {
			const stats = await pidusage(parseInt(processId, 10));
			return {
				memory: stats.memory / 1024 / 1024,
				cpu: stats.cpu,
			};
		} catch {
			return { memory: 0, cpu: 0 };
		}
	}

	private getSafeEnvironmentVariables(env: Record<string, string>): Record<string, string> {
		// Only allow safe environment variables
		const safeKeys = ['LANG', 'LC_ALL', 'TZ'];
		const safeEnv: Record<string, string> = {};

		for (const key of safeKeys) {
			if (env[key]) {
				safeEnv[key] = env[key];
			}
		}

		return safeEnv;
	}
}

/**
 * MCP Tool Registry with allowlist enforcement
 */
export class MCPToolRegistry {
	private sandbox: MCPSandbox;
	private tools = new Map<string, MCPToolInfo>();

	constructor() {
		this.sandbox = new MCPSandbox();
	}

	async initialize(): Promise<void> {
		await this.sandbox.initialize();
		await this.loadAllowedTools();
	}

	/**
	 * Register a tool if it's in the allowlist
	 */
	async registerTool(tool: MCPToolInfo): Promise<boolean> {
		if (!this.sandbox.isToolAllowed(tool.name, tool.version)) {
			return false;
		}

		this.tools.set(tool.name, tool);
		return true;
	}

	/**
	 * Execute a tool with sandboxing
	 */
	async executeTool(name: string, args: unknown[]): Promise<SandboxResult> {
		const tool = this.tools.get(name);
		if (!tool) {
			throw new ValidationError(`Tool ${name} not found`);
		}

		const context: SandboxContext = {
			toolName: tool.name,
			version: tool.version,
			args,
			workingDir: getCachePath('tools', tool.name),
			environment: {},
			timeout: 30000, // 30 seconds
		};

		return await this.sandbox.executeTool(context);
	}

	/**
	 * List available tools
	 */
	getAvailableTools(): MCPToolInfo[] {
		return Array.from(this.tools.values());
	}

	private async loadAllowedTools(): Promise<void> {
		// In a real implementation, this would:
		// 1. Scan for installed MCP tools
		// 2. Validate versions against allowlist
		// 3. Load tool definitions
		// 4. Register allowed tools

		// For now, simulate some tools
		const simulatedTools: MCPToolInfo[] = [
			{
				name: 'filesystem',
				version: '1.0.0',
				description: 'File system operations',
				schema: {},
			},
			{
				name: 'web-search',
				version: '2.1.0',
				description: 'Web search capabilities',
				schema: {},
			},
		];

		for (const tool of simulatedTools) {
			await this.registerTool(tool);
		}
	}
}

export interface MCPToolInfo {
	name: string;
	version: string;
	description: string;
	schema: unknown;
}
