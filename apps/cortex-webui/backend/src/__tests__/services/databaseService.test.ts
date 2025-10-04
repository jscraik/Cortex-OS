/**
 * Database Service Tests
 * Goal: Achieve 95% coverage on database operations
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db';
import {
	databaseService,
	type QueryOptions,
	type TransactionOptions,
} from '../../services/databaseService';

// Mock the database
vi.mock('../../db', () => ({
	db: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		transaction: vi.fn(),
	},
}));

describe('Database Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Query Operations', () => {
		describe('findById', () => {
			it('should find record by ID', async () => {
				const mockRecord = { id: '123', name: 'Test Record' };
				const mockSelect = {
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockResolvedValue([mockRecord]),
				};
				vi.mocked(db.select).mockReturnValue(mockSelect as any);

				const result = await databaseService.findById('users', '123');

				expect(result).toEqual(mockRecord);
				expect(db.select).toHaveBeenCalled();
				expect(mockSelect.from).toHaveBeenCalledWith('users');
				expect(mockSelect.where).toHaveBeenCalled();
			});

			it('should return null for non-existent record', async () => {
				const mockSelect = {
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockResolvedValue([]),
				};
				vi.mocked(db.select).mockReturnValue(mockSelect as any);

				const result = await databaseService.findById('users', 'non-existent');

				expect(result).toBeNull();
			});

			it('should handle database errors', async () => {
				const mockSelect = {
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockRejectedValue(new Error('Connection failed')),
				};
				vi.mocked(db.select).mockReturnValue(mockSelect as any);

				await expect(databaseService.findById('users', '123')).rejects.toThrow('Connection failed');
			});
		});

		describe('findOne', () => {
			it('should find one record matching criteria', async () => {
				const mockRecord = { id: '123', email: 'test@example.com' };
				const mockSelect = {
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					limit: vi.fn().mockResolvedValue([mockRecord]),
				};
				vi.mocked(db.select).mockReturnValue(mockSelect as any);

				const result = await databaseService.findOne('users', {
					email: 'test@example.com',
				});

				expect(result).toEqual(mockRecord);
			});

			it('should return null when no record found', async () => {
				const mockSelect = {
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					limit: vi.fn().mockResolvedValue([]),
				};
				vi.mocked(db.select).mockReturnValue(mockSelect as any);

				const result = await databaseService.findOne('users', {
					email: 'notfound@example.com',
				});

				expect(result).toBeNull();
			});
		});

		describe('findMany', () => {
			it('should find multiple records', async () => {
				const mockRecords = [
					{ id: '1', name: 'Record 1' },
					{ id: '2', name: 'Record 2' },
				];
				const mockSelect = {
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					limit: vi.fn().mockReturnThis(),
					offset: vi.fn().mockResolvedValue(mockRecords),
				};
				vi.mocked(db.select).mockReturnValue(mockSelect as any);

				const options: QueryOptions = {
					where: { active: true },
					orderBy: { createdAt: 'desc' },
					limit: 10,
					offset: 0,
				};

				const result = await databaseService.findMany('users', options);

				expect(result).toEqual(mockRecords);
				expect(mockSelect.where).toHaveBeenCalledWith({ active: true });
				expect(mockSelect.orderBy).toHaveBeenCalledWith({ createdAt: 'desc' });
				expect(mockSelect.limit).toHaveBeenCalledWith(10);
				expect(mockSelect.offset).toHaveBeenCalledWith(0);
			});

			it('should return empty array for no matches', async () => {
				const mockSelect = {
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					limit: vi.fn().mockReturnThis(),
					offset: vi.fn().mockResolvedValue([]),
				};
				vi.mocked(db.select).mockReturnValue(mockSelect as any);

				const result = await databaseService.findMany('users', {
					where: { active: false },
				});

				expect(result).toEqual([]);
			});
		});

		describe('create', () => {
			it('should create a new record', async () => {
				const newRecord = { name: 'New User', email: 'new@example.com' };
				const createdRecord = { id: '123', ...newRecord, createdAt: new Date() };
				const mockInsert = {
					into: vi.fn().mockReturnThis(),
					values: vi.fn().mockResolvedValue([createdRecord]),
				};
				vi.mocked(db.insert).mockReturnValue(mockInsert as any);

				const result = await databaseService.create('users', newRecord);

				expect(result).toEqual(createdRecord);
				expect(mockInsert.into).toHaveBeenCalledWith('users');
				expect(mockInsert.values).toHaveBeenCalledWith(newRecord);
			});

			it('should handle validation errors', async () => {
				const invalidRecord = { email: 'invalid-email' };
				const mockInsert = {
					into: vi.fn().mockReturnThis(),
					values: vi.fn().mockRejectedValue(new Error('Validation failed')),
				};
				vi.mocked(db.insert).mockReturnValue(mockInsert as any);

				await expect(databaseService.create('users', invalidRecord)).rejects.toThrow(
					'Validation failed',
				);
			});
		});

		describe('update', () => {
			it('should update existing record', async () => {
				const updateData = { name: 'Updated Name' };
				const updatedRecord = { id: '123', ...updateData };
				const mockUpdate = {
					set: vi.fn().mockReturnThis(),
					where: vi.fn().mockResolvedValue([updatedRecord]),
				};
				vi.mocked(db.update).mockReturnValue(mockUpdate as any);

				const result = await databaseService.update('users', '123', updateData);

				expect(result).toEqual(updatedRecord);
				expect(mockUpdate.set).toHaveBeenCalledWith(updateData);
				expect(mockUpdate.where).toHaveBeenCalled();
			});

			it('should return null when updating non-existent record', async () => {
				const mockUpdate = {
					set: vi.fn().mockReturnThis(),
					where: vi.fn().mockResolvedValue([]),
				};
				vi.mocked(db.update).mockReturnValue(mockUpdate as any);

				const result = await databaseService.update('users', 'non-existent', {
					name: 'Updated',
				});

				expect(result).toBeNull();
			});
		});

		describe('delete', () => {
			it('should delete record by ID', async () => {
				const mockDelete = {
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockResolvedValue([1]), // Number of deleted rows
				};
				vi.mocked(db.delete).mockReturnValue(mockDelete as any);

				const result = await databaseService.delete('users', '123');

				expect(result).toBe(true);
				expect(mockDelete.from).toHaveBeenCalledWith('users');
				expect(mockDelete.where).toHaveBeenCalled();
			});

			it('should return false when deleting non-existent record', async () => {
				const mockDelete = {
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockResolvedValue([]),
				};
				vi.mocked(db.delete).mockReturnValue(mockDelete as any);

				const result = await databaseService.delete('users', 'non-existent');

				expect(result).toBe(false);
			});
		});
	});

	describe('Transaction Operations', () => {
		it('should execute transaction successfully', async () => {
			const mockTx = {
				rollback: vi.fn(),
				commit: vi.fn(),
			};
			const mockSelect = {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockResolvedValue([{ id: '1', balance: 100 }]),
			};
			const mockUpdate = {
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockResolvedValue([{ id: '1', balance: 90 }]),
			};

			vi.mocked(db.transaction).mockImplementation(async (callback) => {
				return await callback(mockTx);
			});
			vi.mocked(db.select).mockReturnValue(mockSelect as any);
			vi.mocked(db.update).mockReturnValue(mockUpdate as any);

			const options: TransactionOptions = {
				isolationLevel: 'READ_COMMITTED',
			};

			const result = await databaseService.transaction(async (_tx) => {
				const user = await databaseService.findById('users', '1');
				await databaseService.update('users', '1', { balance: 90 });
				return user;
			}, options);

			expect(result).toEqual({ id: '1', balance: 100 });
			expect(db.transaction).toHaveBeenCalled();
			expect(mockTx.commit).toHaveBeenCalled();
			expect(mockTx.rollback).not.toHaveBeenCalled();
		});

		it('should rollback on error', async () => {
			const mockTx = {
				rollback: vi.fn(),
				commit: vi.fn(),
			};

			vi.mocked(db.transaction).mockImplementation(async (callback) => {
				return await callback(mockTx);
			});

			try {
				await databaseService.transaction(async () => {
					throw new Error('Transaction failed');
				});
			} catch (_error) {
				// Expected
			}

			expect(mockTx.rollback).toHaveBeenCalled();
			expect(mockTx.commit).not.toHaveBeenCalled();
		});
	});

	describe('Query Builder', () => {
		it('should build complex queries', async () => {
			const mockRecords = [
				{ id: '1', status: 'active', role: 'user' },
				{ id: '2', status: 'active', role: 'admin' },
			];
			const mockSelect = {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				andWhere: vi.fn().mockReturnThis(),
				orWhere: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				having: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				offset: vi.fn().mockResolvedValue(mockRecords),
			};
			vi.mocked(db.select).mockReturnValue(mockSelect as any);

			const query = databaseService
				.query('users')
				.where('active', true)
				.andWhere('status', 'verified')
				.orWhere('role', 'admin')
				.orderBy('createdAt', 'desc')
				.groupBy('department')
				.having('COUNT(*)', '>', 5)
				.limit(20)
				.offset(10);

			const result = await query.execute();

			expect(result).toEqual(mockRecords);
		});

		it('should support joins', async () => {
			const mockRecords = [
				{
					user: { id: '1', name: 'User 1' },
					profile: { id: '1', bio: 'Bio 1' },
				},
			];
			const mockSelect = {
				from: vi.fn().mockReturnThis(),
				leftJoin: vi.fn().mockReturnThis(),
				innerJoin: vi.fn().mockReturnThis(),
				rightJoin: vi.fn().mockReturnThis(),
				where: vi.fn().mockResolvedValue(mockRecords),
			};
			vi.mocked(db.select).mockReturnValue(mockSelect as any);

			const result = await databaseService
				.query('users')
				.leftJoin('profiles', 'users.id', 'profiles.userId')
				.where('users.active', true)
				.execute();

			expect(result).toEqual(mockRecords);
			expect(mockSelect.leftJoin).toHaveBeenCalledWith('profiles', 'users.id', 'profiles.userId');
		});
	});

	describe('Performance and Caching', () => {
		it('should cache query results', async () => {
			const mockRecord = { id: '1', name: 'Cached User' };
			const mockSelect = {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockResolvedValueOnce([mockRecord]),
			};
			vi.mocked(db.select).mockReturnValue(mockSelect as any);

			// First call
			const result1 = await databaseService.findById('users', '1', {
				cache: true,
				ttl: 300,
			});

			// Second call should use cache
			const result2 = await databaseService.findById('users', '1', {
				cache: true,
				ttl: 300,
			});

			expect(result1).toEqual(mockRecord);
			expect(result2).toEqual(mockRecord);
			expect(mockSelect.where).toHaveBeenCalledTimes(1); // Called only once due to cache
		});

		it('should handle connection pooling', async () => {
			const mockRecords = [{ id: '1' }, { id: '2' }, { id: '3' }];
			const mockSelect = {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockResolvedValue(mockRecords),
			};
			vi.mocked(db.select).mockReturnValue(mockSelect as any);

			// Simulate concurrent requests
			const promises = Array(10)
				.fill(null)
				.map(() => databaseService.findMany('users', { active: true }));

			const results = await Promise.all(promises);

			expect(results).toHaveLength(10);
			results.forEach((result) => {
				expect(result).toEqual(mockRecords);
			});
		});
	});

	describe('Error Handling', () => {
		it('should handle connection timeouts', async () => {
			const mockSelect = {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockRejectedValue(new Error('Connection timeout')),
			};
			vi.mocked(db.select).mockReturnValue(mockSelect as any);

			await expect(databaseService.findById('users', '1')).rejects.toThrow('Connection timeout');
		});

		it('should handle constraint violations', async () => {
			const mockInsert = {
				into: vi.fn().mockReturnThis(),
				values: vi.fn().mockRejectedValue(new Error('UNIQUE constraint failed')),
			};
			vi.mocked(db.insert).mockReturnValue(mockInsert as any);

			await expect(
				databaseService.create('users', { email: 'duplicate@example.com' }),
			).rejects.toThrow('UNIQUE constraint failed');
		});

		it('should handle foreign key violations', async () => {
			const mockInsert = {
				into: vi.fn().mockReturnThis(),
				values: vi.fn().mockRejectedValue(new Error('FOREIGN KEY constraint failed')),
			};
			vi.mocked(db.insert).mockReturnValue(mockInsert as any);

			await expect(databaseService.create('posts', { userId: 'non-existent' })).rejects.toThrow(
				'FOREIGN KEY constraint failed',
			);
		});
	});

	describe('Database Health Checks', () => {
		it('should verify database connection', async () => {
			const mockSelect = {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockResolvedValue([{ connected: true }]),
			};
			vi.mocked(db.select).mockReturnValue(mockSelect as any);

			const isHealthy = await databaseService.healthCheck();

			expect(isHealthy).toBe(true);
		});

		it('should detect database unavailability', async () => {
			const mockSelect = {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockRejectedValue(new Error('Database unavailable')),
			};
			vi.mocked(db.select).mockReturnValue(mockSelect as any);

			const isHealthy = await databaseService.healthCheck();

			expect(isHealthy).toBe(false);
		});

		it('should check table existence', async () => {
			const mockSelect = {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockResolvedValue([{ name: 'users' }]),
			};
			vi.mocked(db.select).mockReturnValue(mockSelect as any);

			const tableExists = await databaseService.tableExists('users');

			expect(tableExists).toBe(true);
		});
	});

	describe('Batch Operations', () => {
		it('should perform batch insert', async () => {
			const records = [
				{ name: 'User 1', email: 'user1@example.com' },
				{ name: 'User 2', email: 'user2@example.com' },
			];
			const mockInsert = {
				into: vi.fn().mockReturnThis(),
				values: vi.fn().mockResolvedValue(records.map((r, i) => ({ ...r, id: String(i + 1) }))),
			};
			vi.mocked(db.insert).mockReturnValue(mockInsert as any);

			const result = await databaseService.batchInsert('users', records);

			expect(result).toHaveLength(2);
			expect(result[0]).toHaveProperty('id');
			expect(mockInsert.values).toHaveBeenCalledWith(records);
		});

		it('should perform batch update', async () => {
			const updates = [
				{ id: '1', status: 'active' },
				{ id: '2', status: 'inactive' },
			];
			const mockUpdate = {
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockResolvedValue(updates),
			};
			vi.mocked(db.update).mockReturnValue(mockUpdate as any);

			const result = await databaseService.batchUpdate('users', updates);

			expect(result).toHaveLength(2);
			expect(result[0].status).toBe('active');
			expect(result[1].status).toBe('inactive');
		});

		it('should perform batch delete', async () => {
			const ids = ['1', '2', '3'];
			const mockDelete = {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockResolvedValue(ids.length), // Number of deleted rows
			};
			vi.mocked(db.delete).mockReturnValue(mockDelete as any);

			const deletedCount = await databaseService.batchDelete('users', ids);

			expect(deletedCount).toBe(3);
		});
	});
});
