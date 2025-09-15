// Authentication service for Cortex WebUI backend

import type { User, UserRecord } from '@shared/types';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getServerConfig } from '../config/config';
import { JWT_EXPIRES_IN } from '../config/constants';
import { UserModel } from '../models/user';
import { dbGet, dbRun } from '../utils/database-temp';

export const AuthService = {
	hashPassword(password: string): string {
		const saltRounds = 10;
		return bcrypt.hashSync(password, saltRounds);
	},

	verifyPassword(password: string, hash: string): boolean {
		return bcrypt.compareSync(password, hash);
	},

	generateToken(userId: string): string {
		const { jwtSecret } = getServerConfig();
		if (!jwtSecret) {
			throw new Error('JWT secret missing (validated config)');
		}
		return jwt.sign({ userId }, jwtSecret, { expiresIn: JWT_EXPIRES_IN });
	},

	verifyToken(token: string): { userId: string } | null {
		const { jwtSecret } = getServerConfig();
		if (!jwtSecret) {
			throw new Error('JWT secret missing (validated config)');
		}
		try {
			return jwt.verify(token, jwtSecret) as { userId: string };
		} catch {
			return null;
		}
	},

	async register(
		name: string,
		email: string,
		password: string,
	): Promise<{ user: User; token: string }> {
		// Check if user already exists
		const existingUser = await dbGet(`SELECT * FROM ${UserModel.tableName} WHERE email = ?`, [email]) as UserRecord | undefined;
		if (existingUser) {
			throw new Error('User with this email already exists');
		}

		// Hash password
		const hashedPassword = AuthService.hashPassword(password);

		// Create user
		const userId = uuidv4();
		const now = new Date().toISOString();
		const userRecord = {
			id: userId,
			email,
			name,
			password: hashedPassword,
			created_at: now,
			updated_at: now,
		};

		await dbRun(
			`INSERT INTO ${UserModel.tableName} (id, email, name, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
			[
				userRecord.id,
				userRecord.email,
				userRecord.name,
				userRecord.password,
				userRecord.created_at,
				userRecord.updated_at,
			]
		);

		const user = UserModel.fromRecord(userRecord);
		const token = AuthService.generateToken(user.id);

		// Remove password from returned user object
		const { password: _password, ...userWithoutPassword } = user;

		return { user: userWithoutPassword, token };
	},

	async login(email: string, password: string): Promise<{ user: User; token: string } | null> {
		// Find user
		const userRecord = await dbGet(`SELECT * FROM ${UserModel.tableName} WHERE email = ?`, [email]) as UserRecord | undefined;
		if (!userRecord) {
			return null;
		}

		// Verify password
		const isValid = AuthService.verifyPassword(password, userRecord.password);
		if (!isValid) {
			return null;
		}

		const user = UserModel.fromRecord(userRecord);
		const token = AuthService.generateToken(user.id);

		// Remove password from returned user object
		const { password: _password, ...userWithoutPassword } = user;

		return { user: userWithoutPassword, token };
	},

	async logout(_token: string): Promise<void> {
		// In a more complex implementation, we might want to blacklist tokens
		// For now, we'll just let the token expire naturally
		return;
	},
};
