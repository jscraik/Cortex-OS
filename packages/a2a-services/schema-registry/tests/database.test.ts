import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqliteSchemaRepository } from '../src/database.js';
import type { Schema } from '../src/schemas.js';

describe('SqliteSchemaRepository', () => {
	let repository: SqliteSchemaRepository;
	let testSchema: Schema;

	beforeEach(() => {
		// Use in-memory database for testing
		repository = new SqliteSchemaRepository(':memory:');

		testSchema = {
			id: 'test-id',
			name: 'test-schema',
			version: '1.0.0',
			schema: {
				type: 'object',
				properties: {
					name: { type: 'string' },
				},
			},
		};
	});

	afterEach(() => {
		// Clean up is handled automatically for in-memory databases
	});

	it('should save and retrieve a schema', async () => {
		// Save the schema
		await repository.save(testSchema);

		// Retrieve the schema
		const retrieved = await repository.findByNameAndVersion('test-schema', '1.0.0');

		expect(retrieved).not.toBeNull();
		expect(retrieved?.id).toBe(testSchema.id);
		expect(retrieved?.name).toBe(testSchema.name);
		expect(retrieved?.version).toBe(testSchema.version);
		expect(retrieved?.schema).toEqual(testSchema.schema);
	});

	it('should find schemas by name', async () => {
		// Save multiple versions of the same schema
		const schemaV1 = { ...testSchema, version: '1.0.0' };
		const schemaV2 = { ...testSchema, version: '2.0.0' };

		await repository.save(schemaV1);
		await repository.save(schemaV2);

		// Retrieve schemas by name
		const schemas = await repository.findByName('test-schema');

		expect(schemas).toHaveLength(2);
		expect(schemas.map((s) => s.version)).toContain('1.0.0');
		expect(schemas.map((s) => s.version)).toContain('2.0.0');
	});

	it('should find all schemas', async () => {
		// Save multiple schemas
		const schema1 = { ...testSchema, id: 'schema-1', name: 'schema-1' };
		const schema2 = { ...testSchema, id: 'schema-2', name: 'schema-2' };

		await repository.save(schema1);
		await repository.save(schema2);

		// Retrieve all schemas
		const allSchemas = await repository.findAll();

		expect(allSchemas).toHaveLength(2);
		expect(allSchemas.map((s) => s.name)).toContain('schema-1');
		expect(allSchemas.map((s) => s.name)).toContain('schema-2');
	});

	it('should update an existing schema', async () => {
		// Save initial schema
		await repository.save(testSchema);

		// Update the schema
		const updatedSchema = { ...testSchema, schema: { type: 'string' } };
		await repository.save(updatedSchema);

		// Retrieve the updated schema
		const retrieved = await repository.findByNameAndVersion('test-schema', '1.0.0');

		expect(retrieved).not.toBeNull();
		expect(retrieved?.schema).toEqual({ type: 'string' });
	});

	it('should delete a schema by name and version', async () => {
		// Save a schema
		await repository.save(testSchema);

		// Delete the schema
		const deleted = await repository.deleteByNameAndVersion('test-schema', '1.0.0');

		expect(deleted).toBe(true);

		// Try to retrieve the deleted schema
		const retrieved = await repository.findByNameAndVersion('test-schema', '1.0.0');

		expect(retrieved).toBeNull();
	});

	it('should return false when deleting a non-existent schema', async () => {
		const deleted = await repository.deleteByNameAndVersion('non-existent', '1.0.0');
		expect(deleted).toBe(false);
	});
});
