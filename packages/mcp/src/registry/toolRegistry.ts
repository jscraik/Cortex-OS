import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { gt, lt, maxSatisfying, valid } from 'semver';
import { MCPToolVersionException } from '../errors.js';
import type { Server } from '../server.js';

/**
 * Tool version constraint string (e.g., "^1.0.0", "~2.1.0", "1.2.3")
 */
export type VersionConstraint = string;

/**
 * Tool descriptor with version information
 */
export interface ToolDescriptor {
	name: string;
	version?: string;
	description?: string;
	inputSchema: any;
	handler?: (args: any, context?: any) => Promise<any>;
	metadata?: {
		author?: string;
		tags?: string[];
		deprecationMessage?: string;
		securityLevel?: 'low' | 'medium' | 'high';
	};
}

/**
 * Tool contract definition (loaded from .tool.json files)
 */
export interface ToolContract {
	name: string;
	version?: string;
	description?: string;
	inputSchema: any;
	metadata?: ToolDescriptor['metadata'];
}

/**
 * Versioned tool registry with SemVer constraint resolution
 */
export class VersionedToolRegistry {
	private tools = new Map<string, Map<string, ToolDescriptor>>();
	private server: Server;

	constructor(server: Server) {
		this.server = server;
	}

	/**
	 * Load tools from a directory path
	 */
	async loadFromDirectory(toolsPath: string): Promise<void> {
		try {
			const files = readdirSync(toolsPath);
			const toolFiles = files.filter((file) => extname(file) === '.json');

			this.logStructured('loading_tools_from_directory', {
				path: toolsPath,
				fileCount: toolFiles.length,
			});

			for (const file of toolFiles) {
				const filePath = join(toolsPath, file);
				await this.loadToolFromFile(filePath);
			}

			this.logStructured('tools_loaded', {
				totalTools: this.tools.size,
				totalVersions: Array.from(this.tools.values()).reduce(
					(sum, versions) => sum + versions.size,
					0,
				),
			});
		} catch (error) {
			this.logError('failed_to_load_tools_directory', error as Error, { toolsPath });
		}
	}

	/**
	 * Load a single tool from a JSON file
	 */
	async loadToolFromFile(filePath: string): Promise<void> {
		try {
			const content = readFileSync(filePath, 'utf8');
			const contract: ToolContract = JSON.parse(content);

			if (!this.validateToolContract(contract)) {
				throw new Error(`Invalid tool contract in ${filePath}`);
			}

			const descriptor: ToolDescriptor = {
				name: contract.name,
				version: contract.version,
				description: contract.description,
				inputSchema: contract.inputSchema,
				metadata: contract.metadata,
			};

			this.registerTool(descriptor);

			this.logStructured('tool_loaded', {
				name: contract.name,
				version: contract.version,
				filePath,
			});
		} catch (error) {
			this.logError('failed_to_load_tool_file', error as Error, { filePath });
		}
	}

	/**
	 * Register a tool descriptor in the registry
	 */
	registerTool(descriptor: ToolDescriptor): void {
		if (!descriptor.name) {
			throw new MCPToolVersionException('Tool name is required', 'INVALID_TOOL_VERSION');
		}

		if (descriptor.version && !valid(descriptor.version)) {
			throw new MCPToolVersionException(
				`Invalid semantic version: ${descriptor.version}`,
				'INVALID_TOOL_VERSION',
			);
		}

		// Initialize versions map for this tool name if it doesn't exist
		if (!this.tools.has(descriptor.name)) {
			this.tools.set(descriptor.name, new Map());
		}

		const versions = this.tools.get(descriptor.name)!;

		// Register the version
		if (descriptor.version) {
			versions.set(descriptor.version, descriptor);
		} else {
			// For tools without versions, use a special key
			versions.set('unversioned', descriptor);
		}

		// Register with the underlying MCP server
		this.server.registerTool({
			name: descriptor.version ? `${descriptor.name}@${descriptor.version}` : descriptor.name,
			description: descriptor.description,
			inputSchema: descriptor.inputSchema,
			handler: descriptor.handler || this.createDefaultHandler(descriptor),
		});

		this.logStructured('tool_registered', {
			name: descriptor.name,
			version: descriptor.version,
			totalVersions: versions.size,
		});
	}

	/**
	 * List all available tools
	 */
	listTools(): ToolDescriptor[] {
		const allTools: ToolDescriptor[] = [];

		for (const [_name, versions] of this.tools) {
			for (const [_version, descriptor] of versions) {
				allTools.push({ ...descriptor });
			}
		}

		return allTools;
	}

	/**
	 * Resolve a tool with version constraints
	 */
	resolveTool(name: string, constraint?: VersionConstraint): ToolDescriptor | null {
		const versions = this.tools.get(name);
		if (!versions || versions.size === 0) {
			return null;
		}

		// If no constraint specified, return the latest stable version
		if (!constraint) {
			return this.getLatestVersion(name, versions);
		}

		// If constraint is exact version, return it directly
		if (valid(constraint) && versions.has(constraint)) {
			return versions.get(constraint)!;
		}

		// Find the latest version that satisfies the constraint
		const availableVersions = Array.from(versions.keys()).filter(
			(v) => v !== 'unversioned' && valid(v),
		);
		const satisfyingVersion = maxSatisfying(availableVersions, constraint);

		if (satisfyingVersion) {
			return versions.get(satisfyingVersion)!;
		}

		// Check for unversioned tool if no version satisfies constraint
		if (versions.has('unversioned')) {
			return versions.get('unversioned')!;
		}

		return null;
	}

	/**
	 * Get the latest stable version of a tool
	 */
	private getLatestVersion(_name: string, versions: Map<string, ToolDescriptor>): ToolDescriptor {
		const versionedTools = Array.from(versions.entries())
			.filter(([version]) => version !== 'unversioned' && valid(version))
			.sort(([a], [b]) => {
				// Sort by semantic version in descending order
				if (gt(a, b)) return -1;
				if (lt(a, b)) return 1;
				return 0;
			});

		// Return the latest version if available
		if (versionedTools.length > 0) {
			return versionedTools[0][1];
		}

		// Fall back to unversioned tool
		return versions.get('unversioned')!;
	}

	/**
	 * Validate tool contract structure
	 */
	private validateToolContract(contract: any): contract is ToolContract {
		return (
			typeof contract === 'object' &&
			contract !== null &&
			typeof contract.name === 'string' &&
			contract.name.length > 0 &&
			(!contract.version || typeof contract.version === 'string') &&
			typeof contract.inputSchema === 'object' &&
			contract.inputSchema !== null
		);
	}

	/**
	 * Create a default handler for tools without explicit handlers
	 */
	private createDefaultHandler(
		descriptor: ToolDescriptor,
	): (args: any, context?: any) => Promise<any> {
		return async (args: any, _context?: any) => {
			return {
				content: [
					{
						type: 'text',
						text: `[brAInwav] Tool ${descriptor.name}${descriptor.version ? `@${descriptor.version}` : ''} executed with args: ${JSON.stringify(args)}`,
					},
				],
			};
		};
	}

	/**
	 * Check if a tool version constraint is satisfiable
	 */
	isConstraintSatisfiable(name: string, constraint: VersionConstraint): boolean {
		const versions = this.tools.get(name);
		if (!versions || versions.size === 0) {
			return false;
		}

		const availableVersions = Array.from(versions.keys()).filter(
			(v) => v !== 'unversioned' && valid(v),
		);

		if (availableVersions.length === 0) {
			// Only unversioned tool available
			return true;
		}

		return maxSatisfying(availableVersions, constraint) !== null;
	}

	/**
	 * Get all versions of a tool
	 */
	getToolVersions(name: string): string[] {
		const versions = this.tools.get(name);
		if (!versions) {
			return [];
		}

		return Array.from(versions.keys())
			.filter((v) => v !== 'unversioned')
			.sort((a, b) => {
				if (gt(a, b)) return -1;
				if (lt(a, b)) return 1;
				return 0;
			});
	}

	/**
	 * Remove a tool version
	 */
	removeTool(name: string, version?: string): boolean {
		const versions = this.tools.get(name);
		if (!versions) {
			return false;
		}

		const versionToRemove = version || 'unversioned';
		const removed = versions.delete(versionToRemove);

		if (versions.size === 0) {
			this.tools.delete(name);
		}

		if (removed) {
			this.logStructured('tool_removed', {
				name,
				version: versionToRemove,
			});
		}

		return removed;
	}

	/**
	 * Get registry statistics
	 */
	getStats(): {
		totalTools: number;
		totalVersions: number;
		toolsWithVersions: number;
		unversionedTools: number;
	} {
		const totalTools = this.tools.size;
		let totalVersions = 0;
		let toolsWithVersions = 0;
		let unversionedTools = 0;

		for (const versions of this.tools.values()) {
			totalVersions += versions.size;
			const hasVersioned = Array.from(versions.keys()).some((v) => v !== 'unversioned');
			if (hasVersioned) {
				toolsWithVersions++;
			}
			if (versions.has('unversioned')) {
				unversionedTools++;
			}
		}

		return {
			totalTools,
			totalVersions,
			toolsWithVersions,
			unversionedTools,
		};
	}

	/**
	 * Log structured events with brAInwav branding
	 */
	private logStructured(event: string, data: any): void {
		const logEntry = {
			timestamp: new Date().toISOString(),
			event,
			brand: 'brAInwav',
			service: 'cortex-os-mcp-tool-registry',
			...data,
		};

		console.log(JSON.stringify(logEntry));
	}

	/**
	 * Log errors
	 */
	private logError(event: string, error: Error, context?: any): void {
		this.logStructured(event, {
			error: error.message,
			stack: error.stack,
			...context,
		});
	}
}

/**
 * Factory function to create a versioned tool registry
 */
export function createVersionedToolRegistry(server: Server): VersionedToolRegistry {
	return new VersionedToolRegistry(server);
}
