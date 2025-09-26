import { randomUUID } from 'node:crypto';

type ModelRecord = {
	id: string;
	createdAt: Date;
	updatedAt: Date;
} & Record<string, unknown>;

type ScalarFilter = {
	readonly equals?: unknown;
	readonly in?: readonly unknown[];
};

type WhereValue = ScalarFilter | string | number | boolean | Date | null | undefined;

type WhereClause = Record<string, WhereValue>;

type CreateArgs = {
	readonly model: ModelName;
	readonly data: Record<string, unknown>;
};

type QueryArgs = {
	readonly model: ModelName;
	readonly where?: WhereClause;
};

type FindUniqueArgs = {
	readonly model: ModelName;
	readonly where: WhereClause;
};

type UpdateArgs = {
	readonly model: ModelName;
	readonly where: { id: string };
	readonly data: Record<string, unknown>;
};

type DeleteArgs = {
	readonly model: ModelName;
	readonly where: { id: string };
};

type UserCreateInput = {
	readonly email: string;
	readonly name?: string | null;
	readonly image?: string | null;
};

type SessionCreateInput = {
	readonly userId: string;
	readonly token: string;
	readonly expires: Date;
};

type AccountCreateInput = {
	readonly userId: string;
	readonly provider: string;
	readonly providerAccountId: string;
};

type VerificationCreateInput = {
	readonly identifier: string;
	readonly token: string;
	readonly expires: Date;
	readonly type: string;
};

type ModelStoreMap = {
	readonly user: Map<string, ModelRecord>;
	readonly session: Map<string, ModelRecord>;
	readonly account: Map<string, ModelRecord>;
	readonly verification: Map<string, ModelRecord>;
};

type ModelName = keyof ModelStoreMap;

type AdapterClient = {
	readonly create: (args: CreateArgs) => Promise<ModelRecord>;
	readonly findMany: (args: QueryArgs) => Promise<ModelRecord[]>;
	readonly findUnique: (args: FindUniqueArgs) => Promise<ModelRecord | null>;
	readonly update: (args: UpdateArgs) => Promise<ModelRecord | null>;
	readonly delete: (args: DeleteArgs) => Promise<ModelRecord | null>;
	readonly createUser: (data: UserCreateInput) => Promise<ModelRecord>;
	readonly createSession: (data: SessionCreateInput) => Promise<ModelRecord>;
	readonly createAccount: (data: AccountCreateInput) => Promise<ModelRecord>;
	readonly createVerification: (data: VerificationCreateInput) => Promise<ModelRecord>;
};

// In-memory storage for demonstration
// In production, this should be replaced with a real database
class InMemoryDatabase implements AdapterClient {
	private readonly stores: ModelStoreMap = {
		user: new Map(),
		session: new Map(),
		account: new Map(),
		verification: new Map(),
	};

	private getStore(model: ModelName) {
		return this.stores[model];
	}

	private static isScalarFilter(value: unknown): value is ScalarFilter {
		if (typeof value !== 'object' || value === null) {
			return false;
		}

		const candidate = value as Record<string, unknown>;
		return 'equals' in candidate || 'in' in candidate;
	}

	private static matchesWhere(record: ModelRecord, where?: WhereClause) {
		if (!where) {
			return true;
		}

		return Object.entries(where).every(([key, condition]) => {
			const value = record[key];

			if (InMemoryDatabase.isScalarFilter(condition)) {
				if (condition.equals !== undefined && value !== condition.equals) {
					return false;
				}

				if (Array.isArray(condition.in) && !condition.in.includes(value)) {
					return false;
				}

				return true;
			}

			return value === condition;
		});
	}

	async create(args: CreateArgs): Promise<ModelRecord> {
		const id = randomUUID();
		const record: ModelRecord = {
			id,
			...args.data,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		this.getStore(args.model).set(id, record);
		return record;
	}

	async findMany(args: QueryArgs): Promise<ModelRecord[]> {
		const records = Array.from(this.getStore(args.model).values());
		return records.filter((record) => InMemoryDatabase.matchesWhere(record, args.where));
	}

	async findUnique(args: FindUniqueArgs): Promise<ModelRecord | null> {
		const records = await this.findMany(args);
		return records[0] ?? null;
	}

	async update(args: UpdateArgs): Promise<ModelRecord | null> {
		const store = this.getStore(args.model);
		const existing = store.get(args.where.id);

		if (!existing) {
			return null;
		}

		const updated: ModelRecord = {
			...existing,
			...args.data,
			updatedAt: new Date(),
		};

		store.set(args.where.id, updated);
		return updated;
	}

	async delete(args: DeleteArgs): Promise<ModelRecord | null> {
		const store = this.getStore(args.model);
		const existing = store.get(args.where.id);

		if (!existing) {
			return null;
		}

		store.delete(args.where.id);
		return existing;
	}

	// Helper methods for Better Auth
	async createUser(data: UserCreateInput) {
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

	async createSession(data: SessionCreateInput) {
		return this.create({
			model: 'session',
			data: {
				userId: data.userId,
				token: data.token,
				expires: data.expires,
			},
		});
	}

	async createAccount(data: AccountCreateInput) {
		return this.create({
			model: 'account',
			data: {
				userId: data.userId,
				provider: data.provider,
				providerAccountId: data.providerAccountId,
			},
		});
	}

	async createVerification(data: VerificationCreateInput) {
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
	private readonly db: InMemoryDatabase;

	constructor() {
		this.db = new InMemoryDatabase();
	}

	getAdapter(): AdapterClient {
		return this.db;
	}
}
