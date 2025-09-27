import { vi } from 'vitest';

const hash = async (input: string) => `hashed:${input}`;
const compare = async (input: string, hashed: string) => hashed === `hashed:${input}`;
const genSalt = async () => 'salt';

vi.mock('bcrypt', () => ({
	hash,
	compare,
	genSalt,
	default: {
		hash,
		compare,
		genSalt,
	},
}));
