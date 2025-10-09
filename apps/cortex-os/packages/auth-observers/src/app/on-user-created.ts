import type { Envelope } from '@cortex-os/a2a-contracts';
import { getAgentToolkit } from '../../../../src/bootstrap/agent-toolkit.js';
import { buildUserNote, type UserProfileMinimalData } from '../domain/user-memory.js';

export const onUserCreated = async (evt: Envelope) => {
	const tk = getAgentToolkit();

	// Validate the event data structure
	if (!evt.data || typeof evt.data !== 'object' || !('userId' in evt.data)) {
		console.warn('brAInwav: Invalid user.created event data structure');
		return;
	}

	const userData = evt.data as UserProfileMinimalData;
	const text = buildUserNote(userData);

	// Check if toolkit has memories integration (may be undefined in some configurations)
	const memoryStore = (tk as { memories?: { upsert: (data: unknown) => Promise<unknown> } })
		.memories;
	if (!memoryStore || typeof memoryStore.upsert !== 'function') {
		console.warn('brAInwav: Memory integration not available in agent toolkit configuration');
		return;
	}

	await memoryStore.upsert({
		id: `user:${userData.userId}:profile`,
		kind: 'profile',
		text,
		tags: ['auth', 'user', 'profile'],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		provenance: { source: 'auth-observers' },
	});
};
