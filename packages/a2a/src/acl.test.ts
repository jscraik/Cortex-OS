import { describe, expect, it } from 'vitest';
import { createTopicAcl } from './acl.js';

describe('Topic ACL', () => {
	const acl = createTopicAcl({
		rules: [
			{
				topic: 'tasks.*',
				publish: true,
				subscribe: true,
				roles: ['system', 'service'],
			},
			{ topic: 'internal.secret', publish: false, subscribe: false },
		],
		defaultPublish: false,
		defaultSubscribe: false,
	});
	it('allows publish for matched topic & role', () => {
		expect(acl.canPublish('tasks.create', 'system').allowed).toBe(true);
	});
	it('denies when role not permitted', () => {
		const dec = acl.canPublish('tasks.create', 'guest');
		expect(dec.allowed).toBe(false);
		expect(dec.reason).toBe('Role not permitted');
	});
	it('denies unlisted topic by default', () => {
		const dec = acl.canPublish('other.topic', 'system');
		expect(dec.allowed).toBe(false);
		expect(dec.reason).toBe('No matching rule');
	});
	it('denies explicitly forbidden topic', () => {
		expect(acl.canSubscribe('internal.secret', 'system').allowed).toBe(false);
	});
});
