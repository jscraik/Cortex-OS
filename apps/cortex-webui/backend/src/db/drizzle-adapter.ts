// Drizzle ORM adapter for memory database
// This provides a compatible interface for drizzle operations

import { eq } from 'drizzle-orm';
import { memoryAdapter } from './memory-adapter';

export interface DrizzleMemoryAdapter {
	select: () => DrizzleSelectBuilder;
	insert: (table: any) => DrizzleInsertBuilder;
	update: (table: any) => DrizzleUpdateBuilder;
	delete: (table: any) => DrizzleDeleteBuilder;
}

interface DrizzleSelectBuilder {
	from: (table: any) => DrizzleSelectFromBuilder;
}

interface DrizzleSelectFromBuilder {
	where: (condition: any) => DrizzleSelectWhereBuilder;
	limit: (limit: number) => Promise<any[]>;
}

interface DrizzleSelectWhereBuilder {
	limit: (limit: number) => Promise<any[]>;
}

interface DrizzleInsertBuilder {
	values: (values: any) => DrizzleInsertValuesBuilder;
}

interface DrizzleInsertValuesBuilder {
	returning: () => Promise<any[]>;
}

interface DrizzleUpdateBuilder {
	set: (values: any) => DrizzleUpdateSetBuilder;
}

interface DrizzleUpdateSetBuilder {
	where: (condition: any) => DrizzleUpdateWhereBuilder;
}

interface DrizzleUpdateWhereBuilder {
	returning: () => Promise<any[]>;
}

interface DrizzleDeleteBuilder {
	where: (condition: any) => DrizzleDeleteWhereBuilder;
}

interface DrizzleDeleteWhereBuilder {
	returning: () => Promise<any[]>;
}

export class DrizzleMemoryAdapterImpl implements DrizzleMemoryAdapter {
	constructor(private db: typeof memoryAdapter) {}

	select() {
		return {
			from: (table: any) => ({
				where: (condition: any) => ({
					limit: async (limit: number) => {
						// Parse condition for simple equality
						const tableName = this.getTableNameFromCondition(condition);
						const conditions = this.parseCondition(condition);

						let results = await this.db.all(`SELECT * FROM ${tableName}`);

						// Apply conditions
						for (const cond of conditions) {
							results = results.filter((row) => row[cond.field] === cond.value);
						}

						return results.slice(0, limit);
					},
				}),
				limit: async (limit: number) => {
					const tableName = this.getTableNameFromTable(table);
					const results = await this.db.all(`SELECT * FROM ${tableName}`);
					return results.slice(0, limit);
				},
			}),
		};
	}

	insert(table: any) {
		return {
			values: (values: any) => ({
				returning: async () => {
					const tableName = this.getTableNameFromTable(table);
					const id = values.id || `id_${Date.now()}`;
					await this.db.run(
						`INSERT INTO ${tableName} (id, ${Object.keys(values)
							.filter((k) => k !== 'id')
							.join(', ')}) VALUES (?, ${Object.keys(values)
							.filter((k) => k !== 'id')
							.map(() => '?')
							.join(', ')})`,
						id,
						...Object.values(values).filter((_v: any, i: number) => i !== 0 || !values.id),
					);
					return [{ id, ...values }];
				},
			}),
		};
	}

	update(table: any) {
		return {
			set: (values: any) => ({
				where: (condition: any) => ({
					returning: async () => {
						const tableName = this.getTableNameFromTable(table);
						const conditions = this.parseCondition(condition);

						let results = await this.db.all(`SELECT * FROM ${tableName}`);

						// Apply conditions to find records to update
						for (const cond of conditions) {
							results = results.filter((row) => row[cond.field] === cond.value);
						}

						// Update each matching record
						for (const record of results) {
							const setClause = Object.keys(values)
								.map((k) => `${k} = ?`)
								.join(', ');
							await this.db.run(
								`UPDATE ${tableName} SET ${setClause} WHERE id = ?`,
								...Object.values(values),
								record.id,
							);
						}

						// Return updated records
						const updatedResults = await this.db.all(`SELECT * FROM ${tableName}`);
						return updatedResults.filter((row) =>
							conditions.some((cond) => row[cond.field] === cond.value),
						);
					},
				}),
			}),
		};
	}

	delete(table: any) {
		return {
			where: (condition: any) => ({
				returning: async () => {
					const tableName = this.getTableNameFromTable(table);
					const conditions = this.parseCondition(condition);

					const results = await this.db.all(`SELECT * FROM ${tableName}`);

					// Apply conditions to find records to delete
					const toDelete = results.filter((row) =>
						conditions.some((cond) => row[cond.field] === cond.value),
					);

					// Delete each matching record
					for (const record of toDelete) {
						await this.db.run(`DELETE FROM ${tableName} WHERE id = ?`, record.id);
					}

					return toDelete;
				},
			}),
		};
	}

	private getTableNameFromTable(table: any): string {
		// Extract table name from drizzle table object
		return table._?.name || 'unknown';
	}

	private getTableNameFromCondition(condition: any): string {
		// Extract table name from drizzle condition
		return condition.left?.table?._?.name || 'unknown';
	}

	private parseCondition(condition: any): { field: string; value: any }[] {
		const conditions: { field: string; value: any }[] = [];

		if (condition.left && condition.right) {
			// Simple equality condition
			conditions.push({
				field: condition.left.name,
				value: condition.right.value,
			});
		}

		return conditions;
	}
}

// Create a singleton instance
export const drizzleMemoryAdapter = new DrizzleMemoryAdapterImpl(memoryAdapter);

// Export the eq function from drizzle-orm
export { eq };
