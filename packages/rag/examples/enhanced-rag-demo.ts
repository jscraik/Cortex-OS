#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';
/**
 * Enhanced RAG Pipeline Example
 * Demonstrates MLX-first multi-model RAG integration
 */

import {
	createFastRAGPipeline,
	createHighQualityRAGPipeline,
	createProductionRAGPipeline,
	type Document,
	EnhancedRAGPipeline,
} from '../src/enhanced-pipeline';

// Sample documents for testing
const sampleDocuments: Document[] = [
	{
		id: 'doc1',
		content:
			'TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale.',
		metadata: { source: 'typescript-docs', category: 'programming' },
	},
	{
		id: 'doc2',
		content:
			'MLX is a machine learning framework designed for efficient training on Apple silicon, providing NumPy-like APIs.',
		metadata: { source: 'mlx-docs', category: 'machine-learning' },
	},
	{
		id: 'doc3',
		content:
			'RAG (Retrieval-Augmented Generation) combines information retrieval with large language models to provide contextually relevant responses.',
		metadata: { source: 'rag-paper', category: 'ai-research' },
	},
	{
		id: 'doc4',
		content:
			'Ollama is a tool that allows you to run large language models locally, providing privacy and control over AI inference.',
		metadata: { source: 'ollama-docs', category: 'ai-tools' },
	},
	{
		id: 'doc5',
		content:
			'Vector embeddings represent text as high-dimensional numerical vectors, enabling semantic similarity comparisons.',
		metadata: { source: 'embeddings-guide', category: 'ai-concepts' },
	},
];
const modelDir = path.resolve(process.cwd(), 'models');
const embedPath =
	process.env.QWEN_EMBED_MODEL_PATH ||
	path.join(modelDir, 'Qwen3-Embedding-4B');
const rerankPath =
	process.env.QWEN_RERANKER_MODEL_PATH ||
	path.join(modelDir, 'Qwen3-Reranker-4B');

// Validate that model files exist in the directories, or warn if missing.
for (const p of [embedPath, rerankPath]) {
	// If p is a directory, check for files inside. If p is a file path, check if it exists.
	let stat: fs.Stats;
	try {
		stat = fs.statSync(p);
	} catch {
		console.warn(
			`[WARN] Path "${p}" does not exist. Model files may be missing.`,
		);
		continue;
	}
	if (stat.isDirectory()) {
		const files = fs.readdirSync(p);
		if (files.length === 0) {
			console.warn(
				`[WARN] Model directory "${p}" is empty. This may lead to runtime errors if model files are missing.`,
			);
		}
	} else if (stat.isFile()) {
		// File exists, OK.
	} else {
		console.warn(
			`[WARN] Path "${p}" is neither a file nor a directory. Please check your model path configuration.`,
		);
	}
}
process.env.QWEN_EMBED_MODEL_DIR = path.dirname(embedPath);
process.env.QWEN_RERANKER_MODEL_PATH = rerankPath;

async function demonstrateMLXFirstRAG() {
	console.log('🚀 Enhanced RAG Pipeline Demo - MLX-First Integration\n');

	try {
		// Create production pipeline with MLX-first configuration
		console.log('📦 Initializing production RAG pipeline...');
		const pipeline = createProductionRAGPipeline();

		// Show model priority order
		console.log('\n🔄 Model Priority Order (MLX-first):');
		const modelPriority = pipeline.getModelPriority();
		modelPriority.forEach((model, index) => {
			const priorityType = model.backend === 'mlx' ? '🔥 MLX' : '🛡️  Ollama';
			console.log(
				`  ${index + 1}. ${priorityType} - ${model.model} (priority: ${model.priority})`,
			);
		});

		// Test queries
		const queries = [
			'What is TypeScript and how does it relate to JavaScript?',
			'How does MLX compare to other machine learning frameworks?',
			'What are the benefits of using RAG for AI applications?',
		];

		for (const query of queries) {
			console.log(`\n🔍 Query: "${query}"`);
			console.log('⏳ Processing...');

			const result = await pipeline.query(query, sampleDocuments, {
				contextPrompt:
					'You are a technical AI assistant. Provide accurate and helpful information based on the context.',
				maxContextLength: 2000,
			});

			console.log(`✅ Response generated via ${result.provider.toUpperCase()}`);
			console.log(
				`📊 Retrieved ${result.retrievedCount} docs, reranked to ${result.rerankedCount}`,
			);
			console.log(`⏱️  Processing time: ${result.processingTimeMs}ms`);
			console.log(`🎯 Answer: ${result.answer.substring(0, 200)}...`);

			if (result.usage) {
				console.log(
					`📈 Token usage: ${result.usage.totalTokens} total (${result.usage.promptTokens} prompt + ${result.usage.completionTokens} completion)`,
				);
			}
		}
	} catch (error) {
		console.error('❌ Error during RAG demonstration:', error);
	}
}

async function demonstrateConfigurationOptions() {
	console.log('\n\n🎛️  Configuration Options Demo\n');

	const configs = [
		{ name: 'Fast Pipeline', factory: createFastRAGPipeline },
		{ name: 'Production Pipeline', factory: createProductionRAGPipeline },
		{ name: 'High Quality Pipeline', factory: createHighQualityRAGPipeline },
	];

	for (const config of configs) {
		console.log(`📋 ${config.name}:`);
		const pipeline = config.factory();
		const priority = pipeline.getModelPriority();

		console.log(`  🎯 Models: ${priority.length} total`);
		console.log(
			`  🔥 MLX models: ${priority.filter((m) => m.backend === 'mlx').length}`,
		);
		console.log(
			`  🛡️  Ollama fallbacks: ${priority.filter((m) => m.backend === 'ollama').length}`,
		);
		console.log(
			`  🏆 Primary: ${priority[0]?.model.split('/').pop() || priority[0]?.model} (${priority[0]?.backend})`,
		);
	}
}

async function demonstrateCustomConfiguration() {
	console.log('\n\n⚙️  Custom Configuration Demo\n');

	// Create a custom pipeline with specific models
	const customPipeline = new EnhancedRAGPipeline({
		embeddingModelSize: '4B', // Balanced performance
		generationModels: [
			{
				model:
					process.env.MLX_QWEN_CODER_PATH ||
					'mlx-community/qwen2.5-coder-32b-instruct-q4',
				backend: 'mlx',
				name: 'Qwen2.5 Coder 32B',
				priority: 10,
			},
			{
				model: 'qwen3-coder:30b',
				backend: 'ollama',
				name: 'Qwen3 Coder 30B (Ollama)',
				priority: 5,
			},
		],
		topK: 8,
		rerank: { enabled: true, topK: 4 },
	});

	console.log('🔧 Custom configuration created with:');
	console.log('  📐 Embedding: Qwen3-4B model');
	console.log('  🎯 Retrieval: Top 8 documents');
	console.log('  🔄 Reranking: Enabled, top 4 documents');
	console.log('  🧠 Generation: 2 models (MLX + Ollama fallback)');

	const priority = customPipeline.getModelPriority();
	priority.forEach((model, index) => {
		console.log(
			`    ${index + 1}. ${model.backend.toUpperCase()}: ${model.model.split('/').pop() || model.model}`,
		);
	});
}

// Main execution
async function main() {
	try {
		await demonstrateMLXFirstRAG();
		await demonstrateConfigurationOptions();
		await demonstrateCustomConfiguration();

		console.log('\n✨ Enhanced RAG Pipeline demonstration completed!');
		console.log('\n💡 Key Features Demonstrated:');
		console.log('  🔥 MLX-first model prioritization');
		console.log('  🛡️  Automatic Ollama fallback');
		console.log('  📊 Multi-size Qwen3 embeddings');
		console.log('  🎯 Intelligent document reranking');
		console.log('  ⚡ Performance monitoring');
		console.log('  🎛️  Flexible configuration options');
	} catch (error) {
		console.error('❌ Demo failed:', error);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

export { main as runEnhancedRAGDemo };
