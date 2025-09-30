import { getAgentToolkit } from '../../../../src/bootstrap/agent-toolkit.js';
import { buildUserNote, type UserProfileMinimalData } from '../domain/user-memory.js';

export interface UserCreatedEnvelope {
	type: 'user.created';
	source: string;
	id: string;
	time: string;
	data: UserProfileMinimalData;
}

export const onUserCreated = async (evt: UserCreatedEnvelope) => {
	const tk = getAgentToolkit();
	const text = buildUserNote(evt.data);

	// Check if toolkit has memories integration (may be undefined in some configurations)
	const memoryStore = (tk as { memories?: { upsert: (data: unknown) => Promise<unknown> } })
		.memories;
	if (!memoryStore || typeof memoryStore.upsert !== 'function') {
		console.warn('brAInwav: Memory integration not available in agent toolkit configuration');
		return;
	}

	await memoryStore.upsert({
		id: `user:${evt.data.userId}:profile`,
		kind: 'profile',
		text,
		tags: ['auth', 'user', 'profile'],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		provenance: { source: 'auth-observers' },
	});
};
