// OpenAPI/Swagger documentation configuration

import type { SwaggerDefinition } from 'swagger-jsdoc';
import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
	openapi: '3.0.0',
	info: {
		title: 'Cortex WebUI API',
		version: '1.0.0',
		description: 'A modern web interface API for AI models with real-time chat capabilities',
		license: {
			name: 'Apache 2.0',
			url: 'https://www.apache.org/licenses/LICENSE-2.0.html',
		},
		contact: {
			name: 'brAInwav',
			email: 'support@cortex-os.com',
		},
	},
	servers: [
		{
			url: 'http://localhost:3001',
			description: 'Development server',
		},
		{
			url: 'https://api.cortex-webui.com',
			description: 'Production server',
		},
	],
	components: {
		securitySchemes: {
			BearerAuth: {
				type: 'http',
				scheme: 'bearer',
				bearerFormat: 'JWT',
				description: 'JWT Bearer token authentication',
			},
			ApiKeyAuth: {
				type: 'apiKey',
				in: 'header',
				name: 'X-API-Key',
				description: 'API key authentication for external integrations',
			},
		},
		schemas: {
			User: {
				type: 'object',
				properties: {
					id: {
						type: 'string',
						format: 'uuid',
						description: 'Unique user identifier',
					},
					email: {
						type: 'string',
						format: 'email',
						description: 'User email address',
					},
					role: {
						type: 'string',
						enum: ['admin', 'user', 'guest'],
						description: 'User role for access control',
					},
					createdAt: {
						type: 'string',
						format: 'date-time',
						description: 'Account creation timestamp',
					},
					updatedAt: {
						type: 'string',
						format: 'date-time',
						description: 'Last account update timestamp',
					},
				},
				required: ['id', 'email', 'role'],
			},
			Conversation: {
				type: 'object',
				properties: {
					id: {
						type: 'string',
						format: 'uuid',
						description: 'Unique conversation identifier',
					},
					title: {
						type: 'string',
						description: 'Conversation title',
						maxLength: 255,
					},
					userId: {
						type: 'string',
						format: 'uuid',
						description: 'ID of the user who owns this conversation',
					},
					model: {
						type: 'string',
						description: 'AI model used in this conversation',
						example: 'gpt-4',
					},
					createdAt: {
						type: 'string',
						format: 'date-time',
						description: 'Conversation creation timestamp',
					},
					updatedAt: {
						type: 'string',
						format: 'date-time',
						description: 'Last conversation update timestamp',
					},
				},
				required: ['id', 'title', 'userId', 'model'],
			},
			Message: {
				type: 'object',
				properties: {
					id: {
						type: 'string',
						format: 'uuid',
						description: 'Unique message identifier',
					},
					conversationId: {
						type: 'string',
						format: 'uuid',
						description: 'ID of the conversation this message belongs to',
					},
					role: {
						type: 'string',
						enum: ['user', 'assistant', 'system'],
						description: 'Message role (user, assistant, or system)',
					},
					content: {
						type: 'string',
						description: 'Message content',
					},
					metadata: {
						type: 'object',
						description: 'Additional message metadata',
						properties: {
							model: { type: 'string' },
							temperature: { type: 'number' },
							tokens: { type: 'integer' },
						},
					},
					createdAt: {
						type: 'string',
						format: 'date-time',
						description: 'Message creation timestamp',
					},
				},
				required: ['id', 'conversationId', 'role', 'content'],
			},
			Error: {
				type: 'object',
				properties: {
					error: {
						type: 'string',
						description: 'Error type or code',
					},
					message: {
						type: 'string',
						description: 'Human-readable error message',
					},
					details: {
						type: 'string',
						description: 'Additional error details (development only)',
					},
					timestamp: {
						type: 'string',
						format: 'date-time',
						description: 'Error occurrence timestamp',
					},
				},
				required: ['error', 'message', 'timestamp'],
			},
			HealthCheck: {
				type: 'object',
				properties: {
					status: {
						type: 'string',
						enum: ['healthy', 'degraded', 'unhealthy'],
						description: 'Overall system health status',
					},
					checks: {
						type: 'object',
						description: 'Individual component health checks',
						additionalProperties: {
							type: 'object',
							properties: {
								status: {
									type: 'string',
									enum: ['pass', 'fail', 'warn'],
								},
								message: { type: 'string' },
								observedValue: { type: 'number' },
								observedUnit: { type: 'string' },
								componentId: { type: 'string' },
								componentType: { type: 'string' },
							},
						},
					},
					timestamp: {
						type: 'string',
						format: 'date-time',
					},
					uptime: {
						type: 'number',
						description: 'Server uptime in seconds',
					},
					version: {
						type: 'string',
						description: 'Application version',
					},
				},
				required: ['status', 'checks', 'timestamp', 'uptime'],
			},
		},
		responses: {
			UnauthorizedError: {
				description: 'Authentication information is missing or invalid',
				content: {
					'application/json': {
						schema: {
							$ref: '#/components/schemas/Error',
						},
					},
				},
			},
			ForbiddenError: {
				description: 'Access denied - insufficient permissions',
				content: {
					'application/json': {
						schema: {
							$ref: '#/components/schemas/Error',
						},
					},
				},
			},
			NotFoundError: {
				description: 'The requested resource was not found',
				content: {
					'application/json': {
						schema: {
							$ref: '#/components/schemas/Error',
						},
					},
				},
			},
			ValidationError: {
				description: 'Validation error in request data',
				content: {
					'application/json': {
						schema: {
							allOf: [
								{ $ref: '#/components/schemas/Error' },
								{
									type: 'object',
									properties: {
										validationErrors: {
											type: 'array',
											items: {
												type: 'object',
												properties: {
													field: { type: 'string' },
													message: { type: 'string' },
													value: { type: 'string' },
												},
											},
										},
									},
								},
							],
						},
					},
				},
			},
			RateLimitError: {
				description: 'Rate limit exceeded',
				headers: {
					'RateLimit-Limit': {
						schema: { type: 'integer' },
						description: 'Request limit per window',
					},
					'RateLimit-Remaining': {
						schema: { type: 'integer' },
						description: 'Requests remaining in current window',
					},
					'RateLimit-Reset': {
						schema: { type: 'integer' },
						description: 'Time when rate limit resets (Unix timestamp)',
					},
				},
				content: {
					'application/json': {
						schema: {
							allOf: [
								{ $ref: '#/components/schemas/Error' },
								{
									type: 'object',
									properties: {
										retryAfter: {
											type: 'integer',
											description: 'Seconds to wait before retrying',
										},
									},
								},
							],
						},
					},
				},
			},
		},
	},
	tags: [
		{
			name: 'Health',
			description: 'System health and monitoring endpoints',
		},
		{
			name: 'Authentication',
			description: 'User authentication and session management',
		},
		{
			name: 'Conversations',
			description: 'Chat conversation management',
		},
		{
			name: 'Messages',
			description: 'Chat message operations',
		},
		{
			name: 'Models',
			description: 'AI model management and configuration',
		},
		{
			name: 'Files',
			description: 'File upload and management',
		},
	],
};

const options: swaggerJSDoc.Options = {
	definition: swaggerDefinition,
	apis: [
		'./src/controllers/*.ts', // Path to the API controllers
		'./src/routes/*.ts', // Path to the API routes
		'./src/server.ts', // Main server file
	],
};

export const swaggerSpec = swaggerJSDoc(options);

// Export types for use in controllers
export type { SwaggerDefinition };
