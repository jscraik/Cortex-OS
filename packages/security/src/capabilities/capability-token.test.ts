import { describe, expect, it } from 'vitest';
import {
	CapabilityTokenIssuer,
	CapabilityTokenValidator,
	CapabilityTokenError,
	createCapabilitySecret,
} from './capability-token.js';

describe('CapabilityTokenIssuer & CapabilityTokenValidator', () => {
	const secret = createCapabilitySecret();
	const issuer = new CapabilityTokenIssuer(secret, 'test-issuer', () => 1_700_000_000_000);
	const validator = new CapabilityTokenValidator(secret, 0, () => 1_700_000_000_000);

	it('issues and validates a capability token', () => {
		const { token, claims } = issuer.issue({
			tenant: 'brainwav',
			action: 'invoke:tool.embedding',
			resourcePrefix: 'rag/corpus/core',
			maxCost: 2.5,
			budgetProfile: 'quick',
			ttlSeconds: 120,
		});

		expect(token).toBeTypeOf('string');
		const descriptor = validator.verify(token, {
			expectedTenant: 'brainwav',
			requiredAction: 'invoke:tool.embedding',
			requiredResourcePrefix: 'rag/corpus',
		});

		expect(descriptor.tenant).toBe('brainwav');
		expect(descriptor.action).toBe('invoke:tool.embedding');
		expect(descriptor.resourcePrefix).toBe('rag/corpus/core');
		expect(descriptor.maxCost).toBe(2.5);
		expect(descriptor.budgetProfile).toBe('quick');
		expect(descriptor.claims.exp).toBe(claims.exp);
	});

	it('rejects tampered tokens', () => {
		const { token } = issuer.issue({
			tenant: 'brainwav',
			action: 'invoke:tool.embedding',
			resourcePrefix: 'rag/corpus/core',
		});

		const tampered = token.replace(/.$/, (char) => (char === 'A' ? 'B' : 'A'));
		expect(() => validator.verify(tampered)).toThrow(CapabilityTokenError);
	});

	it('rejects expired tokens', () => {
		const { token } = issuer.issue({
			tenant: 'brainwav',
			action: 'invoke:tool.embedding',
			resourcePrefix: 'rag/corpus/core',
			ttlSeconds: 1,
		});

		const futureValidator = new CapabilityTokenValidator(secret, 0, () => (1_700_000_000_000 + 10_000));
		expect(() => futureValidator.verify(token)).toThrow(CapabilityTokenError);
	});
});

