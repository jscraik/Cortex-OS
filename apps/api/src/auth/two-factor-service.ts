import bcrypt from 'bcrypt';
import { prisma } from '../db/prisma-client.js';
import {
	authenticator,
	generateBackupCodes,
	hashBackupCodes,
	parseStoredBackupCodes,
	recordAuthAuditLog,
} from './utils.js';

export class TwoFactorPersistenceError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TwoFactorPersistenceError';
	}
}

export class TwoFactorAlreadyEnabledError extends Error {
	constructor() {
		super('brAInwav two-factor authentication already enabled');
		this.name = 'TwoFactorAlreadyEnabledError';
	}
}

export class TwoFactorNotConfiguredError extends Error {
	constructor() {
		super('brAInwav two-factor authentication not configured');
		this.name = 'TwoFactorNotConfiguredError';
	}
}

type PrismaTwoFactorDelegate = {
	findUnique: (args: { where: { userId: string } }) => Promise<{
		id: string;
		userId: string;
		secret: string;
		backupCodes: string | null;
		enabled: boolean;
	} | null>;
	upsert: (args: {
		where: { userId: string };
		create: { userId: string; secret: string; backupCodes: string; enabled: boolean };
		update: { secret: string; backupCodes: string; enabled: boolean };
	}) => Promise<{ userId: string }>;
	update: (args: {
		where: { userId: string };
		data: Partial<{ secret: string; backupCodes: string; enabled: boolean }>;
	}) => Promise<{ userId: string }>;
};

type PrismaUserDelegate = {
	update: (args: {
		where: { id: string };
		data: Partial<{ twoFactorEnabled: boolean }>;
	}) => Promise<unknown>;
};

const resolveDelegate = (): PrismaTwoFactorDelegate | null => {
	const candidate = (prisma as unknown as Record<string, unknown>).twoFactorSecret as
		| PrismaTwoFactorDelegate
		| undefined;
	return candidate ?? null;
};

const resolveUserDelegate = (): PrismaUserDelegate | null => {
	const candidate = (prisma as unknown as Record<string, unknown>).user as
		| PrismaUserDelegate
		| undefined;
	return candidate ?? null;
};

const issuerLabel = 'brAInwav Cortex-OS';

const serializeBackupCodes = (codes: string[]) => JSON.stringify(codes);

const ensureDelegate = (): PrismaTwoFactorDelegate => {
	const delegate = resolveDelegate();
	if (!delegate) {
		throw new TwoFactorPersistenceError('brAInwav two-factor persistence unavailable');
	}
	return delegate;
};

const ensureUserDelegate = (): PrismaUserDelegate => {
	const delegate = resolveUserDelegate();
	if (!delegate) {
		throw new TwoFactorPersistenceError('User persistence unavailable');
	}
	return delegate;
};

export type TwoFactorEnrollmentResult = {
	secret: string;
	otpauthUrl: string;
	backupCodes: string[];
};

export const startTwoFactorEnrollment = async (params: {
	userId: string;
	email?: string | null;
	sessionId?: string | null;
}): Promise<TwoFactorEnrollmentResult> => {
	const delegate = ensureDelegate();
	const { userId, email, sessionId } = params;
	const existing = await delegate.findUnique({ where: { userId } });
	if (existing?.enabled) {
		throw new TwoFactorAlreadyEnabledError();
	}

	const secret = authenticator.generateSecret();
	const backupCodes = generateBackupCodes();
	const hashedCodes = await hashBackupCodes(backupCodes);

	await delegate.upsert({
		where: { userId },
		create: {
			userId,
			secret,
			backupCodes: serializeBackupCodes(hashedCodes),
			enabled: false,
		},
		update: {
			secret,
			backupCodes: serializeBackupCodes(hashedCodes),
			enabled: false,
		},
	});

	const userDelegate = ensureUserDelegate();
	await userDelegate.update({
		where: { id: userId },
		data: { twoFactorEnabled: false },
	});

	await recordAuthAuditLog({
		userId,
		sessionId,
		action: 'twoFactor.enrollment.created',
		message: 'two-factor secret generated',
	});

	const label = email ?? userId;
	const otpauthUrl = authenticator.keyuri(label, issuerLabel, secret);

	return { secret, otpauthUrl, backupCodes };
};

const removeUsedBackupCode = async (
	delegate: PrismaTwoFactorDelegate,
	userId: string,
	usedHash: string,
	storedHashes: string[],
) => {
	const remaining = storedHashes.filter((hash) => hash !== usedHash);
	await delegate.update({
		where: { userId },
		data: { backupCodes: serializeBackupCodes(remaining), enabled: true },
	});
	return remaining.length;
};

const enableUserTwoFactor = async (userId: string) => {
	const userDelegate = ensureUserDelegate();
	await userDelegate.update({
		where: { id: userId },
		data: { twoFactorEnabled: true },
	});
};

export type TwoFactorVerificationResult = {
	method: 'totp' | 'backup-code';
	backupCodesRemaining: number;
};

const completeTotpVerification = async (
	delegate: PrismaTwoFactorDelegate,
	params: { userId: string; sessionId?: string | null },
	record: { backupCodes: string | null },
): Promise<TwoFactorVerificationResult> => {
	await delegate.update({
		where: { userId: params.userId },
		data: { enabled: true },
	});
	await enableUserTwoFactor(params.userId);
	await recordAuthAuditLog({
		userId: params.userId,
		sessionId: params.sessionId,
		action: 'twoFactor.verified.totp',
		message: 'two-factor verification completed via TOTP',
	});
	const storedCodes = parseStoredBackupCodes({ backupCodes: record.backupCodes });
	return { method: 'totp', backupCodesRemaining: storedCodes.length };
};

const tryBackupCodeVerification = async (
	delegate: PrismaTwoFactorDelegate,
	params: { userId: string; code: string; sessionId?: string | null },
	storedHashes: string[],
): Promise<TwoFactorVerificationResult | null> => {
	for (const hash of storedHashes) {
		const matches = await bcrypt.compare(params.code, hash);
		if (!matches) {
			continue;
		}
		const remaining = await removeUsedBackupCode(delegate, params.userId, hash, storedHashes);
		await enableUserTwoFactor(params.userId);
		await recordAuthAuditLog({
			userId: params.userId,
			sessionId: params.sessionId,
			action: 'twoFactor.verified.backup',
			message: 'two-factor verification completed via backup code',
		});
		return { method: 'backup-code', backupCodesRemaining: remaining };
	}
	return null;
};

export const verifyTwoFactorCode = async (params: {
	userId: string;
	code: string;
	sessionId?: string | null;
}): Promise<TwoFactorVerificationResult> => {
	const delegate = ensureDelegate();
	const { userId, code, sessionId } = params;
	const trimmedCode = code.trim();
	if (!trimmedCode) {
		throw new Error('brAInwav verification code required');
	}

	const secretRecord = await delegate.findUnique({ where: { userId } });
	if (!secretRecord) {
		throw new TwoFactorNotConfiguredError();
	}

	if (authenticator.check(trimmedCode, secretRecord.secret)) {
		return await completeTotpVerification(delegate, { userId, sessionId }, secretRecord);
	}

	const storedHashes = parseStoredBackupCodes({ backupCodes: secretRecord.backupCodes });
	const backupResult = await tryBackupCodeVerification(
		delegate,
		{ userId, code: trimmedCode, sessionId },
		storedHashes,
	);
	if (backupResult) {
		return backupResult;
	}

	throw new Error('brAInwav two-factor verification code invalid');
};
