/**
 * Tools Registry Module
 *
 * Central tool registration and management extracted
 * from the main index file for better modularity.
 */

import { createAgentToolkitMcpTools } from '@cortex-os/agent-toolkit';
import type { FastMCP } from 'fastmcp';
import type { HybridConfig } from '../config/hybrid.js';
import type { OllamaConfig } from '../config/ollama.js';
import type { PiecesMCPProxy } from '../pieces-proxy.js';
import { BRAND, createBrandedLog } from '../utils/brand.js';
import type { ServerConfig } from '../utils/config.js';
import { registerCodebaseTools } from './codebase-tools.js';
import { registerHybridTools } from './hybrid-tools.js';
import { registerMemoryTools } from './memory-tools.js';
import { registerOllamaChat } from './ollama-chat.js';

type ToolContext = {
	piecesProxy: PiecesMCPProxy | null;
	config: ServerConfig;
	ollama: OllamaConfig;
	hybrid: HybridConfig | null;
};

/**
 * Enable and register agent toolkit tools
 */
function enableAgentToolkit(server: FastMCP, logger: any) {
	const tools = createAgentToolkitMcpTools();
	logger.info(
		createBrandedLog('agent_toolkit_registering', { toolCount: tools.length }),
		'Registering agent-toolkit tools',
	);

	for (const tool of tools) {
		server.addTool({
			name: tool.name,
			description: `${BRAND.prefix} ${tool.description}`,
			parameters: tool.inputSchema as any,
			annotations: {
				readOnlyHint: tool.name.includes('search') || tool.name.includes('codemap'),
				title: `${BRAND.prefix} ${tool.name.replace('agent_toolkit_', '')}`,
			},
			async execute(args) {
				logger.info(
					createBrandedLog('agent_toolkit_executing', { tool: tool.name }),
					'Executing agent toolkit tool',
				);
				const result = await tool.handler(args);
				return result.content?.[0]?.text ?? JSON.stringify(result, null, 2);
			},
		});
	}

	logger.info(createBrandedLog('agent_toolkit_registered'), 'Agent-toolkit tools registered');
}

/**
 * Register all tools with the server
 */
export function registerTools(server: FastMCP, logger: any, context: ToolContext) {
	const { config, piecesProxy, ollama } = context;

	// Register memory tools
	registerMemoryTools(server, logger);

	// Register codebase tools
	registerCodebaseTools(server, logger);

	// Register hybrid tools (Pieces integration)
	registerHybridTools(server, logger, piecesProxy);

	// Register Ollama chat tool when enabled
	if (config.ollamaEnabled) {
		registerOllamaChat(server, logger, ollama);
	} else {
		logger.debug(createBrandedLog('ollama_disabled'), 'Ollama tools disabled');
	}

	// Enable agent toolkit if not disabled
	if (process.env.AGENT_TOOLKIT_ENABLED !== 'false') {
		try {
			enableAgentToolkit(server, logger);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			logger.warn(
				createBrandedLog('agent_toolkit_failed', { error: msg }),
				'Failed to load agent-toolkit tools',
			);
		}
	} else {
		logger.info(createBrandedLog('agent_toolkit_disabled'), 'Agent-toolkit tools disabled');
	}
}

/**
 * Register Pieces proxy tools
 */
export function registerPiecesTools(
	server: FastMCP,
	logger: any,
	piecesProxy: PiecesMCPProxy | null,
) {
	if (!piecesProxy) {
		logger.info(createBrandedLog('pieces_proxy_disabled'), 'Pieces proxy disabled');
		return;
	}

	if (piecesProxy.isConnected()) {
		const remoteTools = piecesProxy.getTools();
		logger.info(
			createBrandedLog('pieces_tools_registering', { toolCount: remoteTools.length }),
			'Registering Pieces tools',
		);

		for (const tool of remoteTools) {
			server.addTool({
				name: `pieces.${tool.name}`,
				description: `[Pieces] ${tool.description}`,
				parameters: tool.inputSchema as any,
				annotations: { readOnlyHint: true, title: `Pieces: ${tool.name}` },
				async execute(args) {
					logger.info(
						createBrandedLog('pieces_tool_executing', { tool: tool.name }),
						'Proxying Pieces tool',
					);
					const result = await piecesProxy.callTool(tool.name, args);
					return JSON.stringify(result, null, 2);
				},
			});
		}
	} else {
		logger.info(
			createBrandedLog('pieces_proxy_unavailable'),
			'Pieces proxy unavailable; skipping remote tools',
		);
	}
}
