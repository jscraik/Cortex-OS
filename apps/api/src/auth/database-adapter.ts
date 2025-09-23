import { createId } from '@cortex-os/a2a-core';
import type { BetterAuthOptions, Database } from 'better-auth';

// In-memory storage for demonstration
// In production, this should be replaced with a real database
class InMemoryDatabase implements Database {
	private users = new Map<string, any>();
	private sessions = new Map<string, any>();
	private accounts = new Map<string, any>();
	private verifications = new Map<string, any>();

	async create(data: any): Promise<any> {
		const id = createId();
		const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };

		if (data.model === 'user') {
			this.users.set(id, record);
		} else if (data.model === 'session') {
			this.sessions.set(id, record);
		} else if (data.model === 'account') {
			this.accounts.set(id, record);
		} else if (data.model === 'verification') {
			this.verifications.set(id, record);
		}

		return record;
	}

	async findMany(args: any): Promise<any[]> {
		let results: any[] = [];

		if (args.model === 'user') {
			results = Array.from(this.users.values());
		} else if (args.model === 'session') {
			results = Array.from(this.sessions.values());
		} else if (args.model === 'account') {
			results = Array.from(this.accounts.values());
		} else if (args.model === 'verification') {
			results = Array.from(this.verifications.values());
		}

		// Apply filters
		if (args.where) {
			results = results.filter((record) => {
				return Object.entries(args.where).every(([key, value]) => {
					if (typeof value === 'object' && value !== null) {
						if (value.equals) return record[key] === value.equals;
						if (value.in) return value.in.includes(record[key]);
					}
					return record[key] === value;
				});
			});
		}

		return results;
	}

	async findUnique(args: any): Promise<any | null> {
		const results = await this.findMany({
			model: args.model,
			where: args.where,
		});
		return results[0] || null;
	}

	async update(args: any): Promise<any> {
		let record = null;

		if (args.model === 'user') {
			record = this.users.get(args.where.id);
		} else if (args.model === 'session') {
			record = this.sessions.get(args.where.id);
		} else if (args.model === 'account') {
			record = this.accounts.get(args.where.id);
		} else if (args.model === 'verification') {
			record = this.verifications.get(args.where.id);
		}

		if (record) {
			const updated = { ...record, ...args.data, updatedAt: new Date() };

			if (args.model === 'user') {
				this.users.set(args.where.id, updated);
			} else if (args.model === 'session') {
				this.sessions.set(args.where.id, updated);
			} else if (args.model === 'account') {
				this.accounts.set(args.where.id, updated);
			} else if (args.model === 'verification') {
				this.verifications.set(args.where.id, updated);
			}

			return updated;
		}

		return null;
	}

	async delete(args: any): Promise<any> {
		let record = null;

		if (args.model === 'user') {
			record = this.users.get(args.where.id);
			this.users.delete(args.where.id);
		} else if (args.model === 'session') {
			record = this.sessions.get(args.where.id);
			this.sessions.delete(args.where.id);
		} else if (args.model === 'account') {
			record = this.accounts.get(args.where.id);
			this.accounts.delete(args.where.id);
		} else if (args.model === 'verification') {
			record = this.verifications.get(args.where.id);
			this.verifications.delete(args.where.id);
		}

		return record;
	}

	// Helper methods for Better Auth
	async createUser(data: any) {
		return this.create({
			model: 'user',
			data: {
				email: data.email,
				name: data.name,
				emailVerified: false,
				image: data.image,
			},
		});
	}

	async createSession(data: any) {
		return this.create({
			model: 'session',
			data: {
				userId: data.userId,
				token: data.token,
				expires: data.expires,
			},
		});
	}

	async createAccount(data: any) {
		return this.create({
			model: 'account',
			data: {
				userId: data.userId,
				provider: data.provider,
				providerAccountId: data.providerAccountId,
			},
		});
	}

	async createVerification(data: any) {
		return this.create({
			model: 'verification',
			data: {
				identifier: data.identifier,
				token: data.token,
				expires: data.expires,
				type: data.type,
			},
		});
	}
}

export class DatabaseAdapter {
	private db: InMemoryDatabase;

	constructor() {
		this.db = new InMemoryDatabase();
	}

	getAdapter() {
		return this.db;
	}
}
