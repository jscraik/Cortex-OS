import type { ChildProcess } from 'node:child_process';
import http from 'node:http';
import { faker } from '@faker-js/faker';

/**
 * Mock Services for E2E Testing
 *
 * Provides mock implementations for external dependencies:
 * - Local Memory API
 * - AI Model APIs
 * - File Processing Services
 * - External APIs
 * - Authentication providers
 */
export class MockServices {
	private servers: Map<string, ChildProcess> = new Map();
	private httpServers: Map<string, http.Server> = new Map();

	/**
	 * Start all mock services
	 */
	async start(): Promise<void> {
		await this.startLocalMemoryMock();
		await this.startAIModelMock();
		await this.startFileProcessingMock();
		await this.startAuthMock();

		console.log('✅ All mock services started');
	}

	/**
	 * Stop all mock services
	 */
	async stop(): Promise<void> {
		// Stop HTTP servers
		for (const [name, server] of this.httpServers) {
			server.close();
			console.log(`🛑 Stopped mock HTTP server: ${name}`);
		}

		// Stop child processes
		for (const [name, process] of this.servers) {
			process.kill('SIGTERM');
			console.log(`🛑 Stopped mock process: ${name}`);
		}

		this.servers.clear();
		this.httpServers.clear();
	}

	/**
	 * Start Local Memory API mock
	 */
	private async startLocalMemoryMock(): Promise<void> {
		const server = http.createServer((req, res) => {
			this.setCorsHeaders(res);

			if (req.url === '/api/v1/health' && req.method === 'GET') {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(
					JSON.stringify({
						status: 'healthy',
						timestamp: new Date().toISOString(),
						service: 'brAInwav Local Memory',
						version: '1.0.0',
					}),
				);
				return;
			}

			if (req.url?.startsWith('/api/v1/memories') && req.method === 'POST') {
				let body = '';
				req.on('data', (chunk) => (body += chunk));
				req.on('end', () => {
					const memory = JSON.parse(body);
					const response = {
						id: faker.string.uuid(),
						...memory,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					};
					res.writeHead(201, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify(response));
				});
				return;
			}

			if (req.url?.startsWith('/api/v1/memories') && req.method === 'GET') {
				const response = {
					memories: [
						{
							id: faker.string.uuid(),
							content: 'brAInwav Cortex-OS architecture memory',
							importance: 9,
							tags: ['brainwav', 'cortex-os', 'architecture'],
							domain: 'technical',
							createdAt: new Date().toISOString(),
						},
					],
					total: 1,
					page: 1,
					limit: 10,
				};
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(response));
				return;
			}

			// Default response
			res.writeHead(404, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Not Found' }));
		});

		server.listen(3028, () => {
			console.log('🧠 Local Memory mock server running on port 3028');
		});

		this.httpServers.set('local-memory', server);
	}

	/**
	 * Start AI Model API mock
	 */
	private async startAIModelMock(): Promise<void> {
		const server = http.createServer((req, res) => {
			this.setCorsHeaders(res);

			if (req.url === '/v1/chat/completions' && req.method === 'POST') {
				let body = '';
				req.on('data', (chunk) => (body += chunk));
				req.on('end', () => {
					const request = JSON.parse(body);
					const response = {
						id: faker.string.uuid(),
						object: 'chat.completion',
						created: Math.floor(Date.now() / 1000),
						model: request.model || 'claude-3-sonnet',
						choices: [
							{
								index: 0,
								message: {
									role: 'assistant',
									content: this.generateMockResponse(request.messages),
									refusal: null,
								},
								finish_reason: 'stop',
							},
						],
						usage: {
							prompt_tokens: 100,
							completion_tokens: 200,
							total_tokens: 300,
						},
						system_fingerprint: `brAInwav-Cortex-OS-${faker.string.alphanumeric(16)}`,
					};

					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify(response));
				});
				return;
			}

			res.writeHead(404, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Not Found' }));
		});

		server.listen(3030, () => {
			console.log('🤖 AI Model mock server running on port 3030');
		});

		this.httpServers.set('ai-model', server);
	}

	/**
	 * Start File Processing Service mock
	 */
	private async startFileProcessingMock(): Promise<void> {
		const server = http.createServer((req, res) => {
			this.setCorsHeaders(res);

			if (req.url === '/api/v1/process' && req.method === 'POST') {
				let body = '';
				req.on('data', (chunk) => (body += chunk));
				req.on('end', () => {
					const request = JSON.parse(body);
					const response = {
						id: faker.string.uuid(),
						status: 'completed',
						originalFile: request.fileName,
						processedContent: this.generateMockProcessedContent(request.fileType),
						metadata: {
							processingTime: faker.number.int({ min: 100, max: 1000 }),
							pages: faker.number.int({ min: 1, max: 10 }),
							extractedText: true,
							extractedImages: true,
						},
						createdAt: new Date().toISOString(),
					};

					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify(response));
				});
				return;
			}

			res.writeHead(404, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Not Found' }));
		});

		server.listen(3031, () => {
			console.log('📄 File Processing mock server running on port 3031');
		});

		this.httpServers.set('file-processing', server);
	}

	/**
	 * Start Authentication Provider mock
	 */
	private async startAuthMock(): Promise<void> {
		const server = http.createServer((req, res) => {
			this.setCorsHeaders(res);

			if (req.url === '/oauth/google' && req.method === 'GET') {
				res.writeHead(302, {
					Location: `http://localhost:3000/auth/callback?code=${faker.string.alphanumeric(32)}&state=test-state`,
				});
				res.end();
				return;
			}

			if (req.url === '/oauth/github' && req.method === 'GET') {
				res.writeHead(302, {
					Location: `http://localhost:3000/auth/callback?code=${faker.string.alphanumeric(32)}&state=test-state`,
				});
				res.end();
				return;
			}

			if (req.url === '/api/v1/user' && req.method === 'GET') {
				const response = {
					id: faker.string.uuid(),
					email: faker.internet.email(),
					name: faker.person.fullName(),
					avatar: faker.internet.avatar(),
					provider: 'google',
					verified: true,
					metadata: {
						locale: 'en-US',
						createdAt: new Date().toISOString(),
					},
				};

				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(response));
				return;
			}

			res.writeHead(404, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Not Found' }));
		});

		server.listen(3032, () => {
			console.log('🔐 Auth Provider mock server running on port 3032');
		});

		this.httpServers.set('auth', server);
	}

	/**
	 * Set CORS headers for mock servers
	 */
	private setCorsHeaders(res: http.ServerResponse): void {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Test-Client');
		res.setHeader('Access-Control-Max-Age', '86400');
	}

	/**
	 * Generate mock AI response based on conversation context
	 */
	private generateMockResponse(messages: any[]): string {
		const lastMessage = messages[messages.length - 1];

		const responses = [
			`Based on your question about "${lastMessage.content.substring(0, 50)}...", brAInwav Cortex-OS provides comprehensive solutions through its Autonomous Software Behavior Reasoning (ASBR) runtime.`,
			`The brAInwav Cortex-OS architecture enables sophisticated AI workflows with event-driven communication and Model Context Protocol integration.`,
			`As part of the brAInwav ecosystem, Cortex-OS offers production-ready capabilities for multi-agent coordination and intelligent document processing.`,
			`Your inquiry relates to brAInwav's commitment to scalable, maintainable ASBR solutions with proper governance and quality standards.`,
			`The brAInwav development team has implemented comprehensive E2E testing to ensure reliable operation across all supported browsers and platforms.`,
		];

		return responses[Math.floor(Math.random() * responses.length)];
	}

	/**
	 * Generate mock processed content based on file type
	 */
	private generateMockProcessedContent(fileType: string): string {
		const contentMap: Record<string, string> = {
			'application/pdf':
				'Extracted text content from PDF document with brAInwav Cortex-OS documentation...',
			'text/markdown':
				'# brAInwav Cortex-OS\n\nComprehensive documentation for the Autonomous Software Behavior Reasoning runtime...',
			'image/jpeg':
				'Image processed successfully. Extracted metadata: brAInwav product screenshot, dimensions: 1920x1080...',
			'audio/mpeg':
				'Audio transcribed successfully. Content: Discussion about brAInwav Cortex-OS implementation and ASBR principles...',
			'text/plain':
				'Plain text document processed. Content contains information about brAInwav engineering practices...',
		};

		return (
			contentMap[fileType] ||
			'File processed successfully with brAInwav Cortex-OS document processing pipeline.'
		);
	}

	/**
	 * Check if all services are ready
	 */
	async checkHealth(): Promise<boolean> {
		const services = [
			{ name: 'Local Memory', url: 'http://localhost:3028/api/v1/health' },
			{ name: 'AI Model', url: 'http://localhost:3030/health' },
			{ name: 'File Processing', url: 'http://localhost:3031/health' },
			{ name: 'Auth Provider', url: 'http://localhost:3032/health' },
		];

		for (const service of services) {
			try {
				const response = await fetch(service.url);
				if (!response.ok) {
					console.warn(`⚠️ Service ${service.name} not healthy`);
					return false;
				}
			} catch (error) {
				console.warn(`⚠️ Service ${service.name} not reachable:`, error);
				return false;
			}
		}

		return true;
	}
}
