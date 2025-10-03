import { expect, request, test } from '@playwright/test';

/**
 * brAInwav Cortex-OS API Integration Tests
 *
 * Comprehensive testing of API endpoints and integrations:
 * - Authentication API endpoints
 * - Document management APIs
 * - Workflow and agent APIs
 * - RAG and search APIs
 * - Real-time communication APIs
 * - File processing APIs
 * - Error handling and validation
 * - Security and rate limiting
 * - Performance and load testing
 */
test.describe('brAInwav Cortex-OS API Integration', () => {
	let apiContext: any;
	let authToken: string;

	test.beforeAll(async ({ playwright }) => {
		// Create API context
		apiContext = await playwright.request.newContext({
			baseURL: 'http://localhost:3001/api',
			extraHTTPHeaders: {
				'X-Test-Client': 'Playwright-API-Tests',
				'X-Test-Environment': 'brAInwav-Cortex-OS',
			},
		});

		// Login to get auth token
		const loginResponse = await apiContext.post('/auth/login', {
			data: {
				email: 'testuser@brainwav.ai',
				password: 'TestPassword123!',
			},
		});

		expect(loginResponse.ok()).toBeTruthy();
		const loginData = await loginResponse.json();
		authToken = loginData.token;

		// Set auth token for subsequent requests
		apiContext.setExtraHTTPHeaders({
			Authorization: `Bearer ${authToken}`,
		});
	});

	test.afterAll(async () => {
		await apiContext.dispose();
	});

	test.describe('Authentication API Endpoints', () => {
		test('POST /auth/login - should authenticate valid credentials', async () => {
			const response = await apiContext.post('/auth/login', {
				data: {
					email: 'testuser@brainwav.ai',
					password: 'TestPassword123!',
				},
			});

			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('token');
			expect(data).toHaveProperty('user');
			expect(data.user.email).toBe('testuser@brainwav.ai');
			expect(data.user.firstName).toBe('Test');
		});

		test('POST /auth/login - should reject invalid credentials', async () => {
			const response = await apiContext.post('/auth/login', {
				data: {
					email: 'invalid@brainwav.ai',
					password: 'wrongpassword',
				},
			});

			expect(response.status()).toBe(401);
			const data = await response.json();
			expect(data).toHaveProperty('error');
			expect(data.error).toContain('Invalid credentials');
		});

		test('POST /auth/register - should create new user', async () => {
			const newUser = {
				firstName: 'API',
				lastName: 'Test',
				email: `api-test-${Date.now()}@brainwav.ai`,
				password: 'SecurePassword123!',
			};

			const response = await apiContext.post('/auth/register', {
				data: newUser,
			});

			expect(response.status()).toBe(201);
			const data = await response.json();
			expect(data).toHaveProperty('user');
			expect(data.user.email).toBe(newUser.email);
			expect(data.user.firstName).toBe(newUser.firstName);
		});

		test('POST /auth/logout - should logout user', async () => {
			const response = await apiContext.post('/auth/logout');
			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data.message).toContain('Logged out successfully');
		});

		test('GET /auth/me - should return current user profile', async () => {
			const response = await apiContext.get('/auth/me');
			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('user');
			expect(data.user.email).toBe('testuser@brainwav.ai');
		});

		test('POST /auth/refresh - should refresh access token', async () => {
			const response = await apiContext.post('/auth/refresh');
			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('token');
			expect(data.token).not.toBe(authToken);
		});
	});

	test.describe('Document Management APIs', () => {
		let documentId: string;

		test('POST /documents - should upload document', async () => {
			const documentData = {
				title: 'brAInwav API Test Document',
				content: 'This is a test document for brAInwav Cortex-OS API testing.',
				tags: ['api-test', 'brainwav', 'cortex-os'],
				metadata: {
					source: 'api-test',
					version: '1.0.0',
				},
			};

			const response = await apiContext.post('/documents', {
				data: documentData,
			});

			expect(response.status()).toBe(201);
			const data = await response.json();
			expect(data).toHaveProperty('document');
			expect(data.document.title).toBe(documentData.title);
			documentId = data.document.id;
		});

		test('GET /documents - should list documents', async () => {
			const response = await apiContext.get('/documents');
			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('documents');
			expect(data.documents).toBeInstanceOf(Array);
			expect(data.documents.length).toBeGreaterThan(0);
		});

		test('GET /documents/:id - should retrieve specific document', async () => {
			const response = await apiContext.get(`/documents/${documentId}`);
			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('document');
			expect(data.document.id).toBe(documentId);
			expect(data.document.title).toBe('brAInwav API Test Document');
		});

		test('PUT /documents/:id - should update document', async () => {
			const updateData = {
				title: 'Updated brAInwav API Document',
				tags: ['api-test', 'updated', 'brainwav'],
			};

			const response = await apiContext.put(`/documents/${documentId}`, {
				data: updateData,
			});

			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data.document.title).toBe(updateData.title);
			expect(data.document.tags).toEqual(updateData.tags);
		});

		test('POST /documents/:id/process - should process document', async () => {
			const response = await apiContext.post(`/documents/${documentId}/process`, {
				data: {
					processingOptions: {
						extractEntities: true,
						generateSummary: true,
						enableRAG: true,
					},
				},
			});

			expect(response.status()).toBe(202);
			const data = await response.json();
			expect(data).toHaveProperty('processingId');
			expect(data.message).toContain('Processing started');
		});

		test('DELETE /documents/:id - should delete document', async () => {
			const response = await apiContext.delete(`/documents/${documentId}`);
			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data.message).toContain('Document deleted successfully');
		});
	});

	test.describe('Workflow and Agent APIs', () => {
		let workflowId: string;

		test('POST /workflows - should create workflow', async () => {
			const workflowData = {
				name: 'API Test Workflow',
				description: 'Workflow created via brAInwav API',
				agents: [
					{
						name: 'API Test Agent',
						type: 'worker',
						config: {
							model: 'claude-3-sonnet',
							timeout: 30000,
						},
					},
				],
				triggers: {
					manual: true,
					events: ['document.upload'],
				},
			};

			const response = await apiContext.post('/workflows', {
				data: workflowData,
			});

			expect(response.status()).toBe(201);
			const data = await response.json();
			expect(data).toHaveProperty('workflow');
			expect(data.workflow.name).toBe(workflowData.name);
			workflowId = data.workflow.id;
		});

		test('GET /workflows - should list workflows', async () => {
			const response = await apiContext.get('/workflows');
			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('workflows');
			expect(data.workflows).toBeInstanceOf(Array);
		});

		test('POST /workflows/:id/execute - should execute workflow', async () => {
			const response = await apiContext.post(`/workflows/${workflowId}/execute`, {
				data: {
					mode: 'immediate',
					input: {
						testData: 'brAInwav API execution test',
					},
				},
			});

			expect(response.status()).toBe(202);
			const data = await response.json();
			expect(data).toHaveProperty('executionId');
			expect(data.message).toContain('Workflow execution started');
		});

		test('GET /workflows/:id/executions - should list workflow executions', async () => {
			const response = await apiContext.get(`/workflows/${workflowId}/executions`);
			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('executions');
			expect(data.executions).toBeInstanceOf(Array);
		});

		test('GET /agents - should list available agents', async () => {
			const response = await apiContext.get('/agents');
			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('agents');
			expect(data.agents).toBeInstanceOf(Array);

			// Verify brAInwav agents are available
			const agentTypes = data.agents.map((agent: any) => agent.type);
			expect(agentTypes).toContain('document-parser');
			expect(agentTypes).toContain('content-analyzer');
			expect(agentTypes).toContain('rag-specialist');
		});

		test('POST /agents/:id/execute - should execute agent directly', async () => {
			// Get first available agent
			const agentsResponse = await apiContext.get('/agents');
			const agentsData = await agentsResponse.json();
			const firstAgent = agentsData.agents[0];

			const response = await apiContext.post(`/agents/${firstAgent.id}/execute`, {
				data: {
					task: 'Process brAInwav test data',
					input: {
						content: 'Test content for brAInwav agent execution',
						options: {
							model: 'claude-3-sonnet',
						},
					},
				},
			});

			expect(response.status()).toBe(202);
			const data = await response.json();
			expect(data).toHaveProperty('executionId');
		});
	});

	test.describe('RAG and Search APIs', () => {
		let _documentId: string;

		test.beforeAll(async () => {
			// Create a document for RAG testing
			const docResponse = await apiContext.post('/documents', {
				data: {
					title: 'brAInwav RAG Test Document',
					content:
						'brAInwav Cortex-OS is an Autonomous Software Behavior Reasoning (ASBR) runtime that enables sophisticated AI workflows through event-driven architecture and Model Context Protocol integration.',
					tags: ['rag-test', 'brainwav', 'asbr'],
				},
			});
			const docData = await docResponse.json();
			_documentId = docData.document.id;

			// Wait for document processing
			await new Promise((resolve) => setTimeout(resolve, 2000));
		});

		test('POST /search - should perform semantic search', async () => {
			const response = await apiContext.post('/search', {
				data: {
					query: 'What is brAInwav Cortex-OS?',
					limit: 5,
					includeContent: true,
				},
			});

			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('results');
			expect(data.results).toBeInstanceOf(Array);
			expect(data.results.length).toBeGreaterThan(0);

			// Verify search result relevance
			const firstResult = data.results[0];
			expect(firstResult.score).toBeGreaterThan(0);
			expect(firstResult.content).toContain('brAInwav');
		});

		test('POST /rag/query - should perform RAG query', async () => {
			const response = await apiContext.post('/rag/query', {
				data: {
					query: 'Explain ASBR runtime in brAInwav',
					contextWindow: 4000,
					maxResults: 3,
					includeCitations: true,
				},
			});

			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('answer');
			expect(data).toHaveProperty('citations');
			expect(data).toHaveProperty('sources');

			expect(data.answer).toContain('brAInwav');
			expect(data.citations.length).toBeGreaterThan(0);
			expect(data.sources.length).toBeGreaterThan(0);
		});

		test('GET /search/suggestions - should get search suggestions', async () => {
			const response = await apiContext.get('/search/suggestions?q=brainwav');
			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('suggestions');
			expect(data.suggestions).toBeInstanceOf(Array);
		});

		test('POST /search/advanced - should perform advanced search', async () => {
			const response = await apiContext.post('/search/advanced', {
				data: {
					query: 'brAInwav',
					filters: {
						tags: ['brainwav', 'asbr'],
						dateRange: {
							from: '2024-01-01',
							to: '2024-12-31',
						},
						fileType: ['text/plain', 'application/pdf'],
					},
					sort: 'relevance',
					limit: 10,
				},
			});

			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('results');
			expect(data).toHaveProperty('total');
			expect(data).toHaveProperty('filters');
		});
	});

	test.describe('Real-time Communication APIs', () => {
		test('GET /conversations - should list conversations', async () => {
			const response = await apiContext.get('/conversations');
			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('conversations');
			expect(data.conversations).toBeInstanceOf(Array);
		});

		test('POST /conversations - should create conversation', async () => {
			const response = await apiContext.post('/conversations', {
				data: {
					title: 'brAInwav API Test Conversation',
					model: 'claude-3-sonnet',
					systemPrompt: 'You are a helpful brAInwav assistant.',
				},
			});

			expect(response.status()).toBe(201);
			const data = await response.json();
			expect(data).toHaveProperty('conversation');
			expect(data.conversation.title).toBe('brAInwav API Test Conversation');
		});

		test('POST /conversations/:id/messages - should send message', async () => {
			// First create a conversation
			const convResponse = await apiContext.post('/conversations', {
				data: {
					title: 'Message Test Conversation',
					model: 'claude-3-sonnet',
				},
			});
			const convData = await convResponse.json();
			const conversationId = convData.conversation.id;

			// Send a message
			const response = await apiContext.post(`/conversations/${conversationId}/messages`, {
				data: {
					role: 'user',
					content: 'Hello from brAInwav API test!',
				},
			});

			expect(response.status()).toBe(201);
			const data = await response.json();
			expect(data).toHaveProperty('message');
			expect(data.message.role).toBe('user');
			expect(data.message.content).toBe('Hello from brAInwav API test!');
		});

		test('GET /conversations/:id/messages - should retrieve conversation messages', async () => {
			// Create conversation and add message
			const convResponse = await apiContext.post('/conversations', {
				data: {
					title: 'Message Retrieval Test',
					model: 'claude-3-sonnet',
				},
			});
			const convData = await convResponse.json();

			await apiContext.post(`/conversations/${convData.conversation.id}/messages`, {
				data: {
					role: 'user',
					content: 'Test message for brAInwav',
				},
			});

			// Retrieve messages
			const response = await apiContext.get(`/conversations/${convData.conversation.id}/messages`);
			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('messages');
			expect(data.messages).toBeInstanceOf(Array);
			expect(data.messages.length).toBeGreaterThan(0);
		});
	});

	test.describe('Error Handling and Validation', () => {
		test('should handle 404 Not Found errors', async () => {
			const response = await apiContext.get('/nonexistent-endpoint');
			expect(response.status()).toBe(404);
			const data = await response.json();
			expect(data).toHaveProperty('error');
			expect(data.error).toContain('Not Found');
		});

		test('should handle validation errors', async () => {
			const response = await apiContext.post('/documents', {
				data: {
					title: '', // Invalid: empty title
					content: 'Test content',
				},
			});

			expect(response.status()).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty('errors');
			expect(data.errors).toContain('Title is required');
		});

		test('should handle authentication errors', async () => {
			// Create new context without auth token
			const unauthContext = await request.newContext({
				baseURL: 'http://localhost:3001/api',
			});

			const response = await unauthContext.get('/documents');
			expect(response.status()).toBe(401);

			await unauthContext.dispose();
		});

		test('should handle authorization errors', async () => {
			// Try to access admin endpoint as regular user
			const response = await apiContext.get('/admin/users');
			expect(response.status()).toBe(403);
			const data = await response.json();
			expect(data.error).toContain('Access denied');
		});

		test('should handle rate limiting', async () => {
			// Make multiple rapid requests
			const requests = [];
			for (let i = 0; i < 20; i++) {
				requests.push(apiContext.get('/search?q=test'));
			}

			const responses = await Promise.all(requests);
			const rateLimitedResponses = responses.filter((r) => r.status() === 429);

			expect(rateLimitedResponses.length).toBeGreaterThan(0);

			const rateLimitedResponse = rateLimitedResponses[0];
			const data = await rateLimitedResponse.json();
			expect(data.error).toContain('Rate limit exceeded');
		});
	});

	test.describe('Security and Input Validation', () => {
		test('should sanitize input to prevent XSS', async () => {
			const xssPayload = '<script>alert("XSS")</script>';

			const response = await apiContext.post('/documents', {
				data: {
					title: xssPayload,
					content: 'Test content with XSS attempt',
					tags: ['xss-test'],
				},
			});

			expect(response.status()).toBe(201);
			const data = await response.json();

			// Verify script tags are escaped or removed
			expect(data.document.title).not.toContain('<script>');
			expect(data.document.title).not.toContain('alert("XSS")');
		});

		test('should validate JSON payloads', async () => {
			const response = await apiContext.post('/workflows', {
				headers: {
					'Content-Type': 'application/json',
				},
				data: 'invalid json',
			});

			expect(response.status()).toBe(400);
			const data = await response.json();
			expect(data.error).toContain('Invalid JSON');
		});

		test('should enforce request size limits', async () => {
			const largePayload = {
				title: 'Large Payload Test',
				content: 'x'.repeat(10 * 1024 * 1024), // 10MB
			};

			const response = await apiContext.post('/documents', {
				data: largePayload,
				timeout: 5000,
			});

			expect(response.status()).toBe(413);
			const data = await response.json();
			expect(data.error).toContain('Request too large');
		});

		test('should validate and sanitize file uploads', async () => {
			// Test with malicious file type
			const response = await apiContext.post('/documents/upload', {
				multipart: {
					file: {
						name: 'malicious.exe',
						mimeType: 'application/x-executable',
						buffer: Buffer.from('malicious content'),
					},
				},
			});

			expect(response.status()).toBe(400);
			const data = await response.json();
			expect(data.error).toContain('File type not allowed');
		});
	});

	test.describe('Performance and Monitoring', () => {
		test('should include performance headers', async () => {
			const response = await apiContext.get('/documents');
			expect(response.headers()).toHaveProperty('x-response-time');
			expect(response.headers()).toHaveProperty('x-request-id');
		});

		test('should handle concurrent requests', async () => {
			const concurrentRequests = [];
			const startTime = Date.now();

			// Make 10 concurrent requests
			for (let i = 0; i < 10; i++) {
				concurrentRequests.push(apiContext.get('/documents'));
			}

			const responses = await Promise.all(concurrentRequests);
			const endTime = Date.now();

			// All requests should succeed
			responses.forEach((response) => {
				expect(response.ok()).toBeTruthy();
			});

			// Should complete within reasonable time (less than 5 seconds)
			expect(endTime - startTime).toBeLessThan(5000);
		});

		test('should provide health check endpoint', async () => {
			const response = await apiContext.get('/health');
			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('status');
			expect(data.status).toBe('healthy');
			expect(data).toHaveProperty('timestamp');
			expect(data).toHaveProperty('service');
			expect(data.service).toBe('brAInwav Cortex-OS API');
		});

		test('should provide metrics endpoint', async () => {
			const response = await apiContext.get('/metrics');
			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('uptime');
			expect(data).toHaveProperty('memory');
			expect(data).toHaveProperty('requests');
			expect(data).toHaveProperty('errors');
		});
	});
});
