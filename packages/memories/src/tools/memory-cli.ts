#!/usr/bin/env node

import {
	ContextRetrievalService,
	// GeminiEmbeddingProvider removed from CLI to avoid depending on Gemini keys
	IndexingService,
	type MemoryEntry,
	MemoryService,
	MockEmbeddingProvider,
	Neo4jProvider,
	QdrantProvider,
} from '../packages/memory/index';

interface CLIOptions {
	command: 'init' | 'index' | 'search' | 'stats' | 'demo';
	path?: string;
	query?: string;
	type?: string;
	source?: string;
	limit?: number;
	embedding?: 'mock';
}

class MemoryCLI {
	private memoryService: MemoryService;
	private indexingService: IndexingService;
	private contextService: ContextRetrievalService;
	private embeddingProvider: any;

	constructor(_useGemini: boolean = false) {
		this.memoryService = new MemoryService();

		// Choose embedding provider
		// Gemini embeddings are no longer auto-selected from the CLI. Use mock by default.
		this.embeddingProvider = new MockEmbeddingProvider();
		console.log('🔬 Using mock embeddings (Gemini support removed from CLI)');

		this.indexingService = new IndexingService(
			this.memoryService,
			this.embeddingProvider,
			{ autoIndex: false }, // Manual control for CLI
		);

		this.contextService = new ContextRetrievalService(
			this.memoryService,
			new QdrantProvider(),
			new Neo4jProvider(),
			this.embeddingProvider,
		);
	}

	async init(): Promise<void> {
		console.log('🚀 Initializing Cortex Memory System...');

		try {
			await this.memoryService.initialize();
			console.log('✅ Memory system initialized successfully');

			// Test connectivity
			const neo4jProvider = new Neo4jProvider();
			const qdrantProvider = new QdrantProvider();

			const neo4jOk = await neo4jProvider.verifyConnectivity();
			const qdrantOk = await qdrantProvider.verifyConnectivity();

			console.log(`📊 Neo4j: ${neo4jOk ? '✅ Connected' : '❌ Not connected'}`);
			console.log(
				`🔍 Qdrant: ${qdrantOk ? '✅ Connected' : '❌ Not connected'}`,
			);

			if (!neo4jOk && !qdrantOk) {
				console.log(
					'⚠️  No databases connected. Run `docker-compose up` to start services.',
				);
			}
		} catch (error) {
			console.error('❌ Failed to initialize:', error);
			throw error;
		}
	}

	async indexPath(path: string): Promise<void> {
		console.log(`📁 Indexing directory: ${path}`);

		try {
			await this.indexingService.indexDirectory(path);

			const status = this.indexingService.getQueueStatus();
			console.log(`📝 Queued ${status.queueLength} documents for indexing`);

			// Wait for processing to complete
			while (
				this.indexingService.getQueueStatus().isProcessing ||
				this.indexingService.getQueueStatus().queueLength > 0
			) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				const currentStatus = this.indexingService.getQueueStatus();
				console.log(`⏳ Processing... ${currentStatus.queueLength} remaining`);
			}

			console.log('✅ Indexing complete');
		} catch (error) {
			console.error('❌ Indexing failed:', error);
			throw error;
		}
	}

	async search(
		query: string,
		options: { type?: string; source?: string; limit?: number } = {},
	): Promise<void> {
		console.log(`🔍 Searching for: "${query}"`);

		try {
			const contextQuery = {
				text: query,
				type: options.type as any,
				source: options.source,
				maxResults: options.limit || 10,
			};

			const result = await this.contextService.retrieveContext(contextQuery);

			console.log(
				`\n📊 Found ${result.totalFound} memories (confidence: ${(result.confidence * 100).toFixed(1)}%)`,
			);

			if (result.summary) {
				console.log(`\n📝 Summary:\n${result.summary}`);
			}

			console.log('\n🔍 Results:');
			result.memories.forEach((memory, index) => {
				console.log(
					`\n${index + 1}. [${memory.metadata.type}] ${memory.metadata.source || 'unknown'}`,
				);
				console.log(
					`   Confidence: ${((memory.metadata.confidence || 1) * 100).toFixed(1)}%`,
				);
				console.log(`   Timestamp: ${memory.metadata.timestamp}`);
				if (memory.metadata.tags && memory.metadata.tags.length > 0) {
					console.log(`   Tags: ${memory.metadata.tags.join(', ')}`);
				}
				console.log(
					`   Content: ${memory.content.substring(0, 200)}${memory.content.length > 200 ? '...' : ''}`,
				);
			});

			if (result.knowledgeGraph && result.knowledgeGraph.nodes.length > 0) {
				console.log(
					`\n🕸️  Knowledge Graph: ${result.knowledgeGraph.nodes.length} nodes, ${result.knowledgeGraph.edges.length} edges`,
				);
			}
		} catch (error) {
			console.error('❌ Search failed:', error);
			throw error;
		}
	}

	async showStats(): Promise<void> {
		console.log('📊 Memory System Statistics:');

		try {
			const stats = await this.memoryService.getMemoryStats();

			console.log(`\n📝 Total Memories: ${stats.totalMemories}`);
			console.log(
				`📈 Average Confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`,
			);
			console.log(`🆕 Recent Memories (7 days): ${stats.recentMemories}`);

			console.log('\n📋 Memories by Type:');
			Object.entries(stats.memoriesByType).forEach(([type, count]) => {
				console.log(`   ${type}: ${count}`);
			});

			// Neo4j stats
			const neo4jProvider = new Neo4jProvider();
			if (await neo4jProvider.verifyConnectivity()) {
				const graphStats = await neo4jProvider.getStats();
				console.log(`\n🕸️  Graph Database:`);
				console.log(`   Nodes: ${graphStats.nodeCount}`);
				console.log(`   Relationships: ${graphStats.relationshipCount}`);

				if (Object.keys(graphStats.relationshipTypeCounts).length > 0) {
					console.log('   Relationship Types:');
					Object.entries(graphStats.relationshipTypeCounts).forEach(
						([type, count]) => {
							console.log(`     ${type}: ${count}`);
						},
					);
				}
			}

			// Qdrant stats
			const qdrantProvider = new QdrantProvider();
			if (await qdrantProvider.verifyConnectivity()) {
				const vectorStats = await qdrantProvider.getCollectionStats();
				console.log(`\n🔍 Vector Database:`);
				Object.entries(vectorStats).forEach(([collection, info]) => {
					console.log(`   ${collection}: ${info.points_count} points`);
				});
			}
		} catch (error) {
			console.error('❌ Failed to get stats:', error);
			throw error;
		}
	}

	async runDemo(): Promise<void> {
		console.log('🎭 Running Memory System Demo...\n');

		try {
			// Initialize
			await this.init();

			// Add sample memories
			console.log('📝 Adding sample memories...');
			const sampleMemories: MemoryEntry[] = [
				{
					id: 'demo-1',
					content:
						'React is a JavaScript library for building user interfaces, particularly web applications.',
					vector: await this.embeddingProvider.generateEmbedding(
						'React JavaScript library user interfaces',
					),
					metadata: {
						type: 'knowledge',
						source: 'demo',
						timestamp: new Date().toISOString(),
						tags: ['react', 'javascript', 'ui', 'web'],
						confidence: 1.0,
						accessibility: { wcag_level: 'AA', cognitive_load: 'medium' },
					},
				},
				{
					id: 'demo-2',
					content:
						'TypeScript is a statically typed superset of JavaScript that compiles to plain JavaScript.',
					vector: await this.embeddingProvider.generateEmbedding(
						'TypeScript statically typed JavaScript',
					),
					metadata: {
						type: 'knowledge',
						source: 'demo',
						timestamp: new Date().toISOString(),
						tags: ['typescript', 'javascript', 'types', 'compilation'],
						confidence: 1.0,
						accessibility: { wcag_level: 'AA', cognitive_load: 'medium' },
					},
				},
				{
					id: 'demo-3',
					content:
						'Accessibility in web development means making websites usable by people with disabilities.',
					vector: await this.embeddingProvider.generateEmbedding(
						'Accessibility web development disabilities usable',
					),
					metadata: {
						type: 'knowledge',
						source: 'demo',
						timestamp: new Date().toISOString(),
						tags: ['accessibility', 'web', 'a11y', 'disabilities'],
						confidence: 1.0,
						accessibility: { wcag_level: 'AAA', cognitive_load: 'low' },
					},
				},
			];

			for (const memory of sampleMemories) {
				await this.memoryService.addMemory(memory);
			}

			// Create knowledge relationships
			await this.memoryService.createKnowledgeRelation({
				from: 'demo-1',
				to: 'demo-2',
				type: 'RELATED_TECHNOLOGY',
				properties: { confidence: 0.8 },
			});

			console.log('✅ Sample memories added');

			// Test search
			console.log('\n🔍 Testing search...');
			await this.search('JavaScript programming', { limit: 5 });

			// Show stats
			console.log('\n📊 Final stats:');
			await this.showStats();

			console.log('\n🎉 Demo completed successfully!');
		} catch (error) {
			console.error('❌ Demo failed:', error);
			throw error;
		}
	}

	async cleanup(): Promise<void> {
		await this.indexingService.destroy();
		await this.memoryService.close();
	}
}

// CLI argument parsing
function parseArgs(): CLIOptions {
	const args = process.argv.slice(2);
	const options: CLIOptions = { command: 'demo' };

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		switch (arg) {
			case 'init':
			case 'index':
			case 'search':
			case 'stats':
			case 'demo':
				options.command = arg;
				break;
			case '--path':
				options.path = args[++i];
				break;
			case '--query':
				options.query = args[++i];
				break;
			case '--type':
				options.type = args[++i];
				break;
			case '--source':
				options.source = args[++i];
				break;
			case '--limit':
				options.limit = parseInt(args[++i], 10);
				break;
			case '--embedding': {
				const val = args[++i] as string | undefined;
				if (val === 'mock') options.embedding = 'mock';
				break;
			}
		}
	}

	return options;
}

function printUsage(): void {
	console.log(`
🧠 Cortex Memory CLI

Usage: node memory-cli.js <command> [options]

Commands:
  init                Initialize the memory system
  index --path <dir>  Index files in directory
  search --query <q>  Search memories
  stats              Show system statistics
  demo               Run demonstration

Options:
  --path <dir>       Directory path to index
  --query <text>     Search query text
  --type <type>      Filter by memory type (fact, conversation, knowledge, code, document)
  --source <source>  Filter by source
  --limit <n>        Limit number of results (default: 10)
  --embedding <type> Use 'mock' embeddings (Gemini removed from CLI)

Environment Variables:
  (Gemini API keys and support removed from the CLI)
  NEO4J_URI          Neo4j connection URI (default: bolt://localhost:7687)
  NEO4J_USER         Neo4j username (default: neo4j)
  NEO4J_PASSWORD     Neo4j password (default: cortexpassword)
  QDRANT_URL         Qdrant URL (default: http://localhost:6333)

Examples:
  node memory-cli.js init
  node memory-cli.js index --path ./src
  node memory-cli.js search --query "React components" --type knowledge --limit 5
  node memory-cli.js stats
  node memory-cli.js demo
`);
}

// Main execution
async function main(): Promise<void> {
	const options = parseArgs();

	if (process.argv.includes('--help') || process.argv.includes('-h')) {
		printUsage();
		return;
	}

	// CLI no longer supports Gemini; always use mock embeddings from the CLI
	const cli = new MemoryCLI(false);

	try {
		switch (options.command) {
			case 'init':
				await cli.init();
				break;

			case 'index':
				if (!options.path) {
					console.error('❌ --path is required for index command');
					process.exit(1);
				}
				await cli.init();
				await cli.indexPath(options.path);
				break;

			case 'search':
				if (!options.query) {
					console.error('❌ --query is required for search command');
					process.exit(1);
				}
				await cli.search(options.query, {
					type: options.type,
					source: options.source,
					limit: options.limit,
				});
				break;

			case 'stats':
				await cli.showStats();
				break;

			case 'demo':
				await cli.runDemo();
				break;

			default:
				console.error(`❌ Unknown command: ${options.command}`);
				printUsage();
				process.exit(1);
		}
	} catch (error) {
		console.error('❌ Error:', error);
		process.exit(1);
	} finally {
		await cli.cleanup();
	}
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
	console.log('\n👋 Shutting down gracefully...');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	console.log('\n👋 Shutting down gracefully...');
	process.exit(0);
});

if (require.main === module) {
	main().catch(console.error);
}
