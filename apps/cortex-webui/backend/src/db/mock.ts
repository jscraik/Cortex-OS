// Mock database implementation for testing
// This bypasses the native module issues with better-sqlite3

export const mockDb = {
	select: () => ({
		from: () => ({
			where: () => ({
				limit: () => Promise.resolve([]),
			}),
		}),
	}),
	insert: () => ({
		values: () => ({
			returning: () => Promise.resolve([{}]),
		}),
	}),
	update: () => ({
		set: () => ({
			where: () => ({
				returning: () => Promise.resolve([{}]),
			}),
		}),
	}),
	delete: () => ({
		where: () => ({
			returning: () => Promise.resolve([]),
		}),
	}),
};

// Mock database connection
export const mockSqlite = {
	pragma: () => {},
	exec: () => {},
	prepare: () => ({
		get: () => undefined,
		all: () => [],
		run: () => ({}),
	}),
};

// Mock drizzle instance
export const mockDrizzleDb = mockDb;
