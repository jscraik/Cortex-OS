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
	// Fail-fast if memories API absent (should not happen when properly configured)
	if (!tk.memories || typeof tk.memories.upsert !== 'function') return;
	await tk.memories.upsert({
		id: `user:${evt.data.userId}:profile`,
		kind: 'profile',
		text,
		tags: ['auth', 'user', 'profile'],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		provenance: { source: 'auth-observers' },
	});
};
