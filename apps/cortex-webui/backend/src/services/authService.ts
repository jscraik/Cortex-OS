// Authentication service for Cortex WebUI backend

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../../../shared/constants';
import type { User } from '../../../shared/types';
import { UserModel } from '../models/user';
import { getDatabase } from '../utils/database';

export const AuthService = {
	async hashPassword(password: string): Promise<string> {
		const saltRounds = 10;
		return await bcrypt.hash(password, saltRounds);
	},

	async verifyPassword(password: string, hash: string): Promise<boolean> {
		return await bcrypt.compare(password, hash);
	},

	generateToken(userId: string): string {
		return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
	},

	verifyToken(token: string): { userId: string } | null {
		try {
			return jwt.verify(token, JWT_SECRET) as { userId: string };
		} catch {
			return null;
		}
	},

	async register(
		name: string,
		email: string,
		password: string,
	): Promise<{ user: User; token: string }> {
		const db = await getDatabase();

		// Check if user already exists
		const existingUser = await db.get(
			`SELECT * FROM ${UserModel.tableName} WHERE email = ?`,
			[email],
		);
		if (existingUser) {
			throw new Error('User with this email already exists');
		}

		// Hash password
		const hashedPassword = await AuthService.hashPassword(password);

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

		await db.run(
			`INSERT INTO ${UserModel.tableName} (id, email, name, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
			[
				userRecord.id,
				userRecord.email,
				userRecord.name,
				userRecord.password,
				userRecord.created_at,
				userRecord.updated_at,
			],
		);

		const user = UserModel.fromRecord(userRecord);
		const token = AuthService.generateToken(user.id);

		// Remove password from returned user object
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password: _password, ...userWithoutPassword } = user;

		return { user: userWithoutPassword, token };
	},

	async login(
		email: string,
		password: string,
	): Promise<{ user: User; token: string } | null> {
		const db = await getDatabase();

		// Find user
		const userRecord = await db.get(
			`SELECT * FROM ${UserModel.tableName} WHERE email = ?`,
			[email],
		);
		if (!userRecord) {
			return null;
		}

		// Verify password
		const isValid = await AuthService.verifyPassword(
			password,
			userRecord.password,
		);
		if (!isValid) {
			return null;
		}

		const user = UserModel.fromRecord(userRecord);
		const token = AuthService.generateToken(user.id);

		// Remove password from returned user object
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password: _password, ...userWithoutPassword } = user;

		return { user: userWithoutPassword, token };
	},

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async logout(_token: string): Promise<void> {
		// In a more complex implementation, we might want to blacklist tokens
		// For now, we'll just let the token expire naturally
		return;
	},
};
