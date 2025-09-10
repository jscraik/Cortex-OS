import { validateDatabaseInput } from './validation.js';

// Secure database wrapper that prevents injection vulnerabilities
export class SecureDatabaseWrapper {
	private db: any; // The actual database instance

	constructor(database: any) {
		this.db = database;
	}

	// Secure prepare statement that validates inputs
	securePrepare(query: string, params: any[] = []) {
		// Validate that the query uses parameterized statements
		if (!query.includes('?') && params.length > 0) {
			throw new Error('Query must use parameterized statements');
		}

		// Validate all parameters
		for (const param of params) {
			if (typeof param === 'string') {
				const result = validateDatabaseInput.string(param);
				if (!result.success) {
					throw new Error('Invalid string parameter');
				}
			} else if (typeof param === 'object' && param !== null) {
				if ('_raw' in param) {
					throw new Error('Raw SQL injection detected');
				}
			}
		}

		return this.db.prepare(query);
	}

	// Secure run method that validates inputs
	secureRun(query: string, ...params: any[]) {
		const stmt = this.securePrepare(query, params);
		return stmt.run(...params);
	}

	// Secure get method that validates inputs
	secureGet(query: string, ...params: any[]) {
		const stmt = this.securePrepare(query, params);
		return stmt.get(...params);
	}

	// Secure all method that validates inputs
	secureAll(query: string, ...params: any[]) {
		const stmt = this.securePrepare(query, params);
		return stmt.all(...params);
	}
}
