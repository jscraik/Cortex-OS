// Authentication service for Cortex WebUI backend

import type { User, UserRecord } from '@shared/types';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getServerConfig } from '../config/config';
import { JWT_EXPIRES_IN } from '../config/constants';
import { UserModel } from '../models/user';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { user } from '../db/schema';

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
		const existingUser = await db.select().from(user).where(eq(user.email, email)).limit(1);
		if (existingUser.length > 0) {
			throw new Error('User with this email already exists');
		}

		// Hash password
		const hashedPassword = AuthService.hashPassword(password);

		// Create user
		const userId = uuidv4();

		// Create user
		const newUser = await db.insert(user).values({
			id: userId,
			email,
			name,
			passwordHash: hashedPassword,
			createdAt: new Date(),
			updatedAt: new Date(),
		}).returning();

		const userRecord = newUser[0];

		const user = UserModel.fromRecord(userRecord);
		const token = AuthService.generateToken(user.id);

		// Remove password from returned user object
		const { password: _password, ...userWithoutPassword } = user;

		return { user: userWithoutPassword, token };
	},

	async login(email: string, password: string): Promise<{ user: User; token: string } | null> {
		// Find user
		const userRecords = await db.select().from(user).where(eq(user.email, email)).limit(1);
		const userRecord = userRecords[0];
		if (!userRecord) {
			return null;
		}

		// Verify password
		const isValid = AuthService.verifyPassword(password, userRecord.passwordHash);
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
