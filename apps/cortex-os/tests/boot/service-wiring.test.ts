import { describe, expect, it } from 'vitest';
import { container } from '../../src/boot';
import { TOKENS } from '../../src/tokens';

describe('Service Container Wiring', () => {
	it('should wire all required services', () => {
		const services = [
			'Memories',
			'Orchestration',
			'MCPGateway',
			'TaskRepository',
			'ProfileRepository',
			'ArtifactRepository',
			'EvidenceRepository',
		];

		for (const serviceName of services) {
			const token = TOKENS[serviceName as keyof typeof TOKENS];
			expect(() => container.get(token)).not.toThrow();

			const service = container.get(token);
			expect(service).toBeDefined();
			expect(service).not.toBeNull();
		}
	});

	it('should implement singleton pattern for stateful services', () => {
		const memories1 = container.get(TOKENS.Memories);
		const memories2 = container.get(TOKENS.Memories);

		expect(memories1).toBe(memories2); // Same instance

		const orchestration1 = container.get(TOKENS.Orchestration);
		const orchestration2 = container.get(TOKENS.Orchestration);

		expect(orchestration1).toBe(orchestration2); // Same instance
	});

	it('should provide functional memory service', async () => {
		const memories = container.get(TOKENS.Memories) as any;

		// Test basic memory operations
		const testRecord = {
			id: 'test-memory-1',
			content: 'Test memory content',
			timestamp: new Date().toISOString(),
		};

		// Save a record
		const saved = await memories.save(testRecord);
		expect(saved.id).toBe('test-memory-1');

		// Retrieve the record
		const retrieved = await memories.get('test-memory-1');
		expect(retrieved).toBeDefined();
		expect(retrieved!.content).toBe('Test memory content');
	});

	it('should provide functional orchestration service', () => {
		const orchestration = container.get(TOKENS.Orchestration) as any;

		// Verify orchestration has expected structure
		expect(orchestration).toHaveProperty('config');
		expect(typeof orchestration.config).toBe('object');
	});

	it('should provide functional MCP gateway', () => {
		const mcpGateway = container.get(TOKENS.MCPGateway);

		// Verify MCP gateway has expected methods
		expect(mcpGateway).toBeDefined();
		expect(typeof mcpGateway).toBe('object');

		// Basic MCP gateway should have tool execution capabilities
		// This is a minimal check - more detailed tests in MCP integration tests
	});

	it('should provide repository services with correct interfaces', () => {
		const taskRepo = container.get(TOKENS.TaskRepository) as any;
		const profileRepo = container.get(TOKENS.ProfileRepository) as any;
		const artifactRepo = container.get(TOKENS.ArtifactRepository) as any;
		const evidenceRepo = container.get(TOKENS.EvidenceRepository) as any;

		// Verify all repositories have expected CRUD methods
		expect(typeof taskRepo.save).toBe('function');
		expect(typeof taskRepo.get).toBe('function');
		expect(typeof taskRepo.list).toBe('function');
		expect(typeof taskRepo.delete).toBe('function');

		expect(typeof profileRepo.save).toBe('function');
		expect(typeof profileRepo.get).toBe('function');
		expect(typeof profileRepo.list).toBe('function');
		expect(typeof profileRepo.delete).toBe('function');

		expect(typeof artifactRepo.save).toBe('function');
		expect(typeof artifactRepo.get).toBe('function');
		expect(typeof artifactRepo.list).toBe('function');
		expect(typeof artifactRepo.delete).toBe('function');

		expect(typeof evidenceRepo.save).toBe('function');
		expect(typeof evidenceRepo.get).toBe('function');
		expect(typeof evidenceRepo.list).toBe('function');
		expect(typeof evidenceRepo.delete).toBe('function');
	});
});
