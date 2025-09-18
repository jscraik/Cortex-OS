import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Import schemas
const agentCoordinationRequestedSchema = await import(
	'../cloudevents/agent-coordination-requested.json'
);
const agentTaskCompletedSchema = await import('../cloudevents/agent-task-completed.json');
const agentTaskFailedSchema = await import('../cloudevents/agent-task-failed.json');
const agentTaskRequestedSchema = await import('../cloudevents/agent-task-requested.json');

// Test data
const validAgentTaskRequested = {
	id: '123e4567-e89b-12d3-a456-426614174000',
	type: 'agent.task.requested',
	source: 'external-client',
	subject: 'agent-a:data.process',
	time: '2025-08-27T10:30:00Z',
	data: {
		taskId: '456e7890-e89b-12d3-a456-426614174001',
		taskType: 'data.process',
		payload: {
			document: 'sample-document.txt',
			options: { extractMetadata: true },
		},
		priority: 'high',
		timeout: 30000,
	},
};

const validAgentTaskCompleted = {
	id: '789e0123-e89b-12d3-a456-426614174002',
	type: 'agent.task.completed',
	source: 'agent-a',
	subject: 'agent-a:data.process',
	time: '2025-08-27T10:30:05Z',
	data: {
		taskId: '456e7890-e89b-12d3-a456-426614174001',
		result: {
			processed: true,
			extractedContent: 'Sample document content...',
			metadata: { wordCount: 150, language: 'en' },
		},
		executionTime: 5000,
	},
};

const validAgentTaskFailed = {
	id: '321e6547-e89b-12d3-a456-426614174003',
	type: 'agent.task.failed',
	source: 'agent-a',
	subject: 'agent-a:data.process',
	time: '2025-08-27T10:30:05Z',
	data: {
		taskId: '456e7890-e89b-12d3-a456-426614174001',
		error: 'Document processing failed: invalid format',
		errorCode: 'INVALID_FORMAT',
		executionTime: 2000,
		retryable: true,
	},
};

const validAgentCoordinationRequested = {
	id: '654e9870-e89b-12d3-a456-426614174004',
	type: 'agent.coordination.requested',
	source: 'external-client',
	subject: 'agent-b:coordination',
	time: '2025-08-27T10:30:00Z',
	data: {
		coordinationId: '987e6543-e89b-12d3-a456-426614174005',
		workflowType: 'document.process',
		participants: ['agent-a', 'agent-b'],
		payload: {
			document: 'complex-document.pdf',
			requirements: ['extract', 'analyze', 'summarize'],
		},
		priority: 'high',
		deadline: '2025-08-27T11:00:00Z',
	},
};

describe('CloudEvents Schemas Validation', () => {
	let ajv: Ajv;

	beforeAll(() => {
		ajv = new Ajv({
			allErrors: true,
			verbose: true,
			strict: false,
		});
		addFormats(ajv);
	});

	describe('Agent Task Requested Schema', () => {
		let validate: unknown;

		beforeAll(() => {
			validate = ajv.compile(agentTaskRequestedSchema);
		});

		it('should validate a correct agent task requested event', () => {
			const result = validate(validAgentTaskRequested);
			expect(result).toBe(true);
			expect(validate.errors).toBeNull();
		});

		it('should reject an event with missing required fields', () => {
			const invalidEvent = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				type: 'agent.task.requested',
				source: 'external-client',
				// Missing subject, time, and data
			};

			const result = validate(invalidEvent);
			expect(result).toBe(false);
			expect(validate.errors).toBeDefined();
		});

		it('should reject an event with invalid task type', () => {
			const invalidEvent = {
				...validAgentTaskRequested,
				data: {
					...validAgentTaskRequested.data,
					taskType: 123, // Should be string
				},
			};

			const result = validate(invalidEvent);
			expect(result).toBe(false);
			expect(validate.errors).toBeDefined();
		});
	});

	describe('Agent Task Completed Schema', () => {
		let validate: unknown;

		beforeAll(() => {
			validate = ajv.compile(agentTaskCompletedSchema);
		});

		it('should validate a correct agent task completed event', () => {
			const result = validate(validAgentTaskCompleted);
			expect(result).toBe(true);
			expect(validate.errors).toBeNull();
		});

		it('should reject an event with invalid execution time', () => {
			const invalidEvent = {
				...validAgentTaskCompleted,
				data: {
					...validAgentTaskCompleted.data,
					executionTime: '5000', // Should be number
				},
			};

			const result = validate(invalidEvent);
			expect(result).toBe(false);
			expect(validate.errors).toBeDefined();
		});
	});

	describe('Agent Task Failed Schema', () => {
		let validate: unknown;

		beforeAll(() => {
			validate = ajv.compile(agentTaskFailedSchema);
		});

		it('should validate a correct agent task failed event', () => {
			const result = validate(validAgentTaskFailed);
			expect(result).toBe(true);
			expect(validate.errors).toBeNull();
		});

		it('should validate an event with optional error code', () => {
			const eventWithoutErrorCode = {
				...validAgentTaskFailed,
				data: {
					...validAgentTaskFailed.data,
					errorCode: undefined,
				},
			};

			const result = validate(eventWithoutErrorCode);
			expect(result).toBe(true);
			expect(validate.errors).toBeNull();
		});
	});

	describe('Agent Coordination Requested Schema', () => {
		let validate: unknown;

		beforeAll(() => {
			validate = ajv.compile(agentCoordinationRequestedSchema);
		});

		it('should validate a correct agent coordination requested event', () => {
			const result = validate(validAgentCoordinationRequested);
			expect(result).toBe(true);
			expect(validate.errors).toBeNull();
		});

		it('should reject an event with empty participants array', () => {
			const invalidEvent = {
				...validAgentCoordinationRequested,
				data: {
					...validAgentCoordinationRequested.data,
					participants: [],
				},
			};

			const result = validate(invalidEvent);
			expect(result).toBe(false);
			expect(validate.errors).toBeDefined();
		});
	});

	describe('Schema Consistency', () => {
		it('should have consistent CloudEvents structure across all schemas', () => {
			const schemas = [
				agentTaskRequestedSchema,
				agentTaskCompletedSchema,
				agentTaskFailedSchema,
				agentCoordinationRequestedSchema,
			];

			schemas.forEach((schema) => {
				expect(schema.properties).toHaveProperty('id');
				expect(schema.properties).toHaveProperty('type');
				expect(schema.properties).toHaveProperty('source');
				expect(schema.properties).toHaveProperty('subject');
				expect(schema.properties).toHaveProperty('time');
				expect(schema.properties).toHaveProperty('data');
				expect(schema.required).toContain('id');
				expect(schema.required).toContain('type');
				expect(schema.required).toContain('source');
				expect(schema.required).toContain('subject');
				expect(schema.required).toContain('time');
				expect(schema.required).toContain('data');
			});
		});
	});
});
