import type { ClientType, InstallCommand, ServerManifest } from '../types.js';

function shellEscape(value: string): string {
	return JSON.stringify(value);
}

export function generateCommands(server: ServerManifest): InstallCommand[] {
	const commands: InstallCommand[] = [];
	const claude = generateClaudeCommand(server);
	if (claude) commands.push(claude);
	const cursor = generateCursorCommand(server);
	if (cursor) commands.push(cursor);
	commands.push(generateJsonCommand(server));
	return commands;
}

export function generateCommand(server: ServerManifest, client: ClientType): InstallCommand | null {
	switch (client) {
		case 'claude':
			return generateClaudeCommand(server);
		case 'json':
			return generateJsonCommand(server);
		case 'cursor':
			return generateCursorCommand(server);
		case 'cortex-mcp':
			// Mirror cursor behavior for cortex-mcp but prefer explicit 'cortex-mcp' install string
			return generateCortexMcpCommand(server);
		default:
			return null;
	}
}

function generateCursorCommand(server: ServerManifest): InstallCommand | null {
	// If the manifest provides an explicit cursor install string, use it.
	if (server.install?.cursor) {
		return {
			client: 'cursor',
			command: server.install.cursor,
			description: 'Cursor MCP CLI install string',
		};
	}

	// Otherwise, derive a sensible cursor command from streamableHttp transport if available
	if (server.transport?.streamableHttp) {
		const cfg = server.transport.streamableHttp;
		let cmd = `cursor mcp add --transport streamableHttp ${shellEscape(server.id)} ${shellEscape(cfg.url)}`;
		if (cfg.headers) {
			for (const [key, value] of Object.entries(cfg.headers)) {
				cmd += ` --header ${shellEscape(`${key}: ${value}`)}`;
			}
		}
		return {
			client: 'cursor',
			command: cmd,
			description: 'Cursor with remote server (Streamable HTTP)',
		};
	}

	return null;
}

function generateCortexMcpCommand(server: ServerManifest): InstallCommand | null {
	// If the manifest provides an explicit cortex-mcp install string, use it.
	// Otherwise, fall back to the legacy cursor behavior where applicable.
	if (server.install?.['cortex-mcp']) {
		return {
			client: 'cortex-mcp',
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			command: (server.install as any)['cortex-mcp'],
			description: 'cortex-mcp CLI install string',
		};
	}

	const legacy = generateCursorCommand(server);
	if (legacy) {
		// Adapt legacy cursor entry to cortex-mcp client label
		return { client: 'cortex-mcp', command: legacy.command, description: legacy.description };
	}

	return null;
}

function generateClaudeCommand(server: ServerManifest): InstallCommand | null {
	if (!server.transport.streamableHttp) return null;
	return {
		client: 'claude',
		command: buildClaudeHttpCommand(server),
		description: 'Claude Code with remote server (Streamable HTTP)',
	};
}

function buildClaudeHttpCommand(server: ServerManifest): string {
	if (!server.transport.streamableHttp) {
		throw new Error('Server does not support Streamable HTTP transport');
	}
	const config = server.transport.streamableHttp;
	let command = `claude mcp add --transport streamableHttp ${shellEscape(server.id)} ${shellEscape(config.url)}`;
	if (config.headers) {
		for (const [key, value] of Object.entries(config.headers)) {
			command += ` --header ${shellEscape(`${key}: ${value}`)}`;
		}
	}
	if (config.auth && config.auth.type !== 'none') {
		switch (config.auth.type) {
			case 'bearer':
				command += ` --header ${shellEscape('Authorization: Bearer <YOUR_TOKEN>')}`;
				break;
			case 'oauth2':
				if (config.auth.clientId) {
					command += ` --oauth2-client-id ${shellEscape(config.auth.clientId)}`;
				}
				if (config.auth.scopes) {
					command += ` --oauth2-scopes ${shellEscape(config.auth.scopes.join(' '))}`;
				}
				break;
		}
	}
	return command;
}

function generateJsonCommand(server: ServerManifest): InstallCommand {
	type MCPServersConfig = {
		mcpServers: {
			[id: string]: {
				serverUrl: string;
				headers: Record<string, string>;
			};
		};
	};
	const config: MCPServersConfig = {
		mcpServers: {
			[server.id]: {
				serverUrl: server.transport.streamableHttp.url,
				headers: server.transport.streamableHttp.headers || {},
			},
		},
	};
	return {
		client: 'json',
		command: JSON.stringify(config, null, 2),
		description: 'JSON configuration for direct config file usage',
	};
}

export function generateInstructions(server: ServerManifest, client: ClientType): string {
	const command = generateCommand(server, client);
	if (!command) {
		return `Installation not available for ${client}`;
	}
	let instructions = `## Install ${server.name} for ${client}\n\n`;
	instructions += `${server.description}\n\n`;
	instructions += `**Capabilities:** ${formatCapabilities(server)}\n`;
	instructions += `**Risk Level:** ${server.security.riskLevel}\n`;
	instructions += `**Publisher:** ${server.publisher.name}${server.publisher.verified ? ' ✓' : ''}\n\n`;
	instructions += `### Installation Command\n\n`;
	instructions += `\`\`\`bash\n${command.command}\n\`\`\`\n\n`;
	if (
		server.transport.streamableHttp.auth?.type &&
		server.transport.streamableHttp.auth.type !== 'none'
	) {
		instructions += `### Authentication Setup\n\n`;
		instructions += `This server requires authentication. `;
		if (server.transport.streamableHttp.auth.type === 'bearer') {
			instructions += `Replace \`<YOUR_TOKEN>\` with your API token.\n\n`;
		} else if (server.transport.streamableHttp.auth.type === 'oauth2') {
			instructions += `OAuth2 flow will be initiated during first connection.\n\n`;
		}
	}
	if (server.permissions.length > 0) {
		instructions += `### Permissions Required\n\n`;
		for (const permission of server.permissions) {
			instructions += `- \`${permission}\`\n`;
		}
		instructions += `\n`;
	}
	return instructions;
}

function formatCapabilities(server: ServerManifest): string {
	const caps = [] as string[];
	if (server.capabilities.tools) caps.push('Tools');
	if (server.capabilities.resources) caps.push('Resources');
	if (server.capabilities.prompts) caps.push('Prompts');
	return caps.join(', ') || 'None';
}
