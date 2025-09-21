import { describe, expect, it } from 'vitest';
import { PolicyRegistry } from '../src/policy-registry.js';

const samplePolicy = (id: string, allowed = true) => ({
	id,
	description: `${id} policy`,
	evaluate: () => ({ allowed }),
});

describe('PolicyRegistry contract', () => {
	it('registers policies and lists them as enabled by default', () => {
		const registry = new PolicyRegistry();
		registry.register('safety', samplePolicy('policy.safety'));

		const policies = registry.list();
		expect(Object.keys(policies)).toEqual(['safety']);
		expect(policies.safety.enabled).toBe(true);
		expect(policies.safety.policy.id).toBe('policy.safety');
	});

	it('toggles a policy enabled state', () => {
		const registry = new PolicyRegistry();
		registry.register('safety', samplePolicy('policy.safety'));

		registry.disable('safety');
		expect(registry.list().safety.enabled).toBe(false);

		registry.enable('safety');
		expect(registry.list().safety.enabled).toBe(true);
	});

	it('rejects duplicate registrations', () => {
		const registry = new PolicyRegistry();
		registry.register('safety', samplePolicy('policy.safety'));

		expect(() => registry.register('safety', samplePolicy('policy.safety.v2'))).toThrowError(
			/already registered/i,
		);
	});

	it('errors when toggling unknown policies', () => {
		const registry = new PolicyRegistry();

		expect(() => registry.enable('missing')).toThrowError(/not registered/i);
		expect(() => registry.disable('missing')).toThrowError(/not registered/i);
	});

	it('evaluates policies and returns the first denial', () => {
		const registry = new PolicyRegistry();
		registry.register('allow-all', samplePolicy('policy.allow'));
		registry.register('deny-specific', {
			id: 'policy.deny',
			description: 'denies certain contexts',
			evaluate: (context) =>
				context.kind === 'task.create' ? { allowed: false, reason: 'blocked' } : { allowed: true },
		});

		const decision = registry.evaluate({ kind: 'task.create', input: {} });
		expect(decision.allowed).toBe(false);
		expect(decision.reason).toBe('blocked');
	});

	it('ignores disabled policies during evaluation', () => {
		const registry = new PolicyRegistry();
		registry.register('deny', samplePolicy('policy.deny', false));
		registry.disable('deny');

		const decision = registry.evaluate({ kind: 'task.create', input: {} });
		expect(decision.allowed).toBe(true);
	});
});
