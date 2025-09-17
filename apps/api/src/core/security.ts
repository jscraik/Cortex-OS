import crypto from 'node:crypto';

export class SecurityError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SecurityError';
	}
}

export interface SecurityGuardOptions {
	readonly acceptedApiKeys: readonly string[];
}

export class SecurityGuard {
	private readonly acceptedDigests: Set<string>;

	constructor(options: SecurityGuardOptions) {
		this.acceptedDigests = new Set(
			options.acceptedApiKeys.map((value) => SecurityGuard.digest(value)),
		);
	}

	verify(apiKey: string | undefined): void {
		if (!apiKey) {
			throw new SecurityError('Missing API key for protected operation.');
		}
		const digest = SecurityGuard.digest(apiKey);
		if (!this.acceptedDigests.has(digest)) {
			throw new SecurityError('Provided API key is not authorized.');
		}
	}

	static digest(value: string): string {
		return crypto.createHash('sha256').update(value).digest('hex');
	}
}
