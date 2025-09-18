#!/usr/bin/env -S node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globby } from 'globby';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ContextMetadata {
	type: string;
	description: string;
	technologies: string[];
	agentRelevance: string[];
	sourceUrls?: string[];
}

interface McpServerMetadata {
	repository: string;
	description: string;
	capabilities: string[];
	agentRelevance: string[];
	security: {
		riskLevel: string;
		sandboxRequired: boolean;
		permissions: string[];
	};
}

interface ContextLibrary {
	version: string;
	contextSources: Record<string, ContextMetadata>;
	mcpServers?: Record<string, McpServerMetadata>;
	integrationRules: {
		maxContextPerAgent: number;
		maxMcpServersPerAgent?: number;
		priorityOrder: string[];
		mcpPriorityOrder?: string[];
		requiredForAgents: Record<string, string[]>;
		recommendedMcpForAgents?: Record<string, string[]>;
	};
}

async function validateContextLibrary() {
	console.log('🔍 Validating context library...');
	let failed = false;

	// Load context library policy
	const policyPath = resolve(__dirname, '../policy/context-library.json');
	if (!existsSync(policyPath)) {
		console.error(`❌ Context library policy not found: ${policyPath}`);
		return false;
	}

	let contextLibrary: ContextLibrary;
	try {
		const policyContent = readFileSync(policyPath, 'utf-8');
		contextLibrary = JSON.parse(policyContent);
	} catch (error) {
		console.error('❌ Failed to parse context library policy:', error);
		return false;
	}

	// Get context directory and files
	const contextDir = resolve(__dirname, '../context/');
	if (!existsSync(contextDir)) {
		console.error(`❌ Context directory not found: ${contextDir}`);
		return false;
	}

	const contextFiles = await globby([`${contextDir}/**/*.md`, `${contextDir}/**/*.txt`]);
	const relativeContextFiles = contextFiles.map((f) =>
		f.replace(contextDir, '').replace(/^\//, ''),
	);

	// Validate each registered context source
	for (const [filename, metadata] of Object.entries(contextLibrary.contextSources)) {
		const fullPath = resolve(contextDir, filename);

		if (!existsSync(fullPath)) {
			console.error(`❌ Context file not found: ${filename}`);
			failed = true;
			continue;
		}

		try {
			const content = readFileSync(fullPath, 'utf-8');

			// Basic content validation
			if (content.length < 100) {
				console.error(`❌ Context file too short: ${filename} (${content.length} chars)`);
				failed = true;
				continue;
			}

			// Check for required sections
			if (!content.includes('CODE SNIPPETS') && !content.includes('CODE:')) {
				console.warn(`⚠️  Context file may be missing code examples: ${filename}`);
			}

			console.log(`✅ ${filename} - ${metadata.type} (${content.length} chars)`);
		} catch (error) {
			console.error(`❌ Failed to read context file ${filename}: ${error}`);
			failed = true;
		}
	}

	// Validate agent requirements
	const agentTypes = ['assistant', 'developer', 'reviewer', 'planner', 'architect', 'security'];
	for (const [agentType, requiredFiles] of Object.entries(
		contextLibrary.integrationRules.requiredForAgents,
	)) {
		if (!agentTypes.includes(agentType)) {
			console.error(`❌ Unknown agent type in requirements: ${agentType}`);
			failed = true;
			continue;
		}

		for (const filename of requiredFiles) {
			if (!contextLibrary.contextSources[filename]) {
				console.error(`❌ Required context file not defined for ${agentType}: ${filename}`);
				failed = true;
			}
		}
	}

	// Validate MCP servers
	if (contextLibrary.mcpServers) {
		for (const [serverName, config] of Object.entries(contextLibrary.mcpServers)) {
			// Validate repository URL format
			if (!config.repository.startsWith('https://github.com/')) {
				console.error(
					`❌ Invalid repository URL for MCP server ${serverName}: ${config.repository}`,
				);
				failed = true;
			}

			// Validate security level
			const validSecurityLevels = ['low', 'medium', 'high'];
			if (!validSecurityLevels.includes(config.security.riskLevel)) {
				console.error(
					`❌ Invalid security risk level for MCP server ${serverName}: ${config.security.riskLevel}`,
				);
				failed = true;
			}

			// Validate agent relevance
			const validAgentTypes = [
				'assistant',
				'developer',
				'reviewer',
				'planner',
				'architect',
				'security',
			];
			for (const agentType of config.agentRelevance) {
				if (!validAgentTypes.includes(agentType)) {
					console.error(`❌ Invalid agent type in MCP server ${serverName}: ${agentType}`);
					failed = true;
				}
			}

			console.log(
				`✅ MCP Server: ${serverName} - ${config.security.riskLevel} risk, ${config.agentRelevance.length} agent types`,
			);
		}
	}

	// Auto-discover new context files not registered in policy
	const definedFiles = Object.keys(contextLibrary.contextSources);
	const discoveredOnly = relativeContextFiles.filter((f) => !definedFiles.includes(f));

	const autoEntries: Record<string, ContextMetadata> = {};
	for (const filename of discoveredOnly) {
		const fullPath = resolve(contextDir, filename);
		try {
			const content = readFileSync(fullPath, 'utf-8');
			const firstHeaderMatch = content.match(/^#\s+(.+)$/m);
			const title = firstHeaderMatch ? firstHeaderMatch[1].trim() : filename;
			const description = `Auto-discovered context: ${title}`;

			// Minimal sensible defaults; can be refined later
			const inferred: ContextMetadata = {
				type: 'reference',
				description,
				technologies: [],
				agentRelevance: ['assistant'],
			};

			// Basic content validation for discovered files
			if (content.length < 100) {
				console.warn(`⚠️  Discovered file seems very short: ${filename} (${content.length} chars)`);
			}
			if (!content.includes('```') && !content.includes('CODE:')) {
				console.warn(`⚠️  Discovered file may be missing code examples: ${filename}`);
			}

			autoEntries[filename] = inferred;
			console.log(`🆕 ${filename} - discovered (no policy entry) (${content.length} chars)`);
		} catch (error) {
			console.warn(`⚠️  Skipping unreadable discovered file ${filename}: ${error}`);
		}
	}

	// Emit merged registry artifact for runtime consumption
	try {
		const outDir = resolve(__dirname, '../out');
		mkdirSync(outDir, { recursive: true });
		const merged = {
			...contextLibrary,
			contextSources: { ...contextLibrary.contextSources, ...autoEntries },
			_stats: {
				policyDefined: definedFiles.length,
				discovered: Object.keys(autoEntries).length,
				totalOnDisk: relativeContextFiles.length,
			},
		};
		const outPath = join(outDir, 'context-registry.json');
		writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf-8');
		console.log(`📝 Wrote merged context registry: ${outPath}`);
	} catch (e) {
		console.warn(`⚠️  Failed to write merged registry: ${e}`);
	}

	if (failed) {
		console.error('❌ Context library validation failed');
		return false;
	}

	console.log('✅ Context library validation passed');

	const mcpServerCount = contextLibrary.mcpServers
		? Object.keys(contextLibrary.mcpServers).length
		: 0;
	console.log(
		`📊 Summary: ${Object.keys(contextLibrary.contextSources).length} policy-defined, ${relativeContextFiles.length} on disk, ${discoveredOnly.length} auto-discovered, ${mcpServerCount} MCP servers`,
	);

	return true;
}

// Run validation
validateContextLibrary()
	.then((success) => {
		process.exit(success ? 0 : 1);
	})
	.catch((error) => {
		console.error('❌ Validation error:', error);
		process.exit(1);
	});
