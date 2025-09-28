import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { authenticator as baseAuthenticator } from 'otplib';
import { prisma } from '../db/prisma-client.js';

export type PrismaUserRecord = {
	id: string;
	email: string | null;
	name: string | null;
	emailVerified: Date | boolean | null;
	image: string | null;
	twoFactorEnabled?: boolean | null;
	createdAt: Date;
	updatedAt: Date;
} | null;

type PrismaSecretRecord = {
	backupCodes: string | null;
} | null;

type AuditLogParams = {
	userId: string;
	sessionId?: string | null;
	action: string;
	message: string;
	metadata?: Record<string, unknown>;
};

baseAuthenticator.options = { step: 30, window: 1 };

export const authenticator: typeof baseAuthenticator = baseAuthenticator;

export const formatUserRecord = (user: PrismaUserRecord) => {
	if (!user) {
		return null;
	}

	return {
		id: user.id,
		email: user.email,
		name: user.name,
		emailVerified: user.emailVerified,
		image: user.image,
		twoFactorEnabled: user.twoFactorEnabled,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
	};
};

export const recordAuthAuditLog = async ({
	userId,
	sessionId,
	action,
	message,
	metadata,
}: AuditLogParams) => {
	const auditLogClient = prisma.authAuditLog as unknown as {
		create: (args: {
			data: {
				userId: string;
				sessionId: string | null;
				action: string;
				message: string;
				metadata?: Record<string, unknown>;
			};
		}) => Promise<unknown>;
	};

	await auditLogClient.create({
		data: {
			userId,
			sessionId: sessionId ?? null,
			action,
			message: `brAInwav ${message}`,
			metadata,
		},
	});
};

export const generateBackupCodes = (count: number = 10) => {
	return Array.from({ length: count }, () => randomBytes(4).toString('hex').toUpperCase());
};

export const hashBackupCodes = async (codes: string[]) => {
	return Promise.all(codes.map(async (code) => bcrypt.hash(code, 12)));
};

export const parseStoredBackupCodes = (record: PrismaSecretRecord): string[] => {
	if (!record?.backupCodes) {
		return [];
	}

	try {
		const parsed = JSON.parse(record.backupCodes);
		return Array.isArray(parsed) ? (parsed as string[]) : [];
	} catch {
		return [];
	}
};
