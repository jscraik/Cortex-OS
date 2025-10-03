const http = require('node:http');
const { faker } = require('@faker-js/faker');

/**
 * Mock AI Service for brAInwav Testing
 *
 * Provides mock responses for AI model APIs during testing:
 * - Chat completions
 * - Text embeddings
 * - Content analysis
 * - Document processing
 * - RAG queries
 */

const PORT = process.env.PORT || 3030;

// Store conversations for context
const conversations = new Map();

// Mock model configurations
const MODELS = {
	'claude-3-sonnet': {
		maxTokens: 4096,
		costPer1kTokens: 0.015,
		speed: 'fast',
	},
	'claude-3-haiku': {
		maxTokens: 4096,
		costPer1kTokens: 0.00025,
		speed: 'very-fast',
	},
	'claude-3-opus': {
		maxTokens: 4096,
		costPer1kTokens: 0.075,
		speed: 'medium',
	},
};

const server = http.createServer((req, res) => {
	// Set CORS headers
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Test-Client');
	res.setHeader('Access-Control-Max-Age', '86400');

	if (req.method === 'OPTIONS') {
		res.writeHead(200);
		res.end();
		return;
	}

	// Route handling
	const url = req.url;
	const method = req.method;

	console.log(`${method} ${url}`);

	try {
		if (url === '/health' && method === 'GET') {
			handleHealth(req, res);
		} else if (url === '/v1/chat/completions' && method === 'POST') {
			handleChatCompletion(req, res);
		} else if (url === '/v1/embeddings' && method === 'POST') {
			handleEmbeddings(req, res);
		} else if (url === '/v1/analyze' && method === 'POST') {
			handleAnalysis(req, res);
		} else if (url === '/v1/process-document' && method === 'POST') {
			handleDocumentProcessing(req, res);
		} else if (url === '/v1/rag-query' && method === 'POST') {
			handleRAGQuery(req, res);
		} else {
			res.writeHead(404, { 'Content-Type': 'application/json' });
			res.end(
				JSON.stringify({
					error: 'Not Found',
					message: `Endpoint ${method} ${url} not found`,
					service: 'brAInwav Mock AI Service',
				}),
			);
		}
	} catch (error) {
		console.error('Error handling request:', error);
		res.writeHead(500, { 'Content-Type': 'application/json' });
		res.end(
			JSON.stringify({
				error: 'Internal Server Error',
				message: error.message,
				service: 'brAInwav Mock AI Service',
			}),
		);
	}
});

function handleHealth(_req, res) {
	const healthData = {
		status: 'healthy',
		timestamp: new Date().toISOString(),
		service: 'brAInwav Mock AI Service',
		version: '1.0.0',
		models: Object.keys(MODELS),
		uptime: process.uptime(),
		memory: process.memoryUsage(),
		requests: {
			total: requestsProcessed,
			errors: requestErrors,
		},
	};

	res.writeHead(200, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(healthData));
}

function handleChatCompletion(req, res) {
	let body = '';
	req.on('data', (chunk) => (body += chunk));
	req.on('end', () => {
		try {
			const request = JSON.parse(body);
			const { model, messages, temperature, max_tokens, stream } = request;

			// Store conversation for context
			const conversationId = faker.string.uuid();
			conversations.set(conversationId, {
				messages,
				model,
				timestamp: new Date().toISOString(),
			});

			if (stream) {
				handleStreamingResponse(res, request, conversationId);
			} else {
				handleNormalResponse(res, request, conversationId);
			}
		} catch (error) {
			res.writeHead(400, { 'Content-Type': 'application/json' });
			res.end(
				JSON.stringify({
					error: 'Invalid JSON',
					message: error.message,
				}),
			);
		}
	});
}

function handleNormalResponse(res, request, conversationId) {
	const { model, messages, temperature, max_tokens } = request;
	const lastMessage = messages[messages.length - 1];

	const response = {
		id: `chatcmpl-${faker.string.alphanumeric(29)}`,
		object: 'chat.completion',
		created: Math.floor(Date.now() / 1000),
		model: model || 'claude-3-sonnet',
		choices: [
			{
				index: 0,
				message: {
					role: 'assistant',
					content: generateResponse(lastMessage.content, messages),
					refusal: null,
				},
				finish_reason: 'stop',
				logprobs: null,
			},
		],
		usage: {
			prompt_tokens: estimateTokens(JSON.stringify(messages)),
			completion_tokens: estimateTokens(generateResponse(lastMessage.content, messages)),
			total_tokens: 0,
		},
		system_fingerprint: `fp_${faker.string.alphanumeric(16)}`,
		conversation_id: conversationId,
		brAInwav_metadata: {
			processing_time: faker.number.int({ min: 100, max: 2000 }),
			model_version: '1.0.0',
			service: 'brAInwav Mock AI Service',
		},
	};

	response.usage.total_tokens = response.usage.prompt_tokens + response.usage.completion_tokens;

	res.writeHead(200, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(response));
}

function handleStreamingResponse(res, request, _conversationId) {
	const { model, messages } = request;
	const lastMessage = messages[messages.length - 1];
	const fullResponse = generateResponse(lastMessage.content, messages);
	const words = fullResponse.split(' ');

	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
		'Access-Control-Allow-Origin': '*',
	});

	// Send streaming chunks
	let _currentContent = '';
	words.forEach((word, index) => {
		setTimeout(() => {
			_currentContent += `${word} `;
			const chunk = {
				id: `chatcmpl-${faker.string.alphanumeric(29)}`,
				object: 'chat.completion.chunk',
				created: Math.floor(Date.now() / 1000),
				model: model || 'claude-3-sonnet',
				choices: [
					{
						index: 0,
						delta: {
							content: `${word} `,
						},
						finish_reason: index === words.length - 1 ? 'stop' : null,
					},
				],
			};

			res.write(`data: ${JSON.stringify(chunk)}\n\n`);

			if (index === words.length - 1) {
				res.write('data: [DONE]\n\n');
				res.end();
			}
		}, index * 50); // 50ms delay between words
	});
}

function handleEmbeddings(req, res) {
	let body = '';
	req.on('data', (chunk) => (body += chunk));
	req.on('end', () => {
		try {
			const request = JSON.parse(body);
			const { input, model } = request;

			const embeddings = Array.isArray(input) ? input : [input];

			const response = {
				object: 'list',
				data: embeddings.map((_text, index) => ({
					object: 'embedding',
					embedding: generateMockEmbedding(),
					index,
				})),
				model: model || 'text-embedding-ada-002',
				usage: {
					prompt_tokens: estimateTokens(embeddings.join(' ')),
					total_tokens: estimateTokens(embeddings.join(' ')),
				},
				brAInwav_metadata: {
					service: 'brAInwav Mock AI Service',
					dimensions: 1536,
				},
			};

			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(response));
		} catch (error) {
			res.writeHead(400, { 'Content-Type': 'application/json' });
			res.end(
				JSON.stringify({
					error: 'Invalid JSON',
					message: error.message,
				}),
			);
		}
	});
}

function handleAnalysis(req, res) {
	let body = '';
	req.on('data', (chunk) => (body += chunk));
	req.on('end', () => {
		try {
			const request = JSON.parse(body);
			const { text, analysis_type } = request;

			const analysisResults = {
				sentiment: analysis_type.includes('sentiment') ? analyzeSentiment(text) : undefined,
				entities: analysis_type.includes('entities') ? extractEntities(text) : undefined,
				summary: analysis_type.includes('summary') ? generateSummary(text) : undefined,
				keywords: analysis_type.includes('keywords') ? extractKeywords(text) : undefined,
				language: detectLanguage(text),
				processing_time: faker.number.int({ min: 50, max: 500 }),
				brAInwav_metadata: {
					service: 'brAInwav Mock AI Service',
					model: 'claude-3-sonnet',
					confidence: faker.number.float({ min: 0.8, max: 0.95, precision: 0.01 }),
				},
			};

			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(analysisResults));
		} catch (error) {
			res.writeHead(400, { 'Content-Type': 'application/json' });
			res.end(
				JSON.stringify({
					error: 'Invalid JSON',
					message: error.message,
				}),
			);
		}
	});
}

function handleDocumentProcessing(req, res) {
	let body = '';
	req.on('data', (chunk) => (body += chunk));
	req.on('end', () => {
		try {
			const request = JSON.parse(body);
			const { document_id, processing_options } = request;

			const processingResult = {
				document_id,
				status: 'completed',
				extracted_text: generateMockText(500, 2000),
				metadata: {
					pages: faker.number.int({ min: 1, max: 10 }),
					words: faker.number.int({ min: 200, max: 5000 }),
					characters: faker.number.int({ min: 1000, max: 25000 }),
					language: 'en',
					format: 'pdf',
					created_at: new Date().toISOString(),
				},
				analysis: processing_options?.analyze_content
					? {
							summary: generateMockText(50, 200),
							key_topics: extractKeywords(generateMockText(500, 2000)),
							sentiment: analyzeSentiment(generateMockText(500, 2000)),
							readability_score: faker.number.int({ min: 60, max: 90 }),
						}
					: undefined,
				brAInwav_metadata: {
					processing_time: faker.number.int({ min: 1000, max: 5000 }),
					service: 'brAInwav Mock AI Service',
					quality_score: faker.number.float({ min: 0.85, max: 0.98, precision: 0.01 }),
				},
			};

			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(processingResult));
		} catch (error) {
			res.writeHead(400, { 'Content-Type': 'application/json' });
			res.end(
				JSON.stringify({
					error: 'Invalid JSON',
					message: error.message,
				}),
			);
		}
	});
}

function handleRAGQuery(req, res) {
	let body = '';
	req.on('data', (chunk) => (body += chunk));
	req.on('end', () => {
		try {
			const request = JSON.parse(body);
			const { query, context, max_results, include_citations } = request;

			const ragResult = {
				query,
				answer: generateRAGResponse(query, context),
				sources: generateMockSources(max_results || 3),
				citations: include_citations ? generateMockCitations(max_results || 3) : undefined,
				context_used: context ? context.length : 0,
				relevance_score: faker.number.float({ min: 0.7, max: 0.95, precision: 0.01 }),
				processing_time: faker.number.int({ min: 500, max: 2000 }),
				brAInwav_metadata: {
					service: 'brAInwav Mock AI Service',
					retrieval_method: 'semantic_search',
					model: 'claude-3-sonnet',
				},
			};

			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(ragResult));
		} catch (error) {
			res.writeHead(400, { 'Content-Type': 'application/json' });
			res.end(
				JSON.stringify({
					error: 'Invalid JSON',
					message: error.message,
				}),
			);
		}
	});
}

// Helper functions
function generateResponse(lastMessage, _conversationHistory) {
	const responses = [
		`Based on your question about brAInwav Cortex-OS, it's a comprehensive Autonomous Software Behavior Reasoning (ASBR) runtime that enables sophisticated AI workflows through event-driven architecture.`,
		`brAInwav Cortex-OS provides production-ready capabilities for multi-agent coordination, real-time communication, and intelligent document processing.`,
		`The brAInwav development team has implemented comprehensive testing to ensure reliable operation across all supported platforms and browsers.`,
		`brAInwav's commitment to quality is evident in its extensive E2E testing framework, accessibility compliance, and performance monitoring.`,
		`Your brAInwav Cortex-OS instance supports advanced features like RAG queries, workflow orchestration, and Model Context Protocol integration.`,
	];

	// Check for specific keywords to provide more contextual responses
	const content = lastMessage.toLowerCase();
	if (content.includes('architecture')) {
		return 'brAInwav Cortex-OS follows a modular architecture with clear separation between domain logic, application services, and infrastructure adapters. The system uses event-driven communication via the A2A framework.';
	} else if (content.includes('testing')) {
		return 'brAInwav Cortex-OS includes comprehensive testing with Playwright for E2E, Vitest for unit tests, and accessibility validation with axe-core. The testing framework covers all major browsers and mobile devices.';
	} else if (content.includes('api')) {
		return 'The brAInwav Cortex-OS API provides RESTful endpoints for authentication, document management, workflows, RAG queries, and real-time communication. All APIs include proper validation, error handling, and rate limiting.';
	}

	return responses[Math.floor(Math.random() * responses.length)];
}

function generateRAGResponse(query, _context) {
	const enhancedQuery = query.toLowerCase();

	if (enhancedQuery.includes('brainwav')) {
		return 'brAInwav Cortex-OS is an advanced Autonomous Software Behavior Reasoning runtime that provides comprehensive AI workflow capabilities with production-grade reliability and extensive testing coverage.';
	} else if (enhancedQuery.includes('asbr')) {
		return 'The Autonomous Software Behavior Reasoning (ASBR) runtime in brAInwav Cortex-OS enables sophisticated agent coordination through event-driven architecture and Model Context Protocol integration.';
	} else if (enhancedQuery.includes('test')) {
		return 'brAInwav Cortex-OS includes a comprehensive E2E testing framework with Playwright, covering authentication, document processing, workflows, API integration, performance, and accessibility validation.';
	}

	return 'Based on the brAInwav knowledge base, I can provide you with comprehensive information about Cortex-OS capabilities and implementation details.';
}

function generateMockEmbedding() {
	return Array.from({ length: 1536 }, () =>
		faker.number.float({ min: -1, max: 1, precision: 0.0001 }),
	);
}

function generateMockSources(count) {
	return Array.from({ length: count }, (_, i) => ({
		id: faker.string.uuid(),
		title: `brAInwav Document ${i + 1}`,
		content: generateMockText(100, 500),
		score: faker.number.float({ min: 0.7, max: 0.95, precision: 0.01 }),
		metadata: {
			author: 'brAInwav Team',
			created_at: faker.date.past().toISOString(),
			tags: ['brainwav', 'cortex-os', 'documentation'],
		},
	}));
}

function generateMockCitations(count) {
	return Array.from({ length: count }, (_, i) => ({
		id: i + 1,
		text: generateMockText(20, 100),
		source_id: faker.string.uuid(),
		confidence: faker.number.float({ min: 0.8, max: 0.95, precision: 0.01 }),
	}));
}

function analyzeSentiment(_text) {
	return {
		label: faker.helpers.arrayElement(['positive', 'negative', 'neutral']),
		score: faker.number.float({ min: 0.6, max: 0.95, precision: 0.01 }),
		confidence: faker.number.float({ min: 0.7, max: 0.9, precision: 0.01 }),
	};
}

function extractEntities(_text) {
	return [
		{ type: 'ORGANIZATION', text: 'brAInwav', confidence: 0.95 },
		{ type: 'PRODUCT', text: 'Cortex-OS', confidence: 0.9 },
		{ type: 'TECHNOLOGY', text: 'ASBR', confidence: 0.85 },
	];
}

function generateSummary(_text) {
	return 'This document discusses key aspects of brAInwav Cortex-OS architecture and implementation, focusing on production-ready features and comprehensive testing capabilities.';
}

function extractKeywords(_text) {
	return ['brAInwav', 'Cortex-OS', 'ASBR', 'testing', 'architecture', 'workflow', 'API'];
}

function detectLanguage(_text) {
	return { code: 'en', name: 'English', confidence: 0.98 };
}

function generateMockText(minWords, maxWords) {
	const wordCount = faker.number.int({ min: minWords, max: maxWords });
	const words = [
		'brAInwav',
		'Cortex-OS',
		'ASBR',
		'runtime',
		'architecture',
		'testing',
		'development',
		'production',
		'quality',
		'performance',
		'accessibility',
		'workflows',
		'agents',
		'communication',
		'events',
		'API',
		'integration',
	];

	return `${Array.from({ length: wordCount }, () => words[Math.floor(Math.random() * words.length)])
		.join(' ')
		.replace(/(\b\w+\b)(?=.*\b\1\b)/g, '')}.`;
}

function estimateTokens(text) {
	// Rough estimation: 1 token ≈ 4 characters
	return Math.ceil(text.length / 4);
}

// Metrics
const requestsProcessed = 0;
const requestErrors = 0;

// Start server
server.listen(PORT, () => {
	console.log(`🤖 brAInwav Mock AI Service running on port ${PORT}`);
	console.log(`Health check: http://localhost:${PORT}/health`);
	console.log(`Models available: ${Object.keys(MODELS).join(', ')}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
	console.log('🤖 brAInwav Mock AI Service shutting down gracefully...');
	server.close(() => {
		console.log('✅ Server closed');
		process.exit(0);
	});
});

module.exports = server;
