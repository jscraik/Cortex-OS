import { beforeEach, describe, expect, it, vi } from 'vitest';
// Path from __tests__ to kernel bootstrap accessor
import * as toolkitModule from '../../../src/bootstrap/agent-toolkit.js';
import { onUserCreated, type UserCreatedEnvelope } from '../src/app/on-user-created.js';

vi.mock('../../../../src/bootstrap/agent-toolkit.js', () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    return {
        getAgentToolkit: () => ({
            memories: { upsert },
        }),
    };
});

describe('onUserCreated', () => {
    const envelope: UserCreatedEnvelope = {
        type: 'user.created',
        source: 'urn:test',
        id: 'evt-1',
        time: new Date().toISOString(),
        data: { userId: 'u1', email: 'a@b.c' },
    };

    let upsertSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Access mocked module's toolkit
        upsertSpy = toolkitModule.getAgentToolkit().memories.upsert as ReturnType<typeof vi.fn>;
        upsertSpy.mockClear();
    });

    it('upserts user profile memory', async () => {
        await onUserCreated(envelope);
        expect(upsertSpy).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'user:u1:profile', tags: ['auth', 'user', 'profile'] }),
        );
    });
});
