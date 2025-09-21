#!/usr/bin/env node
/* Generate OpenAPI JSON without external generators (keep it simple) */
const { writeFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const components = {
	AgentConfig: {
		type: 'object',
		properties: {
			seed: { type: 'integer', minimum: 1, default: 1 },
			maxTokens: { type: 'integer', minimum: 1, maximum: 4096, default: 1024 },
			timeoutMs: {
				type: 'integer',
				minimum: 1,
				maximum: 120000,
				default: 30000,
			},
			memory: {
				type: 'object',
				properties: {
					maxItems: { type: 'integer', minimum: 1 },
					maxBytes: { type: 'integer', minimum: 1 },
				},
				required: ['maxItems', 'maxBytes'],
			},
		},
		required: ['seed', 'maxTokens', 'timeoutMs', 'memory'],
	},
	MCPRequest: {
		type: 'object',
		properties: {
			tool: { type: 'string' },
			args: { type: 'object', additionalProperties: true },
		},
		required: ['tool'],
	},
	A2AMessage: {
		type: 'object',
		properties: {
			from: { type: 'string' },
			to: { type: 'string' },
			action: { type: 'string' },
			data: { type: 'object', additionalProperties: true },
		},
		required: ['from', 'to', 'action'],
	},
	RAGQuery: {
		type: 'object',
		properties: {
			query: { type: 'string', minLength: 1 },
			topK: { type: 'integer', minimum: 1, maximum: 100, default: 5 },
		},
		required: ['query'],
	},
	SimlabCommand: {
		type: 'object',
		properties: {
			scenario: { type: 'string' },
			step: { type: 'string' },
			params: { type: 'object', additionalProperties: true },
		},
		required: ['scenario', 'step'],
	},
	MCPBody: {
		type: 'object',
		properties: {
			config: { $ref: '#/components/schemas/AgentConfig' },
			request: { $ref: '#/components/schemas/MCPRequest' },
			json: { type: 'boolean' },
		},
		required: ['config', 'request'],
	},
	A2ABody: {
		type: 'object',
		properties: {
			config: { $ref: '#/components/schemas/AgentConfig' },
			message: { $ref: '#/components/schemas/A2AMessage' },
			json: { type: 'boolean' },
		},
		required: ['config', 'message'],
	},
	RAGBody: {
		type: 'object',
		properties: {
			config: { $ref: '#/components/schemas/AgentConfig' },
			query: { $ref: '#/components/schemas/RAGQuery' },
			json: { type: 'boolean' },
		},
		required: ['config', 'query'],
	},
	SimlabBody: {
		type: 'object',
		properties: {
			config: { $ref: '#/components/schemas/AgentConfig' },
			command: { $ref: '#/components/schemas/SimlabCommand' },
			json: { type: 'boolean' },
		},
		required: ['config', 'command'],
	},
};

const spec = {
	openapi: '3.0.0',
	info: { title: 'Cortex-OS Gateway', version: '0.0.1' },
	components: { schemas: components },
	paths: {
		'/mcp': {
			post: {
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/MCPBody' },
						},
					},
				},
				responses: { 200: { description: 'OK' } },
			},
		},
		'/a2a': {
			post: {
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/A2ABody' },
						},
					},
				},
				responses: { 200: { description: 'OK' } },
			},
		},
		'/rag': {
			post: {
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/RAGBody' },
						},
					},
				},
				responses: { 200: { description: 'OK' } },
			},
		},
		'/simlab': {
			post: {
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/SimlabBody' },
						},
					},
				},
				responses: { 200: { description: 'OK' } },
			},
		},
	},
};

mkdirSync(join(__dirname, '..', 'dist'), { recursive: true });
writeFileSync(join(__dirname, '..', 'openapi.json'), JSON.stringify(spec, null, 2));
console.log('OpenAPI written to packages/gateway/openapi.json');
