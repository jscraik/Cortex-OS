import { randomBytes } from 'node:crypto';
import { prisma } from '../db/prisma-client.js';
import { recordAuthAuditLog } from './utils.js';

export class PasskeyPersistenceError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PasskeyPersistenceError';
	}
}

export class PasskeyCredentialConflictError extends Error {
	constructor() {
		super('Passkey credential already exists for user');
		this.name = 'PasskeyCredentialConflictError';
	}
}

export class PasskeyCredentialNotFoundError extends Error {
	constructor() {
		super('Passkey credential not found');
		this.name = 'PasskeyCredentialNotFoundError';
	}
}

type PrismaPasskeyDelegate = {
	findUnique: (args: { where: { credentialId?: string; id?: string } }) => Promise<{
		id: string;
		userId: string;
		credentialId: string;
		publicKey: string;
		counter: number;
		deviceType: string;
		backedUp: boolean;
		transports: string | null;
		name: string | null;
	} | null>;
	findFirst: (args: { where: { userId?: string; credentialId?: string } }) => Promise<{
		id: string;
		userId: string;
		credentialId: string;
	} | null>;
	create: (args: {
		data: {
			userId: string;
			name?: string | null;
			credentialId: string;
			publicKey: string;
			deviceType: string;
			backedUp: boolean;
			transports?: string | null;
			counter: number;
		};
	}) => Promise<{
		credentialId: string;
		publicKey: string;
		deviceType: string;
		backedUp: boolean;
		transports: string | null;
		name: string | null;
	}>;
	update: (args: {
		where: { credentialId: string };
		data: { counter: number };
	}) => Promise<{ counter: number; userId: string }>;
};

const resolveDelegate = (): PrismaPasskeyDelegate | null => {
	const candidate = (prisma as unknown as Record<string, unknown>).passkeyCredential as
		| PrismaPasskeyDelegate
		| undefined;
	return candidate ?? null;
};

const ensureDelegate = (): PrismaPasskeyDelegate => {
	const delegate = resolveDelegate();
	if (!delegate) {
		throw new PasskeyPersistenceError('Passkey persistence unavailable');
	}
	return delegate;
};

const toTransportString = (transports?: readonly string[] | null) => {
	if (!transports || transports.length === 0) {
		return null;
	}
	return JSON.stringify([...new Set(transports)]);
};

const parseTransportString = (serialized: string | null): string[] => {
	if (!serialized) {
		return [];
	}
	try {
		const parsed = JSON.parse(serialized);
		return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
	} catch {
		return [];
	}
};

const ensureCredentialUnique = async (
	delegate: PrismaPasskeyDelegate,
	params: { userId: string; credentialId: string },
) => {
	const existing = await delegate.findFirst({ where: params });
	if (existing) {
		throw new PasskeyCredentialConflictError();
	}
};

export type PasskeyRegistrationResult = {
	credentialId: string;
	publicKey: string;
	deviceType: string;
	backedUp: boolean;
	transports: string[];
	name: string | null;
};

const createPasskeyForUser = async (
	delegate: PrismaPasskeyDelegate,
	params: {
		userId: string;
		name?: string | null;
		transports?: readonly string[] | null;
		deviceType?: string;
		backedUp?: boolean;
		credentialId?: string;
		publicKey?: string;
	},
) => {
	const credentialId = params.credentialId ?? randomBytes(32).toString('base64url');
	await ensureCredentialUnique(delegate, { userId: params.userId, credentialId });

	const publicKey = params.publicKey ?? randomBytes(64).toString('base64');
	const deviceType = params.deviceType ?? 'singleDevice';
	const backedUp = params.backedUp ?? false;
	const transports = toTransportString(params.transports);

	const created = await delegate.create({
		data: {
			userId: params.userId,
			name: params.name ?? null,
			credentialId,
			publicKey,
			deviceType,
			backedUp,
			transports,
			counter: 0,
		},
	});

	return { created, credentialId, transports } as const;
};

const recordRegistrationAudit = async (params: {
	userId: string;
	sessionId?: string | null;
	credentialId: string;
	deviceType: string;
	transports: string | null;
}) => {
	await recordAuthAuditLog({
		userId: params.userId,
		sessionId: params.sessionId,
		action: 'passkey.registered',
		message: 'passkey credential registered',
		metadata: {
			credentialId: params.credentialId,
			deviceType: params.deviceType,
			transports: parseTransportString(params.transports),
		},
	});
};

export const registerPasskeyCredential = async (params: {
	userId: string;
	name?: string | null;
	transports?: readonly string[] | null;
	deviceType?: string;
	backedUp?: boolean;
	credentialId?: string;
	publicKey?: string;
	sessionId?: string | null;
}): Promise<PasskeyRegistrationResult> => {
	const delegate = ensureDelegate();
	const { created, credentialId, transports } = await createPasskeyForUser(delegate, params);

	await recordRegistrationAudit({
		userId: params.userId,
		sessionId: params.sessionId,
		credentialId,
		deviceType: created.deviceType,
		transports,
	});

	return {
		credentialId,
		publicKey: created.publicKey,
		deviceType: created.deviceType,
		backedUp: created.backedUp,
		transports: parseTransportString(transports),
		name: created.name,
	};
};

export type PasskeyAuthenticationResult = {
	userId: string;
	credentialId: string;
	counter: number;
};

export const authenticatePasskeyCredential = async (params: {
	credentialId: string;
	sessionId?: string | null;
}): Promise<PasskeyAuthenticationResult> => {
	const delegate = ensureDelegate();
	const record = await delegate.findUnique({ where: { credentialId: params.credentialId } });
	if (!record) {
		throw new PasskeyCredentialNotFoundError();
	}

	const newCounter = record.counter + 1;
	await delegate.update({
		where: { credentialId: params.credentialId },
		data: { counter: newCounter },
	});

	await recordAuthAuditLog({
		userId: record.userId,
		sessionId: params.sessionId,
		action: 'passkey.authenticated',
		message: 'passkey credential authenticated',
		metadata: { credentialId: params.credentialId },
	});

	return {
		userId: record.userId,
		credentialId: params.credentialId,
		counter: newCounter,
	};
};
