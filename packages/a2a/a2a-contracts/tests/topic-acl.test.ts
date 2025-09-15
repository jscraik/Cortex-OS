import { describe, expect, it } from 'vitest';
import type { TopicACL } from '../src/topic-acl.js';

describe('TopicACL', () => {
	it('denies access when topic has no entry', () => {
		const acl: TopicACL = {};
		expect(acl.unknown?.publish).toBeUndefined();
		expect(acl.unknown?.subscribe).toBeUndefined();
	});
});
